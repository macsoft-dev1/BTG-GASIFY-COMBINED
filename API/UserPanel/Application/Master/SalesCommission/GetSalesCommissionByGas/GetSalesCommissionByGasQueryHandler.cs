using Core.Abstractions;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.GetSalesCommissionByGas
{
    public class GetSalesCommissionByGasQueryHandler : IRequestHandler<GetSalesCommissionByGasQuery, object>
    {
        private readonly ISalesCommissionRepository _repository;

        public GetSalesCommissionByGasQueryHandler(ISalesCommissionRepository repository)
        {
            _repository = repository;
        }

        public async Task<object> Handle(GetSalesCommissionByGasQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetByGasAsync(request.GasId, request.BranchId, request.OrgId);
        }
    }
}
