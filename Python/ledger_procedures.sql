-- ==========================================================
-- LEDGER BOOK MODULE PROCEDURES
-- ==========================================================

-- 1. Fetch GL Codes
DROP PROCEDURE IF EXISTS proc_GetGLCodes;
DELIMITER //
CREATE PROCEDURE proc_GetGLCodes()
BEGIN
    SELECT * FROM btggasify_finance_live.tbl_GLcodemaster;
END //
DELIMITER ;

-- 2. Fetch SL Codes
DROP PROCEDURE IF EXISTS proc_GetSLCodes;
DELIMITER //
CREATE PROCEDURE proc_GetSLCodes()
BEGIN
    SELECT sl_code_id, sl_code, sl_name, gl_code_id 
    FROM btggasify_finance_live.tbl_sl_codes;
END //
DELIMITER ;

-- 3. Unified Ledger Report (Part 1: Sales Invoices)
DROP PROCEDURE IF EXISTS proc_GetLedgerSalesInvoices;
DELIMITER //
CREATE PROCEDURE proc_GetLedgerSalesInvoices(
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT 
        DATE_FORMAT(h.Salesinvoicesdate, '%Y-%m-%d') AS txn_date,
        h.salesinvoicenbr AS ref_no,
        COALESCE(c.CustomerName, 'Unknown') AS party_name,
        h.TotalAmount AS amount,
        COALESCE(h.CalculatedPrice, h.TotalAmount) AS amount_idr
    FROM btggasify_userpanel_live.tbl_salesinvoices_header h
    LEFT JOIN btggasify_live.master_customer c ON h.customerid = c.Id
    WHERE h.isactive = 1 
      AND h.IsSubmitted = 1
      AND h.Salesinvoicesdate BETWEEN p_from_date AND p_to_date
    ORDER BY h.Salesinvoicesdate ASC;
END //
DELIMITER ;

-- 4. Unified Ledger Report (Part 2: Receipts & Payments)
DROP PROCEDURE IF EXISTS proc_GetLedgerPayments;
DELIMITER //
CREATE PROCEDURE proc_GetLedgerPayments(
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT 
        DATE_FORMAT(r.receipt_date, '%Y-%m-%d') AS txn_date,
        COALESCE(r.reference_no, CONCAT('REC-', r.receipt_id)) AS ref_no,
        COALESCE(c.CustomerName, 'Unknown') AS party_name,
        (IFNULL(r.cash_amount, 0) + IFNULL(r.bank_amount, 0)) AS amount,
        CASE 
            WHEN IFNULL(r.bank_amount, 0) != 0 THEN 'Bank'
            ELSE 'Cash'
        END AS pay_mode
    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    WHERE r.receipt_date BETWEEN p_from_date AND p_to_date
      AND r.is_active = 1
    ORDER BY r.receipt_date ASC;
END //
DELIMITER ;

-- 5. Unified Ledger Report (Part 3: Credit Notes)
DROP PROCEDURE IF EXISTS proc_GetLedgerCreditNotes;
DELIMITER //
CREATE PROCEDURE proc_GetLedgerCreditNotes(
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT 
        DATE_FORMAT(cn.TransactionDate, '%Y-%m-%d') AS txn_date,
        cn.CreditNoteNumber AS ref_no,
        COALESCE(c.CustomerName, 'Unknown') AS party_name,
        cn.Amount AS amount
    FROM btggasify_finance_live.Credit_Notes cn
    LEFT JOIN btggasify_live.master_customer c ON cn.CustomerId = c.Id
    WHERE cn.IsSubmitted = 1
      AND cn.TransactionDate BETWEEN p_from_date AND p_to_date
    ORDER BY cn.TransactionDate ASC;
END //
DELIMITER ;

-- 6. Unified Ledger Report (Part 4: Debit Notes)
DROP PROCEDURE IF EXISTS proc_GetLedgerDebitNotes;
DELIMITER //
CREATE PROCEDURE proc_GetLedgerDebitNotes(
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT 
        DATE_FORMAT(dn.TransactionDate, '%Y-%m-%d') AS txn_date,
        dn.DebitNoteNumber AS ref_no,
        COALESCE(c.CustomerName, 'Unknown') AS party_name,
        dn.Amount AS amount
    FROM btggasify_finance_live.Debit_Notes dn
    LEFT JOIN btggasify_live.master_customer c ON dn.CustomerId = c.Id
    WHERE dn.IsSubmitted = 1
      AND dn.TransactionDate BETWEEN p_from_date AND p_to_date
    ORDER BY dn.TransactionDate ASC;
END //
DELIMITER ;

-- 7. Unified Ledger Report (Part 5: Journal Entries)
DROP PROCEDURE IF EXISTS proc_GetLedgerJournalEntries;
DELIMITER //
CREATE PROCEDURE proc_GetLedgerJournalEntries(
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT 
        DATE_FORMAT(lb.created_at, '%Y-%m-%d') AS txn_date,
        lb.reference_no AS ref_no,
        COALESCE(lb.party, '') AS party_name,
        lb.debit,
        lb.credit,
        lb.narration,
        lb.category AS description
    FROM btggasify_finance_live.tbl_ledgerbook lb
    WHERE lb.created_at BETWEEN p_from_date AND p_to_date
    ORDER BY lb.created_at ASC;
END //
DELIMITER ;
