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

# Distinct prefix for Cash Book to avoid conflict with Bank Book
router = APIRouter(
    prefix="/AR/cash", 
    tags=["Cash Book Entry"]
)

# --- Pydantic Schemas ---
class CashReceiptItem(BaseModel):
    receipt_id: int = 0
    customer_id: int
    cash_amount: float
    receipt_date: Optional[str] = None
    reference_no: Optional[str] = None
    sales_person_id: Optional[int] = None
    send_notification: bool = False
    status: str 
    is_posted: bool = False

class CreateCashReceiptRequest(BaseModel):
    orgId: int
    branchId: int
    userId: int
    userIp: str = "127.0.0.1"
    header: List[CashReceiptItem]

# ==========================================
# 1. LISTING & REPORTING (CASH SPECIFIC)
# ==========================================

@router.get("/get-daily-entries")
async def get_daily_cash_entries(db: AsyncSession = Depends(get_db)):
    """
    Fetches entries for the Cash Book Entry screen.
    Filters by cash_amount != 0 to show only cash transactions.
    """
    try:
        query = text("CALL proc_Cash_GetDailyEntries()")
        result = await db.execute(query)
        data = result.mappings().all()
        return {"status": "success", "data": data}
        
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@router.get("/get-report")
async def get_cash_book_report(
    from_date: str,
    to_date: str,
    bank_id: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Cash Book Report. Uses cash_amount for CashIn/CashOut.
    """
    try:
        sql = "CALL proc_Cash_GetReport(:from_date, :to_date, :bank_id)"
        params = {"from_date": from_date, "to_date": to_date, "bank_id": bank_id if bank_id and bank_id > 0 else 0}

        result = await db.execute(text(sql), params)
        rows = result.mappings().all()
        
        data = []
        running_balance = 0.0 
        
        for row in rows:
            item = dict(row)
            cash_in = float(item["CashIn"] or 0)
            cash_out = float(item["CashOut"] or 0)
            running_balance += (cash_in - cash_out)
            
            item["CashIn"] = cash_in
            item["CashOut"] = cash_out
            item["Balance"] = running_balance
            data.append(item)
            
        return {"status": "success", "data": data}

    except Exception as e:
        print(f"Error fetching cash book report: {e}")
        return {"status": "error", "detail": str(e)}

# ==========================================
# 2. TRANSACTIONAL ENDPOINTS (CREATE/UPDATE)
# ==========================================

@router.post("/create")
async def create_cash_receipt(payload: CreateCashReceiptRequest, db: AsyncSession = Depends(get_db)):
    """
    Creates new cash book entries. Writes to cash_amount column 
    instead of bank_amount to differentiate from bankbook entries.
    """
    try:
        created_records = []
        
        for item in payload.header:
            is_posted = item.is_posted
            pending_verification = True if is_posted else False

            db_receipt = ARReceipt(
                orgid=payload.orgId,
                branchid=payload.branchId,
                created_by=str(payload.userId),
                created_ip=payload.userIp,
                
                receipt_date=item.receipt_date,
                customer_id=item.customer_id,
                
                # KEY DIFFERENCE: Write to cash_amount, leave bank_amount as 0
                cash_amount=item.cash_amount,
                bank_amount=0,
                bank_charges=0,
                deposit_bank_id="0",
                
                # Standard fields
                reference_no=item.reference_no,
                sales_person_id=item.sales_person_id,
                send_notification=item.send_notification,
                
                # Status flags
                is_posted=is_posted,
                pending_verification=pending_verification,
                is_submitted=False,
                
                flag=False,
                is_cleared=False,
                is_active=True,
            )
            db.add(db_receipt)
            created_records.append(db_receipt)

        await db.commit()
        for record in created_records:
            await db.refresh(record)
            
        return {
            "status": "success", 
            "message": f"Created {len(created_records)} cash entries", 
            "ids": [r.receipt_id for r in created_records]
        }
    except Exception as e:
        await db.rollback()
        print(f"Cash Create Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/update/{receipt_id}")
async def update_cash_receipt(receipt_id: int, payload: CreateCashReceiptRequest, db: AsyncSession = Depends(get_db)):
    """
    Updates an existing cash book entry. Writes to cash_amount column.
    """
    try:
        data = payload.header[0]
        stmt = select(ARReceipt).where(ARReceipt.receipt_id == receipt_id)
        result = await db.execute(stmt)
        entry = result.scalars().first()
        
        if not entry:
            raise HTTPException(status_code=404, detail="Entry not found")

        entry.customer_id = data.customer_id
        entry.deposit_bank_id = "0"  # Cash entries have no bank

        if data.receipt_date:
            entry.receipt_date = data.receipt_date 

        # KEY DIFFERENCE: Write to cash_amount
        entry.cash_amount = data.cash_amount
        entry.bank_amount = 0
        entry.bank_charges = 0
        
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

@router.put("/submit/{receipt_id}")
async def submit_cash_receipt(receipt_id: int, db: AsyncSession = Depends(get_db)):
    """
    Called when generating Marketing Verification. Sets is_posted=1 and pending_verification=1.
    """
    stmt = (
        update(ARReceipt)
        .where(ARReceipt.receipt_id == receipt_id)
        .values(is_posted=True, pending_verification=True)
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "success"}

@router.put("/post/{receipt_id}")
async def finalize_cash_receipt(receipt_id: int, db: AsyncSession = Depends(get_db)):
    """
    Called by Finance to finally POST to the Cash Book report. Sets is_submitted=1.
    """
    stmt = (
        update(ARReceipt)
        .where(ARReceipt.receipt_id == receipt_id)
        .values(is_submitted=True, pending_verification=False)
    )
    await db.execute(stmt)
    await db.commit()
    return {"status": "success"}