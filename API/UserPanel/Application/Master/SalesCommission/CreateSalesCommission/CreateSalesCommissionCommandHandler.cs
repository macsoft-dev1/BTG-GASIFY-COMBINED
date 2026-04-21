using Core.Abstractions;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.CreateSalesCommission
{
    public class CreateSalesCommissionCommandHandler : IRequestHandler<CreateSalesCommissionCommand, object>
    {
        private readonly ISalesCommissionRepository _repository;

        public CreateSalesCommissionCommandHandler(ISalesCommissionRepository repository)
        {
            _repository = repository;
        }

        public async Task<object> Handle(CreateSalesCommissionCommand request, CancellationToken cancellationToken)
        {
            return await _repository.AddAsync(request.Item);
        }
    }
}
