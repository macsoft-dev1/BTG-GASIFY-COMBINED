import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def deploy_sql(file_path):
    try:
        conn = pymysql.connect(
            host=os.getenv('DB_HOST'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=int(os.getenv('DB_PORT')),
            client_flag=pymysql.constants.CLIENT.MULTI_STATEMENTS
        )
        with conn.cursor() as cur:
            with open(file_path, 'r') as f:
                sql = f.read()
            
            # Split by DELIMITER if necessary, but pymysql with MULTI_STATEMENTS 
            # might struggle with DELIMITER // syntax directly.
            # Best to strip DELIMITER lines and split by ; where not inside procedure.
            
            # Simplest for this case: Remove DELIMITER lines and let MULTI_STATEMENTS handle it
            cleaned_sql = []
            for line in sql.split('\n'):
                if line.strip().startswith('DELIMITER'):
                    continue
                cleaned_sql.append(line.replace('//', ';')) # Replace procedure end marker with ;
            
            final_sql = '\n'.join(cleaned_sql)
            
            print(f"Deploying {file_path}...")
            cur.execute(final_sql)
            conn.commit()
            print("Successfully deployed stored procedures!")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        deploy_sql(sys.argv[1])
    else:
        deploy_sql('bankbook_procedures.sql')
