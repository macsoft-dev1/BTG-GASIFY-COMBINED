using Core.Abstractions;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.GetAllSalesCommission
{
    public class GetAllSalesCommissionQueryHandler : IRequestHandler<GetAllSalesCommissionQuery, object>
    {
        private readonly ISalesCommissionRepository _repository;

        public GetAllSalesCommissionQueryHandler(ISalesCommissionRepository repository)
        {
            _repository = repository;
        }

        public async Task<object> Handle(GetAllSalesCommissionQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetAllAsync(request.BranchId, request.OrgId, request.CustomerId, request.GasId);
        }
    }
}
