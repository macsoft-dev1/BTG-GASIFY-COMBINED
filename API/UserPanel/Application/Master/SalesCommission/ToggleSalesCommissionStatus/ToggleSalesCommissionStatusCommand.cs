using MediatR;

namespace Application.Master.SalesCommission.ToggleSalesCommissionStatus
{
    public class ToggleSalesCommissionStatusCommand : IRequest<object>
    {
        public int Id { get; set; }
        public int IsActive { get; set; }
        public int UserId { get; set; }
    }
}
