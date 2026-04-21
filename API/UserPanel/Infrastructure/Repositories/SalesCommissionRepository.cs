using BackEnd.Master;
using Core.Abstractions;
using Core.Master.SalesCommission;
using Core.Models;
using Dapper;
using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Infrastructure.Repositories
{
    public class SalesCommissionRepository : ISalesCommissionRepository
    {
        private readonly IDbConnection _connection;

        public SalesCommissionRepository(IUnitOfWorkDB1 unitOfWork)
        {
            _connection = unitOfWork.Connection;
        }

        private void AddBaseParameters(DynamicParameters param, int opt, int id = 0, int customerId = 0, int gasId = 0, 
            decimal? price = null, DateTime? effectiveFrom = null, string? contact = null, decimal? rate = null, 
            int? isActive = null, int userId = 0, int branchId = 0, int orgId = 0, string? searchText = null)
        {
            param.Add("@p_opt", opt);
            param.Add("@p_Id", id);
            param.Add("@p_CustomerId", customerId);
            param.Add("@p_GasId", gasId);
            param.Add("@p_SellingPrice", price);
            param.Add("@p_EffectiveFrom", effectiveFrom);
            param.Add("@p_Contact", contact);
            param.Add("@p_Rate", rate);
            param.Add("@p_IsActive", isActive);
            param.Add("@p_UserId", userId);
            param.Add("@p_BranchId", branchId);
            param.Add("@p_OrgId", orgId);
            param.Add("@p_SearchText", searchText);
        }

        /// <summary>
        /// Get all sales commission records with optional filters
        /// </summary>
        public async Task<object> GetAllAsync(int branchId, int orgId, int customerId = 0, int gasId = 0)
        {
            try
            {
                var param = new DynamicParameters();
                AddBaseParameters(param, opt: 1, customerId: customerId, gasId: gasId, branchId: branchId, orgId: orgId);

                var result = await _connection.QueryAsync<SalesCommissionListing>(
                    MasterSalesCommission.SalesCommissionProcedure,
                    param: param,
                    commandType: CommandType.StoredProcedure
                );

                return new ResponseModel()
                {
                    Data = result.ToList(),
                    Message = "Success",
                    Status = true,
                    StatusCode = 200
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Error: " + ex.Message,
                    Status = false,
                    StatusCode = 500
                };
            }
        }

        public async Task<object> GetByIdAsync(int id)
        {
            try
            {
                var param = new DynamicParameters();
                AddBaseParameters(param, opt: 2, id: id);

                using (var multi = await _connection.QueryMultipleAsync(
                    MasterSalesCommission.SalesCommissionProcedure,
                    param: param,
                    commandType: CommandType.StoredProcedure))
                {
                    var header = await multi.ReadFirstOrDefaultAsync<SalesCommissionHeader>();
                    var details = await multi.ReadAsync<SalesCommissionDetail>();

                    if (header != null)
                    {
                        var fullItem = new SalesCommissionItem
                        {
                            Header = header,
                            Details = details.ToList()
                        };

                        return new ResponseModel()
                        {
                            Data = fullItem,
                            Message = "Success",
                            Status = true,
                            StatusCode = 200
                        };
                    }

                    return new ResponseModel()
                    {
                        Data = null,
                        Message = "Record not found",
                        Status = false,
                        StatusCode = 404
                    };
                }
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Error: " + ex.Message,
                    Status = false,
                    StatusCode = 500
                };
            }
        }

        /// <summary>
        /// Create new sales commission with header and details
        /// </summary>
        public async Task<object> AddAsync(SalesCommissionItem item)
        {
            try
            {
                if (item?.Header == null)
                    throw new ArgumentException("Header data is required");

                if (item.Header.CustomerId <= 0 || item.Header.GasId <= 0 || item.Header.SellingPrice <= 0)
                    throw new ArgumentException("Invalid header data: CustomerId, GasId, and SellingPrice are required");

                // 1. Insert Header and first detail (using existing Option 3)
                var firstDetail = item.Details?.FirstOrDefault();
                var param = new DynamicParameters();
                AddBaseParameters(param, opt: 3, 
                    id: 0, 
                    customerId: item.Header.CustomerId, 
                    gasId: item.Header.GasId, 
                    price: item.Header.SellingPrice, 
                    effectiveFrom: item.Header.EffectiveFrom, 
                    isActive: item.Header.IsActive, 
                    userId: item.Header.CreatedBy ?? 0,
                    contact: firstDetail?.Contact,
                    rate: firstDetail?.Rate
                );

                var result = await _connection.QueryFirstOrDefaultAsync<dynamic>(
                    MasterSalesCommission.SalesCommissionProcedure,
                    param: param,
                    commandType: CommandType.StoredProcedure
                );

                if (result?.StatusCode == 1)
                {
                    int headerId = Convert.ToInt32(result.Data);

                    // 2. Insert remaining details (using new Option 9)
                    if (item.Details != null && item.Details.Count > 1)
                    {
                        foreach (var detail in item.Details.Skip(1))
                        {
                            var detailParam = new DynamicParameters();
                            AddBaseParameters(detailParam, opt: 9, id: headerId, contact: detail.Contact, rate: detail.Rate, userId: item.Header.CreatedBy ?? 0);
                            
                            await _connection.ExecuteAsync(
                                MasterSalesCommission.SalesCommissionProcedure,
                                param: detailParam,
                                commandType: CommandType.StoredProcedure
                            );
                        }
                    }

                    return new ResponseModel()
                    {
                        Data = new { CommissionId = headerId },
                        Message = "Record inserted successfully",
                        Status = true,
                        StatusCode = 200
                    };
                }
                else
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = result?.Message ?? "Failed to insert record",
                        Status = false,
                        StatusCode = 400
                    };
                }
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Error: " + ex.Message,
                    Status = false,
                    StatusCode = 500
                };
            }
        }

        /// <summary>
        /// Update existing sales commission
        /// </summary>
        public async Task<object> UpdateAsync(SalesCommissionItem item)
        {
            try
            {
                if (item?.Header == null || item.Header.Id <= 0)
                    throw new ArgumentException("Invalid ID for update operation");

                // 1. Update Header (using existing Option 4)
                var param = new DynamicParameters();
                AddBaseParameters(param, opt: 4, 
                    id: item.Header.Id, 
                    customerId: item.Header.CustomerId, 
                    gasId: item.Header.GasId, 
                    price: item.Header.SellingPrice, 
                    effectiveFrom: item.Header.EffectiveFrom, 
                    isActive: item.Header.IsActive, 
                    userId: item.Header.LastModifiedBy ?? 0
                );

                var result = await _connection.QueryFirstOrDefaultAsync<dynamic>(
                    MasterSalesCommission.SalesCommissionProcedure,
                    param: param,
                    commandType: CommandType.StoredProcedure
                );

                if (result?.StatusCode == 1)
                {
                    // 2. Handle Details management
                    // Fetch existing details to identify deletions
                    var getByIdParam = new DynamicParameters();
                    AddBaseParameters(getByIdParam, opt: 2, id: item.Header.Id);
                    
                    List<SalesCommissionDetail> existingDetails = new List<SalesCommissionDetail>();
                    using (var multi = await _connection.QueryMultipleAsync(
                        MasterSalesCommission.SalesCommissionProcedure,
                        param: getByIdParam,
                        commandType: CommandType.StoredProcedure))
                    {
                        await multi.ReadFirstOrDefaultAsync<SalesCommissionHeader>(); // Skip header
                        var details = await multi.ReadAsync<SalesCommissionDetail>();
                        existingDetails = details.ToList();
                    }

                    // Delete details that are not in the new list
                    var newDetailIds = item.Details?.Select(d => d.Id).Where(id => id > 0).ToList() ?? new List<int>();
                    foreach (var existingDetail in existingDetails)
                    {
                        if (!newDetailIds.Contains(existingDetail.Id))
                        {
                            var deleteParam = new DynamicParameters();
                            AddBaseParameters(deleteParam, opt: 11, id: existingDetail.Id);
                            await _connection.ExecuteAsync(MasterSalesCommission.SalesCommissionProcedure, deleteParam, commandType: CommandType.StoredProcedure);
                        }
                    }

                    // Insert or Update details
                    if (item.Details != null)
                    {
                        foreach (var detail in item.Details)
                        {
                            var detailParam = new DynamicParameters();
                            if (detail.Id > 0)
                            {
                                AddBaseParameters(detailParam, opt: 10, id: detail.Id, contact: detail.Contact, rate: detail.Rate, userId: item.Header.LastModifiedBy ?? 0);
                            }
                            else
                            {
                                AddBaseParameters(detailParam, opt: 9, id: item.Header.Id, contact: detail.Contact, rate: detail.Rate, userId: item.Header.LastModifiedBy ?? 0);
                            }

                            await _connection.ExecuteAsync(MasterSalesCommission.SalesCommissionProcedure, detailParam, commandType: CommandType.StoredProcedure);
                        }
                    }

                    return new ResponseModel()
                    {
                        Data = new { CommissionId = item.Header.Id },
                        Message = "Record updated successfully",
                        Status = true,
                        StatusCode = 200
                    };
                }
                else
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = result?.Message ?? "Failed to update record",
                        Status = false,
                        StatusCode = 400
                    };
                }
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Error: " + ex.Message,
                    Status = false,
                    StatusCode = 500
                };
            }
        }

        /// <summary>
        /// Delete sales commission record
        /// </summary>
        public async Task<object> DeleteAsync(int commissionId)
        {
            try
            {
                if (commissionId <= 0)
                    throw new ArgumentException("Invalid Commission ID");

                var param = new DynamicParameters();
                AddBaseParameters(param, opt: 5, id: commissionId);

                var result = await _connection.QueryFirstOrDefaultAsync<dynamic>(
                    MasterSalesCommission.SalesCommissionProcedure,
                    param: param,
                    commandType: CommandType.StoredProcedure
                );

                if (result?.StatusCode == 1)
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = result.Message,
                        Status = true,
                        StatusCode = 200
                    };
                }
                else
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = result?.Message ?? "Failed to delete record",
                        Status = false,
                        StatusCode = 400
                    };
                }
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Error: " + ex.Message,
                    Status = false,
                    StatusCode = 500
                };
            }
        }

        public async Task<object> GetByCustomerAsync(int customerId, int branchId, int orgId)
        {
            try
            {
                var param = new DynamicParameters();
                AddBaseParameters(param, opt: 1, customerId: customerId, branchId: branchId, orgId: orgId);

                var result = await _connection.QueryAsync<SalesCommissionListing>(
                    MasterSalesCommission.SalesCommissionProcedure,
                    param: param,
                    commandType: CommandType.StoredProcedure
                );

                return new ResponseModel()
                {
                    Data = result.ToList(),
                    Message = "Success",
                    Status = true,
                    StatusCode = 200
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Error: " + ex.Message,
                    Status = false,
                    StatusCode = 500
                };
            }
        }



        /// <summary>
        /// Get sales commissions by gas type
        /// </summary>
        public async Task<object> GetByGasAsync(int gasId, int branchId, int orgId)
        {
            try
            {
                var param = new DynamicParameters();
                AddBaseParameters(param, opt: 1, gasId: gasId, branchId: branchId, orgId: orgId);

                var result = await _connection.QueryAsync<SalesCommissionListing>(
                    MasterSalesCommission.SalesCommissionProcedure,
                    param: param,
                    commandType: CommandType.StoredProcedure
                );

                return new ResponseModel()
                {
                    Data = result.ToList(),
                    Message = "Success",
                    Status = true,
                    StatusCode = 200
                };
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Error: " + ex.Message,
                    Status = false,
                    StatusCode = 500
                };
            }
        }

        /// <summary>
        /// Update status of a sales commission record
        /// </summary>
        public async Task<object> UpdateStatusAsync(int commissionId, int isActive, int userId)
        {
            try
            {
                var param = new DynamicParameters();
                AddBaseParameters(param, opt: 5, id: commissionId, isActive: isActive, userId: userId);

                var result = await _connection.QueryFirstOrDefaultAsync<dynamic>(
                    MasterSalesCommission.SalesCommissionProcedure,
                    param: param,
                    commandType: CommandType.StoredProcedure
                );

                if (result?.StatusCode == 1)
                {
                    return new ResponseModel()
                    {
                        Data = new { CommissionId = result.Data },
                        Message = result.Message,
                        Status = true,
                        StatusCode = 200
                    };
                }
                else
                {
                    return new ResponseModel()
                    {
                        Data = null,
                        Message = result?.Message ?? "Failed to update record status",
                        Status = false,
                        StatusCode = 400
                    };
                }
            }
            catch (Exception ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Error: " + ex.Message,
                    Status = false,
                    StatusCode = 500
                };
            }
        }
    }
}
