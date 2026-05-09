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
    FROM btggasify_live.tbl_salesinvoices_header
    WHERE salesinvoicenbr = p_invoice_nbr COLLATE utf8mb4_general_ci AND isactive = 1;
END //
DELIMITER ;

-- 2. proc_CRUD_CheckExistingAR
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_CheckExistingAR;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_CheckExistingAR(
    IN p_invoice_nbr VARCHAR(100),
    IN p_invoice_id INT,
    IN p_old_invoice_nbr VARCHAR(100)
)
BEGIN
    SELECT ar_id, already_received 
    FROM btggasify_finance_live.tbl_accounts_receivable 
    WHERE (invoice_no = p_invoice_nbr COLLATE utf8mb4_general_ci 
           OR invoice_no = p_old_invoice_nbr COLLATE utf8mb4_general_ci
           OR invoice_id = p_invoice_id)
      AND is_active = 1
    ORDER BY (invoice_id = p_invoice_id) DESC, (invoice_no = p_invoice_nbr COLLATE utf8mb4_general_ci) DESC, ar_id ASC
    LIMIT 1;
END //
DELIMITER ;

-- 3. proc_CRUD_UpdateARSum
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_UpdateARSum;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_UpdateARSum(
    IN p_invoice_nbr VARCHAR(100), 
    IN p_total DECIMAL(18,2), 
    IN p_total_idr DECIMAL(18,2), 
    IN p_user_id VARCHAR(50),
    IN p_invoice_id INT,
    IN p_ar_id INT
)
BEGIN
    -- Use TRIM and COLLATE for robust matching across databases
    UPDATE btggasify_finance_live.tbl_accounts_receivable ar
    CROSS JOIN (
        SELECT 
            h.customerid, 
            c.CustomerName, 
            h.Salesinvoicesdate,
            h.salesinvoicenbr,
            (SELECT COALESCE(d.Currencyid, 1) 
             FROM btggasify_live.tbl_salesinvoices_details d 
             WHERE d.salesinvoicesheaderid = h.id 
             LIMIT 1) as CurrencyId
        FROM btggasify_live.tbl_salesinvoices_header h
        LEFT JOIN btggasify_live.master_customer c ON h.customerid = c.Id
        WHERE h.id = p_invoice_id
    ) h_new
    SET 
        ar.invoice_id = p_invoice_id, -- Ensure ID is sync'd even if previously missing
        ar.invoice_no = h_new.salesinvoicenbr,
        ar.ar_no = CONCAT('AR-', h_new.salesinvoicenbr),
        ar.inv_amount = p_total,
        ar.invoice_amt_idr = p_total_idr,
        ar.balance_amount = (p_total - ar.already_received),
        ar.customer_id = h_new.customerid,
        ar.customer_name = COALESCE(h_new.CustomerName, 'Unknown'),
        ar.invoice_date = h_new.Salesinvoicesdate,
        ar.currencyid = h_new.CurrencyId,
        ar.updated_by = p_user_id,
        ar.updated_date = NOW(),
        ar.updated_ip = '127.0.0.1'
    WHERE ar.ar_id = p_ar_id AND ar.is_active = 1;
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
    -- Use TRIM() and explicit COLLATE for h.salesinvoicenbr access
    INSERT INTO btggasify_finance_live.tbl_accounts_receivable (
        orgid, branchid, 
        ar_no, 
        invoice_no, invoice_id, invoice_date, 
        customer_id, customer_name,
        inv_amount, invoice_amt_idr, already_received, advance_payment, balance_amount, 
        is_active, is_partial,
        created_by, created_date, currencyid, created_ip
    )
    SELECT 
        p_org_id, p_branch_id, 
        CONCAT('AR-', TRIM(h.salesinvoicenbr)), 
        TRIM(h.salesinvoicenbr), 
        p_primary_id,
        h.Salesinvoicesdate,
        h.customerid,
        COALESCE(c.CustomerName, 'Unknown'),
        p_total, 
        p_total_idr, 
        0, 0, p_total,
        1, 0,
        p_user_id, NOW(),
        (SELECT COALESCE(d.Currencyid, 1) 
         FROM btggasify_live.tbl_salesinvoices_details d 
         WHERE d.salesinvoicesheaderid = h.id 
         LIMIT 1),
        '127.0.0.1'
    FROM btggasify_live.tbl_salesinvoices_header h
    LEFT JOIN btggasify_live.master_customer c ON h.customerid = c.Id
    WHERE h.id = p_invoice_id;
END //
DELIMITER ;

-- 5. proc_CRUD_DeactivateOldDOsInAR
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_DeactivateOldDOsInAR;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_DeactivateOldDOsInAR(IN p_invoice_id INT, IN p_invoice_nbr VARCHAR(100))
BEGIN
    SET FOREIGN_KEY_CHECKS=0;

    -- 1. Deactivate in AR Table using JOIN
    UPDATE btggasify_finance_live.tbl_accounts_receivable ar
    INNER JOIN btggasify_live.tbl_salesinvoices_details d ON TRIM(ar.invoice_no) = TRIM(d.DOnumber) COLLATE utf8mb4_general_ci
    SET ar.is_active = 0
    WHERE ar.is_active = 1
      AND d.salesinvoicesheaderid = p_invoice_id
      AND TRIM(ar.invoice_no) != TRIM(p_invoice_nbr) COLLATE utf8mb4_general_ci;

    -- 2. Deactivate Source DO Headers using JOIN
    UPDATE btggasify_live.tbl_salesinvoices_header h
    INNER JOIN btggasify_live.tbl_salesinvoices_details d ON TRIM(h.salesinvoicenbr) = TRIM(d.DOnumber) COLLATE utf8mb4_general_ci
    SET h.isactive = 0
    WHERE h.isactive = 1
      AND d.salesinvoicesheaderid = p_invoice_id
      AND TRIM(h.salesinvoicenbr) != TRIM(p_invoice_nbr) COLLATE utf8mb4_general_ci;

    SET FOREIGN_KEY_CHECKS=1;
END //
DELIMITER ;

-- 6. proc_CRUD_MarkHeaderAsAR
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_MarkHeaderAsAR;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_MarkHeaderAsAR(IN p_invoice_id INT)
BEGIN
    UPDATE btggasify_live.tbl_salesinvoices_header 
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
    UPDATE btggasify_live.tbl_salesinvoices_header 
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
    UPDATE btggasify_live.tbl_salesinvoices_header 
    SET PaidAmount = IFNULL(PaidAmount, 0) + p_amount 
    WHERE id = p_invoice_id;
END //
DELIMITER ;

-- 12. proc_CRUD_GetARIdByInvoiceId
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_GetARIdByInvoiceId;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_GetARIdByInvoiceId(IN p_invoice_id INT, IN p_type VARCHAR(10))
BEGIN
    IF p_type = 'DN' THEN
        SELECT ar_id FROM btggasify_finance_live.tbl_accounts_receivable WHERE invoice_id = p_invoice_id AND doc_type = 'DN' LIMIT 1;
    ELSE
        SELECT ar.ar_id 
        FROM btggasify_finance_live.tbl_accounts_receivable ar
        JOIN btggasify_live.tbl_salesinvoices_header h ON TRIM(ar.invoice_no) = TRIM(h.salesinvoicenbr)
        WHERE h.id = p_invoice_id AND ar.doc_type = 'INV'
        LIMIT 1;
    END IF;
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
        CASE WHEN ar.doc_type = 'DN' THEN 'Debit Note' ELSE 'Invoice' END as doc_type,
        ar.ar_id as id,
        DATE_FORMAT(ar.invoice_date, '%Y-%m-%d') as ledger_date,
        ar.invoice_no,
        ar.invoice_no as reference_no,
        CASE WHEN ar.doc_type = 'INV' THEN ar.inv_amount ELSE 0 END as invoice_amount,
        0 as receipt_amount,
        CASE WHEN ar.doc_type = 'DN' THEN ar.inv_amount ELSE 0 END as debit_note_amount, 
        0 as credit_note_amount,
        ar.currencyid,
        mc.CurrencyCode,
        ar.created_date,
        NULL as deposit_bank_id,
        NULL as bank_name,
        ar.customer_name,
        NULL as combine_group_id,
        NULL as custom_voucher_no,
        0 as is_combined
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
        c.CustomerName as customer_name,
        r.combine_group_id,
        r.custom_voucher_no,
        r.is_combined
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
    UPDATE btggasify_live.tbl_salesinvoices_header 
    SET salesinvoicenbr = p_ref COLLATE utf8mb4_general_ci
    WHERE id = p_invoice_id;
END //
DELIMITER ;

-- 17. proc_CRUD_BulkUpdatePreserveDO
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_BulkUpdatePreserveDO;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_BulkUpdatePreserveDO(IN p_ar_id INT, IN p_ref VARCHAR(100))
BEGIN
    UPDATE btggasify_live.tbl_salesinvoices_details d
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
    DECLARE v_existing_ar_id INT;
    DECLARE v_amt DECIMAL(18,2);
    DECLARE v_amt_idr DECIMAL(18,2);
    
    -- 1. Check if another record already has this invoice_no and is active
    SELECT ar_id INTO v_existing_ar_id 
    FROM btggasify_finance_live.tbl_accounts_receivable 
    WHERE invoice_no = p_ref COLLATE utf8mb4_general_ci 
      AND ar_id != p_ar_id 
      AND is_active = 1 
    LIMIT 1;
    
    IF v_existing_ar_id IS NOT NULL THEN
        -- 2. MERGE SCENARIO: Reference exists, so we consolidate this record into the existing one
        SELECT inv_amount, invoice_amt_idr INTO v_amt, v_amt_idr 
        FROM btggasify_finance_live.tbl_accounts_receivable WHERE ar_id = p_ar_id;
        
        -- Add amounts to the existing 'master' record
        UPDATE btggasify_finance_live.tbl_accounts_receivable 
        SET inv_amount = inv_amount + v_amt, 
            invoice_amt_idr = invoice_amt_idr + v_amt_idr,
            balance_amount = balance_amount + v_amt,
            updated_date = NOW()
        WHERE ar_id = v_existing_ar_id;
        
        -- Deactivate this 'child' record (now that we've updated its index column to NULL via generated column logic)
        UPDATE btggasify_finance_live.tbl_accounts_receivable 
        SET is_active = 0, invoice_no = p_ref COLLATE utf8mb4_general_ci, updated_date = NOW()
        WHERE ar_id = p_ar_id;
    ELSE
        -- 3. STANDARD SCENARIO: First time setting this reference or only one record
        UPDATE btggasify_finance_live.tbl_accounts_receivable 
        SET invoice_no = p_ref COLLATE utf8mb4_general_ci, updated_date = NOW()
        WHERE ar_id = p_ar_id;
    END IF;
END //
DELIMITER ;

-- 19. proc_CRUD_BulkUpdateSalesHeader
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_BulkUpdateSalesHeader;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_BulkUpdateSalesHeader(IN p_ar_id INT, IN p_ref VARCHAR(100))
BEGIN
    UPDATE btggasify_live.tbl_salesinvoices_header
    SET salesinvoicenbr = p_ref COLLATE utf8mb4_general_ci
    WHERE id IN (
        SELECT invoice_id 
        FROM btggasify_finance_live.tbl_accounts_receivable 
        WHERE ar_id = p_ar_id
    );
END //
DELIMITER ;

-- 21. proc_CRUD_GetReceiptLinkedInvoices
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_CRUD_GetReceiptLinkedInvoices;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_CRUD_GetReceiptLinkedInvoices(IN p_receipt_id INT)
BEGIN
    SELECT DISTINCT ar.invoice_no 
    FROM btggasify_finance_live.tbl_receipt_ag_ar ra
    JOIN btggasify_finance_live.tbl_accounts_receivable ar ON ra.ar_id = ar.ar_id
    WHERE ra.receipt_id = p_receipt_id AND ra.is_active = 1;
END //
DELIMITER ;
