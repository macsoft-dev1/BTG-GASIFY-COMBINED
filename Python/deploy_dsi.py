import asyncio
from sqlalchemy import text
from app.database import engine

async def deploy():
    sql = """
    CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetDetails(IN p_header_id INT)
    BEGIN
        SELECT 
            d.id AS Id,
            COALESCE(d.gascodeid, 0) AS gascodeid,
            COALESCE(g.GasName, 'Item') AS GasName,
            COALESCE(d.PickedQty, 0) AS PickedQty,
            COALESCE(d.UnitPrice, 0) AS UnitPrice,
            COALESCE(d.TotalPrice, 0) AS TotalPrice,
            COALESCE(d.Currencyid, 1) AS Currencyid,
            COALESCE(d.ExchangeRate, 1) AS ExchangeRate, 
            COALESCE(d.Price, 0) AS Price,
            COALESCE(d.DOnumber, '') AS DOnumber,
            COALESCE(d.PONumber, '') AS PONumber,
            COALESCE(d.uomid, 0) AS uomid,
            COALESCE(d.Note, '') AS Note
        FROM btggasify_userpanel_live.tbl_salesinvoices_details d
        LEFT JOIN btggasify_live.master_gascode g ON d.gascodeid = g.Id
        WHERE d.salesinvoicesheaderid = p_header_id;
    END
    """
    try:
        async with engine.begin() as conn:
            await conn.execute(text("DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetDetails;"))
            await conn.execute(text(sql))
            print("Successfully deployed!)")
    except Exception as e:
        print(f"Error: {e}")

asyncio.run(deploy())
