-- ==========================================================
-- CASH BOOK MODULE PROCEDURES
-- ==========================================================

-- 1. Fetch Daily Cash Entries (Grid View)
DROP PROCEDURE IF EXISTS proc_GetCashDailyEntries;
DELIMITER //
CREATE PROCEDURE proc_GetCashDailyEntries()
BEGIN
    SELECT 
        r.receipt_id,
        COALESCE(r.receipt_date, r.created_date) as date,
        r.customer_id,
        
        CASE 
            WHEN r.cash_amount < 0 AND r.customer_id != 0 THEN COALESCE(s.SupplierName, 'Unknown Supplier')
            WHEN r.customer_id = 0 AND r.reference_no LIKE 'CLM%' THEN SUBSTRING_INDEX(r.reference_no, ' - ', -1)
            ELSE COALESCE(c.CustomerName, 'Unknown Customer')
        END as customerName,
        
        r.cash_amount,
        r.deposit_bank_id,
        r.reference_no,
        r.sales_person_id,
        r.send_notification,
        r.is_posted, 
        r.pending_verification, 
        r.is_submitted,

        CASE WHEN r.is_posted = 1 THEN 'P' ELSE 'S' END as status_code,
        
        CASE 
            WHEN r.is_posted = 1 AND r.pending_verification = 1 THEN 'Pending'
            WHEN r.is_posted = 1 AND r.pending_verification = 0 THEN 'Completed'
            ELSE NULL 
        END as verification_status

    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    LEFT JOIN btggasify_masterpanel_live.master_supplier s ON r.customer_id = s.SupplierId
    
    WHERE r.cash_amount != 0
      AND r.is_active = 1
      AND (r.reference_no NOT LIKE 'CLM%' OR r.reference_no IS NULL)
    
    ORDER BY r.receipt_id DESC;
END //
DELIMITER ;

-- 2. Fetch Cash Book Report
DROP PROCEDURE IF EXISTS proc_GetCashBookReport;
DELIMITER //
CREATE PROCEDURE proc_GetCashBookReport(
    IN p_from_date DATE,
    IN p_to_date DATE,
    IN p_bank_id INT
)
BEGIN
    SELECT 
        r.receipt_id,
        COALESCE(r.receipt_date, r.created_date) as Date,
        r.reference_no as VoucherNo,
        
        CASE 
            WHEN r.cash_amount < 0 THEN 'Receipt' 
            ELSE 'Payment' 
        END as TransactionType, 
        
        CASE 
            WHEN r.cash_amount < 0 AND r.deposit_bank_id != '0' AND r.deposit_bank_id IS NOT NULL 
                THEN COALESCE(b.BankName, 'Bank Withdrawal')
            WHEN r.cash_amount > 0 AND r.customer_id != 0 
                THEN COALESCE(s.SupplierName, 'Unknown Supplier')
            WHEN r.customer_id = 0 AND r.reference_no LIKE 'CLM%' 
                THEN SUBSTRING_INDEX(r.reference_no, ' - ', -1)
            ELSE COALESCE(c.CustomerName, 'Unknown Customer') 
        END as Party,
        
        COALESCE(b.BankName, '-') as BankName,
        r.deposit_bank_id,
        
        r.reference_no as Description,
        COALESCE(mc.CurrencyCode, 'IDR') as Currency, 
        
        CASE WHEN r.cash_amount < 0 THEN ABS(r.cash_amount) ELSE 0 END as CashIn,
        CASE WHEN r.cash_amount > 0 THEN r.cash_amount ELSE 0 END as CashOut,
        
        ABS(r.cash_amount) as NetAmount
        
    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    LEFT JOIN btggasify_masterpanel_live.master_supplier s ON r.customer_id = s.SupplierId
    LEFT JOIN btggasify_live.master_currency mc ON r.currencyid = mc.CurrencyId
    LEFT JOIN btggasify_masterpanel_live.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
    
    WHERE DATE(COALESCE(r.receipt_date, r.created_date)) BETWEEN p_from_date AND p_to_date
      AND r.is_active = 1
      AND r.is_submitted = 1
      AND r.cash_amount != 0
      AND (r.reference_no NOT LIKE 'CLM%' OR r.reference_no IS NULL
           OR (r.deposit_bank_id IS NULL OR r.deposit_bank_id = '' OR r.deposit_bank_id = '0'))
      AND (p_bank_id = 0 OR r.deposit_bank_id = CAST(p_bank_id AS CHAR))
    
    ORDER BY COALESCE(r.receipt_date, r.created_date) ASC, r.receipt_id ASC;
END //
DELIMITER ;
