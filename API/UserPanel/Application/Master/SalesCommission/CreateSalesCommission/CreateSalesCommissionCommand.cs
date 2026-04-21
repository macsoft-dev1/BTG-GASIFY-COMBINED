using Core.Master.SalesCommission;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.CreateSalesCommission
{
    public class CreateSalesCommissionCommand : IRequest<object>
    {
        public SalesCommissionItem Item { get; set; }
    }
}
