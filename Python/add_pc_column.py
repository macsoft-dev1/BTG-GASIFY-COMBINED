import pymysql

try:
    conn = pymysql.connect(
        host='76.13.18.34',
        user='btgsogdbu53r',
        password='FM0ipR$Zrt9eM',
        port=3306,
        cursorclass=pymysql.cursors.DictCursor
    )
    with conn.cursor() as cur:
        # Check if column already exists
        cur.execute("SHOW COLUMNS FROM btggasify_finance_live.tbl_petty_cash LIKE 'ExpenseDescription';")
        if cur.fetchone():
            print("ExpenseDescription already exists.")
        else:
            print("Adding ExpenseDescription column...")
            cur.execute("ALTER TABLE btggasify_finance_live.tbl_petty_cash ADD COLUMN ExpenseDescription VARCHAR(250) NULL AFTER expense_type_id;")
            conn.commit()
            print("Column added successfully.")
            
except Exception as e:
    print("Error:", e)
finally:
    if 'conn' in locals():
        conn.close()
