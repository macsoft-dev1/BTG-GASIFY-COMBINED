
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

async def check_claim_categories():
    url = f"mysql+aiomysql://{DB_USER}:{DB_PASS_QUOTED}@{DB_HOST}:{DB_PORT}/{DB_NAME_FINANCE}"
    engine = create_async_engine(url)
    
    try:
        async with engine.connect() as conn:
            print("\n--- Claim Types ---")
            res = await conn.execute(text("SELECT Id, ClaimType FROM master_claimtype"))
            for row in res.fetchall():
                print(row)
                
            print("\n--- Claim Categories ---")
            res = await conn.execute(text("SELECT Id, claimcategory FROM master_claimcategory"))
            for row in res.fetchall():
                print(row)
                
            print("\n--- Claim Details (Searching for Top-ups) ---")
            res = await conn.execute(text(f"""
                SELECT h.Claim_ID, h.ApplicationNo, h.ClaimCategoryId, mc.claimcategory, h.PPP_PV_Commissioner_approveone, h.PPP_PV_Director_approve, h.SummaryId, d.ClaimTypeId, mct.ClaimType
                FROM tbl_claimAndpayment_header h
                LEFT JOIN master_claimcategory mc ON h.ClaimCategoryId = mc.Id
                LEFT JOIN tbl_claimAndpayment_Details d ON h.Claim_ID = d.Claim_ID
                LEFT JOIN master_claimtype mct ON d.ClaimTypeId = mct.Id
                WHERE d.ClaimTypeId = 8
                LIMIT 20
            """))
            for row in res.fetchall():
                print(row)
                
    finally:
        await engine.dispose()

if __name__ == "__main__":
    asyncio.run(check_claim_categories())
