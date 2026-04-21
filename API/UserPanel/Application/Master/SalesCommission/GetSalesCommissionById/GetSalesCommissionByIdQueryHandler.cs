using Core.Abstractions;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.GetSalesCommissionById
{
    public class GetSalesCommissionByIdQueryHandler : IRequestHandler<GetSalesCommissionByIdQuery, object>
    {
        private readonly ISalesCommissionRepository _repository;

        public GetSalesCommissionByIdQueryHandler(ISalesCommissionRepository repository)
        {
            _repository = repository;
        }

        public async Task<object> Handle(GetSalesCommissionByIdQuery request, CancellationToken cancellationToken)
        {
            return await _repository.GetByIdAsync(request.CommissionId);
        }
    }
}
