import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def check_collation():
    try:
        conn = pymysql.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=int(os.getenv('DB_PORT')),
            database='btggasify_userpanel_live'
        )
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COLUMN_NAME, COLLATION_NAME 
                FROM information_schema.COLUMNS 
                WHERE TABLE_SCHEMA = 'btggasify_userpanel_live' 
                  AND TABLE_NAME = 'tbl_salesinvoices_header' 
                  AND COLUMN_NAME = 'salesinvoicenbr'
            """)
            result = cur.fetchone()
            print(f"Collation: {result}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_collation()
