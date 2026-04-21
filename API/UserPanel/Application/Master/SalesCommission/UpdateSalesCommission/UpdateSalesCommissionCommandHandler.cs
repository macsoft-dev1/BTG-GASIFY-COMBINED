using Core.Abstractions;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.UpdateSalesCommission
{
    public class UpdateSalesCommissionCommandHandler : IRequestHandler<UpdateSalesCommissionCommand, object>
    {
        private readonly ISalesCommissionRepository _repository;

        public UpdateSalesCommissionCommandHandler(ISalesCommissionRepository repository)
        {
            _repository = repository;
        }

        public async Task<object> Handle(UpdateSalesCommissionCommand request, CancellationToken cancellationToken)
        {
            return await _repository.UpdateAsync(request.Item);
        }
    }
}
