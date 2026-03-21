-- ============================================================
-- GROUP 2: FINANCIAL REPORTING — STORED PROCEDURES
-- Target DB: btggasify_finance_live (dev/test)
-- Cross-DB refs: btggasify_userpanel_live, btggasify_purchase_live,
--                btggasify_live, btggasify_masterpanel_live
-- ============================================================

-- ============================================================
-- A. PROFIT AND LOSS
-- ============================================================

-- 1. proc_PL_GetRevenue
-- Returns consolidated revenue (SUM of sales invoice totals)
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_PL_GetRevenue;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_PL_GetRevenue(
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT SUM(TotalAmount) as total
    FROM btggasify_userpanel_live.tbl_salesinvoices_header
    WHERE Salesinvoicesdate BETWEEN p_from_date AND p_to_date
      AND IsSubmitted = 1;
END //
DELIMITER ;

-- 2. proc_PL_GetCOGS
-- Returns consolidated purchases / COGS
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_PL_GetCOGS;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_PL_GetCOGS(
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT SUM(po_amount) as total
    FROM btggasify_purchase_live.tbl_irnreceipt_detail
    WHERE receiptdate BETWEEN p_from_date AND p_to_date
      AND isactive = 1;
END //
DELIMITER ;

-- 3. proc_PL_GetExpenses
-- Returns expenses grouped by claim category
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_PL_GetExpenses;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_PL_GetExpenses(
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT c.claimcategory, SUM(h.TotalAmountInIDR) as total
    FROM btggasify_finance_live.tbl_claimAndpayment_header h
    JOIN btggasify_finance_live.master_claimcategory c ON h.ClaimCategoryId = c.Id
    WHERE h.ApplicationDate BETWEEN p_from_date AND p_to_date
      AND h.claim_director_isapproved = 1
    GROUP BY c.claimcategory
    HAVING total > 0
    ORDER BY total DESC;
END //
DELIMITER ;

-- 4. proc_PL_Comparative
-- Massive UNION ALL for comparative P&L by month
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_PL_Comparative;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_PL_Comparative(
    IN p_year INT
)
BEGIN
    SELECT 
        gl_code,
        month_num,
        SUM(debit - credit) as balance
    FROM (
        -- A. Manual Journal Entries (from tbl_ledgerbook)
        SELECT 
            gl.GLCode as gl_code,
            MONTH(jm.journal_date) as month_num,
            l.debit,
            l.credit
        FROM btggasify_finance_live.tbl_ledgerbook l
        JOIN btggasify_finance_live.tbl_GLcodemaster gl ON l.gl_id = gl.id
        JOIN btggasify_finance_live.tbl_journal_master jm ON l.reference_no = jm.journal_no COLLATE utf8mb4_unicode_ci
        WHERE YEAR(jm.journal_date) = p_year

        UNION ALL

        -- B. Sales Invoices (Revenue - Categorized)
        SELECT 
            CASE 
                WHEN gt.TypeName LIKE '%Refill%' THEN '4110-001'
                WHEN gt.TypeName LIKE '%Rental%' THEN '4120-001'
                WHEN gt.TypeName LIKE '%Transport%' THEN '4130-001'
                WHEN gt.TypeName LIKE '%Industrial%' THEN '4100-002'
                ELSE '4000-001'
            END as gl_code,
            MONTH(h.Salesinvoicesdate) as month_num,
            0 as debit,
            d.TotalPrice as credit
        FROM btggasify_userpanel_live.tbl_salesinvoices_header h
        JOIN btggasify_userpanel_live.tbl_salesinvoices_details d ON h.id = d.salesinvoicesheaderid
        LEFT JOIN btggasify_live.master_gascode g ON d.gascodeid = g.Id
        LEFT JOIN btggasify_live.master_gastypes gt ON g.GasTypeId = gt.Id
        WHERE YEAR(h.Salesinvoicesdate) = p_year 
          AND h.isactive = 1 
          AND h.IsSubmitted = 1

        UNION ALL

        -- C. Purchase Invoices (COGS - Purchases)
        SELECT 
            '5900-001' as gl_code,
            MONTH(receiptdate) as month_num,
            po_amount as debit,
            0 as credit
        FROM btggasify_purchase_live.tbl_IRNReceipt_detail
        WHERE YEAR(receiptdate) = p_year AND isactive = 1

        UNION ALL

        -- D. Claims & Payments (Operating Expenses)
        SELECT 
            CASE 
                WHEN mc.claimcategory LIKE '%Salary%' OR mc.claimcategory LIKE '%Upah%' OR mc.claimcategory LIKE '%Gaji%' 
                     OR h.Remarks LIKE '%Salary%' OR h.Remarks LIKE '%Upah%' OR h.Remarks LIKE '%Gaji%' THEN '6120-001'
                WHEN mc.claimcategory LIKE '%BPJS%' OR h.Remarks LIKE '%BPJS%' THEN '6120-019'
                WHEN mc.claimcategory LIKE '%Rent%' OR mc.claimcategory LIKE '%Sewa%' 
                     OR h.Remarks LIKE '%Rent%' OR h.Remarks LIKE '%Sewa%' THEN '6120-023'
                WHEN mc.claimcategory LIKE '%Fuel%' OR mc.claimcategory LIKE '%BBM%' OR mc.claimcategory LIKE '%Petrol%'
                     OR h.Remarks LIKE '%Fuel%' OR h.Remarks LIKE '%BBM%' OR h.Remarks LIKE '%Petrol%' THEN '6110-001'
                WHEN mc.claimcategory LIKE '%Maintenance%' OR mc.claimcategory LIKE '%Service%' OR mc.claimcategory LIKE '%Perbaikan%'
                     OR h.Remarks LIKE '%Maintenance%' OR h.Remarks LIKE '%Service%' OR h.Remarks LIKE '%Perbaikan%' THEN '6110-003'
                WHEN mc.claimcategory LIKE '%Marketing%' OR h.Remarks LIKE '%Marketing%' THEN '6120-002'
                WHEN mc.claimcategory LIKE '%Cylinder%' OR h.Remarks LIKE '%Cylinder%' THEN '6120-015'
                ELSE '6120-099' 
            END as gl_code,
            MONTH(h.ApplicationDate) as month_num,
            h.TotalAmountInIDR as debit,
            0 as credit
        FROM btggasify_finance_live.tbl_claimAndpayment_header h
        JOIN btggasify_finance_live.master_claimcategory mc ON h.ClaimCategoryId = mc.Id
        WHERE YEAR(h.ApplicationDate) = p_year 
          AND h.claim_director_isapproved = 1

        UNION ALL

        -- E. Bank Receipts & Payments (Charges, Misc Income)
        SELECT 
            CASE 
                WHEN (bank_amount + cash_amount) < 0 AND customer_id = 0 THEN '6120-099'
                WHEN (bank_amount + cash_amount) > 0 AND customer_id = 0 THEN '7000-001'
                ELSE '6120-099'
            END as gl_code,
            MONTH(COALESCE(receipt_date, created_date)) as month_num,
            CASE WHEN (bank_amount + cash_amount) < 0 THEN ABS(bank_amount + cash_amount) ELSE 0 END as debit,
            CASE WHEN (bank_amount + cash_amount) > 0 THEN ABS(bank_amount + cash_amount) ELSE 0 END as credit
        FROM btggasify_finance_live.tbl_ar_receipt
        WHERE YEAR(COALESCE(receipt_date, created_date)) = p_year 
          AND is_active = 1
          AND (customer_id = 0 OR (bank_amount + cash_amount) < 0)
          AND (reference_no NOT LIKE 'CLM%' OR reference_no IS NULL)
          AND (reference_no NOT LIKE 'SPC-%' OR reference_no IS NULL)
    ) combined
    GROUP BY gl_code, month_num;
END //
DELIMITER ;


-- ============================================================
-- B. BALANCE SHEET
-- ============================================================

-- 5. proc_BS_GetBankBalances
-- Bank amounts grouped by bank_name
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_BS_GetBankBalances;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_BS_GetBankBalances(
    IN p_as_of_date DATE
)
BEGIN
    SELECT bank_name, SUM(bank_amount) as total
    FROM btggasify_finance_live.tbl_ar_receipt
    WHERE receipt_date <= p_as_of_date AND is_active = 1
    GROUP BY bank_name
    HAVING total > 0;
END //
DELIMITER ;

-- 6. proc_BS_GetCashBalance
-- Cash total
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_BS_GetCashBalance;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_BS_GetCashBalance(
    IN p_as_of_date DATE
)
BEGIN
    SELECT SUM(cash_amount) as total
    FROM btggasify_finance_live.tbl_ar_receipt 
    WHERE receipt_date <= p_as_of_date AND is_active = 1;
END //
DELIMITER ;

-- 7. proc_BS_GetARBalance
-- AR balance from sales headers
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_BS_GetARBalance;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_BS_GetARBalance(
    IN p_as_of_date DATE
)
BEGIN
    SELECT SUM(TotalAmount - PaidAmount) as balance
    FROM btggasify_userpanel_live.tbl_salesinvoices_header
    WHERE Salesinvoicesdate <= p_as_of_date AND IsSubmitted = 1;
END //
DELIMITER ;

-- 8. proc_BS_GetAPBalance
-- AP balance from IRN receipts
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_BS_GetAPBalance;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_BS_GetAPBalance(
    IN p_as_of_date DATE
)
BEGIN
    SELECT SUM(balancepaymentamount) as balance
    FROM btggasify_purchase_live.tbl_irnreceipt_detail
    WHERE receiptdate <= p_as_of_date AND isactive = 1;
END //
DELIMITER ;

-- 9. proc_BS_GetAccruedExpenses
-- Unpaid claims (accrued expenses)
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_BS_GetAccruedExpenses;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_BS_GetAccruedExpenses(
    IN p_as_of_date DATE
)
BEGIN
    SELECT SUM(TotalAmountInIDR) as total
    FROM btggasify_finance_live.tbl_claimAndpayment_header
    WHERE ApplicationDate <= p_as_of_date 
      AND claim_director_isapproved = 1 
      AND IsPaymentgenerated = 0;
END //
DELIMITER ;

-- 10. proc_BS_Comparative
-- Massive UNION ALL for comparative balance sheet by year
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_BS_Comparative;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_BS_Comparative(
    IN p_year INT
)
BEGIN
    SELECT 
        gl_code,
        SUM(debit - credit) as balance
    FROM (
        -- A. Manual Journal Entries
        SELECT 
            CASE 
                WHEN gl.GLCode LIKE '4%' OR gl.GLCode LIKE '5%' OR gl.GLCode LIKE '6%' OR gl.GLCode LIKE '7%' THEN '3120'
                ELSE gl.GLCode 
            END as gl_code,
            l.debit,
            l.credit
        FROM btggasify_finance_live.tbl_ledgerbook l
        JOIN btggasify_finance_live.tbl_GLcodemaster gl ON l.gl_id = gl.id
        JOIN btggasify_finance_live.tbl_journal_master jm ON l.reference_no = jm.journal_no COLLATE utf8mb4_unicode_ci
        WHERE YEAR(jm.journal_date) <= p_year

        UNION ALL

        -- B. Cash & Bank
        SELECT 
            '1120' as gl_code,
            SUM(IFNULL(r.bank_amount, 0) + IFNULL(r.cash_amount, 0)) as debit,
            0 as credit
        FROM btggasify_finance_live.tbl_ar_receipt r
        WHERE YEAR(COALESCE(r.receipt_date, r.created_date)) <= p_year 
          AND r.is_active = 1 
          AND (r.is_submitted = 1 OR r.is_posted = 1)
        GROUP BY gl_code

        UNION ALL

        -- C. Accounts Receivable (Invoices)
        SELECT 
            '1130' as gl_code,
            inv_amount as debit,
            0 as credit
        FROM btggasify_finance_live.tbl_accounts_receivable
        WHERE YEAR(invoice_date) <= p_year AND is_active = 1

        UNION ALL

        -- D. Accounts Receivable (Receipts)
        SELECT 
            '1130' as gl_code,
            0 as debit,
            payment_amount as credit
        FROM btggasify_finance_live.tbl_receipt_ag_ar ra
        JOIN btggasify_finance_live.tbl_ar_receipt r ON ra.receipt_id = r.receipt_id
        WHERE YEAR(COALESCE(r.receipt_date, r.created_date)) <= p_year 
          AND ra.is_active = 1

        UNION ALL

        -- E. Accounts Payable (IRNs)
        SELECT 
            '2110' as gl_code,
            0 as debit,
            IFNULL(po_amount, 0) as credit
        FROM btggasify_purchase_live.tbl_IRNReceipt_detail
        WHERE YEAR(receiptdate) <= p_year AND isactive = 1

        UNION ALL

        -- F. Accounts Payable (Payments)
        SELECT 
            '2110' as gl_code,
            ABS(IFNULL(r.bank_amount, 0) + IFNULL(r.cash_amount, 0)) as debit,
            0 as credit
        FROM btggasify_finance_live.tbl_ar_receipt r
        WHERE YEAR(COALESCE(r.receipt_date, r.created_date)) <= p_year 
          AND r.is_active = 1 
          AND (IFNULL(r.bank_amount, 0) + IFNULL(r.cash_amount, 0)) < 0
          AND (r.reference_no NOT LIKE 'SPC-%' OR r.reference_no IS NULL)

        UNION ALL

        -- G. Accrued Expenses (Claims)
        SELECT 
            '2130' as gl_code,
            0 as debit,
            IFNULL(h.TotalAmountInIDR, 0) as credit
        FROM btggasify_finance_live.tbl_claimAndpayment_header h
        WHERE YEAR(h.ApplicationDate) <= p_year 
          AND h.claim_director_isapproved = 1

        UNION ALL

        -- H. Accrued Expenses (Claim Payments)
        SELECT 
            '2130' as gl_code,
            ABS(IFNULL(r.bank_amount, 0) + IFNULL(r.cash_amount, 0)) as debit,
            0 as credit
        FROM btggasify_finance_live.tbl_ar_receipt r
        WHERE YEAR(COALESCE(r.receipt_date, r.created_date)) <= p_year 
          AND r.is_active = 1 
          AND r.reference_no LIKE 'SPC-%'

        UNION ALL

        -- I. Retained Earnings (Revenue from AR Table)
        SELECT 
            '3120' as gl_code,
            0 as debit,
            IFNULL(inv_amount, 0) as credit
        FROM btggasify_finance_live.tbl_accounts_receivable
        WHERE YEAR(invoice_date) <= p_year AND is_active = 1

        UNION ALL

        -- J. Retained Earnings (COGS)
        SELECT 
            '3120' as gl_code,
            IFNULL(po_amount, 0) as debit,
            0 as credit
        FROM btggasify_purchase_live.tbl_IRNReceipt_detail
        WHERE YEAR(receiptdate) <= p_year AND isactive = 1

        UNION ALL

        -- K. Retained Earnings (Claims)
        SELECT 
            '3120' as gl_code,
            IFNULL(h.TotalAmountInIDR, 0) as debit,
            0 as credit
        FROM btggasify_finance_live.tbl_claimAndpayment_header h
        WHERE YEAR(h.ApplicationDate) <= p_year 
          AND h.claim_director_isapproved = 1
    ) combined
    GROUP BY gl_code;
END //
DELIMITER ;


-- ============================================================
-- C. LEDGER REPORT
-- ============================================================

-- 11. proc_Ledger_GetGLCodes
-- GL codes lookup
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Ledger_GetGLCodes;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Ledger_GetGLCodes()
BEGIN
    SELECT id, GLcode, categoryName, description, AccountTypeId 
    FROM btggasify_finance_live.tbl_GLcodemaster 
    WHERE isActive = 1;
END //
DELIMITER ;

-- 12. proc_Ledger_GetSLCodes
-- SL codes lookup
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Ledger_GetSLCodes;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Ledger_GetSLCodes()
BEGIN
    SELECT sl_code_id, sl_code, sl_name, gl_code_id 
    FROM btggasify_finance_live.tbl_sl_codes;
END //
DELIMITER ;

-- 13. proc_Ledger_GetCurrencies
-- Currencies lookup
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Ledger_GetCurrencies;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Ledger_GetCurrencies()
BEGIN
    SELECT * FROM btggasify_live.master_currency;
END //
DELIMITER ;

-- 14. proc_Ledger_GetSalesInvoices
-- Sales Invoices for Ledger Report (Dr/Cr rows)
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Ledger_GetSalesInvoices;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Ledger_GetSalesInvoices(
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

-- 15. proc_Ledger_GetCustomerPayments
-- Customer Payments for Ledger Report (Dr/Cr rows)
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Ledger_GetCustomerPayments;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Ledger_GetCustomerPayments(
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT 
        DATE_FORMAT(r.receipt_date, '%Y-%m-%d') AS txn_date,
        COALESCE(r.reference_no, CONCAT('REC-', r.receipt_id)) AS ref_no,
        COALESCE(c.CustomerName, 'Unknown') AS party_name,
        ra.payment_amount AS amount,
        CASE 
            WHEN IFNULL(r.bank_amount, 0) > 0 THEN 'Bank'
            ELSE 'Cash'
        END AS pay_mode
    FROM btggasify_finance_live.tbl_receipt_ag_ar ra
    JOIN btggasify_finance_live.tbl_ar_receipt r ON ra.receipt_id = r.receipt_id
    JOIN btggasify_finance_live.tbl_accounts_receivable ar ON ra.ar_id = ar.ar_id
    JOIN btggasify_live.master_customer c ON ar.customer_id = c.Id
    WHERE r.receipt_date BETWEEN p_from_date AND p_to_date
    ORDER BY r.receipt_date ASC;
END //
DELIMITER ;

-- 16. proc_Ledger_GetCreditNotes
-- Credit Notes for Ledger Report (Dr/Cr rows)
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Ledger_GetCreditNotes;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Ledger_GetCreditNotes(
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

-- 17. proc_Ledger_GetDebitNotes
-- Debit Notes for Ledger Report (Dr/Cr rows)
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Ledger_GetDebitNotes;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Ledger_GetDebitNotes(
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

-- 18. proc_Ledger_GetJournalEntries
-- Journal Entries for Ledger Report
-- ============================================================
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Ledger_GetJournalEntries;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Ledger_GetJournalEntries(
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
