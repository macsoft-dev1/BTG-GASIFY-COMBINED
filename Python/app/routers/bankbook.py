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
    
    # 🟢 New fields for Cash/Cheque/Via
    cash_amount: float = 0
    bank_payment_via: int = 0
    cheque_number: Optional[str] = None

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
        query = text("CALL proc_Bank_GetDailyEntries()")
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
            opening_sql = text("CALL proc_Bank_GetOpeningBalance(:bank_id)")
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
            overdraft_sql = text("CALL proc_Bank_GetOverdraftLimit(:bank_id)")
            overdraft_result = await db.execute(overdraft_sql, {"bank_id": bank_id})
            overdraft_row = overdraft_result.mappings().first()
            if overdraft_row:
                overdraft_limit = float(overdraft_row["OverdraftLimit"])

        # Attach overdraft to opening balance row if it exists
        if data:
            data[0]["OverdraftLimit"] = overdraft_limit
            data[0]["OverDraft"] = overdraft_limit - running_balance

        # 2. FETCH TRANSACTIONS
        sql = text("CALL proc_Bank_GetReportTransactions(:from_date, :to_date, :bank_id)")

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
                    "NetAmount": float(row["NetAmount"] or 0),
                    "bank_payment_via": row["bank_payment_via"],
                    "cheque_number": row["cheque_number"],
                    "cash_amount": float(row["cash_amount"] or 0),
                    "GroupedClaims": [{
                        "VoucherNo": str(row["VoucherNo"]) if row["VoucherNo"] else "",
                        "Amount": float(row["NetAmount"] or 0),
                        "receipt_id": row["receipt_id"]
                    }]
                }
            else:
                existing = grouped_dict[group_key]
                new_voucher = str(row["VoucherNo"]) if row["VoucherNo"] else ""
                net_amount = float(row["NetAmount"] or 0)
                
                # Check for identical VoucherNo and Amount to prevent duplicates
                is_duplicate = False
                for gc in existing["GroupedClaims"]:
                    if gc["VoucherNo"] == new_voucher and gc["Amount"] == net_amount:
                        is_duplicate = True
                        break
                
                if not is_duplicate:
                    # Group exists and is not duplicate, sum the amounts
                    existing["CreditIn"] += float(row["CreditIn"] or 0)
                    existing["DebitOut"] += float(row["DebitOut"] or 0)
                    existing["NetAmount"] += net_amount
                    
                    # Append Voucher No for the global search string
                    if new_voucher and new_voucher not in existing["VoucherNo"]:
                        existing["VoucherNo"] += f", {new_voucher}"
                        
                    # Append to GroupedClaims array
                    existing["GroupedClaims"].append({
                        "VoucherNo": new_voucher,
                        "Amount": net_amount,
                        "receipt_id": row["receipt_id"]
                    })
        
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
        query = text("CALL proc_Bank_GetSupplierFilter()")
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
    """
    Called when generating Marketing Verification. Sets is_posted=1 and pending_verification=1.
    is_submitted remains 0 until Finance POSTS it.
    """
    stmt = (
        update(ARReceipt)
        .where(ARReceipt.receipt_id == receipt_id)
        .values(
            is_posted=True,
            pending_verification=True 
        )
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "success"}

@router.put("/post/{receipt_id}")
async def finalize_receipt(receipt_id: int, db: AsyncSession = Depends(get_db)):
    """
    Called by Finance to finally POST to the Bank Book report. Sets is_submitted=1.
    """
    stmt = (
        update(ARReceipt)
        .where(ARReceipt.receipt_id == receipt_id)
        .values(is_submitted=True, pending_verification=False)
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "success"}

@router.get("/get-by-id")
async def get_by_id(receipt_id: int, db: AsyncSession = Depends(get_db)):
    sql = text(f"""
        SELECT 
            r.*,
            COALESCE(c.CustomerName, s.SupplierName, '-') as customer_name,
            COALESCE(b.BankName, '-') as bank_name,
            COALESCE(mc.CurrencyCode, 'IDR') as CurrencyCode
        FROM {DB_NAME_FINANCE}.tbl_ar_receipt r
        LEFT JOIN {DB_NAME_USER}.master_customer c ON r.customer_id = c.Id
        LEFT JOIN {DB_NAME_MASTER}.master_supplier s ON r.customer_id = s.SupplierId
        LEFT JOIN {DB_NAME_MASTER}.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
        LEFT JOIN {DB_NAME_USER}.master_currency mc ON COALESCE(r.currencyid, b.CurrencyId) = mc.CurrencyId
        WHERE r.receipt_id = :receipt_id
    """)
    result = await db.execute(sql, {"receipt_id": receipt_id})
    row = result.mappings().first()
    
    if not row:
        return {"status": "error", "detail": "Not Found"}
    return {"status": "success", "data": dict(row)}

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
        
        # 🟢 Persistent new fields
        entry.cash_amount = data.cash_amount
        entry.bank_payment_via = data.bank_payment_via
        entry.cheque_number = data.cheque_number
        
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
        query = text("CALL proc_Bank_GetSalesPersons()")
        
        result = await db.execute(query)
        sales_persons = result.mappings().all()
        
        return {"status": "success", "data": sales_persons}

    except Exception as e:
        print(f"Error fetching sales persons: {e}")
        return {"status": "error", "detail": str(e)}

@router.get("/get-customer-defaults")
async def get_customer_defaults(db: AsyncSession = Depends(get_db)):
    try:
        query = text("CALL proc_Bank_GetCustomerDefaults()")
        
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
        check_query = text("CALL proc_Bank_GetClaimSubmissionStatus(:cid)")
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