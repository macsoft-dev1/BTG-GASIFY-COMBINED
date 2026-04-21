using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.GetSalesCommissionByCustomer
{
    public class GetSalesCommissionByCustomerQuery : IRequest<object>
    {
        public int CustomerId { get; set; }
        public int BranchId { get; set; }
        public int OrgId { get; set; }
    }
}
