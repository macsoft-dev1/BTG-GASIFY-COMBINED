-- ==========================================================
-- FINANCE MODULE PROCEDURES (AR & Reports)
-- ==========================================================

-- 1. Fetch AR Book Data (Unified query for Invoices, Receipts, DN, CN, Unallocated)
DROP PROCEDURE IF EXISTS proc_GetARBook;
DELIMITER //
CREATE PROCEDURE proc_GetARBook(
    IN p_org_id INT,
    IN p_branch_id INT,
    IN p_customer_id INT,
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    -- This is a simplified version of the complex union in build_ar_book_query
    -- In practice, we might want to split this into smaller blocks or a temporary table
    
    -- 1. Invoices
    SELECT 
        ar.ar_id as transaction_id, 
        ar.invoice_amt_idr as invoice_amount_idr, 
        cur.CurrencyCode as currencycode, 
        ar.invoice_date as ledger_date, 
        c.CustomerName as customer_name, 
        ar.ar_no, 
        ar.invoice_no, 
        (SELECT d.PONumber FROM btggasify_userpanel_live.tbl_salesinvoices_details d 
         WHERE d.salesinvoicesheaderid = ar.invoice_id LIMIT 1) as po_no,
        ar.inv_amount as invoice_amount, 
        NULL as receipt_no, 
        0 as receipt_amount, 
        
        (SELECT COALESCE(SUM(dn.Amount), 0) 
         FROM btggasify_finance_live.debit_invoice di 
         JOIN btggasify_finance_live.Debit_Notes dn ON di.DebitNoteId = dn.DebitNoteId 
         WHERE TRIM(di.InvoiceNo) = TRIM(ar.invoice_no) AND dn.IsSubmitted = 1) as debit_note_amount,
        
        (SELECT COALESCE(SUM(cn.Amount), 0) 
         FROM btggasify_finance_live.credit_invoice ci 
         JOIN btggasify_finance_live.Credit_Notes cn ON ci.CreditNoteId = cn.CreditNoteId 
         WHERE TRIM(ci.InvoiceNo) = TRIM(ar.invoice_no) AND cn.IsSubmitted = 1) as credit_note_amount,
        
        (ar.inv_amount - ar.already_received + 
            (SELECT COALESCE(SUM(dn.Amount), 0) FROM btggasify_finance_live.debit_invoice di JOIN btggasify_finance_live.Debit_Notes dn ON di.DebitNoteId = dn.DebitNoteId WHERE TRIM(di.InvoiceNo) = TRIM(ar.invoice_no) AND dn.IsSubmitted = 1) - 
            (SELECT COALESCE(SUM(cn.Amount), 0) FROM btggasify_finance_live.credit_invoice ci JOIN btggasify_finance_live.Credit_Notes cn ON ci.CreditNoteId = cn.CreditNoteId WHERE TRIM(ci.InvoiceNo) = TRIM(ar.invoice_no) AND cn.IsSubmitted = 1)
        ) as balance, 
        
        'Invoice' as payment_mode, 
        '-' as remarks,
        0 as receipt_id, 
        0 as deposit_bank_id, 
        ar.invoice_id as real_invoice_id
    FROM btggasify_finance_live.tbl_accounts_receivable ar 
    JOIN btggasify_userpanel_live.master_customer c ON ar.customer_id = c.Id 
    LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId 
    WHERE ar.is_active = 1 AND ar.orgid = p_org_id AND ar.branchid = p_branch_id
      AND (p_customer_id = 0 OR ar.customer_id = p_customer_id)
      AND (p_from_date IS NULL OR ar.invoice_date >= p_from_date)
      AND (p_to_date IS NULL OR ar.invoice_date <= p_to_date)

    UNION ALL

    -- 2. Allocated Receipts
    SELECT 
        r.receipt_id as transaction_id, 
        ar.invoice_amt_idr as invoice_amount_idr, 
        cur.CurrencyCode as currencycode, 
        r.receipt_date as ledger_date, 
        c.CustomerName as customer_name, 
        ar.ar_no, 
        ar.invoice_no, 
        0 as invoice_amount, 
        r.reference_no as receipt_no, 
        (SELECT d.PONumber FROM btggasify_userpanel_live.tbl_salesinvoices_details d 
         WHERE d.salesinvoicesheaderid = ar.invoice_id LIMIT 1) as po_no,
        ra.payment_amount as receipt_amount, 
        0 as debit_note_amount, 
        0 as credit_note_amount, 
        ar.balance_amount as balance, 
        CASE WHEN(IFNULL(r.bank_amount,0) > 0) THEN 'Bank' ELSE 'Cash' END as payment_mode, 
        '-' as remarks,
        r.receipt_id, 
        IFNULL(r.deposit_bank_id, 0) as deposit_bank_id, 
        ar.invoice_id as real_invoice_id
    FROM btggasify_finance_live.tbl_receipt_ag_ar ra 
    JOIN btggasify_finance_live.tbl_ar_receipt r ON ra.receipt_id = r.receipt_id 
    JOIN btggasify_finance_live.tbl_accounts_receivable ar ON ra.ar_id = ar.ar_id 
    LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId 
    JOIN btggasify_userpanel_live.master_customer c ON ar.customer_id = c.Id 
    WHERE ar.is_active = 1 AND ar.orgid = p_org_id AND ar.branchid = p_branch_id
      AND (p_customer_id = 0 OR ar.customer_id = p_customer_id)
      AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
      AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)

    UNION ALL

    -- 3. Standalone Debit Notes
    SELECT 
        dn.DebitNoteId as transaction_id, 
        0 as invoice_amount_idr, 
        cur.CurrencyCode as currencycode, 
        dn.TransactionDate as ledger_date, 
        c.CustomerName as customer_name, 
        dn.DebitNoteNumber as ar_no, 
        dn.DebitNoteNumber as invoice_no, 
        0 as invoice_amount, 
        NULL as receipt_no, 
        '' as po_no,
        0 as receipt_amount, 
        dn.Amount as debit_note_amount, 
        0 as credit_note_amount, 
        0 as balance, 
        'Debit Note' as payment_mode, 
        dn.Description as remarks,
        0 as receipt_id, 0 as deposit_bank_id, 
        dn.DebitNoteId as real_invoice_id
    FROM btggasify_finance_live.Debit_Notes dn 
    JOIN btggasify_userpanel_live.master_customer c ON dn.CustomerId = c.Id 
    LEFT JOIN btggasify_live.master_currency cur ON dn.CurrencyId = cur.CurrencyId 
    WHERE (p_customer_id = 0 OR dn.CustomerId = p_customer_id)
      AND (p_from_date IS NULL OR dn.TransactionDate >= p_from_date)
      AND (p_to_date IS NULL OR dn.TransactionDate <= p_to_date)
      AND NOT EXISTS (SELECT 1 FROM btggasify_finance_live.debit_invoice di WHERE di.DebitNoteId = dn.DebitNoteId)

    UNION ALL

    -- 4. Standalone Credit Notes
    SELECT 
        cn.CreditNoteId as transaction_id, 
        0 as invoice_amount_idr, 
        cur.CurrencyCode as currencycode, 
        cn.TransactionDate as ledger_date, 
        c.CustomerName as customer_name, 
        cn.CreditNoteNumber as ar_no, 
        cn.CreditNoteNumber as invoice_no, 
        0 as invoice_amount, 
        NULL as receipt_no, 
        '' as po_no,
        0 as receipt_amount, 
        0 as debit_note_amount, 
        cn.Amount as credit_note_amount, 
        0 as balance, 
        'Credit Note' as payment_mode, 
        cn.Description as remarks,
        0 as receipt_id, 0 as deposit_bank_id, 
        cn.CreditNoteId as real_invoice_id
    FROM btggasify_finance_live.Credit_Notes cn 
    JOIN btggasify_userpanel_live.master_customer c ON cn.CustomerId = c.Id 
    LEFT JOIN btggasify_live.master_currency cur ON cn.CurrencyId = cur.CurrencyId 
    WHERE (p_customer_id = 0 OR cn.CustomerId = p_customer_id)
      AND (p_from_date IS NULL OR cn.TransactionDate >= p_from_date)
      AND (p_to_date IS NULL OR cn.TransactionDate <= p_to_date)
      AND NOT EXISTS (SELECT 1 FROM btggasify_finance_live.credit_invoice ci WHERE ci.CreditNoteId = cn.CreditNoteId)

    UNION ALL

    -- 5. Unallocated Receipts
    SELECT 
        r.receipt_id as transaction_id, 
        0 as invoice_amount_idr, 
        IFNULL(cur.CurrencyCode, 'IDR') as currencycode, 
        r.receipt_date as ledger_date, 
        c.CustomerName as customer_name, 
        IFNULL(r.reference_no, 'Unallocated') as ar_no, 
        IFNULL(r.reference_no, 'Unallocated') as invoice_no, 
        0 as invoice_amount, 
        r.receipt_no as receipt_no, 
        '' as po_no,
        (r.cash_amount + r.bank_amount) as receipt_amount, 
        0 as debit_note_amount, 
        0 as credit_note_amount, 
        -(r.cash_amount + r.bank_amount) as balance, 
        CASE WHEN(IFNULL(r.bank_amount,0) > 0) THEN 'Bank' ELSE 'Cash' END as payment_mode, 
        'Standalone Receipt' as remarks, 
        r.receipt_id, 
        IFNULL(r.deposit_bank_id, 0) as deposit_bank_id, 
        '0' as real_invoice_id
    FROM btggasify_finance_live.tbl_ar_receipt r 
    JOIN btggasify_userpanel_live.master_customer c ON r.customer_id = c.Id 
    LEFT JOIN btggasify_live.master_currency cur ON r.currencyid = cur.CurrencyId 
    WHERE r.is_active = 1 AND r.ar_id IS NULL AND r.orgid = p_org_id AND r.branchid = p_branch_id
      AND (p_customer_id = 0 OR r.customer_id = p_customer_id)
      AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
      AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)

    ORDER BY customer_name, ledger_date, ar_no;
END //
DELIMITER ;

-- 2. Fetch Customer Address (for SOA)
DROP PROCEDURE IF EXISTS proc_GetCustomerAddress;
DELIMITER //
CREATE PROCEDURE proc_GetCustomerAddress(IN p_customer_id INT)
BEGIN
    SELECT 
        c.Id as customer_id,
        c.CustomerName as customer_name,
        COALESCE(c.Address, '') as address,
        COALESCE(c.City, '') as city,
        COALESCE(c.Country, '') as country
    FROM btggasify_userpanel_live.master_customer c
    WHERE c.Id = p_customer_id AND c.IsActive = 1;
END //
DELIMITER ;

-- 3. Fetch Pending Receipt List
DROP PROCEDURE IF EXISTS proc_GetPendingReceiptList;
DELIMITER //
CREATE PROCEDURE proc_GetPendingReceiptList(
    IN p_user_id INT,
    IN p_department VARCHAR(50)
)
BEGIN
    SELECT 
        r.*, 
        ABS(CASE WHEN r.bank_amount != 0 THEN r.bank_amount ELSE r.cash_amount END) as display_amount,
        CASE 
            WHEN r.deposit_bank_id IS NULL OR r.deposit_bank_id = '0' OR r.deposit_bank_id = '' THEN 'Cashbook'
            ELSE 'Bankbook'
        END as payment_type,
        COALESCE(mc.CurrencyCode, 'IDR') as CurrencyCode,
        c.CustomerName
    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_userpanel_live.master_customer c ON r.customer_id = c.Id
    LEFT JOIN btggasify_masterpanel_live.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
    LEFT JOIN btggasify_live.master_currency mc ON b.CurrencyId = mc.CurrencyId
    WHERE r.is_active = 1 
      AND (IFNULL(r.bank_amount, 0) != 0 OR IFNULL(r.cash_amount, 0) != 0)
      AND (
          r.pending_verification = 1 
          OR (r.pending_verification = 0 AND r.is_submitted = 0 AND r.is_posted = 1)
      )
      AND (p_department != '9' OR p_user_id IS NULL OR r.sales_person_id = p_user_id)
    ORDER BY r.receipt_id DESC;
END //
DELIMITER ;

-- 4. Fetch Outstanding Invoices
DROP PROCEDURE IF EXISTS proc_GetOutstandingInvoices;
DELIMITER //
CREATE PROCEDURE proc_GetOutstandingInvoices(IN p_customer_id INT)
BEGIN
    SELECT 
        h.id as invoice_id,
        h.salesinvoicenbr as invoice_no,
        DATE_FORMAT(h.Salesinvoicesdate, '%d-%m-%Y') as invoice_date,
        h.TotalAmount as total_amount,
        (h.TotalAmount - IFNULL(h.PaidAmount, 0)) as balance_due
    FROM btggasify_userpanel_live.tbl_salesinvoices_header h
    WHERE h.customerid = p_customer_id
      AND (h.TotalAmount - IFNULL(h.PaidAmount, 0)) > 0
      AND h.IsSubmitted = 1
    ORDER BY h.Salesinvoicesdate ASC;
END //
DELIMITER ;
