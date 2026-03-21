-- ============================================================
-- CRUD.PY STORED PROCEDURES
-- ============================================================

-- 1. proc_CRUD_GetInvoiceGrandTotal
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_GetInvoiceGrandTotal;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_GetInvoiceGrandTotal(IN p_invoice_nbr VARCHAR(100))
BEGIN
    SELECT 
        SUM(TotalAmount) as GrandTotal, 
        SUM(CalculatedPrice) as GrandTotalIDR,
        MIN(id) as PrimaryID
    FROM btggasify_userpanel_live.tbl_salesinvoices_header
    WHERE salesinvoicenbr = p_invoice_nbr COLLATE utf8mb4_general_ci AND isactive = 1;
END //
DELIMITER ;

-- 2. proc_CRUD_CheckExistingAR
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_CheckExistingAR;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_CheckExistingAR(IN p_invoice_nbr VARCHAR(100))
BEGIN
    SELECT ar_id, already_received 
    FROM btggasify_finance_live.tbl_accounts_receivable 
    WHERE invoice_no = p_invoice_nbr COLLATE utf8mb4_general_ci;
END //
DELIMITER ;

-- 3. proc_CRUD_UpdateARSum
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_UpdateARSum;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_UpdateARSum(
    IN p_invoice_nbr VARCHAR(100), IN p_total DECIMAL(18,2), IN p_total_idr DECIMAL(18,2), IN p_user_id VARCHAR(50)
)
BEGIN
    UPDATE btggasify_finance_live.tbl_accounts_receivable
    SET 
        inv_amount = p_total,
        invoice_amt_idr = p_total_idr,
        balance_amount = (p_total - already_received),
        updated_by = p_user_id,
        updated_date = NOW()
    WHERE invoice_no = p_invoice_nbr COLLATE utf8mb4_general_ci;
END //
DELIMITER ;

-- 4. proc_CRUD_InsertARFromInvoice
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_InsertARFromInvoice;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_InsertARFromInvoice(
    IN p_org_id INT, IN p_branch_id INT, IN p_user_id VARCHAR(50), 
    IN p_invoice_id INT, IN p_primary_id INT, IN p_total DECIMAL(18,2), IN p_total_idr DECIMAL(18,2)
)
BEGIN
    INSERT INTO btggasify_finance_live.tbl_accounts_receivable (
        orgid, branchid, 
        ar_no, 
        invoice_no, invoice_id, invoice_date, 
        customer_id, customer_name, 
        inv_amount, balance_amount, already_received, 
        invoice_amt_idr, currencyid, 
        created_by, created_ip, created_date, 
        is_active, is_partial
    )
    SELECT 
        p_org_id, p_branch_id,
        CONCAT('AR-', h.salesinvoicenbr), 
        h.salesinvoicenbr, 
        p_primary_id,
        h.Salesinvoicesdate,
        h.customerid, 
        IFNULL(c.CustomerName, 'Unknown'), 
        p_total, 
        p_total, 
        0, 
        p_total_idr, 
        (SELECT COALESCE(d.Currencyid, 1) 
         FROM btggasify_userpanel_live.tbl_salesinvoices_details d 
         WHERE d.salesinvoicesheaderid = h.id 
         LIMIT 1), 
        p_user_id, '127.0.0.1', NOW(), 
        1, 0
    FROM btggasify_userpanel_live.tbl_salesinvoices_header h
    LEFT JOIN btggasify_live.master_customer c ON h.customerid = c.Id
    WHERE h.id = p_invoice_id;
END //
DELIMITER ;

-- 5. proc_CRUD_DeactivateOldDOsInAR
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_DeactivateOldDOsInAR;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_DeactivateOldDOsInAR(IN p_invoice_id INT, IN p_invoice_nbr VARCHAR(100))
BEGIN
    UPDATE btggasify_finance_live.tbl_accounts_receivable
    SET is_active = 0
    WHERE is_active = 1
      AND invoice_no != p_invoice_nbr COLLATE utf8mb4_general_ci
      AND invoice_no IN (
          SELECT DISTINCT DOnumber 
          FROM btggasify_userpanel_live.tbl_salesinvoices_details 
          WHERE salesinvoicesheaderid = p_invoice_id 
            AND DOnumber IS NOT NULL 
            AND DOnumber != ''
      );
END //
DELIMITER ;

-- 6. proc_CRUD_MarkHeaderAsAR
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_MarkHeaderAsAR;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_MarkHeaderAsAR(IN p_invoice_id INT)
BEGIN
    UPDATE btggasify_userpanel_live.tbl_salesinvoices_header 
    SET IsAR = 1 
    WHERE id = p_invoice_id;
END //
DELIMITER ;

-- 7. proc_CRUD_GetOldAllocations
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_GetOldAllocations;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_GetOldAllocations(IN p_receipt_id INT)
BEGIN
    SELECT ar.invoice_id, ra.ar_id, ra.payment_amount 
    FROM btggasify_finance_live.tbl_receipt_ag_ar ra
    JOIN btggasify_finance_live.tbl_accounts_receivable ar ON ra.ar_id = ar.ar_id
    WHERE ra.receipt_id = p_receipt_id AND ra.is_active = 1;
END //
DELIMITER ;

-- 8. proc_CRUD_RevertHeaderPaidAmount
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_RevertHeaderPaidAmount;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_RevertHeaderPaidAmount(IN p_amount DECIMAL(18,2), IN p_invoice_id INT)
BEGIN
    UPDATE btggasify_userpanel_live.tbl_salesinvoices_header 
    SET PaidAmount = PaidAmount - p_amount 
    WHERE id = p_invoice_id;
END //
DELIMITER ;

-- 9. proc_CRUD_RevertARAlreadyReceived
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_RevertARAlreadyReceived;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_RevertARAlreadyReceived(IN p_amount DECIMAL(18,2), IN p_ar_id INT)
BEGIN
    UPDATE btggasify_finance_live.tbl_accounts_receivable 
    SET already_received = already_received - p_amount, balance_amount = balance_amount + p_amount 
    WHERE ar_id = p_ar_id;
END //
DELIMITER ;

-- 10. proc_CRUD_DeactivateOldAllocations
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_DeactivateOldAllocations;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_DeactivateOldAllocations(IN p_receipt_id INT)
BEGIN
    UPDATE btggasify_finance_live.tbl_receipt_ag_ar 
    SET is_active = 0 
    WHERE receipt_id = p_receipt_id;
END //
DELIMITER ;

-- 11. proc_CRUD_ApplyHeaderPaidAmount
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_ApplyHeaderPaidAmount;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_ApplyHeaderPaidAmount(IN p_amount DECIMAL(18,2), IN p_invoice_id INT)
BEGIN
    UPDATE btggasify_userpanel_live.tbl_salesinvoices_header 
    SET PaidAmount = IFNULL(PaidAmount, 0) + p_amount 
    WHERE id = p_invoice_id;
END //
DELIMITER ;

-- 12. proc_CRUD_GetARIdByInvoiceId
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_GetARIdByInvoiceId;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_GetARIdByInvoiceId(IN p_invoice_id INT)
BEGIN
    SELECT ar_id FROM btggasify_finance_live.tbl_accounts_receivable WHERE invoice_id = p_invoice_id LIMIT 1;
END //
DELIMITER ;

-- 13. proc_CRUD_InsertReceiptARLink
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_InsertReceiptARLink;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_InsertReceiptARLink(
    IN p_receipt_id INT, IN p_ar_id INT, IN p_amount DECIMAL(18,2), 
    IN p_rdate DATE, IN p_user_id VARCHAR(50), IN p_ip VARCHAR(50)
)
BEGIN
    INSERT INTO btggasify_finance_live.tbl_receipt_ag_ar 
    (receipt_id, ar_id, payment_amount, receipt_date, created_date, created_by, created_ip, is_active)
    VALUES (p_receipt_id, p_ar_id, p_amount, p_rdate, NOW(), p_user_id, p_ip, 1);
END //
DELIMITER ;

-- 14. proc_CRUD_ApplyARAlreadyReceived
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_ApplyARAlreadyReceived;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_ApplyARAlreadyReceived(IN p_amount DECIMAL(18,2), IN p_ar_id INT, IN p_user_id VARCHAR(50))
BEGIN
    UPDATE btggasify_finance_live.tbl_accounts_receivable 
    SET already_received = already_received + p_amount, 
        balance_amount = balance_amount - p_amount, 
        updated_date = NOW(), 
        updated_by = p_user_id 
    WHERE ar_id = p_ar_id;
END //
DELIMITER ;

-- 15. proc_CRUD_GetARBook
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_GetARBook;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_GetARBook(IN p_customer_id INT)
BEGIN
    SELECT 
        'Invoice' as doc_type,
        ar.ar_id as id,
        DATE_FORMAT(ar.invoice_date, '%Y-%m-%d') as ledger_date,
        ar.invoice_no,
        ar.invoice_no as reference_no,
        ar.inv_amount as invoice_amount,
        0 as receipt_amount,
        0 as debit_note_amount, 
        0 as credit_note_amount,
        ar.currencyid,
        mc.CurrencyCode,
        ar.created_date,
        NULL as deposit_bank_id,
        NULL as bank_name,
        ar.customer_name
    FROM btggasify_finance_live.tbl_accounts_receivable ar
    LEFT JOIN btggasify_live.master_currency mc ON ar.currencyid = mc.CurrencyId
    WHERE ar.customer_id = p_customer_id AND ar.is_active = 1

    UNION ALL

    SELECT 
        'Receipt' as doc_type,
        r.receipt_id as id,
        DATE_FORMAT(r.receipt_date, '%Y-%m-%d') as ledger_date,
        r.reference_no as invoice_no, 
        r.receipt_no as reference_no, 
        0 as invoice_amount,
        r.bank_amount as receipt_amount,
        0 as debit_note_amount,
        0 as credit_note_amount,
        r.currencyid,
        mc.CurrencyCode,
        r.created_date,
        r.deposit_bank_id,
        b.BankName as bank_name,
        c.CustomerName as customer_name
    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_currency mc ON r.currencyid = mc.CurrencyId
    LEFT JOIN btggasify_masterpanel_live.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    WHERE r.customer_id = p_customer_id AND r.is_active = 1 AND r.is_posted = 1

    ORDER BY ledger_date DESC, created_date DESC;
END //
DELIMITER ;

-- 16. proc_CRUD_UpdateHeaderReference
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_UpdateHeaderReference;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_UpdateHeaderReference(IN p_invoice_id INT, IN p_ref VARCHAR(100))
BEGIN
    UPDATE btggasify_userpanel_live.tbl_salesinvoices_header 
    SET salesinvoicenbr = p_ref COLLATE utf8mb4_general_ci
    WHERE id = p_invoice_id;
END //
DELIMITER ;

-- 17. proc_CRUD_BulkUpdatePreserveDO
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_BulkUpdatePreserveDO;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_BulkUpdatePreserveDO(IN p_ar_id INT, IN p_ref VARCHAR(100))
BEGIN
    UPDATE btggasify_userpanel_live.tbl_salesinvoices_details d
    INNER JOIN btggasify_finance_live.tbl_accounts_receivable ar 
        ON d.salesinvoicesheaderid = ar.invoice_id
    SET d.DOnumber = p_ref COLLATE utf8mb4_general_ci
    WHERE ar.ar_id = p_ar_id;
END //
DELIMITER ;

-- 18. proc_CRUD_BulkUpdateFinanceAR
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_BulkUpdateFinanceAR;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_BulkUpdateFinanceAR(IN p_ar_id INT, IN p_ref VARCHAR(100))
BEGIN
    UPDATE btggasify_finance_live.tbl_accounts_receivable 
    SET invoice_no = p_ref COLLATE utf8mb4_general_ci
    WHERE ar_id = p_ar_id;
END //
DELIMITER ;

-- 19. proc_CRUD_BulkUpdateSalesHeader
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_BulkUpdateSalesHeader;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_BulkUpdateSalesHeader(IN p_ar_id INT, IN p_ref VARCHAR(100))
BEGIN
    UPDATE btggasify_userpanel_live.tbl_salesinvoices_header
    SET salesinvoicenbr = p_ref COLLATE utf8mb4_general_ci
    WHERE id IN (
        SELECT invoice_id 
        FROM btggasify_finance_live.tbl_accounts_receivable 
        WHERE ar_id = p_ar_id
    );
END //
DELIMITER ;

