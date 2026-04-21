using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.GetSalesCommissionByGas
{
    public class GetSalesCommissionByGasQuery : IRequest<object>
    {
        public int GasId { get; set; }
        public int BranchId { get; set; }
        public int OrgId { get; set; }

        public GetSalesCommissionByGasQuery(int gasId, int branchId, int orgId)
        {
            GasId = gasId;
            BranchId = branchId;
            OrgId = orgId;
        }
    }
}
