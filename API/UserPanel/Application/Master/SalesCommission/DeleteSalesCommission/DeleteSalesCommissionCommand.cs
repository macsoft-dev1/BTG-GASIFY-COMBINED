using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.DeleteSalesCommission
{
    public class DeleteSalesCommissionCommand : IRequest<object>
    {
        public int CommissionId { get; set; }
    }

}
