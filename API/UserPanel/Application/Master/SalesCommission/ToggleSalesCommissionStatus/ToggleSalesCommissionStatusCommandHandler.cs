using Core.Abstractions;
using MediatR;
using System.Threading;
using System.Threading.Tasks;

namespace Application.Master.SalesCommission.ToggleSalesCommissionStatus
{
    public class ToggleSalesCommissionStatusCommandHandler : IRequestHandler<ToggleSalesCommissionStatusCommand, object>
    {
        private readonly ISalesCommissionRepository _repository;

        public ToggleSalesCommissionStatusCommandHandler(ISalesCommissionRepository repository)
        {
            _repository = repository;
        }

        public async Task<object> Handle(ToggleSalesCommissionStatusCommand request, CancellationToken cancellationToken)
        {
            return await _repository.UpdateStatusAsync(request.Id, request.IsActive, request.UserId);
        }
    }
}
