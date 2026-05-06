using Application.Procurement.Goods_Receipt_Note.CreateGoodsReceiptNote;
using Application.Procurement.Goods_Receipt_Note.GetAllGoodsReceiptNote;
using Application.Procurement.Goods_Receipt_Note.GetGoodsReceiptNoteById;
using Application.Procurement.Goods_Receipt_Note.GetGoodsReceiptNoteSeqNo;
using Application.Procurement.Goods_Receipt_Note.GetGrnNoAutoComplete;
using Application.Procurement.Goods_Receipt_Note.GetGrnSupplierAutoComplete;
using Application.Procurement.Goods_Receipt_Note.UpdateGoodsReceiptNote;
using Application.Procurement.Purchase_Order.CreatePurchaseOrderItem;
using Application.Procurement.Purchase_Order.GetPurchaseOrderSeqNo;
using Application.Procurement.Purchase_Requitision.GetPurchaseRequitisionItem;
using Application.Procurement.Purchase_Requitision.GetSupplierAutoComplete;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace UserPanel.Controllers.Procurement
{
    [Route("api/[controller]")]
    [ApiController]
    public class GoodsReceiptNoteController : ControllerBase
    {
        private readonly IMediator _mediator;

        public GoodsReceiptNoteController(IMediator mediator)
        {
            _mediator = mediator;
        }
        [HttpGet("GetGRNSeqNo")]
        public async Task<IActionResult> GetByGRNNoSeqAsync(Int32 branchid, int orgid)
        {
            var result = await _mediator.Send(new GetGoodsReceiptNoteSeqNoQuery() { Opt =3, branchid = branchid, orgid = orgid });
            return Ok(result);
        }
        [HttpGet("GetPOSupplierList")]
        public async Task<IActionResult> GetPOSupplierListAsync(Int32 branchid, int orgid,int grnid)
        {
            var result = await _mediator.Send(new GetGoodsReceiptNoteSeqNoQuery() { Opt = 2, branchid = branchid, orgid = orgid,grnid=grnid });
            return Ok(result);
        }
        [HttpGet("GetPOList")]
        public async Task<IActionResult> GetPOListAsync(Int32 supplierid,Int32 branchid, int orgid, int grnid)
        {
            var result = await _mediator.Send(new GetGoodsReceiptNoteSeqNoQuery() { Opt = 1, supplierid = supplierid, branchid = branchid, orgid = orgid, grnid =  grnid });
            return Ok(result);
        }
        [HttpGet("GetPoItemList")]
        public async Task<IActionResult> GetPoItemListAsync(int poId, int orgId, int branchId,int grnid)
        {
            var result = await _mediator.Send(new GetGoodsReceiptNoteSeqNoQuery() { Opt = 4, poid = poId, branchid = branchId, orgid = orgId, grnid= grnid });
            return Ok(result);

        }

        [HttpPost("Create")]
        public async Task<IActionResult> Create([FromBody] CreateGoodsReceiptNoteQuery command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpPut("Update")]
        public async Task<IActionResult> Update([FromBody] UpdateGoodsReceiptNoteQuery command)
        {
            var result = await _mediator.Send(command);
            return Ok(result);
        }

        [HttpGet("GetAll")]
        public async Task<IActionResult> GetAllGRNListAsync(int supplierId, Int32 grnid, Int32 OrgId, Int32 BranchId,int userid)
        {
            var result = await _mediator.Send(new GetAllGoodsReceiptNoteQuery { supplierId=supplierId, 
                                                         grnid = grnid, OrgId=OrgId, BranchId = BranchId,userid= userid});
            return Ok(result);
        }
        [HttpGet("GetById")]
        public async Task<IActionResult> GetGoodsReceiptNoteByIdAsync(int grnid, int branchid, int orgid)
        {
            var result = await _mediator.Send(new GetGoodsReceiptNoteByIdQuery { Id = grnid, branchid = branchid, orgid = orgid });

            if (result == null)
                return NotFound();

            return Ok(result);
        }


        [HttpGet("GetGrnSupplierAutocomplete")]
        public async Task<IActionResult> GetGrnSupplierAutocomplete(int branchid, int orgid, string suppliername)
        {
            var result = await _mediator.Send(new GetGrnSupplierAutoCompleteQuery() { branchid = branchid, orgid = orgid, suppliername = suppliername });
            return Ok(result);
        }

        [HttpGet("GetSupplierAutoComplete")]
        public async Task<IActionResult> GetSupplierAutoComplete(int branchid, int orgid, string suppliername)
        {
            var result = await _mediator.Send(new GetGrnSupplierAutoCompleteQuery() { branchid = branchid, orgid = orgid, suppliername = suppliername });
            return Ok(result);
        }

        [HttpGet("GetGrnNoAutoComplete")]
        public async Task<IActionResult> GetGrnNoAutoComplete(int branchid, int orgid, string grnno)
        {
            var result = await _mediator.Send(new GetGrnNoAutoCompleteQuery() { branchid = branchid, orgid = orgid, grnno = grnno });
            return Ok(result);
        }
    }
}
