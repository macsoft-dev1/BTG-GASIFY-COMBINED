-- Fix Collation issue in DSI_GetHeader
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
    FROM btggasify_userpanel_live.tbl_salesinvoices_header h
    LEFT JOIN btggasify_live.master_customer c ON h.customerid = c.Id
    WHERE (h.salesinvoicenbr = p_input_val COLLATE utf8mb4_general_ci OR h.id = CAST(p_input_val AS UNSIGNED))
      AND h.isactive = 1;
END //
DELIMITER ;

-- Fix Collation issue in DSI_CheckDuplicate
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_CheckDuplicate;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_CheckDuplicate(
    IN p_invoice_nbr VARCHAR(100), IN p_exclude_id INT
)
BEGIN
    SELECT count(*) as cnt FROM btggasify_userpanel_live.tbl_salesinvoices_header 
    WHERE salesinvoicenbr = p_invoice_nbr COLLATE utf8mb4_general_ci AND isactive = 1
      AND (p_exclude_id = 0 OR id != p_exclude_id);
END //
DELIMITER ;

-- Fix Collation issue in DSI_CheckDOConverted
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

-- Fix OD_GetList
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
      AND (p_overdrafttype IS NULL OR p_overdrafttype = '' OR OverDraftType = p_overdrafttype COLLATE utf8mb4_general_ci)
      AND (p_voucherno IS NULL OR p_voucherno = '' OR VoucherNo = p_voucherno COLLATE utf8mb4_general_ci)
    ORDER BY OverDraftId DESC;
END //
DELIMITER ;

-- Fix PC_GetList
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
      AND (p_voucherno IS NULL OR p_voucherno = '' OR t1.VoucherNo = p_voucherno COLLATE utf8mb4_general_ci)
      AND (p_category_id IS NULL OR p_category_id = 0 OR t1.category_id = p_category_id)
      AND (p_from_date IS NULL OR t1.ExpDate >= p_from_date)
      AND (p_to_date IS NULL OR t1.ExpDate <= p_to_date)
    ORDER BY t1.PettyCashId DESC;
END //
DELIMITER ;
