from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession 
from sqlalchemy import text, select, update
from datetime import date
from typing import List, Optional
from pydantic import BaseModel
from .. import schemas
from .. import crud 
from ..database import get_db, DB_NAME_USER, DB_NAME_FINANCE, DB_NAME_MASTER, DB_NAME_OLD, DB_NAME_USER_NEW
from ..models.finance import ARReceipt

router = APIRouter(
    prefix="/AR", 
    tags=["Bank Book Entry"]
)

# --- Pydantic Schemas ---
class ReceiptItem(BaseModel):
    receipt_id: int = 0
    customer_id: int
    bank_amount: float
    bank_charges: float
    deposit_bank_id: int
    receipt_date: Optional[str] = None
    reference_no: Optional[str] = None
    sales_person_id: Optional[int] = None
    send_notification: bool = False
    status: str 

class CreateReceiptRequest(BaseModel):
    orgId: int
    branchId: int
    userId: int
    userIp: str = "127.0.0.1"
    header: List[ReceiptItem]

# --- API Endpoints ---

@router.get("/get-daily-entries")
async def get_daily_entries(db: AsyncSession = Depends(get_db)):
    try:
        query = text(f"""
            SELECT 
                r.receipt_id,
                r.receipt_date as date,
                r.customer_id,
                
                -- Dynamic Party Name Logic
                CASE 
                    WHEN r.bank_amount < 0 AND r.customer_id != 0 THEN COALESCE(s.SupplierName, 'Unknown Supplier')
                    WHEN r.customer_id = 0 AND r.reference_no LIKE 'CLM%' THEN SUBSTRING_INDEX(r.reference_no, ' - ', -1)
                    WHEN r.bank_amount < 0 AND r.customer_id = 0 THEN 'Bank Charges'
                    ELSE COALESCE(c.CustomerName, 'Unknown Customer')
                END as customerName,
                
                -- Fallback to cash_amount if it's a cash transaction linked to a bank
                CASE WHEN r.bank_amount != 0 THEN r.bank_amount ELSE r.cash_amount END as bank_amount,
                r.bank_charges,
                r.deposit_bank_id,
                r.reference_no,
                r.sales_person_id,
                r.send_notification,
                r.is_posted, 
                r.pending_verification, 

                CASE WHEN r.is_posted = 1 THEN 'P' ELSE 'S' END as status_code,
                
                CASE 
                    WHEN r.is_posted = 1 AND r.pending_verification = 1 THEN 'Pending'
                    WHEN r.is_posted = 1 AND r.pending_verification = 0 THEN 'Completed'
                    ELSE NULL 
                END as verification_status

            FROM tbl_ar_receipt r
            LEFT JOIN {DB_NAME_USER}.master_customer c ON r.customer_id = c.Id
            -- 🟢 FIX: Join on SupplierId, not Id
            LEFT JOIN {DB_NAME_MASTER}.master_supplier s ON r.customer_id = s.SupplierId
            
            WHERE r.deposit_bank_id IS NOT NULL 
              AND r.deposit_bank_id != '' 
              AND r.deposit_bank_id != '0'
              AND (r.reference_no NOT LIKE 'CLM%' OR r.reference_no IS NULL)
            
            ORDER BY r.receipt_id DESC
        """)
        
        result = await db.execute(query)
        data = result.mappings().all()
        return {"status": "success", "data": data}
        
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# --- UPDATED ENDPOINT: BANK BOOK REPORT ---
@router.get("/get-report")
async def get_bank_book_report(
    from_date: str,
    to_date: str,
    bank_id: int = 0,
    db: AsyncSession = Depends(get_db)
):
    try:
        data = []
        running_balance = 0.0

        # 1. FETCH OPENING BALANCE
        if bank_id and bank_id != 0:
            opening_sql = text(f"""
                SELECT 
                    as_of_date as Date,
                    '-' as VoucherNo,
                    'OPENING BALANCE' as TransactionType,
                    '-' as Account,
                    '-' as Party,
                    'Brought Forward' as Description,
                    currency as Currency,
                    0.00 as CreditIn, 
                    opening_balance as DebitOut, 
                    opening_balance as NetAmount
                FROM {DB_NAME_FINANCE}.tbl_bank_opening_balance
                WHERE bank_id = :bank_id
                LIMIT 1
            """)
            opening_result = await db.execute(opening_sql, {"bank_id": bank_id})
            opening_row = opening_result.mappings().first()

            if opening_row:
                op_item = dict(opening_row)
                op_debit = float(op_item["DebitOut"] or 0)
                running_balance = op_debit
                
                op_item["CreditIn"] = 0.0
                op_item["DebitOut"] = op_debit
                op_item["Balance"] = running_balance
                data.append(op_item)

        # 1b. FETCH OVERDRAFT LIMIT from tbl_overdraft (user-entered via Overdraft screen)
        overdraft_limit = 0.0
        if bank_id and bank_id != 0:
            overdraft_sql = text(f"""
                SELECT COALESCE(ODAmount, 0) as OverdraftLimit
                FROM {DB_NAME_FINANCE}.tbl_overdraft
                WHERE bankid = :bank_id
                  AND IsActive = 1
                  AND IsSubmitted = 1
                ORDER BY OverDraftId DESC
                LIMIT 1
            """)
            overdraft_result = await db.execute(overdraft_sql, {"bank_id": bank_id})
            overdraft_row = overdraft_result.mappings().first()
            if overdraft_row:
                overdraft_limit = float(overdraft_row["OverdraftLimit"])

        # Attach overdraft to opening balance row if it exists
        if data:
            data[0]["OverdraftLimit"] = overdraft_limit
            data[0]["OverDraft"] = overdraft_limit - running_balance

        # 2. FETCH TRANSACTIONS
        sql = text(f"""
            SELECT 
                COALESCE(r.receipt_date, r.created_date) as Date,
                r.reference_no as VoucherNo,
                
                CASE 
                    WHEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) < 0 THEN 'Payment' 
                    ELSE 'Receipt' 
                END as TransactionType, 
                
                MAX(b.BankName) as Account,
                
                -- Dynamic Party Name
                CASE 
                    WHEN MAX(r.cash_amount) < 0 AND MAX(r.bank_amount) = 0 THEN 'Petty Cash / Cash Holding'
                    WHEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) < 0 AND MAX(r.customer_id) != 0 
                        THEN COALESCE(MAX(s.SupplierName), 'Unknown Supplier')
                    WHEN MAX(r.customer_id) = 0 AND r.reference_no LIKE 'CLM%' 
                        THEN SUBSTRING_INDEX(r.reference_no, ' - ', -1)
                    WHEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) < 0 AND MAX(r.customer_id) = 0 
                        THEN 'Bank Charges'
                    ELSE COALESCE(MAX(c.CustomerName), 'Unknown Customer') 
                END as Party,
                
                r.reference_no as Description,
                COALESCE(MAX(mc.CurrencyCode), 'IDR') as Currency, 
                
                CASE WHEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) >= 0 
                     THEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) ELSE 0 END as DebitOut,
                CASE WHEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) < 0 
                     THEN ABS(MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount))) ELSE 0 END as CreditIn,
                
                MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) as NetAmount
            FROM tbl_ar_receipt r
            LEFT JOIN {DB_NAME_USER}.master_customer c ON r.customer_id = c.Id
            LEFT JOIN {DB_NAME_MASTER}.master_supplier s ON r.customer_id = s.SupplierId
            LEFT JOIN {DB_NAME_MASTER}.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
            LEFT JOIN {DB_NAME_USER}.master_currency mc ON b.CurrencyId = mc.CurrencyId
            WHERE 
                DATE(COALESCE(r.receipt_date, r.created_date)) BETWEEN :from_date AND :to_date
                AND r.is_active = 1
                AND r.is_submitted = 1
                AND CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = :bank_id
            GROUP BY 
                r.receipt_id,
                r.reference_no,
                COALESCE(r.receipt_date, r.created_date)
            ORDER BY COALESCE(r.receipt_date, r.created_date) ASC, r.receipt_id ASC
        """)

        params = {
            "from_date": from_date, 
            "to_date": to_date, 
            "bank_id": int(bank_id) 
        }

        result = await db.execute(sql, params)
        raw_rows = result.mappings().all()
        
        # --- NEW LOGIC: GROUP BY (Date, TransactionType, Party) ---
        grouped_dict = {}
        for row in raw_rows:
            # Create a unique sorting key that keeps chronological order
            # Using str(Date) to easily group dates
            dt_str = str(row["Date"]).split()[0] if row["Date"] else "" 
            
            group_key = (dt_str, row["TransactionType"], row["Party"])
            
            if group_key not in grouped_dict:
                grouped_dict[group_key] = {
                    "Date": row["Date"],
                    "VoucherNo": str(row["VoucherNo"]) if row["VoucherNo"] else "",
                    "TransactionType": row["TransactionType"],
                    "Account": row["Account"],
                    "Party": row["Party"],
                    "Description": row["Description"],
                    "Currency": row["Currency"],
                    "CreditIn": float(row["CreditIn"] or 0),
                    "DebitOut": float(row["DebitOut"] or 0),
                    "NetAmount": float(row["NetAmount"] or 0)
                }
            else:
                # Group exists, sum the amounts
                existing = grouped_dict[group_key]
                existing["CreditIn"] += float(row["CreditIn"] or 0)
                existing["DebitOut"] += float(row["DebitOut"] or 0)
                existing["NetAmount"] += float(row["NetAmount"] or 0)
                
                # Append Voucher No if it's new
                new_voucher = str(row["VoucherNo"]) if row["VoucherNo"] else ""
                if new_voucher and new_voucher not in existing["VoucherNo"]:
                    existing["VoucherNo"] += f", {new_voucher}"

        
        # Calculate moving balance on the grouped array
        for item in grouped_dict.values():
            credit_val = item["CreditIn"]
            debit_val = item["DebitOut"]
            
            running_balance += (debit_val - credit_val)
            
            item["Balance"] = running_balance
            item["OverdraftLimit"] = overdraft_limit
            item["OverDraft"] = overdraft_limit - running_balance
            data.append(item)
            
        return {"status": "success", "data": data}

    except Exception as e:
        print(f"Error fetching bank book report: {e}")
        return {"status": "error", "detail": str(e)}

# --- 🟢 UPDATED ENDPOINT: GET SUPPLIER FILTER ---
@router.get("/get-supplier-filter")
async def get_supplier_filter(db: AsyncSession = Depends(get_db)):
    try:
        # 🟢 FIX: Use SupplierId column & DB_NAME_MASTER
        query = text(f"""
            SELECT SupplierId, SupplierName 
            FROM {DB_NAME_MASTER}.master_supplier 
            WHERE IsActive = 1 
            ORDER BY SupplierName ASC
        """)
        result = await db.execute(query)
        data = result.mappings().all()
        return {"status": "success", "data": data}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

# --- NEW ENDPOINT: VERIFY RECEIPT ---
@router.put("/verify/{receipt_id}")
async def verify_receipt(
    receipt_id: int, 
    payload: schemas.VerifyCustomerUpdate, 
    db: AsyncSession = Depends(get_db)
):
    try:
        record = await crud.update_customer_and_verify(db, receipt_id, payload)
        if not record:
            raise HTTPException(status_code=404, detail="Receipt not found or not in pending state")
        return {"status": "success", "message": "Verification finalized"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@router.put("/submit/{receipt_id}")
async def submit_receipt(receipt_id: int, db: AsyncSession = Depends(get_db)):
    stmt = (
        update(ARReceipt)
        .where(ARReceipt.receipt_id == receipt_id)
        .values(
            is_submitted=True,
            pending_verification=True 
        )
    )
    result = await db.execute(stmt)
    await db.commit()
    return {"status": "success"}

@router.get("/get-by-id")
async def get_by_id(receipt_id: int, db: AsyncSession = Depends(get_db)):
    stmt = select(ARReceipt).where(ARReceipt.receipt_id == receipt_id)
    result = await db.execute(stmt)
    entry = result.scalars().first()
    
    if not entry:
        return {"status": "error", "detail": "Not Found"}
    return {"status": "success", "data": entry}

@router.post("/create")
async def create_receipt(payload: schemas.CreateARCommand, db: AsyncSession = Depends(get_db)):
    try:
        new_records = await crud.create_ar_receipt(db, payload)
        
        if new_records:
            return {"status": "success", "message": f"Created {len(new_records)} entries", "ids": [r.receipt_id for r in new_records]}
        else:
            raise HTTPException(status_code=400, detail="Failed to create receipt")

    except Exception as e:
        print(f"Create Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update/{receipt_id}")
async def update_receipt(receipt_id: int, payload: CreateReceiptRequest, db: AsyncSession = Depends(get_db)):
    try:
        data = payload.header[0]
        
        stmt = select(ARReceipt).where(ARReceipt.receipt_id == receipt_id)
        result = await db.execute(stmt)
        entry = result.scalars().first()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Receipt not found")

        entry.customer_id = data.customer_id
        entry.deposit_bank_id = str(data.deposit_bank_id)

        if data.receipt_date:
            entry.receipt_date = data.receipt_date 

        entry.bank_amount = data.bank_amount
        entry.bank_charges = data.bank_charges
        entry.reference_no = data.reference_no
        entry.sales_person_id = data.sales_person_id
        entry.send_notification = data.send_notification
        entry.status = data.status
        
        if data.status == "Posted":
            entry.is_posted = True
            entry.pending_verification = True
        else:
            entry.is_posted = False
            
        entry.updated_by = str(payload.userId)

        await db.commit()
        return {"status": "success"}

    except Exception as e:
        await db.rollback()
        return {"status": "error", "detail": str(e)}

@router.get("/get-sales-persons")
async def get_sales_persons(db: AsyncSession = Depends(get_db)):
    try:
        query = text(f"""
            SELECT 
                Id as value, 
                CONCAT(FirstName, ' ', IFNULL(LastName, '')) as label 
            FROM {DB_NAME_USER}.users 
            WHERE IsActive = 1 
              AND (
                  Department = '9' 
                  OR Id IN (
                      SELECT DISTINCT SalesPersonId 
                      FROM {DB_NAME_USER}.master_customer 
                      WHERE SalesPersonId IS NOT NULL
                  )
              )
            ORDER BY FirstName ASC
        """)
        
        result = await db.execute(query)
        sales_persons = result.mappings().all()
        
        return {"status": "success", "data": sales_persons}

    except Exception as e:
        print(f"Error fetching sales persons: {e}")
        return {"status": "error", "detail": str(e)}

@router.get("/get-customer-defaults")
async def get_customer_defaults(db: AsyncSession = Depends(get_db)):
    try:
        query = text(f"""
            SELECT Id, SalesPersonId 
            FROM {DB_NAME_USER}.master_customer 
            WHERE IsActive = 1 AND SalesPersonId IS NOT NULL
        """)
        
        result = await db.execute(query)
        rows = result.mappings().all()
        
        defaults = {}
        for row in rows:
            customer_id = int(row['Id'])
            sales_person_id = int(row['SalesPersonId']) if row['SalesPersonId'] else None
            if sales_person_id is not None:
                defaults[customer_id] = sales_person_id
        
        return {"status": "success", "data": defaults}

    except Exception as e:
        print(f"❌ Error fetching customer defaults: {e}")
        return {"status": "error", "detail": str(e)}


# --- NEW ENDPOINT: SYNC CLAIM TO AP ---
@router.post("/sync-claim-to-ap/{claim_id}")
async def sync_claim_to_ap(
    claim_id: int, 
    user_id: int, 
    db: AsyncSession = Depends(get_db)
):
    """
    Calls the stored procedure to sync a validated Claim into the 
    Accounts Payable (AP) table.
    """
    try:
        # 1. Optional: Verify if the claim exists and is posted before syncing
        # This prevents accidental syncing of 'Saved' but 'Not Posted' claims
        check_query = text("SELECT IsSubmitted FROM tbl_claimAndpayment_header WHERE Claim_ID = :cid")
        check_result = await db.execute(check_query, {"cid": claim_id})
        claim = check_result.mappings().first()

        if not claim:
            raise HTTPException(status_code=404, detail="Claim record not found")
        
        if claim['IsSubmitted'] == 0:
            return {
                "status": "warning", 
                "message": "Only 'Posted' claims can be synced to Accounts Payable."
            }

        # 2. Call the Stored Procedure
        # Note: We use db.execute with text() for calling procedures in SQLAlchemy Async
        sync_query = text("CALL proc_sync_ClaimToAP(:cid, :uid)")
        await db.execute(sync_query, {"cid": claim_id, "uid": user_id})
        
        # 3. Commit the transaction
        await db.commit()

        return {
            "status": "success", 
            "message": f"Claim {claim_id} successfully synced to Accounts Payable."
        }

    except Exception as e:
        await db.rollback()
        print(f"❌ Sync Error: {e}")
        return {"status": "error", "detail": str(e)}