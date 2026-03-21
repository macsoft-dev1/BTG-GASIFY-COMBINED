-- ============================================================
-- GAS MASTER STORED PROCEDURES
-- ============================================================

-- 1. proc_GasMaster_GetAll
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_GasMaster_GetAll;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_GasMaster_GetAll(
    IN p_gas_name VARCHAR(100),
    IN p_volume VARCHAR(50),
    IN p_pressure VARCHAR(50)
)
BEGIN
    SELECT 
        g.Id,
        g.GasCode,
        g.GasName,
        g.Volume,
        g.Pressure,
        g.VolumeId,
        g.PressureId,
        g.GasTypeId,
        g.Descriptions,
        CAST(g.IsActive AS UNSIGNED) as IsActive,
        gt.TypeName as GasTypeName
    FROM btggasify_live.master_gascode g
    LEFT JOIN btggasify_live.master_gastypes gt ON g.GasTypeId = gt.Id
    WHERE (p_gas_name = '' OR g.GasName LIKE CONCAT('%', p_gas_name, '%'))
      AND (p_volume = '' OR g.Volume LIKE CONCAT('%', p_volume, '%'))
      AND (p_pressure = '' OR g.Pressure LIKE CONCAT('%', p_pressure, '%'))
    ORDER BY g.GasName ASC;
END //
DELIMITER ;

-- 2. proc_GasMaster_GetById
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_GasMaster_GetById;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_GasMaster_GetById(IN p_id INT)
BEGIN
    SELECT * FROM btggasify_live.master_gascode WHERE Id = p_id;
END //
DELIMITER ;

-- 3. proc_GasMaster_Create
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_GasMaster_Create;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_GasMaster_Create(
    IN p_code VARCHAR(50), IN p_name VARCHAR(100), IN p_vol VARCHAR(50), 
    IN p_press VARCHAR(50), IN p_user INT, IN p_ip VARCHAR(50), 
    IN p_active INT, IN p_org INT, IN p_branch INT, IN p_desc VARCHAR(255), 
    IN p_type INT, IN p_volid INT, IN p_pressid INT
)
BEGIN
    INSERT INTO btggasify_live.master_gascode 
    (GasCode, GasName, Volume, Pressure, CreatedBy, CreatedDate, CreatedIP, IsActive, OrgId, BranchId, Descriptions, GasTypeId, VolumeId, PressureId)
    VALUES 
    (p_code, p_name, p_vol, p_press, p_user, NOW(), p_ip, p_active, p_org, p_branch, p_desc, p_type, p_volid, p_pressid);
END //
DELIMITER ;

-- 4. proc_GasMaster_Update
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_GasMaster_Update;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_GasMaster_Update(
    IN p_id INT, IN p_code VARCHAR(50), IN p_name VARCHAR(100), 
    IN p_vol VARCHAR(50), IN p_press VARCHAR(50), IN p_user INT, 
    IN p_ip VARCHAR(50), IN p_active INT, IN p_org INT, IN p_branch INT, 
    IN p_desc VARCHAR(255), IN p_type INT, IN p_volid INT, IN p_pressid INT
)
BEGIN
    UPDATE btggasify_live.master_gascode
    SET 
        GasCode = p_code,
        GasName = p_name,
        Volume = p_vol,
        Pressure = p_press,
        LastModifiedBy = p_user,
        LastModifiedDate = NOW(),
        LastModifiedIP = p_ip,
        IsActive = p_active,
        OrgId = p_org,
        BranchId = p_branch,
        Descriptions = p_desc,
        GasTypeId = p_type,
        VolumeId = p_volid,
        PressureId = p_pressid
    WHERE Id = p_id;
END //
DELIMITER ;

-- 5. proc_GasMaster_ToggleStatus
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_GasMaster_ToggleStatus;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_GasMaster_ToggleStatus(IN p_id INT, IN p_active INT)
BEGIN
    UPDATE btggasify_live.master_gascode
    SET IsActive = p_active
    WHERE Id = p_id;
END //
DELIMITER ;

-- 6. proc_GasMaster_GetAllTypes
DROP PROCEDURE IF EXISTS btggasify_finance_live.proc_GasMaster_GetAllTypes;
DELIMITER //
CREATE PROCEDURE btggasify_finance_live.proc_GasMaster_GetAllTypes()
BEGIN
    SELECT Id, TypeName FROM btggasify_live.master_gastypes WHERE IsActive = 1 ORDER BY TypeName;
END //
DELIMITER ;
