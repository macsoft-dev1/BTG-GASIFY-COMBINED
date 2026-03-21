import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def check_collation_extended():
    try:
        conn = pymysql.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=int(os.getenv('DB_PORT')),
            database='btggasify_finance_live'
        )
        with conn.cursor() as cur:
            cur.execute("SELECT @@collation_database, @@collation_server, @@collation_connection")
            result = cur.fetchone()
            print(f"Collations (DB, Server, Connection): {result}")
            
            cur.execute("SHOW CREATE DATABASE btggasify_finance_live")
            db_finance = cur.fetchone()
            print(f"Finance DB Create: {db_finance}")
            
            cur.execute("SHOW CREATE DATABASE btggasify_userpanel_live")
            db_userpanel = cur.fetchone()
            print(f"Userpanel DB Create: {db_userpanel}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    check_collation_extended()
