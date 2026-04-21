using Core.Abstractions;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.GetSalesCommissionByCustomer
{
    public class GetSalesCommissionByCustomerQueryHandler : IRequestHandler<GetSalesCommissionByCustomerQuery, object>
    {
        private readonly ISalesCommissionRepository _repository;

        public GetSalesCommissionByCustomerQueryHandler(ISalesCommissionRepository repository)
        {
            _repository = repository;
        }

        public async Task<object> Handle(GetSalesCommissionByCustomerQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetByCustomerAsync(request.CustomerId, request.BranchId, request.OrgId);
        }
    }

}
