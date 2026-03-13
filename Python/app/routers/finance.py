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

# --- CATEGORY MAPPING FOR COMPARATIVE REPORTS ---
PL_CATEGORIES = [
    {"label": "REVENUE", "id": "REV_HDR", "isHeader": True, "level": 0},
    {"label": "LPG Cylinder Sales", "id": "REV_LPG", "codes": ["4000-001", "4100-001"], "level": 1},
    {"label": "Industrial Gas Sales", "id": "REV_IND", "codes": ["4100-002", "4100-003", "4100-004", "4100-005"], "level": 1},
    {"label": "Gas Refilling Charges", "id": "REV_REF", "codes": ["4110-001"], "level": 1},
    {"label": "Cylinder Rental Income", "id": "REV_RENT", "codes": ["4120-001"], "level": 1},
    {"label": "Transportation Charges", "id": "REV_TRANS", "codes": ["4130-001"], "level": 1},
    {"label": "TOTAL REVENUE", "id": "REV_TOTAL", "isTotal": True, "level": 0},
    
    {"label": "COST OF GOODS SOLD", "id": "COGS_HDR", "isHeader": True, "level": 0},
    {"label": "Gas Purchase Cost", "id": "COGS_PURCH", "codes": ["5900-001", "5900-002", "5900-003"], "level": 1},
    {"label": "Gas Transportation Cost", "id": "COGS_TRANS", "codes": ["5910-001"], "level": 1},
    {"label": "Cylinder Filling Cost", "id": "COGS_FILL", "codes": ["5826-012"], "level": 1},
    {"label": "Cylinder Maintenance", "id": "COGS_MAINT", "codes": ["6120-015"], "level": 1},
    {"label": "TOTAL COGS", "id": "COGS_TOTAL", "isTotal": True, "level": 0},
    
    {"label": "GROSS PROFIT", "id": "GROSS_PROFIT", "isTotal": True, "level": 0},
    
    {"label": "OPERATING EXPENSES", "id": "EXP_HDR", "isHeader": True, "level": 0},
    {"label": "Salaries & Wages", "id": "EXP_SAL", "codes": ["6120-001"], "level": 1},
    {"label": "Employee Benefits (BPJS)", "id": "EXP_BEN", "codes": ["6120-019"], "level": 1},
    {"label": "Office Rent", "id": "EXP_RENT", "codes": ["6120-023"], "level": 1},
    {"label": "Utilities", "id": "EXP_UTIL", "codes": ["6120-007", "6120-008"], "level": 1},
    {"label": "Fuel for Delivery Vehicles", "id": "EXP_FUEL", "codes": ["6110-001"], "level": 1},
    {"label": "Vehicle Maintenance", "id": "EXP_VMAINT", "codes": ["6110-003"], "level": 1},
    {"label": "Marketing Expenses", "id": "EXP_MKT", "codes": ["6120-002", "6120-003"], "level": 1},
    {"label": "Other Expenses", "id": "EXP_OTHER", "codes": ["6110", "6120", "6200"], "level": 1}, # Catch-all
    {"label": "TOTAL OPERATING EXPENSES", "id": "EXP_TOTAL", "isTotal": True, "level": 0},
    
    {"label": "OPERATING PROFIT", "id": "OPER_PROFIT", "isTotal": True, "level": 0},
    
    {"label": "OTHER INCOME / EXPENSES", "id": "OTHER_HDR", "isHeader": True, "level": 0},
    {"label": "Bank Interest Income", "id": "OTH_INT", "codes": ["7000-001"], "level": 1},
    {"label": "Forex Gain / Loss", "id": "OTH_FX", "codes": ["7000-002", "6200-002"], "level": 1},
    {"label": "NET PROFIT", "id": "NET_PROFIT", "isTotal": True, "level": 0}
]

BS_CATEGORIES = [
    {"label": "ASSETS", "id": "ASSETS_HDR", "isHeader": True, "level": 0},
    {"label": "Cash on Hand", "id": "AST_CASH", "codes": ["1110"], "level": 1},
    {"label": "Cash in Bank", "id": "AST_BANK", "codes": ["1120"], "level": 1},
    {"label": "Accounts Receivable", "id": "AST_AR", "codes": ["1130"], "level": 1},
    {"label": "Inventories", "id": "AST_INV", "codes": ["1150", "1160", "1170", "1180"], "level": 1},
    {"label": "Fixed Assets", "id": "AST_FIXED", "codes": ["1500"], "level": 1},
    {"label": "TOTAL ASSETS", "id": "AST_TOTAL", "isTotal": True, "level": 0},
    
    {"label": "LIABILITIES", "id": "LIAB_HDR", "isHeader": True, "level": 0},
    {"label": "Accounts Payable", "id": "LIAB_AP", "codes": ["2110"], "level": 1},
    {"label": "Bank Loans", "id": "LIAB_LOAN", "codes": ["2160"], "level": 1},
    {"label": "Accrued Expenses", "id": "LIAB_ACCR", "codes": ["2130"], "level": 1},
    {"label": "TOTAL LIABILITIES", "id": "LIAB_TOTAL", "isTotal": True, "level": 0},
    
    {"label": "EQUITY", "id": "EQUITY_HDR", "isHeader": True, "level": 0},
    {"label": "Capital", "id": "EQT_CAP", "codes": ["3110"], "level": 1},
    {"label": "Retained Earnings", "id": "EQT_RE", "codes": ["3120"], "level": 1},
    {"label": "TOTAL EQUITY", "id": "EQT_TOTAL", "isTotal": True, "level": 0},
]

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
            (SELECT d.PONumber FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details d 
             WHERE d.salesinvoicesheaderid = ar.invoice_id LIMIT 1) as po_no,
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
            (SELECT d.PONumber FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details d 
             WHERE d.salesinvoicesheaderid = ar.invoice_id LIMIT 1) as po_no,
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
            '' as po_no,
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
            '' as po_no,
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
            '' as po_no,
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
        # Base WHERE clause
        # Entries that are EITHER:
        # 1. Pending Verification (Marketing Stage)
        # 2. Verified but NOT yet Submitted/Posted (Finance Stage)
        where_clause = """
            WHERE r.is_active = 1 
              AND (IFNULL(r.bank_amount, 0) != 0 OR IFNULL(r.cash_amount, 0) != 0)
              AND (
                  r.pending_verification = 1 
                  OR (r.pending_verification = 0 AND r.is_submitted = 0 AND r.is_posted = 1)
              )
        """
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
# POST RECEIPT (Final Finance Stage)
# --------------------------------------------------
@router.put("/post/{receipt_id}")
async def post_receipt(
    receipt_id: int,
    db: AsyncSession = Depends(database.get_db)
):
    try:
        from sqlalchemy import update
        from ..models.finance import ARReceipt

        stmt = (
            update(ARReceipt)
            .where(ARReceipt.receipt_id == receipt_id)
            .values(is_submitted=True, pending_verification=False)
        )
        result = await db.execute(stmt)
        await db.commit()

        if result.rowcount == 0:
            raise HTTPException(status_code=404, detail="Receipt not found")

        return {"status": "success", "message": "Receipt posted to books successfully."}

    except Exception as e:
        await db.rollback()
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
        from sqlalchemy import select

        created_ids = []

        # --- Look up currency IDs for all unique currency codes ---
        unique_codes = set(e.currency_code for e in payload.entries if e.currency_code)
        currency_map = {}  # code -> CurrencyId
        if unique_codes:
            placeholders = ", ".join(f":cc{i}" for i in range(len(unique_codes)))
            cur_params = {f"cc{i}": code for i, code in enumerate(unique_codes)}
            cur_query = text(f"SELECT CurrencyId, CurrencyCode FROM {DB_NAME_OLD}.master_currency WHERE CurrencyCode IN ({placeholders})")
            cur_result = await db.execute(cur_query, cur_params)
            for row in cur_result.mappings().all():
                currency_map[row["CurrencyCode"]] = row["CurrencyId"]

        for entry in payload.entries:
            # 1 = Cash mode. If Cash, it must always route to Cash Book, even if a Bank was selected in the UI.
            is_cash = entry.payment_mode_id == 1
            
            cash_amt = -abs(entry.amount) if is_cash else 0
            bank_amt = 0 if is_cash else -abs(entry.amount)
            ref_no = f"{entry.claim_no} - {entry.supplier_name or entry.applicant_name}".strip(" -")

            # Check for exactly identical existing record to avoid duplication
            check_query = select(ARReceipt).where(
                ARReceipt.reference_no == ref_no,
                ARReceipt.cash_amount == cash_amt,
                ARReceipt.bank_amount == bank_amt
            )
            existing_record = (await db.execute(check_query)).scalars().first()
            
            if existing_record:
                # Skip duplicate insertion
                continue

            # Resolve currency ID from the code sent by frontend
            resolved_currency_id = currency_map.get(entry.currency_code) if entry.currency_code else None

            db_receipt = ARReceipt(
                orgid=payload.org_id,
                branchid=payload.branch_id,
                created_by=str(payload.user_id),
                created_ip="127.0.0.1",

                receipt_date=entry.payment_date,
                customer_id=entry.supplier_id or 0,
                currencyid=resolved_currency_id,

                cash_amount=cash_amt,
                bank_amount=bank_amt,
                bank_charges=0,
                deposit_bank_id=str(entry.bank_id or 0),
                reference_no=ref_no,

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

# --------------------------------------------------
# PROFIT AND LOSS REPORT (OPTION C - DETAILED AGGREGATION)
# --------------------------------------------------
@router.get("/profit-and-loss")
async def get_profit_and_loss(
    from_date: str = None,
    to_date: str = None,
    db: AsyncSession = Depends(database.get_db)
):
    try:
        from app.database import DB_NAME_USER_NEW, DB_NAME_PURCHASE, DB_NAME_MASTER
        if not from_date:
            from_date = f"{date.today().year}-01-01"
        if not to_date:
            to_date = date.today().strftime("%Y-%m-%d")

        report_data = []

        # 1. Consolidated Revenue
        q_revenue = text(f"""
            SELECT SUM(TotalAmount) as total
            FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header
            WHERE Salesinvoicesdate BETWEEN :from_date AND :to_date
              AND IsSubmitted = 1
        """)
        rev_res = await db.execute(q_revenue, {"from_date": from_date, "to_date": to_date})
        total_revenue = float(rev_res.scalar() or 0)
        
        report_data.append({"id": "HDR_REV", "accountCode": "4000", "accountName": "REVENUE", "amount": 0, "isHeader": True, "indentLevel": 0})
        if total_revenue > 0:
            report_data.append({
                "id": "REV_MAIN",
                "accountCode": "4000-000",
                "accountName": "Sales",
                "amount": total_revenue,
                "isHeader": False,
                "indentLevel": 1
            })

        # 2. Consolidated Purchase History / COGS
        q_purchases = text(f"""
            SELECT SUM(po_amount) as total
            FROM {DB_NAME_PURCHASE}.tbl_irnreceipt_detail
            WHERE receiptdate BETWEEN :from_date AND :to_date
              AND isactive = 1
        """)
        pur_res = await db.execute(q_purchases, {"from_date": from_date, "to_date": to_date})
        total_cogs = float(pur_res.scalar() or 0)

        report_data.append({"id": "HDR_PUR", "accountCode": "5000", "accountName": "PURCHASES / COGS", "amount": 0, "isHeader": True, "indentLevel": 0})
        if total_cogs > 0:
            report_data.append({
                "id": "PUR_MAIN",
                "accountCode": "5000-000",
                "accountName": "Purchases / COGS",
                "amount": total_cogs,
                "isHeader": False,
                "indentLevel": 1
            })

        # 3. Detailed Expenses (By Claim Category)
        q_expense = text(f"""
            SELECT c.claimcategory, SUM(h.TotalAmountInIDR) as total
            FROM {DB_NAME_FINANCE}.tbl_claimandpayment_header h
            JOIN {DB_NAME_FINANCE}.master_claimcategory c ON h.ClaimCategoryId = c.Id
            WHERE h.ApplicationDate BETWEEN :from_date AND :to_date
              AND h.claim_director_isapproved = 1
            GROUP BY c.claimcategory
            HAVING total > 0
            ORDER BY total DESC
        """)
        exp_res = await db.execute(q_expense, {"from_date": from_date, "to_date": to_date})
        expense_rows = exp_res.mappings().all()

        total_expense = 0
        report_data.append({"id": "HDR_EXP", "accountCode": "6000", "accountName": "OPERATING EXPENSES", "amount": 0, "isHeader": True, "indentLevel": 0})
        for idx, row in enumerate(expense_rows):
            amt = float(row['total'])
            total_expense += amt
            report_data.append({
                "id": f"EXP_{idx}",
                "accountCode": f"6000-{idx+1:03}",
                "accountName": row['claimcategory'],
                "amount": amt,
                "isHeader": False,
                "indentLevel": 1
            })

        # Summary Row
        report_data.append({
            "id": "NP_TOT",
            "accountCode": "",
            "accountName": "NET PROFIT / LOSS",
            "amount": total_revenue - total_cogs - total_expense,
            "isHeader": False,
            "isTotal": True,
            "indentLevel": 0
        })

        return {"status": True, "message": "Success", "data": report_data}
    except Exception as e:
        print(f"Detailed P&L Error: {e}")
        return {"status": "error", "message": str(e)}

# --------------------------------------------------
# BALANCE SHEET REPORT (OPTION C - DETAILED AGGREGATION)
# --------------------------------------------------
@router.get("/balance-sheet")
async def get_balance_sheet(
    as_of_date: str = None,
    db: AsyncSession = Depends(database.get_db)
):
    try:
        from app.database import DB_NAME_USER_NEW, DB_NAME_PURCHASE, DB_NAME_MASTER
        if not as_of_date:
            as_of_date = date.today().strftime("%Y-%m-%d")

        report_data = []

        # --- ASSETS SECTION ---
        report_data.append({"id": "HDR_ASSETS", "accountCode": "1000", "accountName": "ASSETS", "amount": 0, "isHeader": True, "indentLevel": 0})
        
        # 1. Cash & Bank Breakdown
        q_bank = text(f"""
            SELECT bank_name, SUM(bank_amount) as total
            FROM {DB_NAME_FINANCE}.tbl_ar_receipt
            WHERE receipt_date <= :as_of_date AND is_active = 1
            GROUP BY bank_name
            HAVING total > 0
        """)
        q_cash = text(f"SELECT SUM(cash_amount) FROM {DB_NAME_FINANCE}.tbl_ar_receipt WHERE receipt_date <= :as_of_date AND is_active = 1")
        
        bank_res = await db.execute(q_bank, {"as_of_date": as_of_date})
        cash_res = await db.execute(q_cash, {"as_of_date": as_of_date})
        
        total_cash_bank = 0
        # Add Banks
        for idx, row in enumerate(bank_res.mappings().all()):
            amt = float(row['total'])
            total_cash_bank += amt
            
            b_name = row['bank_name']
            if not b_name or str(b_name).strip().lower() in ['none', 'null', '']:
                display_name = "Bank"
            else:
                display_name = f"Bank - {b_name}"
                
            report_data.append({
                "id": f"BANK_{idx}",
                "accountCode": f"1010-{idx:02}",
                "accountName": display_name,
                "amount": amt,
                "indentLevel": 1
            })
        # Add Cash
        cash_amt = float(cash_res.scalar() or 0)
        total_cash_bank += cash_amt
        if cash_amt != 0:
            report_data.append({
                "id": "CASH_MAIN",
                "accountCode": "1001",
                "accountName": "Cash on Hand",
                "amount": cash_amt,
                "indentLevel": 1
            })

        # 2. Consolidated Accounts Receivable
        q_ar = text(f"""
            SELECT SUM(TotalAmount - PaidAmount) as balance
            FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header
            WHERE Salesinvoicesdate <= :as_of_date AND IsSubmitted = 1
        """)
        ar_res = await db.execute(q_ar, {"as_of_date": as_of_date})
        total_ar = float(ar_res.scalar() or 0)
        
        if total_ar > 0:
            report_data.append({
                "id": "AR_MAIN",
                "accountCode": "1130-000",
                "accountName": "Accounts Receivable",
                "amount": total_ar,
                "indentLevel": 1
            })

        # --- LIABILITIES SECTION ---
        report_data.append({"id": "HDR_LIAB", "accountCode": "2000", "accountName": "LIABILITIES", "amount": 0, "isHeader": True, "indentLevel": 0})
        
        # 3. Consolidated Accounts Payable
        q_ap = text(f"""
            SELECT SUM(balancepaymentamount) as balance
            FROM {DB_NAME_PURCHASE}.tbl_irnreceipt_detail
            WHERE receiptdate <= :as_of_date AND isactive = 1
        """)
        ap_res = await db.execute(q_ap, {"as_of_date": as_of_date})
        total_ap = float(ap_res.scalar() or 0)
        
        if total_ap > 0:
            report_data.append({
                "id": "AP_MAIN",
                "accountCode": "2100-000",
                "accountName": "Accounts Payable",
                "amount": total_ap,
                "indentLevel": 1
            })

        # 4. Accrued Expenses (Unpaid Claims)
        q_unpaid_claims = text(f"""
            SELECT SUM(TotalAmountInIDR) FROM {DB_NAME_FINANCE}.tbl_claimandpayment_header
            WHERE ApplicationDate <= :as_of_date AND claim_director_isapproved = 1 AND IsPaymentgenerated = 0
        """)
        claim_res = await db.execute(q_unpaid_claims, {"as_of_date": as_of_date})
        accrued_exp = float(claim_res.scalar() or 0)
        if accrued_exp != 0:
            report_data.append({
                "id": "ACCRUED_EXP",
                "accountCode": "2110",
                "accountName": "Accrued Expenses (Pending Claims)",
                "amount": accrued_exp,
                "indentLevel": 1
            })

        # --- EQUITY & VALIDATION ---
        report_data.append({
            "id": "BS_VAL",
            "accountCode": "CHECK",
            "accountName": "EQUITY (Net Assets)",
            "amount": (total_cash_bank + total_ar) - (total_ap + accrued_exp),
            "isHeader": False,
            "isTotal": True,
            "indentLevel": 0,
            "isValidation": True,
            "isValid": True
        })

        return {"status": "success", "data": report_data}
    except Exception as e:
        print(f"Detailed Balance Sheet Error: {e}")
        return {"status": "error", "message": str(e)}

# --------------------------------------------------
# NEW COMPARATIVE REPORTS
# --------------------------------------------------

@router.get("/reports/comparative-p-and-l")
async def get_comparative_p_and_l(year: int, db: AsyncSession = Depends(database.get_db)):
    try:
        # 1. Fetch data from Ledger joined with Journal Header for accurate dates
        query = text(f"""
            SELECT 
                gl.GLCode,
                MONTH(jm.journal_date) as month_num,
                SUM(l.debit - l.credit) as balance
            FROM {DB_NAME_FINANCE}.tbl_ledgerbook l
            JOIN {DB_NAME_FINANCE}.tbl_GLcodemaster gl ON l.gl_id = gl.id
            JOIN {DB_NAME_FINANCE}.tbl_journal_master jm ON l.reference_no = jm.journal_no COLLATE utf8mb4_unicode_ci
            WHERE YEAR(jm.journal_date) = :year
            GROUP BY gl.GLCode, MONTH(jm.journal_date)
        """)
        
        res = await db.execute(query, {"year": year})
        db_data = res.mappings().all()
        
        # 2. Pivot the data into a usable format
        pivoted = {}
        for row in db_data:
            code = row['GLCode']
            m = row['month_num']
            val = float(row['balance'])
            if code not in pivoted: pivoted[code] = {i: 0.0 for i in range(1, 13)}
            pivoted[code][m] = val
            
        # 3. Map to Categories
        report_data = []
        for cat in PL_CATEGORIES:
            row = {"id": cat["id"], "accountName": cat["label"], "isHeader": cat.get("isHeader", False), "isTotal": cat.get("isTotal", False), "level": cat["level"]}
            for m in range(1, 13): row[f"month_{m}"] = 0.0
            
            if "codes" in cat:
                for gl_code, months in pivoted.items():
                    if any(gl_code.startswith(prefix) for prefix in cat["codes"]):
                        for m, val in months.items():
                            row[f"month_{m}"] += val
            report_data.append(row)
            
        # 4. Calculate Totals
        def get_row(rid): return next((r for r in report_data if r["id"] == rid), None)
        
        # Total Revenue
        total_rev = get_row("REV_TOTAL")
        for m in range(1, 13):
            total_rev[f"month_{m}"] = sum(r[f"month_{m}"] for r in report_data if r["id"].startswith("REV_") and r["level"] == 1)

        # Total COGS
        total_cogs = get_row("COGS_TOTAL")
        for m in range(1, 13):
            total_cogs[f"month_{m}"] = sum(r[f"month_{m}"] for r in report_data if r["id"].startswith("COGS_") and r["level"] == 1)

        # Gross Profit (Revenue - COGS) - Note: Revenue is usually credit (negative in this SUM logic), so subtract
        # Actually in P&L, we usually take Revenue as Positive for display.
        # My balance is (debit - credit). Revenue (credit) will be negative.
        # So display_val = -balance
        
        for r in report_data:
            if r["id"].startswith("REV_"):
                for m in range(1, 13): r[f"month_{m}"] = -r[f"month_{m}"]
        
        # Now Revenue is positive. COGS (debit) is positive.
        gross_profit = get_row("GROSS_PROFIT")
        for m in range(1, 13):
            gross_profit[f"month_{m}"] = total_rev[f"month_{m}"] - total_cogs[f"month_{m}"]

        # Operating Expenses
        total_exp = get_row("EXP_TOTAL")
        for m in range(1, 13):
            total_exp[f"month_{m}"] = sum(r[f"month_{m}"] for r in report_data if r["id"].startswith("EXP_") and r["level"] == 1)

        # Operating Profit
        oper_profit = get_row("OPER_PROFIT")
        for m in range(1, 13):
            oper_profit[f"month_{m}"] = gross_profit[f"month_{m}"] - total_exp[f"month_{m}"]

        # Net Profit
        net_profit = get_row("NET_PROFIT")
        for m in range(1, 13):
            other_inc = -sum(r[f"month_{m}"] for r in report_data if r["id"].startswith("OTH_") and r["level"] == 1)
            net_profit[f"month_{m}"] = oper_profit[f"month_{m}"] + other_inc

        return {"status": "success", "data": report_data}
    except Exception as e:
        print(f"Error Comparative P&L: {e}")
        return {"status": "error", "message": str(e)}

@router.get("/reports/comparative-balance-sheet")
async def get_comparative_balance_sheet(years: str, db: AsyncSession = Depends(database.get_db)):
    try:
        year_list = sorted([int(y) for y in years.split(",")], reverse=True)
        report_data = []
        for cat in BS_CATEGORIES:
            row = {"id": cat["id"], "accountName": cat["label"], "isHeader": cat.get("isHeader", False), "isTotal": cat.get("isTotal", False), "level": cat["level"]}
            for y in year_list: row[f"year_{y}"] = 0.0
            report_data.append(row)

        for y in year_list:
            query = text(f"""
                SELECT 
                    gl.GLCode,
                    SUM(l.debit - l.credit) as balance
                FROM {DB_NAME_FINANCE}.tbl_ledgerbook l
                    JOIN {DB_NAME_FINANCE}.tbl_GLcodemaster gl ON l.gl_id = gl.id
                JOIN {DB_NAME_FINANCE}.tbl_journal_master jm ON l.reference_no = jm.journal_no COLLATE utf8mb4_unicode_ci
                WHERE YEAR(jm.journal_date) <= :year
                GROUP BY gl.GLCode
            """)
            res = await db.execute(query, {"year": y})
            for db_row in res.mappings().all():
                gl_code = db_row['GLCode']
                balance = float(db_row['balance'])
                for row in report_data:
                    cat = next(c for c in BS_CATEGORIES if c["id"] == row["id"])
                    if "codes" in cat:
                        if any(gl_code.startswith(prefix) for prefix in cat["codes"]):
                            # Assets: Debit is positive (balance)
                            # Liabilities: Credit is positive (-balance)
                            if cat["id"].startswith("AST"):
                                row[f"year_{y}"] += balance
                            else:
                                row[f"year_{y}"] -= balance

        # Calculate Totals
        def get_row_bs(rid): return next((r for r in report_data if r["id"] == rid), None)
        total_assets = get_row_bs("AST_TOTAL")
        total_liab = get_row_bs("LIAB_TOTAL")
        total_equity = get_row_bs("EQT_TOTAL")

        for y in year_list:
            total_assets[f"year_{y}"] = sum(r[f"year_{y}"] for r in report_data if r["id"].startswith("AST_") and r["level"] == 1)
            total_liab[f"year_{y}"] = sum(r[f"year_{y}"] for r in report_data if r["id"].startswith("LIAB_") and r["level"] == 1)
            total_equity[f"year_{y}"] = sum(r[f"year_{y}"] for r in report_data if r["id"].startswith("EQT_") and r["level"] == 1)

        return {"status": "success", "data": report_data}
    except Exception as e:
        print(f"Error Comparative Balance Sheet: {e}")
        return {"status": "error", "message": str(e)}
