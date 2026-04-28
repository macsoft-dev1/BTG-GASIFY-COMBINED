
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
            print("\n--- Checking tbl_petty_cash ---")
            res = await conn.execute(text(f"""
                SELECT PettyCashId, pc_number, VoucherNo, ExpenseDescription
                FROM tbl_petty_cash
                WHERE pc_number IN ('CLM0003583', 'CLM0003380')
                   OR ExpenseDescription LIKE '%CLM0003583%'
                   OR ExpenseDescription LIKE '%CLM0003380%'
            """))
            for row in res.fetchall():
                print(row)
                
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_ar())
