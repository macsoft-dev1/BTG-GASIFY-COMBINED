-- FINAL MISSED DELETE SP
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_DSI_DeleteDetails;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_DSI_DeleteDetails(IN p_header_id INT)
BEGIN
    DELETE FROM btggasify_userpanel_live.tbl_salesinvoices_details 
    WHERE salesinvoicesheaderid = p_header_id;
END //
DELIMITER ;
