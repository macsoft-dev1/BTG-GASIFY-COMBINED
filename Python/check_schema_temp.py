import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def check_schema():
    try:
        conn = pymysql.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=int(os.getenv('DB_PORT')),
            database='btggasify_userpanel_live'
        )
        with conn.cursor() as cur:
            cur.execute("DESCRIBE tbl_salesinvoices_header")
            columns = cur.fetchall()
            for col in columns:
                print(col)
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_schema()
