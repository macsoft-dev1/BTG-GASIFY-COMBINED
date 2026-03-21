-- MISSED STORED PROCEDURES FOR GROUP 1 & 3

-- BANK BOOK
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Bank_GetOpeningBalance;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Bank_GetOpeningBalance(IN p_bank_id INT)
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
        r.reference_no as VoucherNo,
        CASE 
            WHEN MAX(r.bank_payment_via) = 1 THEN 'Cheque'
            WHEN MAX(r.bank_payment_via) = 4 THEN 'Cash'
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
        MAX(COALESCE(NULLIF(r.bank_amount, 0), r.cash_amount)) as NetAmount,
        MAX(r.bank_payment_via) as bank_payment_via,
        MAX(r.cheque_number) as cheque_number,
        MAX(r.cash_amount) as cash_amount,
        r.receipt_id
    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    LEFT JOIN btggasify_masterpanel_live.master_supplier s ON r.customer_id = s.SupplierId
    LEFT JOIN btggasify_masterpanel_live.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
    LEFT JOIN btggasify_live.master_currency mc ON COALESCE(r.currencyid, b.CurrencyId) = mc.CurrencyId
    WHERE 
        DATE(COALESCE(r.receipt_date, r.created_date)) BETWEEN p_from_date AND p_to_date
        AND r.is_active = 1
        AND IFNULL(r.is_submitted, 0) = 1
        AND CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = p_bank_id
    GROUP BY 
        r.receipt_id,
        r.reference_no,
        COALESCE(r.receipt_date, r.created_date)
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
    SELECT salesinvoicenbr FROM btggasify_userpanel_live.tbl_salesinvoices_header WHERE id = p_do_id;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_CheckDOConverted;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_CheckDOConverted(IN p_do_num VARCHAR(100))
BEGIN
    SELECT h.salesinvoicenbr 
    FROM btggasify_userpanel_live.tbl_salesinvoices_details d
    JOIN btggasify_userpanel_live.tbl_salesinvoices_header h ON d.salesinvoicesheaderid = h.id
    WHERE d.DOnumber = p_do_num COLLATE utf8mb4_general_ci
      AND h.isactive = 1
    LIMIT 1;
END //
DELIMITER ;

DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetDODetailsForConvert;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetDODetailsForConvert(IN p_do_id INT)
BEGIN
    SELECT gascodeid, PickedQty, UnitPrice, Currencyid, ExchangeRate 
    FROM btggasify_userpanel_live.tbl_salesinvoices_details 
    WHERE salesinvoicesheaderid = p_do_id;
END //
DELIMITER ;
