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
        sql = "ALTER TABLE btggasify_finance_live.tbl_ar_receipt MODIFY COLUMN tax_rate DECIMAL(18, 2);"
        print(f"Executing: {sql}")
        cur.execute(sql)
        conn.commit()
        print("Success!")
        
        # Verify
        cur.execute("DESCRIBE btggasify_finance_live.tbl_ar_receipt;")
        cols = cur.fetchall()
        for col in cols:
            if col['Field'] == 'tax_rate':
                print("New Column Definition:", col)
        
except Exception as e:
    print("Error:", e)
finally:
    if 'conn' in locals():
        conn.close()
