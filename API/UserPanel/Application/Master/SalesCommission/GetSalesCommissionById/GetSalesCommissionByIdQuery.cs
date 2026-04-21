using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.GetSalesCommissionById
{
    public class GetSalesCommissionByIdQuery : IRequest<object>
    {
        public int CommissionId { get; set; }
    }
}
