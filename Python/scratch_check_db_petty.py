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

async def check():
    url = f"mysql+aiomysql://{DB_USER}:{DB_PASS_QUOTED}@{DB_HOST}:{DB_PORT}/{DB_NAME_FINANCE}"
    engine = create_async_engine(url)
    
    try:
        async with engine.connect() as conn:
            print("\n--- Check Triggers on tbl_ar_receipt ---")
            res = await conn.execute(text("SHOW TRIGGERS WHERE `Table` = 'tbl_ar_receipt'"))
            for r in res.fetchall():
                print(r[0])
                print(r[3]) # Statement

            print("\n--- Check PC000417 specifically ---")
            res = await conn.execute(text("SELECT PettyCashId, pc_number, VoucherNo, ExpenseDescription, category_id, IsSubmitted FROM tbl_petty_cash WHERE pc_number = 'PC000417'"))
            for r in res.fetchall():
                print(dict(r._mapping))
                
            print("\n--- Check proc_PC_GetList ---")
            res = await conn.execute(text("SHOW CREATE PROCEDURE proc_PC_GetList"))
            r = res.fetchone()
            if r:
                print(r[2])
                
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check())
