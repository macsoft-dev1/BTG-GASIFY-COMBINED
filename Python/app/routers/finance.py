from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from .. import schemas, crud, database
from sqlalchemy import text
import mysql.connector
from pydantic import BaseModel
from typing import Optional, List
from datetime import date
import os
from dotenv import load_dotenv

load_dotenv()

# --- UPDATED DEFAULTS TO LIVE DATABASES ---
DB_NAME_FINANCE = os.getenv('DB_NAME_FINANCE', 'btggasify_finance_live')
DB_NAME_USER = os.getenv('DB_NAME_USER', 'btggasify_live')
DB_NAME_USER_NEW = os.getenv('DB_NAME_USER_NEW', 'btggasify_userpanel_live')
DB_NAME_MASTER = os.getenv('DB_NAME_MASTER', 'btggasify_masterpanel_live')
DB_NAME_OLD = os.getenv('DB_NAME_OLD', 'btggasify_live')

router = APIRouter(
    prefix="/AR",
    tags=["Accounts Receivable"]
)

# --------------------------------------------------
# 1. NEW SCHEMA FOR AR BOOK REQUEST
# --------------------------------------------------
class ARBookRequest(BaseModel):
    org_id: int
    branch_id: int
    customer_id: int 
    from_date: Optional[date] = None
    to_date: Optional[date] = None

# --------------------------------------------------
# 2. DB HELPER (SYNC) FOR REPORTING
# --------------------------------------------------
def get_db_connection_sync():
    return mysql.connector.connect(
        host=os.getenv('DB_HOST'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=DB_NAME_FINANCE,
        ssl_disabled=True 
    )

# --------------------------------------------------
# 3. CALLING STORED PROCEDURE
# --------------------------------------------------
# --------------------------------------------------
# SHARED AR BOOK QUERY BUILDER
# --------------------------------------------------
def build_ar_book_query(org_id, branch_id, customer_id, from_date, to_date):
    params = {"org_id": org_id, "branch_id": branch_id}
    
    # Base Filters
    base_filter = f"ar.is_active = 1 AND ar.orgid = %(org_id)s AND ar.branchid = %(branch_id)s"
    date_filter_ar = ""
    date_filter_r = ""
    date_filter_dn = ""
    date_filter_cn = ""
    
    if customer_id and str(customer_id) != "0":
        base_filter += f" AND ar.customer_id = %(cust_id)s"
        cust_filter_dn = f" AND dn.CustomerId = %(cust_id)s"
        cust_filter_cn = f" AND cn.CustomerId = %(cust_id)s"
        cust_filter_r = f" AND r.customer_id = %(cust_id)s"
        params["cust_id"] = customer_id
    else:
        cust_filter_dn = ""
        cust_filter_cn = ""
        cust_filter_r = ""

    if from_date:
        date_filter_ar += f" AND ar.invoice_date >= %(from_date)s"
        date_filter_r += f" AND r.receipt_date >= %(from_date)s"
        date_filter_dn += f" AND dn.TransactionDate >= %(from_date)s"
        date_filter_cn += f" AND cn.TransactionDate >= %(from_date)s"
        params["from_date"] = from_date

    if to_date:
        date_filter_ar += f" AND ar.invoice_date <= %(to_date)s"
        date_filter_r += f" AND r.receipt_date <= %(to_date)s"
        date_filter_dn += f" AND dn.TransactionDate <= %(to_date)s"
        date_filter_cn += f" AND cn.TransactionDate <= %(to_date)s"
        params["to_date"] = to_date

    # 1. INVOICES
    # Note: 'receipt_no' is NULL for Invoices
    # Updated to include DN/CN amounts for specific Invoice Logic
    # Added TRIM to join keys to ensure match
    q_invoice = f"""
        SELECT 
            ar.ar_id as transaction_id, 
            ar.invoice_amt_idr as invoice_amount_idr, 
            cur.CurrencyCode as currencycode, 
            ar.invoice_date as ledger_date, 
            c.CustomerName as customer_name, 
            ar.ar_no, 
            ar.invoice_no, 
            ar.inv_amount as invoice_amount, 
            NULL as receipt_no, 
            0 as receipt_amount, 
            
            (SELECT COALESCE(SUM(dn.Amount), 0) 
             FROM {DB_NAME_FINANCE}.debit_invoice di 
             JOIN {DB_NAME_FINANCE}.Debit_Notes dn ON di.DebitNoteId = dn.DebitNoteId 
             WHERE TRIM(di.InvoiceNo) = TRIM(ar.invoice_no) AND dn.IsSubmitted = 1) as debit_note_amount,
            
            (SELECT COALESCE(SUM(cn.Amount), 0) 
             FROM {DB_NAME_FINANCE}.credit_invoice ci 
             JOIN {DB_NAME_FINANCE}.Credit_Notes cn ON ci.CreditNoteId = cn.CreditNoteId 
             WHERE TRIM(ci.InvoiceNo) = TRIM(ar.invoice_no) AND cn.IsSubmitted = 1) as credit_note_amount,
            
            (ar.inv_amount - ar.already_received + 
                (SELECT COALESCE(SUM(dn.Amount), 0) FROM {DB_NAME_FINANCE}.debit_invoice di JOIN {DB_NAME_FINANCE}.Debit_Notes dn ON di.DebitNoteId = dn.DebitNoteId WHERE TRIM(di.InvoiceNo) = TRIM(ar.invoice_no) AND dn.IsSubmitted = 1) - 
                (SELECT COALESCE(SUM(cn.Amount), 0) FROM {DB_NAME_FINANCE}.credit_invoice ci JOIN {DB_NAME_FINANCE}.Credit_Notes cn ON ci.CreditNoteId = cn.CreditNoteId WHERE TRIM(ci.InvoiceNo) = TRIM(ar.invoice_no) AND cn.IsSubmitted = 1)
            ) as balance, 
            
            'Invoice' as payment_mode, 
            '-' as remarks,
            0 as receipt_id, 
            0 as deposit_bank_id, 
            ar.invoice_id as real_invoice_id
        FROM {DB_NAME_FINANCE}.tbl_accounts_receivable ar 
        JOIN {DB_NAME_USER_NEW}.master_customer c ON ar.customer_id = c.Id 
        LEFT JOIN {DB_NAME_OLD}.master_currency cur ON ar.currencyid = cur.CurrencyId 
        WHERE {base_filter} {date_filter_ar}
    """

    # 2. RECEIPTS (Allocated)
    # FIX: Select r.reference_no AS receipt_no to show Manual Reference
    q_receipt = f"""
        SELECT 
            r.receipt_id as transaction_id, 
            ar.invoice_amt_idr as invoice_amount_idr, 
            cur.CurrencyCode as currencycode, 
            r.receipt_date as ledger_date, 
            c.CustomerName as customer_name, 
            ar.ar_no, 
            ar.invoice_no, 
            0 as invoice_amount, 
            r.reference_no as receipt_no, 
            ra.payment_amount as receipt_amount, 
            0 as debit_note_amount, 
            0 as credit_note_amount, 
            ar.balance_amount as balance, 
            CASE WHEN(IFNULL(r.bank_amount,0) > 0) THEN 'Bank' ELSE 'Cash' END as payment_mode, 
            '-' as remarks,
            r.receipt_id, 
            IFNULL(r.deposit_bank_id, 0) as deposit_bank_id, 
            ar.invoice_id as real_invoice_id
        FROM {DB_NAME_FINANCE}.tbl_receipt_ag_ar ra 
        JOIN {DB_NAME_FINANCE}.tbl_ar_receipt r ON ra.receipt_id = r.receipt_id 
        JOIN {DB_NAME_FINANCE}.tbl_accounts_receivable ar ON ra.ar_id = ar.ar_id 
        LEFT JOIN {DB_NAME_OLD}.master_currency cur ON ar.currencyid = cur.CurrencyId 
        JOIN {DB_NAME_USER_NEW}.master_customer c ON ar.customer_id = c.Id 
        WHERE {base_filter} {date_filter_r}
    """

    # 3. DEBIT NOTES
    # Filter out DNs that are linked to an invoice (already shown in invoice row)
    q_dn = f"""
        SELECT 
            dn.DebitNoteId as transaction_id, 
            0 as invoice_amount_idr, 
            cur.CurrencyCode as currencycode, 
            dn.TransactionDate as ledger_date, 
            c.CustomerName as customer_name, 
            dn.DebitNoteNumber as ar_no, 
            dn.DebitNoteNumber as invoice_no, 
            0 as invoice_amount, 
            NULL as receipt_no, 
            0 as receipt_amount, 
            dn.Amount as debit_note_amount, 
            0 as credit_note_amount, 
            0 as balance, 
            'Debit Note' as payment_mode, 
            dn.Description as remarks,
            0 as receipt_id, 0 as deposit_bank_id, 
            dn.DebitNoteId as real_invoice_id
        FROM {DB_NAME_FINANCE}.Debit_Notes dn 
        JOIN {DB_NAME_USER_NEW}.master_customer c ON dn.CustomerId = c.Id 
        LEFT JOIN {DB_NAME_OLD}.master_currency cur ON dn.CurrencyId = cur.CurrencyId 
        WHERE 1=1 {cust_filter_dn} {date_filter_dn}
        AND NOT EXISTS (
            SELECT 1 FROM {DB_NAME_FINANCE}.debit_invoice di 
            WHERE di.DebitNoteId = dn.DebitNoteId
        )
    """

    # 4. CREDIT NOTES
    # Filter out CNs that are linked to an invoice (already shown in invoice row)
    q_cn = f"""
        SELECT 
            cn.CreditNoteId as transaction_id, 
            0 as invoice_amount_idr, 
            cur.CurrencyCode as currencycode, 
            cn.TransactionDate as ledger_date, 
            c.CustomerName as customer_name, 
            cn.CreditNoteNumber as ar_no, 
            cn.CreditNoteNumber as invoice_no, 
            0 as invoice_amount, 
            NULL as receipt_no, 
            0 as receipt_amount, 
            0 as debit_note_amount, 
            cn.Amount as credit_note_amount, 
            0 as balance, 
            'Credit Note' as payment_mode, 
            cn.Description as remarks,
            0 as receipt_id, 0 as deposit_bank_id, 
            cn.CreditNoteId as real_invoice_id
        FROM {DB_NAME_FINANCE}.Credit_Notes cn 
        JOIN {DB_NAME_USER_NEW}.master_customer c ON cn.CustomerId = c.Id 
        LEFT JOIN {DB_NAME_OLD}.master_currency cur ON cn.CurrencyId = cur.CurrencyId 
        WHERE 1=1 {cust_filter_cn} {date_filter_cn}
        AND NOT EXISTS (
            SELECT 1 FROM {DB_NAME_FINANCE}.credit_invoice ci 
            WHERE ci.CreditNoteId = cn.CreditNoteId
        )
    """

    # 5. UNALLOCATED RECEIPTS
    q_unalloc = f"""
        SELECT 
            r.receipt_id as transaction_id, 
            0 as invoice_amount_idr, 
            IFNULL(cur.CurrencyCode, 'IDR') as currencycode, 
            r.receipt_date as ledger_date, 
            c.CustomerName as customer_name, 
            IFNULL(r.reference_no, 'Unallocated') as ar_no, 
            IFNULL(r.reference_no, 'Unallocated') as invoice_no, 
            0 as invoice_amount, 
            r.receipt_no as receipt_no, 
            (r.cash_amount + r.bank_amount) as receipt_amount, 
            0 as debit_note_amount, 
            0 as credit_note_amount, 
            -(r.cash_amount + r.bank_amount) as balance, 
            CASE WHEN(IFNULL(r.bank_amount,0) > 0) THEN 'Bank' ELSE 'Cash' END as payment_mode, 
            'Standalone Receipt' as remarks, 
            r.receipt_id, 
            IFNULL(r.deposit_bank_id, 0) as deposit_bank_id, 
            '0' as real_invoice_id
        FROM {DB_NAME_FINANCE}.tbl_ar_receipt r 
        JOIN {DB_NAME_USER_NEW}.master_customer c ON r.customer_id = c.Id 
        LEFT JOIN {DB_NAME_OLD}.master_currency cur ON r.currencyid = cur.CurrencyId 
        WHERE r.is_active = 1 AND r.ar_id IS NULL AND r.orgid = %(org_id)s AND r.branchid = %(branch_id)s
        {cust_filter_r} {date_filter_r}
    """

    full_query = f"{q_invoice} UNION ALL {q_receipt} UNION ALL {q_dn} UNION ALL {q_cn} UNION ALL {q_unalloc} ORDER BY customer_name, ledger_date, ar_no"
    return full_query, params

@router.post("/get_ar_book")
def get_ar_book(request: ARBookRequest):
    conn = None
    cursor = None
    try:
        conn = get_db_connection_sync()
        cursor = conn.cursor(dictionary=True)

        query, params = build_ar_book_query(
            request.org_id, 
            request.branch_id, 
            request.customer_id, 
            request.from_date, 
            request.to_date
        )
        
        cursor.execute(query, params)
        result_rows = cursor.fetchall()

        for row in result_rows:
            if row.get('ledger_date'):
                row['ledger_date'] = str(row['ledger_date'])

        return {
            "status": True, 
            "message": "Success", 
            "data": result_rows
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# --------------------------------------------------
# 4. GET AR BOOK COMPATIBILITY ENDPOINT
# --------------------------------------------------
@router.get("/getARBook")
def get_ar_book_get(
    orgid: int = 1,
    branchid: int = 1,
    customer_id: int = 0,
    from_date: Optional[date] = None,
    to_date: Optional[date] = None
):
    conn = None
    cursor = None
    try:
        conn = get_db_connection_sync()
        cursor = conn.cursor(dictionary=True)

        query, params = build_ar_book_query(
            orgid, 
            branchid, 
            customer_id, 
            from_date, 
            to_date
        )
        
        cursor.execute(query, params)
        result_rows = cursor.fetchall()

        for row in result_rows:
            if row.get('ledger_date'):
                row['ledger_date'] = str(row['ledger_date'])

        return {
            "status": True, 
            "message": "Success", 
            "data": result_rows
        }

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# --------------------------------------------------
# 5. GET CUSTOMER ADDRESS FOR SOA
# --------------------------------------------------
@router.get("/getCustomerAddress")
def get_customer_address(customer_id: int):
    conn = None
    cursor = None
    try:
        conn = get_db_connection_sync()
        cursor = conn.cursor(dictionary=True)
        query = f"""
            SELECT 
                c.Id as customer_id,
                c.CustomerName as customer_name,
                COALESCE(c.Address, '') as address,
                COALESCE(c.City, '') as city,
                COALESCE(c.Country, '') as country
            FROM {DB_NAME_USER_NEW}.master_customer c
            WHERE c.Id = %(customer_id)s AND c.IsActive = 1
        """
        cursor.execute(query, {"customer_id": customer_id})
        row = cursor.fetchone()
        return {"status": True, "data": row or {}}
    except Exception as e:
        print(f"Error fetching customer address: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

# --------------------------------------------------
# CREATE AR RECEIPT
# --------------------------------------------------
@router.post("/create")
async def create_ar_receipt(
    command: schemas.CreateARCommand,
    db: AsyncSession = Depends(database.get_db)
):
    try:
        new_receipts = await crud.create_ar_receipt(db, command)
        return {
            "status": "success",
            "message": "Receipt(s) created successfully",
            "data": new_receipts
        }
    except Exception as e:
        print(f"Error creating AR receipt: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------
# GET ALL PENDING RECEIPTS
# --------------------------------------------------
@router.get("/get-pending-list")
async def get_pending_list(
    user_id: Optional[int] = None, 
    department: Optional[str] = None, 
    db: AsyncSession = Depends(database.get_db)
):
    try:
        # Base WHERE clause (Only fetch Receipts, meaning positive amounts)
        where_clause = "WHERE r.pending_verification = 1 AND r.is_active = 1 AND (IFNULL(r.bank_amount, 0) > 0 OR IFNULL(r.cash_amount, 0) > 0)"
        query_params = {}

        # LOGIC: If Department is '9' (Sales), filter by sales_person_id
        if department == '9' and user_id is not None:
            where_clause += " AND r.sales_person_id = :user_id"
            query_params["user_id"] = user_id

        query = text(f"""
            SELECT 
                r.*, 
                ABS(CASE WHEN r.bank_amount != 0 THEN r.bank_amount ELSE r.cash_amount END) as display_amount,
                CASE 
                    WHEN r.deposit_bank_id IS NULL OR r.deposit_bank_id = '0' OR r.deposit_bank_id = '' THEN 'Cashbook'
                    ELSE 'Bankbook'
                END as payment_type,
                COALESCE(mc.CurrencyCode, 'IDR') as CurrencyCode,
                c.CustomerName
            FROM tbl_ar_receipt r
            LEFT JOIN {DB_NAME_USER_NEW}.master_customer c ON r.customer_id = c.Id
            LEFT JOIN {DB_NAME_MASTER}.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
            LEFT JOIN {DB_NAME_USER}.master_currency mc ON b.CurrencyId = mc.CurrencyId
            {where_clause}
            ORDER BY r.receipt_id DESC
        """)
        
        result = await db.execute(query, query_params)
        results = result.mappings().all()
        
        return {
            "status": "success",
            "count": len(results),
            "data": results
        }
    except Exception as e:
        print(f"Error fetching pending list: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --------------------------------------------------
# VERIFY RECEIPT
# --------------------------------------------------
@router.put("/verify/{receipt_id}")
async def verify_receipt(
    receipt_id: int,
    data: schemas.VerifyCustomerUpdate,
    db: AsyncSession = Depends(database.get_db)
):
    try:
        updated = await crud.update_customer_and_verify(
            db, receipt_id, data
        )

        if not updated:
            raise HTTPException(
                status_code=404,
                detail="Receipt not found OR already verified."
            )

        return {
            "status": "success",
            "message": "Verification posted successfully.",
            "data": updated
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --------------------------------------------------
# SAVE DRAFT
# --------------------------------------------------
@router.put("/save-draft/{receipt_id}")
async def save_draft(
    receipt_id: int,
    data: schemas.SaveDraftRequest,
    db: AsyncSession = Depends(database.get_db)
):
    try:
        saved_record = await crud.save_verification_draft(db, receipt_id, data)
        
        if not saved_record:
            raise HTTPException(status_code=404, detail="Receipt not found")

        return {
            "status": "success",
            "message": "Draft saved successfully",
            "data": saved_record
        }
    except Exception as e:
        print(f"Error saving draft: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --------------------------------------------------
# GET OUTSTANDING INVOICES
# --------------------------------------------------
@router.get("/get-outstanding-invoices/{customer_id}")
async def get_outstanding_invoices(customer_id: int, db: AsyncSession = Depends(database.get_db)):
    try:
        query = text(f"""
            SELECT 
                h.id as invoice_id,
                h.salesinvoicenbr as invoice_no,
                DATE_FORMAT(h.Salesinvoicesdate, '%d-%m-%Y') as invoice_date,
                h.TotalAmount as total_amount,
                (h.TotalAmount - IFNULL(h.PaidAmount, 0)) as balance_due
            FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header h
            WHERE h.customerid = :cust_id
              AND (h.TotalAmount - IFNULL(h.PaidAmount, 0)) > 0
              AND h.IsSubmitted = 1
            ORDER BY h.Salesinvoicesdate ASC
        """)
        
        result = await db.execute(query, {"cust_id": customer_id})
        invoices = result.mappings().all()
        
        return {"status": "success", "data": invoices}

    except Exception as e:
        print(f"Error fetching outstanding invoices: {e}")
        return {"status": "error", "detail": str(e)}

# --------------------------------------------------
# UPDATE REFERENCE ENDPOINTS
# --------------------------------------------------
@router.put("/update-reference")
async def update_reference_endpoint(
    payload: schemas.UpdateReferenceRequest,
    db: AsyncSession = Depends(database.get_db)
):
    success = await crud.update_invoice_reference(db, payload.id, payload.new_reference)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update reference. ID might not exist.")
        
    return {"status": "success", "message": "Reference updated successfully"}


@router.put("/bulk-update-reference")
async def bulk_update_reference(
    payload: schemas.BulkUpdateReferenceRequest,
    db: AsyncSession = Depends(database.get_db)
):
    updated_count = await crud.bulk_update_ar_reference(db, payload.ids, payload.new_reference)
    
    if updated_count == -1:
        raise HTTPException(status_code=500, detail="Database error occurred.")
    
    if updated_count == 0:
        raise HTTPException(status_code=404, detail=f"No records found for IDs: {payload.ids}")
        
    return {
        "status": "success", 
        "message": f"Successfully updated {updated_count} records."
    }

# --------------------------------------------------
# POST INVOICE TO AR
# --------------------------------------------------
@router.post("/post-invoice")
async def post_invoice_endpoint(
    payload: schemas.PostInvoiceToARRequest,
    db: AsyncSession = Depends(database.get_db)
):
    success = await crud.post_invoice_to_ar(db, payload)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to post Invoice to AR Book.")
        
    return {"status": "success", "message": "Invoice posted to AR Book successfully"}


# --------------------------------------------------
# CREATE BOOK ENTRIES FROM CLAIM PAYMENTS
# --------------------------------------------------
class ClaimPaymentEntry(BaseModel):
    claim_id: int
    claim_no: str = ""
    amount: float
    payment_mode_id: int          # 1 = Cash, else Bank Transfer
    bank_id: Optional[int] = None
    payment_date: Optional[str] = None
    supplier_id: Optional[int] = 0
    supplier_name: Optional[str] = ""
    applicant_name: Optional[str] = ""
    currency_code: Optional[str] = "IDR"

class CreateFromClaimRequest(BaseModel):
    entries: List[ClaimPaymentEntry]
    user_id: int = 1
    org_id: int = 1
    branch_id: int = 1

@router.post("/create-from-claim")
async def create_book_entries_from_claim(
    payload: CreateFromClaimRequest,
    db: AsyncSession = Depends(database.get_db)
):
    """
    Called after PPP voucher generation.
    Creates CashBook or BankBook payment entries from approved claims.
    - ModeOfPaymentId == 1  → CashBook (cash_amount, deposit_bank_id='0')
    - ModeOfPaymentId != 1  → BankBook (bank_amount, deposit_bank_id=bank_id)
    Entries are auto-posted (no verification needed for outgoing payments).
    """
    try:
        from ..models.finance import ARReceipt

        created_ids = []

        for entry in payload.entries:
            # 1 = Cash mode. If Cash, it must always route to Cash Book, even if a Bank was selected in the UI.
            is_cash = entry.payment_mode_id == 1

            db_receipt = ARReceipt(
                orgid=payload.org_id,
                branchid=payload.branch_id,
                created_by=str(payload.user_id),
                created_ip="127.0.0.1",

                receipt_date=entry.payment_date,
                customer_id=entry.supplier_id or 0,

                # Cash vs Bank (Payments out are negative)
                cash_amount=-abs(entry.amount) if is_cash else 0,
                bank_amount=0 if is_cash else -abs(entry.amount),
                bank_charges=0,
                deposit_bank_id=str(entry.bank_id or 0),

                # Reference = claim number for traceability
                reference_no=f"{entry.claim_no} - {entry.supplier_name or entry.applicant_name}".strip(" -"),

                # Auto-posted, no verification, fully submitted
                is_posted=True,
                pending_verification=False,
                is_submitted=True,
                send_notification=False,

                flag=False,
                is_cleared=False,
                is_active=True,
            )
            db.add(db_receipt)
            created_ids.append(entry.claim_id)

        await db.commit()

        return {
            "status": "success",
            "message": f"Created {len(created_ids)} book entries from claims",
            "claim_ids": created_ids
        }

    except Exception as e:
        await db.rollback()
        print(f"❌ Create from claim error: {e}")
        raise HTTPException(status_code=500, detail=str(e))