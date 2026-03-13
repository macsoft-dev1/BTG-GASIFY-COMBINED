from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy import text
from ..database import engine 
import os
from dotenv import load_dotenv

# --- FORCE LOAD ENV VARIABLES ---
load_dotenv()

# Explicitly load names to ensure we don't use stale defaults from imports
DB_NAME_USER = os.getenv('DB_NAME_USER', 'btggasify_live')
DB_NAME_USER_NEW = os.getenv('DB_NAME_USER_NEW', 'btggasify_userpanel_live')
DB_NAME_FINANCE = os.getenv('DB_NAME_FINANCE', 'btggasify_finance_live')
DB_NAME_MASTER = os.getenv('DB_NAME_MASTER', 'btggasify_masterpanel_live')
DB_NAME_OLD = os.getenv('DB_NAME_OLD', 'btggasify_live')

router = APIRouter()

# ==========================================
# 1. RESPONSE & FILTER MODELS
# ==========================================

class InvoiceFilter(BaseModel):
    customerid: int = 0
    FromDate: str
    ToDate: str
    BranchId: int = 1
    IsAR: int = 0 
    ItemId: Optional[int] = 0
    SalesPersonId: Optional[int] = 0

class SalesReportItem(BaseModel):
    DetailId: int
    Salesinvoicesdate: Optional[str] = ""
    CustomerName: Optional[str] = ""
    InvoiceCurrency: Optional[str] = ""
    InvoiceNo: Optional[str] = ""
    DONumber: Optional[str] = "" 
    ItemName: Optional[str] = ""
    Qty: float
    UnitPrice: float
    OriginalTotal: float 
    ConvertedTotal: float 

class DOFilter(BaseModel):
    customerid: int
    gascodeid: Optional[int] = 0

class InvoiceListItem(BaseModel):
    InvoiceId: int
    InvoiceNbr: str
    Salesinvoicesdate: str
    CustomerName: str
    PONumber: Optional[str] = ""
    CurrencyCode: Optional[str] = ""
    TotalAmount: float
    CalculatedPrice: float
    Status: str
    DOnumber: Optional[str] = ""
    uomid: Optional[int] = 0  # Fixed: removed duplicate PONumber field

class InvoiceItemDetail(BaseModel):
    Id: int
    gascodeid: int
    GasName: Optional[str] = ""
    PickedQty: float
    UnitPrice: float
    TotalPrice: float
    Currencyid: int
    ExchangeRate: float
    DOnumber: Optional[str] = ""
    PONumber: Optional[str] = ""
    uomid: Optional[int] = 0
    Note: Optional[str] = ""

class InvoiceFullDetail(BaseModel):
    InvoiceId: int
    InvoiceNbr: str
    Salesinvoicesdate: str
    CustomerName: str
    customerid: int
    TotalAmount: float
    CalculatedPrice: float
    Status: str
    PONumber: Optional[str] = ""
    Items: List[InvoiceItemDetail] = []

class ConvertDORequest(BaseModel):
    customerid: int
    do_ids: List[int]
    created_by: int = 1

# ==========================================
# 2. REQUEST MODELS
# ==========================================

class ManualInvoiceDetail(BaseModel):
    gasCodeId: int 
    pickedQty: float
    UnitPrice: float
    CurrencyId: int
    UomId: Optional[int] = 0
    poNumber: Optional[str] = ""
    doNumber: Optional[str] = ""
    driverName: Optional[str] = ""
    truckName: Optional[str] = ""
    deliveryAddress: Optional[str] = ""
    ExchangeRate: Optional[float] = 1.0
    Note: Optional[str] = ""
    
    class Config:
        extra = "ignore"

class ManualInvoiceHeader(BaseModel):
    id: Optional[int] = 0
    customerId: int
    salesInvoiceDate: str
    salesInvoiceNbr: str 
    userId: int = 1
    orgId: int = 1
    branchId: int = 1
    isSubmitted: int = 0
    ismanual: int = 1
    
    class Config:
        extra = "ignore"

class CreateInvoiceRequest(BaseModel):
    header: ManualInvoiceHeader
    details: List[ManualInvoiceDetail]
    
    class Config:
        extra = "ignore"

class UpdateInvoiceRequest(BaseModel):
    command: str
    header: ManualInvoiceHeader
    details: List[ManualInvoiceDetail]
    doDetail: List[dict] = [] 

# ==========================================
# 3. API ENDPOINTS
# ==========================================

# --- Create Manual Invoice ---
@router.post("/CreateInvoice")
async def create_invoice(payload: CreateInvoiceRequest):
    async with engine.begin() as conn: 
        try:
            # 🟢 [FIX] Disable FK Checks for Cross-DB Reference
            await conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))

            # [FIX 1] Check for Duplicate Invoice Number
            if payload.header.salesInvoiceNbr:
                dup_check = text(f"""
                    SELECT count(*) FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header 
                    WHERE salesinvoicenbr = :nbr AND isactive = 1
                """)
                dup_res = await conn.execute(dup_check, {"nbr": payload.header.salesInvoiceNbr})
                if dup_res.scalar() > 0:
                     raise HTTPException(status_code=400, detail=f"Invoice Number '{payload.header.salesInvoiceNbr}' already exists.")

            # 1. Create Header
            header_query = text(f"""
                INSERT INTO {DB_NAME_USER_NEW}.tbl_salesinvoices_header 
                (salesinvoicenbr, customerid, Salesinvoicesdate, TotalAmount, IsSubmitted, CalculatedPrice, createdby, OrgId, BranchId, IsManual, CreatedDate, isactive)
                VALUES (:nbr, :cust, :date, 0, :submitted, 0, :user, :org, :branch, :manual, NOW(), 1)
            """)
            
            result = await conn.execute(header_query, {
                "nbr": payload.header.salesInvoiceNbr, 
                "cust": payload.header.customerId,
                "date": payload.header.salesInvoiceDate,
                "submitted": payload.header.isSubmitted,
                "user": payload.header.userId,
                "org": payload.header.orgId,
                "branch": payload.header.branchId,
                "manual": payload.header.ismanual
            })
            new_header_id = result.lastrowid

            total_header_amount = 0.0
            total_calculated_price_idr = 0.0

            # 2. Process Details
            for item in payload.details:
                # A. Get Rate
                rate_query = text(f"""
                    SELECT COALESCE(ExchangeRate, 1) 
                    FROM {DB_NAME_USER}.master_currency 
                    WHERE CurrencyId = :cid
                """)
                cid = item.CurrencyId if item.CurrencyId else 1
                rate_result = await conn.execute(rate_query, {"cid": cid})
                exchange_rate = rate_result.scalar() or 1.0

                # [FIX 3] Rounding Calculations to 2 decimal places
                line_total = round(item.pickedQty * item.UnitPrice, 2)
                line_calculated_price = round(line_total * float(exchange_rate), 2)

                total_header_amount += line_total
                total_calculated_price_idr += line_calculated_price

                # C. Insert Detail
                detail_query = text(f"""
                    INSERT INTO {DB_NAME_USER_NEW}.tbl_salesinvoices_details
                    (salesinvoicesheaderid, gascodeid, PickedQty, UnitPrice, TotalPrice, Price, Currencyid, ExchangeRate, uomid, DOnumber, PONumber, DriverName, TruckName, DeliveryAddress, Note)
                    VALUES (:hid, :gas, :qty, :price, :total, :calc_price, :cur, :rate, :uom, :do, :po, :driver, :truck, :addr, :note)
                """)
                await conn.execute(detail_query, {
                    "hid": new_header_id,
                    "gas": item.gasCodeId,
                    "qty": item.pickedQty,
                    "price": item.UnitPrice,
                    "total": line_total,
                    "calc_price": line_calculated_price,
                    "cur": cid,
                    "rate": exchange_rate,
                    "uom": item.UomId,
                    "do": item.doNumber,
                    "po": item.poNumber,
                    "driver": item.driverName,
                    "truck": item.truckName,
                    "addr": item.deliveryAddress,
                    "note": item.Note
                })

            # 3. Update Header Totals
            update_header = text(f"""
                UPDATE {DB_NAME_USER_NEW}.tbl_salesinvoices_header
                SET TotalAmount = :total,
                    CalculatedPrice = :calc_price
                WHERE id = :hid
            """)
            await conn.execute(update_header, {
                "total": total_header_amount,
                "calc_price": total_calculated_price_idr,
                "hid": new_header_id
            })

            await conn.commit() 
            return {"status": "success", "message": "Invoice Created", "data": new_header_id, "InvoiceId": new_header_id}

        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Error creating invoice: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# --- Update Invoice ---
@router.post("/UpdateInvoice")
async def update_invoice(payload: UpdateInvoiceRequest):
    async with engine.begin() as conn:
        try:
            invoice_id = payload.header.id
            if not invoice_id:
                raise HTTPException(status_code=400, detail="Invoice ID required for update")

            # 🟢 [FIX] Disable FK Checks for Cross-DB Reference
            await conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))

            # [FIX 1] Check for Duplicate Invoice Number (Excluding Current ID)
            if payload.header.salesInvoiceNbr:
                dup_check = text(f"""
                    SELECT count(*) FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header 
                    WHERE salesinvoicenbr = :nbr AND id != :hid AND isactive = 1
                """)
                dup_res = await conn.execute(dup_check, {"nbr": payload.header.salesInvoiceNbr, "hid": invoice_id})
                if dup_res.scalar() > 0:
                     raise HTTPException(status_code=400, detail=f"Invoice Number '{payload.header.salesInvoiceNbr}' already exists.")

            # 1. Delete Existing Details
            await conn.execute(text(f"DELETE FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details WHERE salesinvoicesheaderid = :hid"), {"hid": invoice_id})

            total_header_amount = 0.0
            total_calculated_price_idr = 0.0

            # 2. Insert New Details & Recalculate Totals
            for item in payload.details:
                # Get Rate
                rate_query = text(f"SELECT COALESCE(ExchangeRate, 1) FROM {DB_NAME_USER}.master_currency WHERE CurrencyId = :cid")
                cid = item.CurrencyId if item.CurrencyId else 1
                rate_result = await conn.execute(rate_query, {"cid": cid})
                exchange_rate = rate_result.scalar() or 1.0

                # [FIX 3] Rounding Calculations
                line_total = round(float(item.pickedQty) * float(item.UnitPrice), 2)
                line_calculated_price = round(line_total * float(exchange_rate), 2)

                total_header_amount += line_total
                total_calculated_price_idr += line_calculated_price

                # Insert
                detail_query = text(f"""
                    INSERT INTO {DB_NAME_USER_NEW}.tbl_salesinvoices_details
                    (salesinvoicesheaderid, gascodeid, PickedQty, UnitPrice, TotalPrice, Price, Currencyid, ExchangeRate, uomid, DOnumber, PONumber, DriverName, TruckName, DeliveryAddress, Note)
                    VALUES (:hid, :gas, :qty, :price, :total, :calc_price, :cur, :rate, :uom, :do, :po, :driver, :truck, :addr, :note)
                """)
                await conn.execute(detail_query, {
                    "hid": invoice_id,
                    "gas": item.gasCodeId,
                    "qty": item.pickedQty,
                    "price": item.UnitPrice,
                    "total": line_total,
                    "calc_price": line_calculated_price,
                    "cur": cid,
                    "rate": exchange_rate,
                    "uom": item.UomId,
                    "do": item.doNumber,
                    "po": item.poNumber,
                    "driver": item.driverName,
                    "truck": item.truckName,
                    "addr": item.deliveryAddress,
                    "note": item.Note
                })

            # 3. Update Header Totals
            update_header = text(f"""
                UPDATE {DB_NAME_USER_NEW}.tbl_salesinvoices_header
                SET TotalAmount = :total,
                    CalculatedPrice = :calc_price,
                    salesinvoicenbr = :nbr,
                    customerid = :cust,
                    Salesinvoicesdate = :date,
                    IsSubmitted = :submitted,
                    updatedby = :user,
                    LastModifiedDate = NOW()
                WHERE id = :hid
            """)
            
            await conn.execute(update_header, {
                "total": total_header_amount,
                "calc_price": total_calculated_price_idr,
                "nbr": payload.header.salesInvoiceNbr,
                "cust": payload.header.customerId,
                "date": payload.header.salesInvoiceDate,
                "user": payload.header.userId,
                "submitted": payload.header.isSubmitted,
                "hid": invoice_id
            })

            await conn.commit() 
            return {"status": True, "message": "Invoice updated successfully", "data": invoice_id}

        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Error updating invoice: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# --- Get All Invoices ---
@router.post("/GetALLInvoices", response_model=List[InvoiceListItem])
async def get_all_invoices(filter_data: InvoiceFilter):
    try:
        sql = text(f"""
        SELECT 
            h.id AS InvoiceId,
            h.salesinvoicenbr AS InvoiceNbr,
            DATE_FORMAT(h.Salesinvoicesdate, '%Y-%m-%d') AS Salesinvoicesdate,
            COALESCE(c.CustomerName, 'Unknown') AS CustomerName,
            (SELECT d.PONumber FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details d 
             WHERE d.salesinvoicesheaderid = h.id LIMIT 1) AS PONumber, 
            (SELECT mc.CurrencyCode 
             FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details d 
             JOIN {DB_NAME_USER}.master_currency mc ON d.Currencyid = mc.CurrencyId
             WHERE d.salesinvoicesheaderid = h.id LIMIT 1) AS CurrencyCode,
            h.TotalAmount,
            COALESCE(h.CalculatedPrice, h.TotalAmount) AS CalculatedPrice,
            CASE 
                WHEN h.IsSubmitted = 1 THEN 'Posted' 
                ELSE 'Saved' 
            END AS Status,
            (SELECT d.DOnumber FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details d 
             WHERE d.salesinvoicesheaderid = h.id LIMIT 1) AS DOnumber,
            (SELECT d.uomid FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details d 
             WHERE d.salesinvoicesheaderid = h.id LIMIT 1) AS uomid
        FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header h
        LEFT JOIN {DB_NAME_USER}.master_customer c ON h.customerid = c.Id
        WHERE h.Salesinvoicesdate BETWEEN :from_date AND :to_date
          AND (:customer_id = 0 OR h.customerid = :customer_id)
          AND h.isactive = 1 
          AND h.IsSubmitted = :is_ar
        ORDER BY h.id DESC;
        """)

        async with engine.connect() as conn:
            result = await conn.execute(sql, {
                "from_date": filter_data.FromDate,
                "to_date": filter_data.ToDate,
                "customer_id": filter_data.customerid,
                "is_ar": filter_data.IsAR
            })
            
            rows = result.fetchall()
            return [dict(row._mapping) for row in rows]

    except Exception as e:
        print(f"Error fetching invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/GetInvoiceDetails", response_model=InvoiceFullDetail)
async def get_invoice_details(invoiceid: str):
    try:
        async with engine.connect() as conn:
            # 1. Fetch Headers from BOTH Old and New schemas using UNION
            header_query = text(f"""
                SELECT 
                    h.id AS RealHeaderId, 
                    h.salesinvoicenbr AS InvoiceNbr,
                    COALESCE(DATE_FORMAT(h.Salesinvoicesdate, '%Y-%m-%d'), '') AS Salesinvoicesdate,
                    h.customerid,
                    COALESCE(c.CustomerName, 'Unknown') AS CustomerName,
                    COALESCE(h.TotalAmount, 0) AS TotalAmount,
                    COALESCE(h.CalculatedPrice, h.TotalAmount, 0) AS CalculatedPrice,
                    CASE WHEN h.IsSubmitted = 1 THEN 'Posted' ELSE 'Saved' END AS Status
                FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header h
                LEFT JOIN {DB_NAME_USER}.master_customer c ON h.customerid = c.Id
                WHERE (h.salesinvoicenbr = :input_val OR h.id = :input_val)
                  AND h.isactive = 1 
                  
                UNION ALL 
                
                SELECT 
                    h.id AS RealHeaderId, 
                    h.salesinvoicenbr AS InvoiceNbr,
                    COALESCE(DATE_FORMAT(h.Salesinvoicesdate, '%Y-%m-%d'), '') AS Salesinvoicesdate,
                    h.customerid,
                    COALESCE(c.CustomerName, 'Unknown') AS CustomerName,
                    COALESCE(h.TotalAmount, 0) AS TotalAmount,
                    COALESCE(h.CalculatedPrice, h.TotalAmount, 0) AS CalculatedPrice,
                    CASE WHEN h.IsSubmitted = 1 THEN 'Posted' ELSE 'Saved' END AS Status
                FROM {DB_NAME_USER}.tbl_salesinvoices_header h
                LEFT JOIN {DB_NAME_USER}.master_customer c ON h.customerid = c.Id
                WHERE (h.salesinvoicenbr = :input_val OR h.id = :input_val)
                  AND h.isactive = 1 
            """)
            
            result = await conn.execute(header_query, {"input_val": invoiceid})
            headers = result.fetchall()
            
            if not headers:
                raise HTTPException(status_code=404, detail=f"Invoice '{invoiceid}' not found")

            # ... (Rest of the function remains exactly the same)
            primary_header = headers[0]
            
            aggregated_total_amount = 0.0
            aggregated_calc_price = 0.0
            all_header_ids = []

            for h in headers:
                aggregated_total_amount += float(h.TotalAmount)
                aggregated_calc_price += float(h.CalculatedPrice)
                all_header_ids.append(h.RealHeaderId)

            header_dict = dict(primary_header._mapping)
            header_dict["InvoiceId"] = header_dict.pop("RealHeaderId") 
            header_dict["TotalAmount"] = aggregated_total_amount
            header_dict["CalculatedPrice"] = aggregated_calc_price

            if all_header_ids:
                # 2. Fetch Details from BOTH Old and New schemas using UNION
                detail_query = text(f"""
                    SELECT 
                        d.id AS Id,
                        COALESCE(d.gascodeid, 0) AS gascodeid,
                        COALESCE(g.GasName, 'Item') AS GasName,
                        COALESCE(d.PickedQty, 0) AS PickedQty,
                        COALESCE(d.UnitPrice, 0) AS UnitPrice,
                        COALESCE(d.TotalPrice, 0) AS TotalPrice,
                        COALESCE(d.Currencyid, 1) AS Currencyid,
                        COALESCE(d.ExchangeRate, 1) AS ExchangeRate, 
                        COALESCE(d.DOnumber, '') AS DOnumber,
                        COALESCE(d.PONumber, '') AS PONumber,
                        COALESCE(d.uomid, 0) AS uomid,
                        COALESCE(d.Note, '') AS Note
                    FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details d
                    LEFT JOIN {DB_NAME_USER}.master_gascode g ON d.gascodeid = g.Id
                    WHERE d.salesinvoicesheaderid IN :hids
                    
                    UNION ALL 
                    
                    SELECT 
                        d.id AS Id,
                        COALESCE(d.gascodeid, 0) AS gascodeid,
                        COALESCE(g.GasName, 'Item') AS GasName,
                        COALESCE(d.PickedQty, 0) AS PickedQty,
                        COALESCE(d.UnitPrice, 0) AS UnitPrice,
                        COALESCE(d.TotalPrice, 0) AS TotalPrice,
                        COALESCE(d.Currencyid, 1) AS Currencyid,
                        1 AS ExchangeRate, 
                        COALESCE(d.DOnumber, '') AS DOnumber,
                        COALESCE(d.PONumber, '') AS PONumber,
                        0 AS uomid,
                        '' AS Note
                    FROM {DB_NAME_USER}.tbl_salesinvoices_details d
                    LEFT JOIN {DB_NAME_USER}.master_gascode g ON d.gascodeid = g.Id
                    WHERE d.salesinvoicesheaderid IN :hids
                """)
                
                details_result = await conn.execute(detail_query, {"hids": tuple(all_header_ids)})
                details_rows = details_result.fetchall()
            else:
                details_rows = []

            items_list = []
            for row in details_rows:
                row_dict = dict(row._mapping)
                row_dict["PickedQty"] = float(row_dict["PickedQty"])
                row_dict["UnitPrice"] = float(row_dict["UnitPrice"])
                row_dict["TotalPrice"] = float(row_dict["TotalPrice"])
                row_dict["ExchangeRate"] = float(row_dict["ExchangeRate"])
                items_list.append(row_dict)
            
            header_dict["Items"] = items_list
            header_dict["PONumber"] = items_list[0]["PONumber"] if items_list else ""
            return header_dict

    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Error fetching invoice {invoiceid}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# --- Get Available DOs ---
@router.post("/GetAvailableDOs")
async def get_available_dos(filter_data: DOFilter):
    try:
        async with engine.connect() as conn:
            query = text(f"""
                SELECT 
                    h.id as do_id,
                    h.salesinvoicenbr as do_number,
                    DATE_FORMAT(h.Salesinvoicesdate, '%Y-%m-%d') as do_date,
                    h.TotalQty as qty,
                    h.TotalAmount as total,
                    MAX(g.GasName) as GasName
                FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header h
                LEFT JOIN {DB_NAME_USER_NEW}.tbl_salesinvoices_details det ON h.id = det.salesinvoicesheaderid
                LEFT JOIN {DB_NAME_USER}.master_gascode g ON det.gascodeid = g.Id
                WHERE h.customerid = :cust_id
                  AND h.isactive = 1 
                GROUP BY h.id, h.salesinvoicenbr, h.Salesinvoicesdate, h.TotalQty, h.TotalAmount
                ORDER BY h.Salesinvoicesdate ASC
            """)
            
            result = await conn.execute(query, {
                "cust_id": filter_data.customerid
            })
            
            rows = result.fetchall()
            return {"status": True, "data": [dict(row._mapping) for row in rows]}

    except Exception as e:
        print(f"Error fetching DOs: {e}")
        return {"status": False, "message": str(e), "data": []}

# --- Create Invoice From DO ---
@router.post("/CreateInvoiceFromDO")
async def create_invoice_from_do(payload: ConvertDORequest):
    async with engine.begin() as conn:
        try:
            if not payload.do_ids:
                 raise HTTPException(status_code=400, detail="No DOs selected")

            # 🟢 [FIX] Disable FK Checks for Cross-DB Reference
            await conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))

            # 1. [FIX 2] CHECK IF ANY DO IS ALREADY CONVERTED
            # Logic: Look for any active invoice details that reference these DO Numbers
            for do_id in payload.do_ids:
                # Get the DO Number String first
                do_num_q = text(f"SELECT salesinvoicenbr FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header WHERE id = :doid")
                do_res = await conn.execute(do_num_q, {"doid": do_id})
                do_num_str = do_res.scalar()

                if do_num_str:
                    # Check if this string exists in any ACTIVE invoice's details
                    check_do_q = text(f"""
                        SELECT h.salesinvoicenbr 
                        FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details d
                        JOIN {DB_NAME_USER_NEW}.tbl_salesinvoices_header h ON d.salesinvoicesheaderid = h.id
                        WHERE d.DOnumber = :do_num 
                          AND h.isactive = 1
                        LIMIT 1
                    """)
                    check_res = await conn.execute(check_do_q, {"do_num": do_num_str})
                    existing_inv = check_res.scalar()
                    
                    if existing_inv:
                        raise HTTPException(
                            status_code=400, 
                            detail=f"DO '{do_num_str}' is already linked to Invoice '{existing_inv}'. Cannot convert again."
                        )

            # 2. Create Invoice Header
            header_query = text(f"""
                INSERT INTO {DB_NAME_USER_NEW}.tbl_salesinvoices_header 
                (customerid, Salesinvoicesdate, TotalAmount, IsSubmitted, CalculatedPrice, createdby, invoice_type, isactive, CreatedDate)
                VALUES (:cust, CURDATE(), 0, 0, 0, :user, 'DSI', 1, NOW())
            """)
            result = await conn.execute(header_query, {
                "cust": payload.customerid,
                "user": payload.created_by
            })
            new_invoice_id = result.lastrowid

            total_amount = 0.0
            total_calculated_price = 0.0

            # 3. Process selected DOs
            for do_id in payload.do_ids:
                do_header_query = text(f"SELECT salesinvoicenbr FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header WHERE id = :doid")
                do_header_res = await conn.execute(do_header_query, {"doid": do_id})
                do_number_str = do_header_res.scalar() or ""

                do_details_query = text(f"""
                    SELECT gascodeid, PickedQty, UnitPrice, Currencyid, ExchangeRate 
                    FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_details 
                    WHERE salesinvoicesheaderid = :doid
                """)
                do_res = await conn.execute(do_details_query, {"doid": do_id})
                do_rows = do_res.fetchall()
                
                for row in do_rows:
                    rate_val = float(row.ExchangeRate or 1.0)
                    
                    # [FIX 3] Rounding
                    line_total = round(row.PickedQty * row.UnitPrice, 2)
                    line_calc_price = round(line_total * rate_val, 2)
                    
                    total_amount += line_total
                    total_calculated_price += line_calc_price
                    
                    det_query = text(f"""
                        INSERT INTO {DB_NAME_USER_NEW}.tbl_salesinvoices_details
                        (salesinvoicesheaderid, gascodeid, PickedQty, UnitPrice, TotalPrice, Price, Currencyid, ExchangeRate, DOnumber, Note)
                        VALUES (:hid, :gas, :qty, :price, :total, :calc_price, :cur, :rate, :do_str, '')
                    """)
                    await conn.execute(det_query, {
                        "hid": new_invoice_id,
                        "gas": row.gascodeid,
                        "qty": row.PickedQty,
                        "price": row.UnitPrice,
                        "total": line_total,
                        "calc_price": line_calc_price,
                        "cur": row.Currencyid,
                        "rate": rate_val,
                        "do_str": do_number_str
                    })

            # 4. Update Header Totals
            update_header = text(f"""
                UPDATE {DB_NAME_USER_NEW}.tbl_salesinvoices_header
                SET TotalAmount = :total, CalculatedPrice = :calc_total
                WHERE id = :hid
            """)
            await conn.execute(update_header, {
                "total": total_amount, 
                "calc_total": total_calculated_price,
                "hid": new_invoice_id
            })

            await conn.commit() 
            return {"status": True, "message": "Invoice Created Successfully", "InvoiceId": new_invoice_id}

        except HTTPException as he:
            raise he
        except Exception as e:
            print(f"Error converting DO: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# --- Get Gas Items ---
@router.get("/GetGasItems")
async def get_gas_items():
    try:
        async with engine.connect() as conn:
            query = text(f"""
                SELECT Id, GasName 
                FROM {DB_NAME_USER}.master_gascode 
                WHERE IsActive = 1 
                ORDER BY GasName ASC
            """)
            result = await conn.execute(query)
            rows = result.fetchall()
            return {"status": True, "data": [dict(row._mapping) for row in rows]}

    except Exception as e:
        print(f"Error fetching gas items: {e}")
        return {"status": False, "message": str(e), "data": []}

# --- Get Sales Details (Reports) ---
@router.post("/GetSalesDetails", response_model=List[SalesReportItem])
async def get_sales_details(filter_data: InvoiceFilter):
    try:
        sql = text(f"""
        SELECT 
            d.id as DetailId,
            DATE_FORMAT(h.Salesinvoicesdate, '%Y-%m-%d') AS Salesinvoicesdate,
            COALESCE(TRIM(c.CustomerName), 'Unknown') AS CustomerName,
            mc.CurrencyCode as InvoiceCurrency,
            h.salesinvoicenbr as InvoiceNo,
            COALESCE(d.DOnumber, '') AS DONumber,
            COALESCE(g.GasName, 'Item') as ItemName,
            d.PickedQty as Qty,
            d.UnitPrice,
            d.TotalPrice as OriginalTotal, 
            (d.TotalPrice * COALESCE(mc.ExchangeRate, 1)) as ConvertedTotal
        FROM {DB_NAME_USER_NEW}.tbl_salesinvoices_header h
        JOIN {DB_NAME_USER_NEW}.tbl_salesinvoices_details d ON h.id = d.salesinvoicesheaderid
        LEFT JOIN {DB_NAME_USER}.master_customer c ON h.customerid = c.Id
        LEFT JOIN {DB_NAME_USER}.master_gascode g ON d.gascodeid = g.Id
        LEFT JOIN {DB_NAME_USER}.master_currency mc ON d.Currencyid = mc.CurrencyId
        WHERE DATE(h.Salesinvoicesdate) BETWEEN :from_date AND :to_date 
          AND h.isactive = 1 
          AND (:cust_id = 0 OR h.customerid = :cust_id)
          AND (:item_id = 0 OR d.gascodeid = :item_id)
          AND (:sp_id = 0 OR c.SalesPersonId = :sp_id) 
        ORDER BY COALESCE(TRIM(c.CustomerName), 'Unknown') ASC, h.Salesinvoicesdate ASC, h.salesinvoicenbr ASC
        """)

        async with engine.connect() as conn:
            result = await conn.execute(sql, {
                "from_date": filter_data.FromDate,
                "to_date": filter_data.ToDate,
                "cust_id": filter_data.customerid,
                "item_id": filter_data.ItemId,
                "sp_id": filter_data.SalesPersonId 
            })
            rows = result.fetchall()
            return [dict(row._mapping) for row in rows]

    except Exception as e:
        print(f"Error fetching sales details: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/GetItemFilter")
async def get_item_filter():
    try:
        sql = text(f"SELECT Id as value, GasName as label FROM {DB_NAME_USER}.master_gascode WHERE IsActive = 1 ORDER BY GasName")
        async with engine.connect() as conn:
            result = await conn.execute(sql)
            return [dict(row._mapping) for row in result.fetchall()]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))