-- ==========================================================
-- PETTY CASH MODULE PROCEDURES
-- ==========================================================

-- 1. Fetch Petty Cash List with joins
DROP PROCEDURE IF EXISTS proc_GetPettyCashList;
DELIMITER //
CREATE PROCEDURE proc_GetPettyCashList(
    IN p_pettycashid INT,
    IN p_exptype INT,
    IN p_voucherno VARCHAR(100),
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
    WHERE (p_pettycashid = 0 OR t1.PettyCashId = p_pettycashid)
      AND (p_exptype IS NULL OR t1.expense_type_id = p_exptype)
      AND (p_voucherno IS NULL OR t1.VoucherNo = p_voucherno)
      AND (p_category_id IS NULL OR t1.category_id = p_category_id)
      AND (p_from_date IS NULL OR t1.ExpDate >= p_from_date)
      AND (p_to_date IS NULL OR t1.ExpDate <= p_to_date)
    ORDER BY t1.PettyCashId DESC;
END //
DELIMITER ;

-- 2. Fetch Master Expense Categories
DROP PROCEDURE IF EXISTS proc_GetMasterExpenseCategories;
DELIMITER //
CREATE PROCEDURE proc_GetMasterExpenseCategories()
BEGIN
    SELECT * FROM btggasify_masterpanel_live.master_expense_category;
END //
DELIMITER ;

-- 3. Fetch Master Expense Types
DROP PROCEDURE IF EXISTS proc_GetMasterExpenseTypes;
DELIMITER //
CREATE PROCEDURE proc_GetMasterExpenseTypes(IN p_category_id INT)
BEGIN
    SELECT * 
    FROM btggasify_masterpanel_live.master_expense_type 
    WHERE (p_category_id IS NULL OR category_id = p_category_id);
END //
DELIMITER ;

-- 4. Fetch Master Currency for Petty Cash
DROP PROCEDURE IF EXISTS proc_GetMasterCurrency;
DELIMITER //
CREATE PROCEDURE proc_GetMasterCurrency()
BEGIN
    SELECT * FROM btggasify_live.master_currency;
END //
DELIMITER ;
