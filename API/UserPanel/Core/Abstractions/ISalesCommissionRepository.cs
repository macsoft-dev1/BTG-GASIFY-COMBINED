using Core.Master.SalesCommission;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Abstractions
{
    public interface ISalesCommissionRepository
    {
        Task<object> GetAllAsync(int branchId, int orgId, int customerId = 0, int gasId = 0);
        Task<object> GetByIdAsync(int commissionId);
        Task<object> AddAsync(SalesCommissionItem item);
        Task<object> UpdateAsync(SalesCommissionItem item);
        Task<object> DeleteAsync(int commissionId);
        Task<object> GetByCustomerAsync(int customerId, int branchId, int orgId);
        Task<object> GetByGasAsync(int gasId, int branchId, int orgId);
        Task<object> UpdateStatusAsync(int commissionId, int isActive, int userId);
    }
}
