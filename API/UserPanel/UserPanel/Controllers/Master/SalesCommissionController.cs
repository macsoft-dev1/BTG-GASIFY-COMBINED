using Core.Master.SalesCommission;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using Application.Master.SalesCommission.GetSalesCommissionByGas;
using Application.Master.SalesCommission.GetAllSalesCommission;
using Application.Master.SalesCommission.GetSalesCommissionById;
using Application.Master.SalesCommission.CreateSalesCommission;
using Application.Master.SalesCommission.UpdateSalesCommission;
using Application.Master.SalesCommission.DeleteSalesCommission;
using Application.Master.SalesCommission.GetSalesCommissionByCustomer;
using Application.Master.SalesCommission.ToggleSalesCommissionStatus;

namespace UserPanel.Controllers.Master
{
    [Route("api/[controller]")]
    [ApiController]
    public class SalesCommissionController : ControllerBase
    {
        private readonly IMediator _mediator;

        public SalesCommissionController(IMediator mediator)
        {
            _mediator = mediator;
        }

        #region GetAllSalesCommission
        /// <summary>
        /// Get all sales commission records with optional filters
        /// </summary>
        [HttpGet("get-all")]
        public async Task<IActionResult> GetAllSalesCommission(
            [FromQuery] int branchId,
            [FromQuery] int orgId,
            [FromQuery] int customerId = 0,
            [FromQuery] int gasId = 0)
        {
            if (branchId <= 0 || orgId <= 0)
            {
                return BadRequest(new { message = "BranchId and OrgId are required!" });
            }

            var query = new GetAllSalesCommissionQuery
            {
                BranchId = branchId,
                OrgId = orgId,
                CustomerId = customerId,
                GasId = gasId
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        #endregion

        #region GetSalesCommissionById
        /// <summary>
        /// Get sales commission by ID (includes header and details)
        /// </summary>
        [HttpGet("get-by-id/{commissionId}")]
        public async Task<IActionResult> GetSalesCommissionById([FromRoute] int commissionId)
        {
            if (commissionId <= 0)
            {
                return BadRequest(new { message = "Valid Commission ID is required!" });
            }

            var query = new GetSalesCommissionByIdQuery { CommissionId = commissionId };
            var result = await _mediator.Send(query);
            return Ok(result);
        }
        #endregion

        #region CreateSalesCommission
        /// <summary>
        /// Create new sales commission with header and details
        /// </summary>
        [HttpPost("create")]
        public async Task<IActionResult> CreateSalesCommission([FromBody] SalesCommissionItem item)
        {
            if (item == null)
            {
                return BadRequest(new { message = "Data cannot be empty!" });
            }

            if (item.Header == null)
            {
                return BadRequest(new { message = "Header data is required!" });
            }

            if (item.Header.CustomerId <= 0 || item.Header.GasId <= 0)
            {
                return BadRequest(new { message = "CustomerId and GasId are required!" });
            }

            var command = new CreateSalesCommissionCommand { Item = item };
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        #endregion

        #region UpdateSalesCommission
        /// <summary>
        /// Update existing sales commission
        /// </summary>
        [HttpPut("update")]
        public async Task<IActionResult> UpdateSalesCommission([FromBody] SalesCommissionItem item)
        {
            if (item == null || item.Header == null || item.Header.Id <= 0)
            {
                return BadRequest(new { message = "Valid Commission ID is required for update!" });
            }

            var command = new UpdateSalesCommissionCommand { Item = item };
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        #endregion

        #region DeleteSalesCommission
        /// <summary>
        /// Delete sales commission record
        /// </summary>
        [HttpDelete("delete/{commissionId}")]
        public async Task<IActionResult> DeleteSalesCommission([FromRoute] int commissionId)
        {
            if (commissionId <= 0)
            {
                return BadRequest(new { message = "Valid Commission ID is required!" });
            }

            var command = new DeleteSalesCommissionCommand { CommissionId = commissionId };
            var result = await _mediator.Send(command);
            return Ok(result);
        }
        #endregion

        #region ToggleSalesCommissionStatus
        /// <summary>
        /// Update status of a sales commission record
        /// </summary>
        [HttpPut("toggle-actve-status")]
        public async Task<IActionResult> ToggleStatus([FromBody] ToggleSalesCommissionStatusCommand command)
        {
            if (command == null || command.Id <= 0)
            {
                return BadRequest(new { message = "Valid Commission ID is required for status update!" });
            }

            var result = await _mediator.Send(command);
            return Ok(result);
        }
        #endregion

        #region GetByCustomer
        /// <summary>
        /// Get sales commissions by customer
        /// </summary>
        [HttpGet("get-by-customer/{customerId}")]
        public async Task<IActionResult> GetByCustomer(
            [FromRoute] int customerId,
            [FromQuery] int branchId,
            [FromQuery] int orgId)
        {
            if (customerId <= 0 || branchId <= 0 || orgId <= 0)
            {
                return BadRequest(new { message = "CustomerId, BranchId, and OrgId are required!" });
            }

            var query = new GetSalesCommissionByCustomerQuery
            {
                CustomerId = customerId,
                BranchId = branchId,
                OrgId = orgId
            };

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        #endregion

        #region GetByGas
        /// <summary>
        /// Get sales commissions by gas type
        /// </summary>
        [HttpGet("get-by-gas/{gasId}")]
        public async Task<IActionResult> GetByGas(
            [FromRoute] int gasId,
            [FromQuery] int branchId,
            [FromQuery] int orgId)
        {
            if (gasId <= 0 || branchId <= 0 || orgId <= 0)
            {
                return BadRequest(new { message = "GasId, BranchId, and OrgId are required!" });
            }

           var query = new GetSalesCommissionByGasQuery(gasId, branchId, orgId);

            var result = await _mediator.Send(query);
            return Ok(result);
        }
        #endregion
    }
}

