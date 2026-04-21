using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.GetAllSalesCommission
{
    public class GetAllSalesCommissionQuery : IRequest<object>
    {
        public int BranchId { get; set; }
        public int OrgId { get; set; }
        public int CustomerId { get; set; }
        public int GasId { get; set; }
    }
}
