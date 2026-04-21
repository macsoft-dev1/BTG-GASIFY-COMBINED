using Core.Abstractions;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.DeleteSalesCommission
{
    public class DeleteSalesCommissionCommandHandler : IRequestHandler<DeleteSalesCommissionCommand, object>
    {
        private readonly ISalesCommissionRepository _repository;

        public DeleteSalesCommissionCommandHandler(ISalesCommissionRepository repository)
        {
            _repository = repository;
        }

        public async Task<object> Handle(DeleteSalesCommissionCommand request, CancellationToken cancellationToken)
        {
            return await _repository.DeleteAsync(request.CommissionId);
        }
    }
}
