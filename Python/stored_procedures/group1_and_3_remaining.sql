-- ============================================================
-- GROUPS 1 & 3: REMAINING STORED PROCEDURES
-- Target DB: btggasify_finance_live (dev/test)
-- ============================================================

-- ============================================================
-- A. AR BOOK (finance.py)
-- ============================================================

-- 1. proc_AR_GetARBook
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_AR_GetARBook;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_AR_GetARBook(
    IN p_org_id INT,
    IN p_branch_id INT,
    IN p_customer_id INT,
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    -- Invoices / AR Ledger Records
    SELECT 
        ar.ar_id as transaction_id, 
        ar.customer_id as customer_id, 
        ar.invoice_amt_idr as invoice_amount_idr, 
        cur.CurrencyCode as currencycode, 
        ar.invoice_date as ledger_date, 
        c.CustomerName as customer_name, 
        ar.ar_no, 
        ar.invoice_no, 
        (SELECT d.PONumber FROM btggasify_live.tbl_salesinvoices_details d 
         WHERE d.salesinvoicesheaderid = ar.invoice_id AND ar.doc_type = 'INV' LIMIT 1) as po_no,
        CASE WHEN ar.doc_type = 'INV' THEN ar.inv_amount ELSE 0 END as invoice_amount, 
        NULL as receipt_no, 
        0 as receipt_amount, 
        CASE 
            WHEN ar.doc_type = 'DN' THEN ar.inv_amount
            ELSE (SELECT COALESCE(SUM(dn.Amount), 0) 
                  FROM btggasify_finance_live.debit_invoice di 
                  JOIN btggasify_finance_live.Debit_Notes dn ON di.DebitNoteId = dn.DebitNoteId 
                  WHERE TRIM(di.InvoiceNo) = TRIM(ar.invoice_no) AND dn.IsSubmitted = 1)
        END as debit_note_amount,
        CASE 
            WHEN ar.doc_type = 'CN' THEN ar.inv_amount
            ELSE (SELECT COALESCE(SUM(cn.Amount), 0) 
                  FROM btggasify_finance_live.credit_invoice ci 
                  JOIN btggasify_finance_live.Credit_Notes cn ON ci.CreditNoteId = cn.CreditNoteId 
                  WHERE TRIM(ci.InvoiceNo) = TRIM(ar.invoice_no) AND cn.IsSubmitted = 1)
        END as credit_note_amount,
        (CASE 
            WHEN ar.doc_type = 'INV' THEN
                (ar.inv_amount - ar.already_received + 
                    (SELECT COALESCE(SUM(dn2.Amount), 0) FROM btggasify_finance_live.debit_invoice di2 JOIN btggasify_finance_live.Debit_Notes dn2 ON di2.DebitNoteId = dn2.DebitNoteId WHERE TRIM(di2.InvoiceNo) = TRIM(ar.invoice_no) AND dn2.IsSubmitted = 1) - 
                    (SELECT COALESCE(SUM(cn2.Amount), 0) FROM btggasify_finance_live.credit_invoice ci2 JOIN btggasify_finance_live.Credit_Notes cn2 ON ci2.CreditNoteId = cn2.CreditNoteId WHERE TRIM(ci2.InvoiceNo) = TRIM(ar.invoice_no) AND cn2.IsSubmitted = 1)
                )
            ELSE (ar.inv_amount - ar.already_received)
         END) as balance, 
        CASE 
            WHEN ar.doc_type = 'DN' THEN 'Debit Note'
            WHEN ar.doc_type = 'CN' THEN 'Credit Note'
            ELSE 'Invoice'
        END as payment_mode, 
        '-' as remarks,
        0 as receipt_id, 
        0 as deposit_bank_id, 
        ar.invoice_id as real_invoice_id,
        0 as total_receipt_amount,
        NULL as combine_group_id,
        NULL as custom_voucher_no,
        0 as is_combined
    FROM btggasify_finance_live.tbl_accounts_receivable ar 
    JOIN btggasify_live.master_customer c ON ar.customer_id = c.Id 
    LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId 
    WHERE ar.is_active = 1 AND ar.orgid = p_org_id AND ar.branchid = p_branch_id
      AND (p_customer_id = 0 OR ar.customer_id = p_customer_id)
      AND (p_from_date IS NULL OR ar.invoice_date >= p_from_date)
      AND (p_to_date IS NULL OR ar.invoice_date <= p_to_date)

    UNION ALL

    -- Receipts (Allocated via Link Table)
    SELECT 
        r.receipt_id as transaction_id, 
        ar.customer_id as customer_id, 
        ar.invoice_amt_idr as invoice_amount_idr, 
        cur.CurrencyCode as currencycode, 
        r.receipt_date as ledger_date, 
        c.CustomerName as customer_name, 
        ar.ar_no, 
        ar.invoice_no, 
        (SELECT d.PONumber FROM btggasify_live.tbl_salesinvoices_details d 
         WHERE d.salesinvoicesheaderid = ar.invoice_id LIMIT 1) as po_no,
        ar.inv_amount as invoice_amount, 
        r.reference_no as receipt_no, 
        ra.payment_amount as receipt_amount, 
        0 as debit_note_amount, 
        0 as credit_note_amount, 
        ar.balance_amount as balance, 
        CASE WHEN(IFNULL(r.bank_amount,0) > 0) THEN 'Bank' ELSE 'Cash' END as payment_mode, 
        '-' as remarks,
        r.receipt_id, 
        IFNULL(r.deposit_bank_id, 0) as deposit_bank_id, 
        ar.invoice_id as real_invoice_id,
        (r.cash_amount + r.bank_amount) as total_receipt_amount,
        r.combine_group_id,
        r.custom_voucher_no,
        r.is_combined
    FROM btggasify_finance_live.tbl_receipt_ag_ar ra 
    JOIN btggasify_finance_live.tbl_ar_receipt r ON ra.receipt_id = r.receipt_id 
    JOIN btggasify_finance_live.tbl_accounts_receivable ar ON ra.ar_id = ar.ar_id 
    LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId 
    JOIN btggasify_live.master_customer c ON ar.customer_id = c.Id 
    WHERE ar.is_active = 1 AND ra.is_active = 1 AND ar.orgid = p_org_id AND ar.branchid = p_branch_id
      AND (p_customer_id = 0 OR ar.customer_id = p_customer_id)
      AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
      AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
      AND IFNULL(r.is_submitted, 0) = 1

    UNION ALL

    -- Receipts (Allocated via direct ar_id, fallback for single-invoice legacy data)
    SELECT 
        r.receipt_id as transaction_id, 
        ar.customer_id as customer_id, 
        ar.invoice_amt_idr as invoice_amount_idr, 
        cur.CurrencyCode as currencycode, 
        r.receipt_date as ledger_date, 
        c.CustomerName as customer_name, 
        ar.ar_no, 
        ar.invoice_no, 
        (SELECT d.PONumber FROM btggasify_live.tbl_salesinvoices_details d 
         WHERE d.salesinvoicesheaderid = ar.invoice_id LIMIT 1) as po_no,
        ar.inv_amount as invoice_amount, 
        r.reference_no as receipt_no, 
        (r.cash_amount + r.bank_amount) as receipt_amount, 
        0 as debit_note_amount, 
        0 as credit_note_amount, 
        ar.balance_amount as balance, 
        CASE WHEN(IFNULL(r.bank_amount,0) > 0) THEN 'Bank' ELSE 'Cash' END as payment_mode, 
        'Direct AR Mapping' as remarks,
        r.receipt_id, 
        IFNULL(r.deposit_bank_id, 0) as deposit_bank_id, 
        ar.invoice_id as real_invoice_id,
        (r.cash_amount + r.bank_amount) as total_receipt_amount,
        r.combine_group_id,
        r.custom_voucher_no,
        r.is_combined
    FROM btggasify_finance_live.tbl_ar_receipt r
    JOIN btggasify_finance_live.tbl_accounts_receivable ar ON r.ar_id = ar.ar_id 
    LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId 
    JOIN btggasify_live.master_customer c ON ar.customer_id = c.Id 
    WHERE r.is_active = 1 AND r.orgid = p_org_id AND r.branchid = p_branch_id
      AND NOT EXISTS (SELECT 1 FROM btggasify_finance_live.tbl_receipt_ag_ar ra3 WHERE ra3.receipt_id = r.receipt_id AND ra3.is_active = 1)
      AND (p_customer_id = 0 OR r.customer_id = p_customer_id)
      AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
      AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
      AND IFNULL(r.is_submitted, 0) = 1

    UNION ALL

    -- Debit Notes (standalone)
    SELECT 
        dn.DebitNoteId as transaction_id, 
        dn.CustomerId as customer_id, 
        0 as invoice_amount_idr, 
        cur.CurrencyCode as currencycode, 
        dn.TransactionDate as ledger_date, 
        c.CustomerName as customer_name, 
        dn.DebitNoteNumber as ar_no, 
        dn.DebitNoteNumber as invoice_no, 
        '' as po_no,
        0 as invoice_amount, 
        NULL as receipt_no, 
        0 as receipt_amount, 
        dn.Amount as debit_note_amount, 
        0 as credit_note_amount, 
        0 as balance, 
        'Debit Note' as payment_mode, 
        dn.Description as remarks,
        0 as receipt_id, 0 as deposit_bank_id, 
        dn.DebitNoteId as real_invoice_id,
        0 as total_receipt_amount,
        NULL as combine_group_id,
        NULL as custom_voucher_no,
        0 as is_combined
    FROM btggasify_finance_live.Debit_Notes dn 
    JOIN btggasify_live.master_customer c ON dn.CustomerId = c.Id 
    LEFT JOIN btggasify_live.master_currency cur ON dn.CurrencyId = cur.CurrencyId 
    WHERE 1=1
      AND (p_customer_id = 0 OR dn.CustomerId = p_customer_id)
      AND (p_from_date IS NULL OR dn.TransactionDate >= p_from_date)
      AND (p_to_date IS NULL OR dn.TransactionDate <= p_to_date)
      AND NOT EXISTS (SELECT 1 FROM btggasify_finance_live.debit_invoice di WHERE di.DebitNoteId = dn.DebitNoteId)
      AND NOT EXISTS (SELECT 1 FROM btggasify_finance_live.tbl_accounts_receivable ar WHERE ar.invoice_id = dn.DebitNoteId AND ar.doc_type = 'DN')

    UNION ALL

    -- Credit Notes (standalone)
    SELECT 
        cn.CreditNoteId as transaction_id, 
        cn.CustomerId as customer_id, 
        0 as invoice_amount_idr, 
        cur.CurrencyCode as currencycode, 
        cn.TransactionDate as ledger_date, 
        c.CustomerName as customer_name, 
        cn.CreditNoteNumber as ar_no, 
        cn.CreditNoteNumber as invoice_no, 
        '' as po_no,
        0 as invoice_amount, 
        NULL as receipt_no, 
        0 as receipt_amount, 
        0 as debit_note_amount, 
        cn.Amount as credit_note_amount, 
        0 as balance, 
        'Credit Note' as payment_mode, 
        cn.Description as remarks,
        0 as receipt_id, 0 as deposit_bank_id, 
        cn.CreditNoteId as real_invoice_id,
        0 as total_receipt_amount,
        NULL as combine_group_id,
        NULL as custom_voucher_no,
        0 as is_combined
    FROM btggasify_finance_live.Credit_Notes cn 
    JOIN btggasify_live.master_customer c ON cn.CustomerId = c.Id 
    LEFT JOIN btggasify_live.master_currency cur ON cn.CurrencyId = cur.CurrencyId 
    WHERE 1=1
      AND (p_customer_id = 0 OR cn.CustomerId = p_customer_id)
      AND (p_from_date IS NULL OR cn.TransactionDate >= p_from_date)
      AND (p_to_date IS NULL OR cn.TransactionDate <= p_to_date)
      AND NOT EXISTS (SELECT 1 FROM btggasify_finance_live.credit_invoice ci WHERE ci.CreditNoteId = cn.CreditNoteId)

    UNION ALL

    -- Unallocated Receipts (Portion not linked to any Invoice)
    SELECT 
        r.receipt_id as transaction_id, 
        r.customer_id as customer_id, 
        0 as invoice_amount_idr, 
        IFNULL(cur.CurrencyCode, 'IDR') as currencycode, 
        r.receipt_date as ledger_date, 
        c.CustomerName as customer_name, 
        IFNULL(r.reference_no, 'Unallocated') as ar_no, 
        IFNULL(r.reference_no, 'Unallocated') as invoice_no, 
        '' as po_no,
        0 as invoice_amount, 
        r.receipt_no as receipt_no, 
        ((r.cash_amount + r.bank_amount) - IFNULL((SELECT SUM(ra2.payment_amount) FROM btggasify_finance_live.tbl_receipt_ag_ar ra2 WHERE ra2.receipt_id = r.receipt_id AND ra2.is_active = 1), 0)) as receipt_amount, 
        0 as debit_note_amount, 
        0 as credit_note_amount, 
        -((r.cash_amount + r.bank_amount) - IFNULL((SELECT SUM(ra2.payment_amount) FROM btggasify_finance_live.tbl_receipt_ag_ar ra2 WHERE ra2.receipt_id = r.receipt_id AND ra2.is_active = 1), 0)) as balance, 
        CASE WHEN(IFNULL(r.bank_amount,0) > 0) THEN 'Bank' ELSE 'Cash' END as payment_mode, 
        'Standalone/Partial Receipt' as remarks, 
        r.receipt_id, 
        IFNULL(r.deposit_bank_id, 0) as deposit_bank_id, 
        '0' as real_invoice_id,
        (r.cash_amount + r.bank_amount) as total_receipt_amount,
        r.combine_group_id,
        r.custom_voucher_no,
        r.is_combined
    FROM btggasify_finance_live.tbl_ar_receipt r 
    JOIN btggasify_live.master_customer c ON r.customer_id = c.Id 
    LEFT JOIN btggasify_live.master_currency cur ON r.currencyid = cur.CurrencyId 
    WHERE r.is_active = 1 AND r.orgid = p_org_id AND r.branchid = p_branch_id
      AND r.ar_id IS NULL
      AND (p_customer_id = 0 OR r.customer_id = p_customer_id)
      AND (p_from_date IS NULL OR r.receipt_date >= p_from_date)
      AND (p_to_date IS NULL OR r.receipt_date <= p_to_date)
      AND IFNULL(r.is_submitted, 0) = 1
      AND ((r.cash_amount + r.bank_amount) - IFNULL((SELECT SUM(ra2.payment_amount) FROM btggasify_finance_live.tbl_receipt_ag_ar ra2 WHERE ra2.receipt_id = r.receipt_id AND ra2.is_active = 1), 0)) > 0.01

    ORDER BY customer_name, ledger_date, ar_no;
END //
DELIMITER ;

-- 2. proc_AR_GetOutstandingInvoices
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_AR_GetOutstandingInvoices;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_AR_GetOutstandingInvoices(
    IN p_customer_id INT,
    IN p_receipt_id INT,
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT 
        h.id as invoice_id,
        h.salesinvoicenbr as invoice_no,
        (SELECT d.PONumber FROM btggasify_live.tbl_salesinvoices_details d 
         WHERE d.salesinvoicesheaderid = h.id LIMIT 1) as po_no,
        DATE_FORMAT(h.Salesinvoicesdate, '%d-%m-%Y') as invoice_date,
        h.TotalAmount as total_amount,
        cur.CurrencyCode as currencycode,
        (SELECT COALESCE(SUM(ra.payment_amount), 0) 
         FROM btggasify_finance_live.tbl_receipt_ag_ar ra 
         JOIN btggasify_finance_live.tbl_accounts_receivable ar_link ON ra.ar_id = ar_link.ar_id
         WHERE TRIM(ar_link.invoice_no) = TRIM(h.salesinvoicenbr) 
           AND ra.receipt_id = p_receipt_id AND ra.is_active = 1
        ) as allocated_here,
        (h.TotalAmount - 
            (SELECT COALESCE(SUM(ra3.payment_amount), 0) 
             FROM btggasify_finance_live.tbl_receipt_ag_ar ra3 
             JOIN btggasify_finance_live.tbl_accounts_receivable ar_link3 ON ra3.ar_id = ar_link3.ar_id
             WHERE TRIM(ar_link3.invoice_no) = TRIM(h.salesinvoicenbr) 
               AND ra3.is_active = 1
               AND (ra3.receipt_id != p_receipt_id OR p_receipt_id IS NULL)
            ) -
            (SELECT COALESCE(SUM(cn.Amount), 0) 
             FROM btggasify_finance_live.credit_invoice ci 
             JOIN btggasify_finance_live.Credit_Notes cn ON ci.CreditNoteId = cn.CreditNoteId 
             WHERE TRIM(ci.InvoiceNo) = TRIM(h.salesinvoicenbr) AND cn.IsSubmitted = 1)
        ) as balance_due
    FROM btggasify_live.tbl_salesinvoices_header h
    LEFT JOIN btggasify_finance_live.tbl_accounts_receivable ar ON TRIM(h.salesinvoicenbr) = TRIM(ar.invoice_no)
    LEFT JOIN btggasify_live.master_currency cur ON ar.currencyid = cur.CurrencyId
    WHERE h.customerid = p_customer_id
      AND (p_from_date IS NULL OR h.Salesinvoicesdate >= p_from_date)
      AND (p_to_date IS NULL OR h.Salesinvoicesdate <= p_to_date)
      AND h.IsSubmitted = 1
      AND h.IsAR = 1
      AND (
          (h.TotalAmount - 
              (SELECT COALESCE(SUM(ra4.payment_amount), 0) 
               FROM btggasify_finance_live.tbl_receipt_ag_ar ra4 
               JOIN btggasify_finance_live.tbl_accounts_receivable ar_link4 ON ra4.ar_id = ar_link4.ar_id
               WHERE TRIM(ar_link4.invoice_no) = TRIM(h.salesinvoicenbr) AND ra4.is_active = 1
              ) -
              (SELECT COALESCE(SUM(cn2.Amount), 0) 
               FROM btggasify_finance_live.credit_invoice ci2 
               JOIN btggasify_finance_live.Credit_Notes cn2 ON ci2.CreditNoteId = cn2.CreditNoteId 
               WHERE TRIM(ci2.InvoiceNo) = TRIM(h.salesinvoicenbr) AND cn2.IsSubmitted = 1)
          ) > 0.01
          OR 
          -- Match by Invoice Number in link table (override for current receipt)
          EXISTS (
              SELECT 1 FROM btggasify_finance_live.tbl_receipt_ag_ar ra2
              JOIN btggasify_finance_live.tbl_accounts_receivable ar_link2 ON ra2.ar_id = ar_link2.ar_id
              WHERE TRIM(ar_link2.invoice_no) = TRIM(h.salesinvoicenbr)
                AND ra2.receipt_id = p_receipt_id AND ra2.is_active = 1
          )
      )
      AND h.salesinvoicenbr NOT IN (
          SELECT DISTINCT DOnumber 
          FROM btggasify_live.tbl_salesinvoices_details 
          WHERE DOnumber IS NOT NULL AND DOnumber != ''
      )
      AND h.salesinvoicenbr NOT LIKE 'DO %'
    ORDER BY h.Salesinvoicesdate ASC;
END //
DELIMITER ;

-- 3. proc_AR_GetCustomerAddress
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_AR_GetCustomerAddress;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_AR_GetCustomerAddress(IN p_customer_id INT)
BEGIN
    SELECT 
        c.Id as customer_id,
        c.CustomerName as customer_name,
        COALESCE(c.Address, '') as address,
        COALESCE(c.City, '') as city,
        COALESCE(c.Country, '') as country
    FROM btggasify_live.master_customer c
    WHERE c.Id = p_customer_id AND c.IsActive = 1;
END //
DELIMITER ;

-- 4. proc_AR_GetPendingList
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_AR_GetPendingList;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_AR_GetPendingList(
    IN p_department VARCHAR(10),
    IN p_user_id INT
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
        c.CustomerName,
        (SELECT COUNT(*) FROM btggasify_finance_live.tbl_ar_receipt_messages WHERE receipt_id = r.receipt_id AND sender_role = 'Finance' AND is_read = 0) as unread_count
    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    LEFT JOIN btggasify_masterpanel_live.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
    LEFT JOIN btggasify_live.master_currency mc ON b.CurrencyId = mc.CurrencyId
    WHERE r.is_active = 1 
      AND (IFNULL(r.bank_amount, 0) != 0 OR IFNULL(r.cash_amount, 0) != 0)
      AND IFNULL(r.is_submitted, 0) = 0
      AND r.is_posted = 1
      AND (p_department != '9' OR r.sales_person_id = p_user_id)
    ORDER BY r.receipt_id DESC;
END //
DELIMITER ;

-- 5. proc_AR_GetCurrencyIds
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_AR_GetCurrencyIds;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_AR_GetCurrencyIds()
BEGIN
    SELECT CurrencyId, CurrencyCode FROM btggasify_live.master_currency;
END //
DELIMITER ;


-- ============================================================
-- B. BANK BOOK (bankbook.py)
-- ============================================================

-- 6. proc_Bank_GetDailyEntries
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Bank_GetDailyEntries;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Bank_GetDailyEntries()
BEGIN
    SELECT 
        r.receipt_id,
        COALESCE(r.receipt_date, r.created_date) as date,
        r.customer_id,
        r.transaction_type,
        CASE 
            WHEN r.transaction_type = 'Bank transfer' THEN COALESCE(pb.BankName, 'Unknown Bank')
            WHEN r.transaction_type = 'Bank Interest' THEN 'N/A'
            WHEN LOWER(r.transaction_type) = 'cash deposit' THEN 'Cash Deposit'
            WHEN r.bank_amount < 0 AND r.customer_id != 0 THEN COALESCE(s.SupplierName, 'Unknown Supplier')
            WHEN r.customer_id = 0 AND r.reference_no LIKE 'CLM%' THEN SUBSTRING_INDEX(r.reference_no, ' - ', -1)
            ELSE COALESCE(c.CustomerName, 'Unknown Customer')
        END as customerName,
        r.bank_amount,
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
        END as verification_status,
        COALESCE(b.BankName, 'Unknown Bank') as bank_name,
        COALESCE(mc.CurrencyCode, 'IDR') as CurrencyCode,
        r.bank_charges,
        r.currencyid,
        r.combine_group_id,
        r.custom_voucher_no,
        (SELECT COUNT(*) FROM btggasify_finance_live.tbl_ar_receipt_messages WHERE receipt_id = r.receipt_id AND sender_role = 'Marketing' AND is_read = 0) as unread_count
    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    LEFT JOIN btggasify_masterpanel_live.master_supplier s ON r.customer_id = s.SupplierId
    LEFT JOIN btggasify_masterpanel_live.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
    LEFT JOIN btggasify_masterpanel_live.master_bank pb ON r.customer_id = pb.BankId
    LEFT JOIN btggasify_live.master_currency mc ON r.currencyid = mc.CurrencyId
    WHERE r.bank_amount != 0
      AND r.is_active = 1
      AND (r.reference_no NOT LIKE 'CLM%' OR r.reference_no IS NULL)
      AND IFNULL(r.is_submitted, 0) = 0
    ORDER BY r.receipt_id DESC;
END //
DELIMITER ;

-- 7. proc_Bank_GetReport
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Bank_GetReport;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Bank_GetReport(
    IN p_from_date DATE,
    IN p_to_date DATE,
    IN p_bank_id INT,
    IN p_currency_id INT
)
BEGIN
    SELECT 
        r.receipt_id,
        COALESCE(r.receipt_date, r.created_date) as Date,
        r.reference_no as VoucherNo,
        CASE 
            WHEN r.bank_amount < 0 THEN 'Payment' 
            ELSE 'Receipt' 
        END as TransactionType, 
        CASE 
            WHEN r.bank_amount < 0 AND r.customer_id != 0 THEN COALESCE(s.SupplierName, 'Unknown Supplier')
            WHEN r.customer_id = 0 AND r.reference_no LIKE 'CLM%' THEN SUBSTRING_INDEX(r.reference_no, ' - ', -1)
            ELSE COALESCE(c.CustomerName, 'Unknown Customer') 
        END as Party,
        COALESCE(b.BankName, 'Unknown Bank') as BankName,
        r.deposit_bank_id,
        r.reference_no as Description,
        COALESCE(mc.CurrencyCode, 'IDR') as Currency,
        CASE WHEN r.bank_amount > 0 THEN r.bank_amount ELSE 0 END as Receipts,
        CASE WHEN r.bank_amount < 0 THEN ABS(r.bank_amount) ELSE 0 END as Payments,
        ABS(r.bank_amount) as NetAmount,
        IFNULL(r.bank_charges, 0) as BankCharges
    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    LEFT JOIN btggasify_masterpanel_live.master_supplier s ON r.customer_id = s.SupplierId
    LEFT JOIN btggasify_live.master_currency mc ON r.currencyid = mc.CurrencyId
    LEFT JOIN btggasify_masterpanel_live.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
    WHERE DATE(COALESCE(r.receipt_date, r.created_date)) BETWEEN p_from_date AND p_to_date
      AND r.is_active = 1
      AND IFNULL(r.is_submitted, 0) = 1
      AND r.bank_amount != 0
      AND (r.reference_no NOT LIKE 'CLM%' OR r.reference_no IS NULL
           OR (r.deposit_bank_id IS NULL OR r.deposit_bank_id = '' OR r.deposit_bank_id = '0'))
      AND (p_bank_id = 0 OR r.deposit_bank_id = CAST(p_bank_id AS CHAR))
      AND (p_currency_id = 0 OR r.currencyid = p_currency_id)
    ORDER BY COALESCE(r.receipt_date, r.created_date) ASC, r.receipt_id ASC;
END //
DELIMITER ;


-- ============================================================
-- C. CASH BOOK (cashbook.py)
-- ============================================================

-- 8. proc_Cash_GetDailyEntries
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Cash_GetDailyEntries;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Cash_GetDailyEntries()
BEGIN
    SELECT 
        r.receipt_id,
        COALESCE(r.receipt_date, r.created_date) as date,
        r.customer_id,
        CASE 
            WHEN LOWER(r.transaction_type) = 'cash deposit' THEN 'Cash Deposit'
            WHEN r.cash_amount < 0 AND r.customer_id != 0 THEN COALESCE(s.SupplierName, 'Unknown Supplier')
            WHEN r.reference_no LIKE 'CLM%' AND r.reference_no LIKE '% - %' THEN SUBSTRING_INDEX(r.reference_no, ' - ', -1)
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
      AND IFNULL(r.is_submitted, 0) = 0
    ORDER BY r.receipt_id DESC;
END //
DELIMITER ;

-- 9. proc_Cash_GetReport
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Cash_GetReport;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Cash_GetReport(
    IN p_from_date DATE,
    IN p_to_date DATE,
    IN p_bank_id INT,
    IN p_currency_id INT
)
BEGIN
    SELECT 
        r.receipt_id,
        COALESCE(r.receipt_date, r.created_date) as Date,
        CASE 
            WHEN r.reference_no LIKE 'PC%' AND r.reference_no LIKE '% | %' THEN SUBSTRING_INDEX(r.reference_no, ' | ', 1)
            ELSE r.reference_no 
        END as VoucherNo,
        COALESCE(r.transaction_type, CASE WHEN r.cash_amount > 0 THEN 'Receipt' ELSE 'Payment' END) as TransactionType, 
        CASE 
            WHEN LOWER(r.transaction_type) = 'deposit to bank' THEN COALESCE(b.BankName, 'Bank Withdrawal')
            WHEN LOWER(r.transaction_type) = 'bank transfer' AND r.bank_amount < 0 THEN COALESCE(b.BankName, 'Bank Withdrawal')
            WHEN (r.cash_amount > 0 OR r.transaction_type = 'Deposit') AND r.deposit_bank_id != '0' AND r.deposit_bank_id IS NOT NULL 
                THEN COALESCE(b.BankName, 'Bank Withdrawal')
            WHEN r.cash_amount < 0 AND r.customer_id != 0 
                THEN COALESCE(s.SupplierName, 'Unknown Supplier')
            WHEN r.reference_no LIKE 'PC%' AND r.reference_no LIKE '% | %'
                THEN SUBSTRING_INDEX(r.reference_no, ' | ', -1)
            WHEN r.reference_no LIKE 'CLM%' AND r.reference_no LIKE '% - %'
                THEN SUBSTRING_INDEX(r.reference_no, ' - ', -1)
            ELSE COALESCE(c.CustomerName, 'Unknown Customer') 
        END as Party,
        COALESCE(b.BankName, '-') as BankName,
        r.deposit_bank_id,
        r.reference_no as Description,
        COALESCE(mc.CurrencyCode, 'IDR') as Currency, 
        CASE WHEN r.cash_amount > 0 THEN r.cash_amount ELSE 0 END as CashIn,
        CASE WHEN r.cash_amount < 0 THEN ABS(r.cash_amount) ELSE 0 END as CashOut,
        ABS(r.cash_amount) as NetAmount
    FROM btggasify_finance_live.tbl_ar_receipt r
    LEFT JOIN btggasify_live.master_customer c ON r.customer_id = c.Id
    LEFT JOIN btggasify_masterpanel_live.master_supplier s ON r.customer_id = s.SupplierId
    LEFT JOIN btggasify_live.master_currency mc ON r.currencyid = mc.CurrencyId
    LEFT JOIN btggasify_masterpanel_live.master_bank b ON CAST(NULLIF(r.deposit_bank_id, '') AS UNSIGNED) = b.BankId
    WHERE DATE(COALESCE(r.receipt_date, r.created_date)) BETWEEN p_from_date AND p_to_date
      AND r.is_active = 1
      AND (r.is_posted = 1 OR IFNULL(r.is_submitted, 0) = 1)
      AND (r.cash_amount > 0 OR (r.cash_amount != 0 AND LOWER(r.transaction_type) != 'bank transfer'))
      AND (r.reference_no NOT LIKE 'CLM%' OR r.reference_no IS NULL
           OR (r.deposit_bank_id IS NULL OR r.deposit_bank_id = '' OR r.deposit_bank_id = '0'))
      AND (p_bank_id = 0 OR r.deposit_bank_id = CAST(p_bank_id AS CHAR))
      AND (p_currency_id = 0 OR IFNULL(r.currencyid, 3) = p_currency_id)
    ORDER BY COALESCE(r.receipt_date, r.created_date) ASC, r.receipt_id ASC;
END //
DELIMITER ;


-- ============================================================
-- D. OVERDRAFT (overdraft.py)
-- ============================================================

-- 10. proc_OD_GetList
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_OD_GetList;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_OD_GetList(
    IN p_overdraftid INT,
    IN p_overdrafttype VARCHAR(50),
    IN p_voucherno VARCHAR(50)
)
BEGIN
    SELECT * FROM btggasify_finance_live.tbl_overdraft 
    WHERE IsActive = 1
      AND (p_overdraftid = 0 OR OverDraftId = p_overdraftid)
      AND (p_overdrafttype IS NULL OR p_overdrafttype = '' OR OverDraftType = p_overdrafttype)
      AND (p_voucherno IS NULL OR p_voucherno = '' OR VoucherNo = p_voucherno)
    ORDER BY OverDraftId DESC;
END //
DELIMITER ;


-- ============================================================
-- E. PETTY CASH (petty_cash.py)
-- ============================================================

-- 11. proc_PC_GetList
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_PC_GetList;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_PC_GetList(
    IN p_pettycashid INT,
    IN p_exptype INT,
    IN p_voucherno VARCHAR(50),
    IN p_category_id INT,
    IN p_from_date DATE,
    IN p_to_date DATE
)
BEGIN
    SELECT t1.*, t2.CurrencyCode, t3.category_name, t4.expense_type
    FROM btggasify_finance_live.tbl_petty_cash t1
    LEFT JOIN btggasify_live.master_currency t2 ON t1.currencyid = t2.CurrencyId
    LEFT JOIN btggasify_masterpanel_live.master_expense_category t3 ON t1.category_id = t3.id
    LEFT JOIN btggasify_masterpanel_live.master_expense_type t4 ON t1.expense_type_id = t4.id
    WHERE 1=1
      AND (p_pettycashid = 0 OR t1.PettyCashId = p_pettycashid)
      AND (p_exptype IS NULL OR p_exptype = 0 OR t1.expense_type_id = p_exptype)
      AND (p_voucherno IS NULL OR p_voucherno = '' OR t1.VoucherNo = p_voucherno)
      AND (p_category_id IS NULL OR p_category_id = 0 OR t1.category_id = p_category_id)
      AND (p_from_date IS NULL OR t1.ExpDate >= p_from_date)
      AND (p_to_date IS NULL OR t1.ExpDate <= p_to_date)
    ORDER BY t1.PettyCashId DESC;
END //
DELIMITER ;

-- 12. proc_PC_GetExchangeRate
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_PC_GetExchangeRate;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_PC_GetExchangeRate(IN p_currency_id INT)
BEGIN
    SELECT COALESCE(ExchangeRate, 1) as rate FROM btggasify_live.master_currency WHERE CurrencyId = p_currency_id;
END //
DELIMITER ;

-- 13. proc_PC_GetExpenseCategories
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_PC_GetExpenseCategories;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_PC_GetExpenseCategories()
BEGIN
    SELECT * FROM btggasify_masterpanel_live.master_expense_category;
END //
DELIMITER ;

-- 14. proc_PC_GetExpenseTypes
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_PC_GetExpenseTypes;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_PC_GetExpenseTypes(IN p_category_id INT)
BEGIN
    SELECT * FROM btggasify_masterpanel_live.master_expense_type 
    WHERE 1=1
      AND (p_category_id IS NULL OR p_category_id = 0 OR category_id = p_category_id);
END //
DELIMITER ;

-- 15. proc_PC_GetCurrencies
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_PC_GetCurrencies;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_PC_GetCurrencies()
BEGIN
    SELECT * FROM btggasify_live.master_currency;
END //
DELIMITER ;


-- ============================================================
-- F. JOURNAL (journal.py)
-- ============================================================

-- 16. proc_Jnl_GetCustomers
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Jnl_GetCustomers;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Jnl_GetCustomers()
BEGIN
    SELECT Id as id, CustomerName as name FROM btggasify_live.master_customer WHERE IsActive = 1;
END //
DELIMITER ;

-- 17. proc_Jnl_GetSuppliers
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Jnl_GetSuppliers;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Jnl_GetSuppliers()
BEGIN
    SELECT SupplierId as id, SupplierName as name FROM btggasify_masterpanel_live.master_supplier WHERE IsActive = 1;
END //
DELIMITER ;

-- 18. proc_Jnl_GetBanks
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Jnl_GetBanks;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Jnl_GetBanks()
BEGIN
    SELECT BankId as id, BankName as name FROM btggasify_masterpanel_live.master_bank WHERE IsActive = 1;
END //
DELIMITER ;

-- 19. proc_Jnl_GetGLCodes
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Jnl_GetGLCodes;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Jnl_GetGLCodes()
BEGIN
    SELECT id, GLcode, description FROM btggasify_finance_live.tbl_GLcodemaster WHERE isActive = 1;
END //
DELIMITER ;

-- 20. proc_Jnl_InsertDetail
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Jnl_InsertDetail;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Jnl_InsertDetail(
    IN p_journal_id INT, IN p_gl_code VARCHAR(50), IN p_type VARCHAR(20),
    IN p_description VARCHAR(500), IN p_amount DECIMAL(18,2), IN p_reference_no VARCHAR(100)
)
BEGIN
    INSERT INTO btggasify_finance_live.tbl_journal_details 
    (journal_id, gl_code, type, description, amount, reference_no)
    VALUES (p_journal_id, p_gl_code, p_type, p_description, p_amount, p_reference_no);
END //
DELIMITER ;

-- 21. proc_Jnl_UpdatePosted
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Jnl_UpdatePosted;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Jnl_UpdatePosted(IN p_journal_id INT, IN p_is_posted TINYINT)
BEGIN
    UPDATE btggasify_finance_live.tbl_journal_master SET is_posted = p_is_posted WHERE journal_id = p_journal_id;
END //
DELIMITER ;

-- 22. proc_Jnl_GetHeader
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Jnl_GetHeader;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Jnl_GetHeader(IN p_journal_id INT)
BEGIN
    SELECT journal_id as id, journal_no, DATE_FORMAT(journal_date, '%Y-%m-%d') as journal_date, 
           description, party_type, party_id, party_name, reference_no, 
           total_amount, status, created_by, is_posted
    FROM btggasify_finance_live.tbl_journal_master
    WHERE journal_id = p_journal_id;
END //
DELIMITER ;

-- 23. proc_Jnl_GetDetails
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Jnl_GetDetails;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Jnl_GetDetails(IN p_journal_id INT)
BEGIN
    SELECT detail_id as id, gl_code, type, description, amount, reference_no 
    FROM btggasify_finance_live.tbl_journal_details
    WHERE journal_id = p_journal_id;
END //
DELIMITER ;

-- 24. proc_Jnl_UpdateHeader
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Jnl_UpdateHeader;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Jnl_UpdateHeader(
    IN p_journal_id INT, IN p_journal_date DATE, IN p_description VARCHAR(500),
    IN p_party_type VARCHAR(50), IN p_party_id INT, IN p_party_name VARCHAR(200),
    IN p_reference_no VARCHAR(100), IN p_total_amount DECIMAL(18,2), 
    IN p_status VARCHAR(20), IN p_is_posted TINYINT
)
BEGIN
    UPDATE btggasify_finance_live.tbl_journal_master 
    SET journal_date = p_journal_date, description = p_description, party_type = p_party_type, 
        party_id = p_party_id, party_name = p_party_name, reference_no = p_reference_no, 
        total_amount = p_total_amount, status = p_status, is_posted = p_is_posted, updated_at = NOW()
    WHERE journal_id = p_journal_id;
END //
DELIMITER ;

-- 25. proc_Jnl_DeleteDetails
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Jnl_DeleteDetails;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Jnl_DeleteDetails(IN p_journal_id INT)
BEGIN
    DELETE FROM btggasify_finance_live.tbl_journal_details WHERE journal_id = p_journal_id;
END //
DELIMITER ;

-- 26. proc_Jnl_GetAll
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_Jnl_GetAll;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_Jnl_GetAll()
BEGIN
    SELECT journal_id as id, journal_no as journalNo, 
           DATE_FORMAT(journal_date, '%Y-%m-%d') as date, 
           description, total_amount as amount, status
    FROM btggasify_finance_live.tbl_journal_master
    ORDER BY journal_date DESC, journal_id DESC;
END //
DELIMITER ;


-- ============================================================
-- G. DN/CN (dn_cn.py)
-- ============================================================

-- 27. proc_DNCN_GetCustomers
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DNCN_GetCustomers;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DNCN_GetCustomers()
BEGIN
    SELECT Id, CustomerName FROM btggasify_live.master_customer WHERE IsActive = 1 ORDER BY CustomerName ASC;
END //
DELIMITER ;

-- 28. proc_DNCN_GetAllCN
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DNCN_GetAllCN;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DNCN_GetAllCN()
BEGIN
    SELECT cn.*, mc.CurrencyCode 
    FROM btggasify_finance_live.Credit_Notes cn
    LEFT JOIN btggasify_live.master_currency mc ON cn.CurrencyId = mc.CurrencyId
    ORDER BY cn.CreditNoteId DESC;
END //
DELIMITER ;

-- 29. proc_DNCN_GetAllDN
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DNCN_GetAllDN;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DNCN_GetAllDN()
BEGIN
    SELECT dn.*, mc.CurrencyCode 
    FROM btggasify_finance_live.Debit_Notes dn
    LEFT JOIN btggasify_live.master_currency mc ON dn.CurrencyId = mc.CurrencyId
    ORDER BY dn.DebitNoteId DESC;
END //
DELIMITER ;

-- 30. proc_DNCN_GetCNById
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DNCN_GetCNById;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DNCN_GetCNById(IN p_id INT)
BEGIN
    SELECT cn.*, mc.CurrencyCode 
    FROM btggasify_finance_live.Credit_Notes cn
    LEFT JOIN btggasify_live.master_currency mc ON cn.CurrencyId = mc.CurrencyId
    WHERE cn.CreditNoteId = p_id;
END //
DELIMITER ;

-- 31. proc_DNCN_GetDNById
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DNCN_GetDNById;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DNCN_GetDNById(IN p_id INT)
BEGIN
    SELECT dn.*, mc.CurrencyCode 
    FROM btggasify_finance_live.Debit_Notes dn
    LEFT JOIN btggasify_live.master_currency mc ON dn.CurrencyId = mc.CurrencyId
    WHERE dn.DebitNoteId = p_id;
END //
DELIMITER ;


-- ============================================================
-- H. DSI / INVOICE (invoice_api.py)
-- ============================================================

-- 32. proc_DSI_CheckDuplicate
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_CheckDuplicate;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_CheckDuplicate(
    IN p_invoice_nbr VARCHAR(100), IN p_exclude_id INT
)
BEGIN
    SELECT count(*) as cnt FROM btggasify_live.tbl_salesinvoices_header 
    WHERE salesinvoicenbr = p_invoice_nbr COLLATE utf8mb4_general_ci AND isactive = 1
      AND (p_exclude_id = 0 OR id != p_exclude_id);
END //
DELIMITER ;

-- 33. proc_DSI_GetExchangeRate
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetExchangeRate;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetExchangeRate(IN p_currency_id INT)
BEGIN
    SELECT COALESCE(ExchangeRate, 1) as rate FROM btggasify_live.master_currency WHERE CurrencyId = p_currency_id;
END //
DELIMITER ;

-- 34. proc_DSI_GetAllInvoices
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetAllInvoices;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetAllInvoices(
    IN p_from_date DATE, IN p_to_date DATE, IN p_customer_id INT, IN p_is_ar INT
)
BEGIN
    SELECT 
        h.id AS InvoiceId,
        h.salesinvoicenbr AS InvoiceNbr,
        DATE_FORMAT(h.Salesinvoicesdate, '%Y-%m-%d') AS Salesinvoicesdate,
        COALESCE(c.CustomerName, 'Unknown') AS CustomerName,
        (SELECT d.PONumber FROM btggasify_live.tbl_salesinvoices_details d 
         WHERE d.salesinvoicesheaderid = h.id LIMIT 1) AS PONumber, 
        (SELECT mc.CurrencyCode 
         FROM btggasify_live.tbl_salesinvoices_details d 
         JOIN btggasify_live.master_currency mc ON d.Currencyid = mc.CurrencyId
         WHERE d.salesinvoicesheaderid = h.id LIMIT 1) AS CurrencyCode,
        h.TotalAmount,
        COALESCE(h.CalculatedPrice, h.TotalAmount) AS CalculatedPrice,
        CASE WHEN h.IsSubmitted = 1 THEN 'Posted' ELSE 'Saved' END AS Status,
        (SELECT d.DOnumber FROM btggasify_live.tbl_salesinvoices_details d 
         WHERE d.salesinvoicesheaderid = h.id LIMIT 1) AS DOnumber,
        (SELECT d.uomid FROM btggasify_live.tbl_salesinvoices_details d 
         WHERE d.salesinvoicesheaderid = h.id LIMIT 1) AS uomid
    FROM btggasify_live.tbl_salesinvoices_header h
    LEFT JOIN btggasify_live.master_customer c ON h.customerid = c.Id
    WHERE h.Salesinvoicesdate BETWEEN p_from_date AND p_to_date
      AND (p_customer_id = 0 OR h.customerid = p_customer_id)
      AND h.isactive = 1 
      AND (p_is_ar = 2 OR h.IsSubmitted = p_is_ar)
    ORDER BY h.id DESC;
END //
DELIMITER ;

-- 35. proc_DSI_GetHeader
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetHeader;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetHeader(IN p_input_val VARCHAR(100))
BEGIN
    SELECT 
        h.id AS InvoiceId, 
        h.salesinvoicenbr AS InvoiceNbr,
        COALESCE(DATE_FORMAT(h.Salesinvoicesdate, '%Y-%m-%d'), '') AS Salesinvoicesdate,
        h.customerid,
        COALESCE(c.CustomerName, 'Unknown') AS CustomerName,
        COALESCE(h.TotalAmount, 0) AS TotalAmount,
        COALESCE(h.CalculatedPrice, h.TotalAmount, 0) AS CalculatedPrice,
        CASE WHEN h.IsSubmitted = 1 THEN 'Posted' ELSE 'Saved' END AS Status
    FROM btggasify_live.tbl_salesinvoices_header h
    LEFT JOIN btggasify_live.master_customer c ON h.customerid = c.Id
    WHERE (h.salesinvoicenbr = p_input_val COLLATE utf8mb4_general_ci OR h.id = CAST(p_input_val AS UNSIGNED))
      AND h.isactive = 1;
END //
DELIMITER ;

-- 36. proc_DSI_GetDetails
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetDetails;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetDetails(IN p_header_id INT)
BEGIN
    SELECT 
        d.id AS Id,
        COALESCE(d.gascodeid, 0) AS gascodeid,
        COALESCE(g.GasName, 'Item') AS GasName,
        COALESCE(d.PickedQty, 0) AS PickedQty,
        COALESCE(d.UnitPrice, 0) AS UnitPrice,
        COALESCE(d.TotalPrice, 0) AS TotalPrice,
        COALESCE(d.Currencyid, 1) AS Currencyid,
        COALESCE(d.ExchangeRate, 1) AS ExchangeRate, 
        COALESCE(d.Price, 0) AS Price,
        COALESCE(d.DOnumber, '') AS DOnumber,
        COALESCE(d.PONumber, '') AS PONumber,
        COALESCE(d.uomid, 0) AS uomid,
        COALESCE(d.Note, '') AS Note,
        COALESCE(d.SellingPrice, 0) AS SellingPrice,
        COALESCE(d.SellingTotal, 0) AS SellingTotal
    FROM btggasify_live.tbl_salesinvoices_details d
    LEFT JOIN btggasify_live.master_gascode g ON d.gascodeid = g.Id
    WHERE d.salesinvoicesheaderid = p_header_id;
END //
DELIMITER ;

-- 37. proc_DSI_GetAvailableDOs
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetAvailableDOs;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetAvailableDOs(IN p_customer_id INT)
BEGIN
    SELECT 
        h.id as do_id,
        h.salesinvoicenbr as do_number,
        DATE_FORMAT(h.Salesinvoicesdate, '%Y-%m-%d') as do_date,
        h.TotalQty as qty,
        h.TotalAmount as total,
        MAX(g.GasName) as GasName
    FROM btggasify_live.tbl_salesinvoices_header h
    LEFT JOIN btggasify_live.tbl_salesinvoices_details det ON h.id = det.salesinvoicesheaderid
    LEFT JOIN btggasify_live.master_gascode g ON det.gascodeid = g.Id
    WHERE h.customerid = p_customer_id
      AND h.isactive = 1 
      AND NOT EXISTS (
          SELECT 1 
          FROM btggasify_live.tbl_salesinvoices_details det_link 
          JOIN btggasify_live.tbl_salesinvoices_header h_link ON det_link.salesinvoicesheaderid = h_link.id
          WHERE TRIM(det_link.DOnumber) = TRIM(h.salesinvoicenbr) COLLATE utf8mb4_general_ci
            AND h_link.isactive = 1
      )
    GROUP BY h.id, h.salesinvoicenbr, h.Salesinvoicesdate, h.TotalQty, h.TotalAmount
    ORDER BY h.Salesinvoicesdate ASC;
END //
DELIMITER ;

-- 38. proc_DSI_GetGasItems
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetGasItems;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetGasItems()
BEGIN
    SELECT Id, GasName FROM btggasify_live.master_gascode WHERE IsActive = 1 ORDER BY GasName ASC;
END //
DELIMITER ;

-- 39. proc_DSI_GetSalesDetails
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetSalesDetails;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetSalesDetails(
    IN p_from_date DATE, IN p_to_date DATE, IN p_customer_id INT,
    IN p_item_id INT, IN p_sp_id INT
)
BEGIN
    SELECT 
        d.id as DetailId,
        DATE_FORMAT(h.Salesinvoicesdate, '%Y-%m-%d') AS Salesinvoicesdate,
        COALESCE(TRIM(c.CustomerName), 'Unknown') AS CustomerName,
        mc.CurrencyCode as InvoiceCurrency,
        h.salesinvoicenbr as InvoiceNo,
        COALESCE(d.DOnumber, '') AS DONumber,
        COALESCE(g.GasName, 'Item') as ItemName,
        d.PickedQty as Qty,
        d.UnitPrice,
        d.TotalPrice as OriginalTotal, 
        (d.TotalPrice * COALESCE(mc.ExchangeRate, 1)) as ConvertedTotal
    FROM btggasify_live.tbl_salesinvoices_header h
    JOIN btggasify_live.tbl_salesinvoices_details d ON h.id = d.salesinvoicesheaderid
    LEFT JOIN btggasify_live.master_customer c ON h.customerid = c.Id
    LEFT JOIN btggasify_live.master_gascode g ON d.gascodeid = g.Id
    LEFT JOIN btggasify_live.master_currency mc ON d.Currencyid = mc.CurrencyId
    WHERE DATE(h.Salesinvoicesdate) BETWEEN p_from_date AND p_to_date 
      AND h.isactive = 1 
      AND (p_customer_id = 0 OR h.customerid = p_customer_id)
      AND (p_item_id = 0 OR d.gascodeid = p_item_id)
      AND (p_sp_id = 0 OR c.SalesPersonId = p_sp_id)
    ORDER BY COALESCE(TRIM(c.CustomerName), 'Unknown') ASC, h.Salesinvoicesdate ASC, h.salesinvoicenbr ASC;
END //
DELIMITER ;

-- 40. proc_DSI_GetItemFilter
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_GetItemFilter;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_GetItemFilter()
BEGIN
    SELECT Id as value, GasName as label FROM btggasify_live.master_gascode WHERE IsActive = 1 ORDER BY GasName;
END //
DELIMITER ;
