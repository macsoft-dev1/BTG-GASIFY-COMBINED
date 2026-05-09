-- MISSED STORED PROCEDURES FOR GROUP 1 & 3

-- BANK BOOK
-- BANK BOOK: Corrected to handle 2 parameters (bank_id and from_date)
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Bank_GetOpeningBalance;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Bank_GetOpeningBalance(IN p_bank_id INT, IN p_from_date DATE)
BEGIN
    DECLARE v_first_of_month DATE;
    DECLARE v_opening_val DECIMAL(18,2);
    DECLARE v_currency VARCHAR(10);
    DECLARE v_official_opening_date DATE;
    DECLARE v_official_opening_val DECIMAL(18,2);
    
    SET v_first_of_month = DATE_FORMAT(p_from_date, '%Y-%m-01');
    
    -- Get official opening balance data
    SELECT as_of_date, opening_balance, currency 
    INTO v_official_opening_date, v_official_opening_val, v_currency
    FROM btggasify_finance_live.tbl_bank_opening_balance 
    WHERE bank_id = p_bank_id 
    LIMIT 1;
    
    -- If official opening is precisely the from_date or in the same month, logic varies.
    -- Standard behavior: calculate running balance up to p_from_date.
    
    SELECT 
        COALESCE(v_official_opening_val, 0)
        +
        (SELECT COALESCE(SUM(bank_amount), 0)
         FROM btggasify_finance_live.tbl_ar_receipt
         WHERE CAST(NULLIF(deposit_bank_id, '') AS UNSIGNED) = p_bank_id
           AND is_active = 1
           AND is_posted = 1
           AND IFNULL(bank_amount, 0) != 0
           AND deposit_bank_id != '0'
           AND deposit_bank_id != ''
           AND DATE(COALESCE(receipt_date, created_date)) < p_from_date
           AND (v_official_opening_date IS NULL OR DATE(COALESCE(receipt_date, created_date)) >= v_official_opening_date))
    INTO v_opening_val;
    
    SELECT 
        p_from_date as Date,
        '-' as VoucherNo,
        'OPENING BALANCE' as TransactionType,
        '-' as Account,
        '-' as Party,
        'Brought Forward' as Description,
        COALESCE(v_currency, 'IDR') as Currency,
        0.00 as CreditIn, 
        v_opening_val as DebitOut, 
        v_opening_val as NetAmount;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Bank_GetOverdraftLimit;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Bank_GetOverdraftLimit(IN p_bank_id INT)
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

DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Bank_GetReportTransactions;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Bank_GetReportTransactions(
    IN p_from_date DATE, IN p_to_date DATE, IN p_bank_id INT
)
BEGIN
    SELECT 
        COALESCE(r.receipt_date, r.created_date) as Date,
        CONCAT(r.receipt_id, ' - ', COALESCE(r.reference_no, '')) as VoucherNo,
        CASE 
            WHEN r.transaction_type != 'Receipt' THEN r.transaction_type
            WHEN MAX(r.bank_payment_via) = 1 THEN 'Cheque'
            WHEN MAX(r.bank_payment_via) = 4 THEN 'Cash'
            WHEN MAX(r.bank_amount) < 0 THEN 'Payment' 
            ELSE 'Receipt' 
        END as TransactionType,
        MAX(b.BankName) as Account,
        CASE 
            WHEN LOWER(r.transaction_type) = 'bank interest' THEN 'Bank Interest'
            WHEN LOWER(r.transaction_type) = 'cash deposit' THEN 'Cash Deposit'
            WHEN MAX(r.cash_amount) < 0 AND MAX(r.bank_amount) = 0 THEN 'Petty Cash / Cash Holding'
            WHEN LOWER(r.transaction_type) = 'deposit to bank' THEN 'Cash Book'
            WHEN LOWER(r.transaction_type) = 'bank transfer' AND MAX(r.cash_amount) > 0 THEN 'Cash Book'
            WHEN LOWER(r.transaction_type) = 'bank transfer' THEN COALESCE(MAX(rb.BankName), 'Other Bank')
            WHEN MAX(r.bank_amount) < 0 AND MAX(r.customer_id) != 0 
                THEN COALESCE(MAX(s.SupplierName), 'Unknown Supplier')
            WHEN MAX(r.customer_id) = 0 AND r.reference_no LIKE 'CLM%' 
                THEN SUBSTRING_INDEX(r.reference_no, ' - ', -1)
            WHEN MAX(r.bank_amount) < 0 AND MAX(r.customer_id) = 0 
                THEN 'Bank Charges'
            ELSE COALESCE(MAX(c.CustomerName), 'Unknown Customer') 
        END as Party,
        CASE 
            WHEN LOWER(r.transaction_type) = 'bank transfer' THEN 
                CASE 
                    WHEN rb.BankId IS NOT NULL THEN CONCAT(rb.BankName, ' - ', COALESCE(rb.Description, ''))
                    ELSE 'Unknown Bank'
                END
            WHEN LOWER(r.transaction_type) = 'bank charges' 
                 OR (MAX(r.bank_amount) < 0 AND MAX(r.customer_id) = 0)
                 OR (MAX(r.customer_id) = 0 AND r.reference_no LIKE 'CLM%')
                THEN r.reference_no
            ELSE NULL
        END as PartyDetail,
        CASE 
            WHEN IFNULL(r.is_submitted, 0) = 1 THEN
                COALESCE(NULLIF(r.reference_no, ''), (
                    SELECT GROUP_CONCAT(ar_inner.invoice_no SEPARATOR ', ')
                    FROM btggasify_finance_live.tbl_receipt_ag_ar ra_inner
                    JOIN btggasify_finance_live.tbl_accounts_receivable ar_inner ON ra_inner.ar_id = ar_inner.ar_id
                    WHERE ra_inner.receipt_id = r.receipt_id AND ra_inner.is_active = 1
                ), '')
            ELSE r.reference_no
        END as Description,
        COALESCE(MAX(mc.CurrencyCode), 'IDR') as Currency, 
        -- DEBIT OUT (INCREASE)
        CASE 
            WHEN MAX(r.bank_amount) >= 0 
                THEN MAX(r.bank_amount) 
            ELSE 0 
        END as DebitOut,
        -- CREDIT IN (DECREASE)
        CASE 
            WHEN MAX(r.bank_amount) < 0 
                THEN ABS(MAX(r.bank_amount)) 
            ELSE 0 
        END as CreditIn,
        -- NET AMOUNT
        MAX(r.bank_amount) as NetAmount,
        MAX(r.bank_payment_via) as bank_payment_via,
        MAX(r.cheque_number) as cheque_number,
        MAX(r.cash_amount) as cash_amount,
        CASE WHEN IFNULL(r.is_submitted, 0) = 1 THEN (
            SELECT GROUP_CONCAT(ar_inner.invoice_no SEPARATOR ', ')
            FROM btggasify_finance_live.tbl_receipt_ag_ar ra_inner
            JOIN btggasify_finance_live.tbl_accounts_receivable ar_inner ON ra_inner.ar_id = ar_inner.ar_id
            WHERE ra_inner.receipt_id = r.receipt_id AND ra_inner.is_active = 1
        ) ELSE NULL END as AllocatedInvoices,
        r.receipt_id,
        MAX(r.pending_verification) as pending_verification
    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    LEFT JOIN btggasify_masterpanel_live.master_supplier s ON r.customer_id = s.SupplierId
    LEFT JOIN btggasify_masterpanel_live.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
    LEFT JOIN btggasify_masterpanel_live.master_bank sb ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = sb.BankId 
    LEFT JOIN btggasify_masterpanel_live.master_bank rb ON CAST(NULLIF(r.customer_id, '') AS UNSIGNED) = rb.BankId 
    LEFT JOIN btggasify_live.master_currency mc ON COALESCE(r.currencyid, b.CurrencyId) = mc.CurrencyId
    WHERE 
        DATE(COALESCE(r.receipt_date, r.created_date)) BETWEEN p_from_date AND p_to_date
        AND r.is_active = 1
        AND IFNULL(r.is_posted, 0) = 1
        AND IFNULL(r.bank_amount, 0) != 0
        AND r.deposit_bank_id != '0'
        AND r.deposit_bank_id != ''
        AND CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = p_bank_id 
    GROUP BY 
        r.receipt_id,
        r.reference_no,
        COALESCE(r.receipt_date, r.created_date),
        r.transaction_type,
        r.deposit_bank_id,
        r.customer_id
    ORDER BY COALESCE(r.receipt_date, r.created_date) ASC, r.receipt_id ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Bank_GetSupplierFilter;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Bank_GetSupplierFilter()
BEGIN
    SELECT SupplierId, SupplierName 
    FROM btggasify_masterpanel_live.master_supplier 
    WHERE IsActive = 1 
    ORDER BY SupplierName ASC;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Bank_GetSalesPersons;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Bank_GetSalesPersons()
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

DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Bank_GetCustomerDefaults;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Bank_GetCustomerDefaults()
BEGIN
    SELECT Id, SalesPersonId 
    FROM btggasify_live.master_customer 
    WHERE IsActive = 1 AND SalesPersonId IS NOT NULL;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Bank_GetClaimSubmissionStatus;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Bank_GetClaimSubmissionStatus(IN p_claim_id INT)
BEGIN
    SELECT IsSubmitted FROM btggasify_finance_live.tbl_claimAndpayment_header WHERE Claim_ID = p_claim_id;
END //
DELIMITER ;


-- INVOICE API
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetDONumberString;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetDONumberString(IN p_do_id INT)
BEGIN
    SELECT salesinvoicenbr FROM btggasify_live.tbl_salesinvoices_header WHERE id = p_do_id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_CheckDOConverted;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_CheckDOConverted(IN p_do_num VARCHAR(100))
BEGIN
    SELECT h.salesinvoicenbr 
    FROM btggasify_live.tbl_salesinvoices_details d
    JOIN btggasify_live.tbl_salesinvoices_header h ON d.salesinvoicesheaderid = h.id
    WHERE d.DOnumber = p_do_num COLLATE utf8mb4_general_ci
      AND h.isactive = 1
    LIMIT 1;
END //
DELIMITER ;

-- 24. proc_DSI_GetDODetailsForConvert
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetDODetailsForConvert;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetDODetailsForConvert(IN p_do_id INT)
BEGIN
    SELECT 
        gascodeid, 
        PickedQty, 
        UnitPrice, 
        TotalPrice,
        Price,
        Currencyid, 
        ExchangeRate,
        uomid,
        COALESCE(SellingPrice, 0) AS SellingPrice,
        COALESCE(SellingTotal, 0) AS SellingTotal
    FROM btggasify_live.tbl_salesinvoices_details 
    WHERE salesinvoicesheaderid = p_do_id;
END //
DELIMITER ;
