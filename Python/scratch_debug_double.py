import asyncio
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from dotenv import load_dotenv
import urllib.parse

load_dotenv()

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASSWORD")
DB_PORT = os.getenv("DB_PORT")
DB_NAME_FINANCE = os.getenv("DB_NAME_FINANCE", "btggasify_finance_live")
DB_PASS_QUOTED = urllib.parse.quote_plus(DB_PASS)

async def check_ar():
    url = f"mysql+aiomysql://{DB_USER}:{DB_PASS_QUOTED}@{DB_HOST}:{DB_PORT}/{DB_NAME_FINANCE}"
    engine = create_async_engine(url)
    
    try:
        async with engine.connect() as conn:
            print("\n--- Check tbl_petty_cash ---")
            res = await conn.execute(text("""
                SELECT PettyCashId, pc_number, VoucherNo, ExpenseDescription, Amount, ExpDate
                FROM tbl_petty_cash
                WHERE ExpenseDescription LIKE '%CLM0003583%' OR pc_number = 'PC000417' OR ExpenseDescription LIKE '%claim and payment%'
            """))
            for r in res.fetchall():
                print(dict(r._mapping))

            print("\n--- Check tbl_ar_receipt ---")
            res = await conn.execute(text("""
                SELECT receipt_id, reference_no, transaction_type, cash_amount, is_active
                FROM tbl_ar_receipt
                WHERE reference_no LIKE '%CLM0003583%'
            """))
            for r in res.fetchall():
                print(dict(r._mapping))

            print("\n--- Check proc_PC_GetList ---")
            res = await conn.execute(text("SHOW CREATE PROCEDURE proc_PC_GetList"))
            r = res.fetchone()
            if r:
                print(r[2]) # The procedure body
                
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_ar())
