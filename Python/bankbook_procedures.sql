-- 1. proc_GetARDailyEntries
DROP PROCEDURE IF EXISTS proc_GetARDailyEntries;
DELIMITER //
CREATE PROCEDURE proc_GetARDailyEntries()
BEGIN
    SELECT 
        r.receipt_id,
        r.receipt_date as date,
        r.customer_id,
        
        CASE 
            WHEN r.bank_amount < 0 AND r.customer_id != 0 THEN COALESCE(s.SupplierName, 'Unknown Supplier')
            WHEN r.customer_id = 0 AND r.reference_no LIKE 'CLM%' THEN SUBSTRING_INDEX(r.reference_no, ' - ', -1)
            WHEN r.bank_amount < 0 AND r.customer_id = 0 THEN 'Bank Charges'
            ELSE COALESCE(c.CustomerName, 'Unknown Customer')
        END as customerName,
        
        CASE WHEN r.bank_amount != 0 THEN r.bank_amount ELSE r.cash_amount END as bank_amount,
        r.bank_charges,
        r.deposit_bank_id,
        r.reference_no,
        r.sales_person_id,
        r.send_notification,
        r.is_posted, 
        r.pending_verification, 
        r.bank_payment_via,
        r.currencyid,

        CASE WHEN r.is_posted = 1 THEN 'P' ELSE 'S' END as status_code,
        
        CASE 
            WHEN r.is_posted = 1 AND r.pending_verification = 1 THEN 'Pending'
            WHEN r.is_posted = 1 AND r.pending_verification = 0 THEN 'Completed'
            ELSE NULL 
        END as verification_status

    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    LEFT JOIN btggasify_masterpanel_live.master_supplier s ON r.customer_id = s.SupplierId
    
    WHERE r.deposit_bank_id IS NOT NULL 
      AND r.deposit_bank_id != '' 
      AND r.deposit_bank_id != '0'
      AND (r.reference_no NOT LIKE 'CLM%' OR r.reference_no IS NULL)
    
    ORDER BY r.receipt_id DESC;
END //
DELIMITER ;

-- 2. proc_GetBankOpeningBalance
DROP PROCEDURE IF EXISTS proc_GetBankOpeningBalance;
DELIMITER //
CREATE PROCEDURE proc_GetBankOpeningBalance(IN p_bank_id INT)
BEGIN
    SELECT 
        as_of_date as Date,
        '-' as VoucherNo,
        'OPENING BALANCE' as TransactionType,
        '-' as Account,
        '-' as Party,
        'Brought Forward' as Description,
        currency as Currency,
        0.00 as CreditIn, 
        opening_balance as DebitOut, 
        opening_balance as NetAmount
    FROM btggasify_finance_live.tbl_bank_opening_balance
    WHERE bank_id = p_bank_id
    LIMIT 1;
END //
DELIMITER ;

-- 3. proc_GetBankOverdraftLimit
DROP PROCEDURE IF EXISTS proc_GetBankOverdraftLimit;
DELIMITER //
CREATE PROCEDURE proc_GetBankOverdraftLimit(IN p_bank_id INT)
BEGIN
    SELECT COALESCE(ODAmount, 0) as OverdraftLimit
    FROM btggasify_finance_live.tbl_overdraft
    WHERE bankid = p_bank_id
      AND IsActive = 1
      AND IsSubmitted = 1
    ORDER BY OverDraftId DESC
    LIMIT 1;
END //
DELIMITER ;

-- 4. proc_GetBankBookTransactions
DROP PROCEDURE IF EXISTS proc_GetBankBookTransactions;
DELIMITER //
CREATE PROCEDURE proc_GetBankBookTransactions(
    IN p_from_date DATE,
    IN p_to_date DATE,
    IN p_bank_id INT
)
BEGIN
    SELECT 
        COALESCE(r.receipt_date, r.created_date) as Date,
        r.reference_no as VoucherNo,
        
        CASE 
            WHEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) < 0 THEN 'Payment' 
            ELSE 'Receipt' 
        END as TransactionType, 
        
        MAX(b.BankName) as Account,
        
        CASE 
            WHEN MAX(r.cash_amount) < 0 AND MAX(r.bank_amount) = 0 THEN 'Petty Cash / Cash Holding'
            WHEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) < 0 AND MAX(r.customer_id) != 0 
                THEN COALESCE(MAX(s.SupplierName), 'Unknown Supplier')
            WHEN MAX(r.customer_id) = 0 AND r.reference_no LIKE 'CLM%' 
                THEN SUBSTRING_INDEX(r.reference_no, ' - ', -1)
            WHEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) < 0 AND MAX(r.customer_id) = 0 
                THEN 'Bank Charges'
            ELSE COALESCE(MAX(c.CustomerName), 'Unknown Customer') 
        END as Party,
        
        r.reference_no as Description,
        COALESCE(MAX(mc.CurrencyCode), 'IDR') as Currency, 
        
        CASE WHEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) >= 0 
             THEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) ELSE 0 END as DebitOut,
        CASE WHEN MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) < 0 
             THEN ABS(MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount))) ELSE 0 END as CreditIn,
        
        MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) as NetAmount
    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    LEFT JOIN btggasify_masterpanel_live.master_supplier s ON r.customer_id = s.SupplierId
    LEFT JOIN btggasify_masterpanel_live.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
    LEFT JOIN btggasify_live.master_currency mc ON COALESCE(r.currencyid, b.CurrencyId) = mc.CurrencyId
    WHERE 
        DATE(COALESCE(r.receipt_date, r.created_date)) BETWEEN p_from_date AND p_to_date
        AND r.is_active = 1
        AND r.is_submitted = 1
        AND CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = p_bank_id
    GROUP BY 
        r.receipt_id,
        r.reference_no,
        COALESCE(r.receipt_date, r.created_date)
    ORDER BY COALESCE(r.receipt_date, r.created_date) ASC, r.receipt_id ASC;
END //
DELIMITER ;

-- 5. proc_GetSupplierFilter
DROP PROCEDURE IF EXISTS proc_GetSupplierFilter;
DELIMITER //
CREATE PROCEDURE proc_GetSupplierFilter()
BEGIN
    SELECT SupplierId, SupplierName 
    FROM btggasify_masterpanel_live.master_supplier 
    WHERE IsActive = 1 
    ORDER BY SupplierName ASC;
END //
DELIMITER ;

-- 6. proc_GetSalesPersons
DROP PROCEDURE IF EXISTS proc_GetSalesPersons;
DELIMITER //
CREATE PROCEDURE proc_GetSalesPersons()
BEGIN
    SELECT 
        Id as value, 
        CONCAT(FirstName, ' ', IFNULL(LastName, '')) as label 
    FROM btggasify_live.users 
    WHERE IsActive = 1 
      AND (
          Department = '9' 
          OR Id IN (
              SELECT DISTINCT SalesPersonId 
              FROM btggasify_live.master_customer 
              WHERE SalesPersonId IS NOT NULL
          )
      )
    ORDER BY FirstName ASC;
END //
DELIMITER ;

-- 7. proc_GetCustomerDefaults
DROP PROCEDURE IF EXISTS proc_GetCustomerDefaults;
DELIMITER //
CREATE PROCEDURE proc_GetCustomerDefaults()
BEGIN
    SELECT Id, SalesPersonId 
    FROM btggasify_live.master_customer 
    WHERE IsActive = 1 AND SalesPersonId IS NOT NULL;
END //
DELIMITER ;
