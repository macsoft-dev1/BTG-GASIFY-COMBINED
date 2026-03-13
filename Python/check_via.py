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
        sql = "SELECT receipt_id, deposit_bank_id, cash_amount, bank_amount FROM btggasify_finance_live.tbl_ar_receipt WHERE cash_amount != 0 ORDER BY receipt_id DESC LIMIT 10;"
        cur.execute(sql)
        records = cur.fetchall()
        for r in records:
            print(r)
        
except Exception as e:
    print("Error:", e)
finally:
    if 'conn' in locals():
        conn.close()
