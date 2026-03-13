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
        print("--- btggasify_masterpanel_live ---")
        cur.execute("SHOW TABLES IN btggasify_masterpanel_live;")
        for table in cur.fetchall():
            print(list(table.values())[0])
            
        print("\n--- DESCRIBE master_expense_category ---")
        cur.execute("DESCRIBE btggasify_masterpanel_live.master_expense_category;")
        for col in cur.fetchall():
            print(col['Field'], "(", col['Type'], ")")

        print("\n--- DESCRIBE master_expense_type ---")
        cur.execute("DESCRIBE btggasify_masterpanel_live.master_expense_type;")
        for col in cur.fetchall():
            print(col['Field'], "(", col['Type'], ")")
            
except Exception as e:
    print("Error:", e)
finally:
    if 'conn' in locals():
        conn.close()
