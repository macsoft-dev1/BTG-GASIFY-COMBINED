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
DB_PASS_QUOTED = urllib.parse.quote_plus(DB_PASS)

async def check_categories():
    # Connect to master panel database
    url = f"mysql+aiomysql://{DB_USER}:{DB_PASS_QUOTED}@{DB_HOST}:{DB_PORT}/btggasify_masterpanel_live"
    engine = create_async_engine(url)
    
    try:
        async with engine.connect() as conn:
            print("\n--- Expense Categories ---")
            res = await conn.execute(text("SELECT id, category_name FROM master_expense_category"))
            for row in res.fetchall():
                print(dict(row._mapping))
                
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_categories())
