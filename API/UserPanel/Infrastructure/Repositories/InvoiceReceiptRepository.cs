using System.Data;
using System.Dynamic;
using BackEnd.Procurement.PurchaseOrder;
using BackEnd.Procurement.InvoiceReceipt;
using Core.Abstractions;
using Core.Models;
using Dapper;
using Core.Procurement.InvoiceReceipt;
using DocumentFormat.OpenXml.Office2016.Drawing.ChartDrawing;
using BackEnd.Shared;
using BackEnd.Currency;
using Core.Master.Supplier;
using Org.BouncyCastle.Ocsp;
using DocumentFormat.OpenXml.Spreadsheet;
using DocumentFormat.OpenXml.Wordprocessing;

namespace Infrastructure.Repositories
{
    public class InvoiceReceiptRepository : IInvoiceReceiptRepository
    {
        private readonly IDbConnection _connection;
        string IPAddress = "";
        public InvoiceReceiptRepository(IUnitOfWorkDB2 unitOfWork)
        {
            _connection = unitOfWork.Connection;
        }

        public async Task<object> GetPONoAutoComplete(int supplier_id, int category_id, int org_id)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 11);
                param.Add("@prid", supplier_id);
                param.Add("@id", category_id);
                param.Add("@orgid", org_id);
                param.Add("@branchid", 0);
                param.Add("@searchtext", "");
                param.Add("@pmid", 0);
                param.Add("groupid", 0);

                var List = await _connection.QueryAsync(InvoiceReceiptBackEnd.InvoiceRecceiptAutocomplete, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();


                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }
        public async Task<object> GetSupplierGRNAutoComplete(int supplier_id, int category_id, int org_id)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 12);
                param.Add("@prid", supplier_id);
                param.Add("@id", category_id);
                param.Add("@orgid", org_id);
                param.Add("@branchid", 0);
                param.Add("@searchtext", "");
                param.Add("@pmid", 0);
                param.Add("groupid", 0);

                var List = await _connection.QueryAsync(InvoiceReceiptBackEnd.InvoiceRecceiptAutocomplete, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();


                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }
        public async Task<object> getSupplierPODetailsView(string po_id, int org_id, int cid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 1);
                param.Add("@po_id", po_id);
                param.Add("@orgid", org_id);
                param.Add("@sid", 0);
                param.Add("@cid", cid);
                param.Add("@supplierid", 0);
                param.Add("@branchid", 0);

                var List = await _connection.QueryAsync(InvoiceReceiptBackEnd.InvoiceReceiptProcedure, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();


                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }

        public async Task<object> GetInvoiceReceiptAll(Int32 supplierid, int org_id, int branchid)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 2);
                param.Add("@po_id", 0);
                param.Add("@orgid", org_id);
                param.Add("@sid", 0);
                param.Add("@cid", 0);
                param.Add("@supplierid", supplierid);
                param.Add("@branchid", branchid);

                var List = await _connection.QueryAsync(InvoiceReceiptBackEnd.InvoiceReceiptProcedure, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();


                return new ResponseModel()
                {
                    Data = Modellist,
                    Message = "Success",
                    Status = true
                };
            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }

        public async Task<object> AddIRN(InvoiceEntry Obj)
        {
            try
            {
                int Result = 0;
                var response = "select concat(prefixtext, lpad(doc_number+1,7,'0')) as text from master_documentnumber a where doc_type=5 and a.unit="+Obj.Header.branchid+" and a.orgid ="+Obj.Header.orgid+";";
                var seqno = await _connection.QuerySingleAsync<string>(response);
                Obj.Header.receipt_no = seqno;
                const string headerSql = @"
                        INSERT INTO `tbl_invoice_receiptnote_header`
                        (`supplier_id`, `cat_type_id`,`receipt_no`,`receipt_date`,`is_active`,`create_by`,`create_dt`,`org_id` ,`branch_id`,`ip_address`,`IsGenerated`)
                        VALUES (@supplier_id, @category_id, @receipt_no, now(), 1, @userid,now(),@orgid,@branchid,'',@isGenerated );
                        SELECT LAST_INSERT_ID();";


                await _connection.ExecuteAsync(headerSql, Obj.Header);

                var UpdateSeq = "update master_documentnumber set Doc_Number=Doc_Number+1 where Doc_Type=5 and unit=" + Obj.Header.branchid + "; ";
                Result = await _connection.ExecuteAsync(UpdateSeq, Obj.Header.branchid);

                const string getLastInsertedIdSql = "SELECT LAST_INSERT_ID();";
                var insertedHeaderId = await _connection.QuerySingleAsync<int>(getLastInsertedIdSql);

                int recipid = insertedHeaderId;              

                string updatesql = "";
                var pridToPodidMap = new Dictionary<int, int>();

                var detailSql = "";
                foreach (var detail in Obj.Details)
                {
                    detail.receiptnote_hdr_id = recipid;

                    detailSql = @"
                        INSERT INTO `tbl_invoicereceipt_summary`
                        (`receiptnote_hdr_id`, `purchase_id`,`invoice_no`,`invoice_dt`,`due_dt`,`file_path`,`file_name`,`spc` ,
                        `is_active`,`grn_id`)
                        VALUES (@receiptnote_hdr_id, @po_id, @invoice_no, @invoice_date, @due_date, @file_attach_path,@file_name,@spc,@is_active,@grn_id);
                        SELECT LAST_INSERT_ID();";

                    var podid = await _connection.QuerySingleAsync<int>(detailSql, new
                    {
                        receiptnote_hdr_id= detail.receiptnote_hdr_id,
                        po_id = detail.po_id,
                        invoice_no = detail.invoice_no,
                        invoice_date = detail.invoice_date,
                        due_date = detail.due_date,
                        file_attach_path = detail.file_attach_path,
                        file_name = detail.file_name,
                        spc = detail.spc,
                        is_active = detail.isactive,
                        grn_id=detail.grn_id

                    });
                     
                }
 
                foreach (var req in Obj.Requisition)
                {
                    req.receiptnote_hdr_id = recipid;
                    var reqSql = @"
                        INSERT INTO `tbl_invoicereceipt_detail`
                        (`receiptnote_hdr_id`, `item_id`, `unit_price`, `item_qty`, `rate`, `total_amount`, `tax_per`, `total_value`, 
                         `vat_per`, `vat_value`, `net_amount`, `is_active`, `ip_address`,`currencyid`)
                        VALUES
                        (@receiptnote_hdr_id, @item_id, @unit_price, @qty, @rate, @total_amount, @tax_perc, @total_value, @vat_perc, @vat_value,
                         @net_amount, 1, '',@currencyid);";

                    //await _connection.ExecuteAsync(reqSql, req);
                    await _connection.ExecuteAsync(reqSql, new
                    {
                        receiptnote_hdr_id = req.receiptnote_hdr_id,
                        item_id = req.item_id,
                        unit_price = req.unit_price,
                        qty = req.qty,
                        rate = req.rate,
                        total_amount = req.total_amount,
                        tax_perc = req.tax_perc,
                        uni_qty = req.qty,
                        total_value = req.total_value,
                        vat_perc = req.vat_perc,
                        vat_value = req.vat_value,
                        net_amount = req.net_amount,
                        isActive = 1,
                        ip_address = req.ip_address,
                        currencyid=req.currencyid
                    });
                }

                if (Obj.Header.isGenerated == true)
                {
                    string updatetofinance = "call proc_InsertInvoiceToFinance(1," + recipid + ");";
                    var exeresult = await _connection.ExecuteAsync(updatetofinance);
                }
                
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Invoice receipt note posted successfully",
                    Status = true
                };

            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }
        public async Task<object> GenerateInvoiceReceipt(InvoiceGenerate Obj)
        {
            try
            {
                int recipid = Obj.Header.receiptnote_hdr_id;
                const string deleteDetailsSql = @"UPDATE tbl_invoice_receiptnote_header SET IsGenerated = 1 WHERE receiptnote_hdr_id = @recipid;";
                await _connection.ExecuteAsync(deleteDetailsSql, new { recipid });

                return new ResponseModel() { Data = null, Message = "Invoice Receipt Generated successfully", Status = true };
            }
            catch (Exception Ex)
            {
                return new ResponseModel() { Data = null, Message = "Something went wrong", Status = false };
            }
        }
    
        public async Task<object> updateSupplierPODetailsView(InvoiceEntry Obj)
        {
            try
            {
                int Result = 0;
                const string headerSql = @"
            UPDATE tbl_invoice_receiptnote_header
            SET 
                `supplier_id` = @supplier_id,
                `cat_type_id`=@category_id,
                `update_dt` = NOW(),
                `update_by` = @userid,
                `is_active` = 1,
                `org_id` = @orgid,
                `branch_id` = @branchid,
                `IsGenerated`=@isGenerated
                 where receiptnote_hdr_id = @receiptnote_hdr_id";


                await _connection.ExecuteAsync(headerSql, Obj.Header);

                int recipid = Obj.Header.receiptnote_hdr_id;
                var pridToPodidMap = new Dictionary<int, int>();

                var detailSql = "";
                int receiptsummarydtl_id = 0;
                foreach (var detail in Obj.Details)
                {
                    detail.receiptnote_hdr_id = recipid;
                    if (detail.receiptsummarydtl_id == 0)
                    {
                        detailSql = @"
                        INSERT INTO `tbl_invoicereceipt_summary`
                        (`receiptnote_hdr_id`, `purchase_id`,`invoice_no`,`invoice_dt`,`due_dt`,`file_path`,`file_name`,`spc`,`grn_id` 
                        `IsActive`)
                        VALUES (@recipid, @po_id, @invoice_no, @invoice_date, @due_date, @file_attach_path,@file_name,@spc,@grn_id,@isactive);
                        ";
                        receiptsummarydtl_id = await _connection.QuerySingleAsync<int>("SELECT LAST_INSERT_ID();");
                    }
                    else
                    {
                        int summary_id = detail.receiptsummarydtl_id;
                        detailSql = @"UPDATE tbl_invoicereceipt_summary SET `invoice_no` = @invoice_no, `invoice_dt` = @invoice_date, `due_dt` = @due_date, 
                        `spc` = @spc, `grn_id`=@grn_id
                        WHERE receiptsummarydtl_id = @receiptsummarydtl_id;";
                    }

                    await _connection.ExecuteAsync(detailSql, new
                    {
                        receiptsummarydtl_id = detail.receiptsummarydtl_id,
                        receiptnote_hdr_id = detail.receiptnote_hdr_id,
                        po_id = detail.po_id,
                        grn_id = detail.grn_id,
                        invoice_no = detail.invoice_no,
                        invoice_date = detail.invoice_date,
                        due_date = detail.due_date,
                        file_attach_path = detail.file_attach_path,
                        file_name = detail.file_name,
                        spc = detail.spc,
                        isactive = detail.isactive,
                        userid = detail.userid
                    });
                    receiptsummarydtl_id = await _connection.QuerySingleAsync<int>("SELECT LAST_INSERT_ID();");
                }

                foreach (var req in Obj.Requisition)
                {
                    var reqSql = "";
                    if (req.receiptdtl_id == 0)
                    {
                        reqSql = @"
                        INSERT INTO `tbl_invoicereceipt_detail`
                        (`receiptnote_hdr_id`,receiptsummarydtl_id, `item_id`, `unit_price`, `item_qty`, `rate`, `total_amount`, `tax_per`, `total_value`, 
                         `vat_per`, `vat_value`, `net_amount`, `is_active`, `ip_address`)
                        VALUES
                        (@receiptnote_hdr_id,@receiptsummarydtl_id, @item_id, @unit_price, @qty, @rate, @total_amount, @tax_perc, @total_value, @vat_perc, @vat_value,
                         @net_amount, @isActive, @ip_address);";
                    }
                    else
                    {
                        int receiptdtl_id = req.receiptdtl_id;
                        reqSql = @"UPDATE tbl_invoicereceipt_detail SET `item_id` = @item_id, `unit_price` = @unit_price, `item_qty` = @qty, 
                        `rate` = @rate, `total_amount`=@total_amount, `tax_per`=@tax_perc,`total_value`=@total_value,`vat_per`=@vat_perc, `vat_value` =@vat_value, 
                        `net_amount` = @net_amount, `is_active`=1, `ip_address` = @ip_address
                        WHERE receiptdtl_id = @receiptdtl_id;";
                    }

                    await _connection.ExecuteAsync(reqSql, new
                    {
                        receiptdtl_id = req.receiptdtl_id,
                        receiptnote_hdr_id = req.receiptnote_hdr_id,
                        receiptsummarydtl_id = req.receiptsummarydtl_id,
                        item_id = req.item_id,
                        unit_price = req.unit_price,
                        qty = req.qty,
                        rate = req.rate,
                        total_amount = req.total_amount,
                        tax_perc = req.tax_perc,
                        total_value = req.total_value,
                        vat_perc = req.vat_perc,
                        vat_value = req.vat_value,
                        net_amount = req.net_amount,
                        isactive = req.isactive,
                        ip_address = req.ip_address,
                    });
                }

                if (Obj.Header.isGenerated == true)
                {
                    string updatetofinance = "call proc_InsertInvoiceToFinance(1," + recipid + ");";
                    var exeresult = await _connection.ExecuteAsync(updatetofinance);
                }

                return new ResponseModel()
                {
                    Data = null,
                    Message = "Invoice Receipt Updated successfully",
                    Status = true
                };

            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }
        
        public async Task<object> getSupplierPODetailsEditView(Int32 po_id, int org_id)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 3);
                param.Add("@sid", 0);
                param.Add("@cid", 0);
                param.Add("@po_id", po_id);
                param.Add("@orgid", org_id);
                param.Add("@supplierid", 0);
                param.Add("@branchid", 0);

                using (var List = await _connection.QueryMultipleAsync(InvoiceReceiptBackEnd.InvoiceReceiptProcedure, param: param, commandType: CommandType.StoredProcedure))
                {
                    dynamic Modellist = new ExpandoObject();
                    int I = 0;
                    while (!List.IsConsumed)
                    {
                        dynamic nl = List.Read();
                        if (I == 0)
                        {
                            int count = nl.Count;
                            if (count == 0)
                                Modellist.header = new object();
                            else
                                Modellist.header = nl[0];
                        }
                        else if (I == 1)
                            Modellist.details = nl;
                        else if (I == 2)
                            Modellist.Requisition = nl;

                        I++;
                    }
                    return new ResponseModel()
                    {
                        Data = Modellist,
                        Message = "Success",
                        Status = true
                    };
                }
            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }
        public async Task<object> getSearchbySupplierduedate(string branchid, int orgid, int supplierid, string fromdate, string todate)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 1);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                param.Add("@supplierid", supplierid);
                param.Add("@fromdate", fromdate);
                param.Add("@todate", todate);

                var List = await _connection.QueryAsync(InvoiceReceiptBackEnd.InvoiceReceiptSearchBy, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();

                return new ResponseModel() { Data = Modellist, Message = "Success", Status = true };
            }
            catch (Exception Ex)
            {
                return new ResponseModel() { Data = null, Message = "Something went wrong", Status = false };
            }
        }
        public async Task<object> getIRNGRNDetails(int receiptnote_hdr_id)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 2);
                param.Add("@supplierid", receiptnote_hdr_id);
                param.Add("@branchid", 0);
                param.Add("@orgid", 0);
                param.Add("@fromdate", "");
                param.Add("@todate", "");

                var List = await _connection.QueryAsync(InvoiceReceiptBackEnd.InvoiceReceiptSearchBy, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();

                return new ResponseModel() { Data = Modellist, Message = "Success", Status = true };
            }
            catch (Exception Ex)
            {
                return new ResponseModel() { Data = null, Message = "Something went wrong", Status = false };
            }
        }
        public async Task<object> getAddInvoiceReceiptDetails(string branchid, string orgid, string fromdate, string todate)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 3);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                param.Add("@supplierid", 0);
                param.Add("@fromdate", fromdate);
                param.Add("@todate", todate);

                var List = await _connection.QueryAsync(InvoiceReceiptBackEnd.InvoiceReceiptSearchBy, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();

                return new ResponseModel() { Data = Modellist, Message = "Success", Status = true };
            }
            catch (Exception Ex)
            {
                return new ResponseModel() { Data = null, Message = "Something went wrong", Status = false };
            }
        }
        public async Task<object> AddIRNGRN(InvoiceEntry1 Obj)
        {
            try
            {
                int Result = 0;                
                
                var pridToPodidMap = new Dictionary<int, int>();
                string message = "";
                var detailSqls = "";
                foreach (var detail in Obj.item)
                {

                        int receiptnote_hdr_id = detail.receiptnote_hdr_id;
                        if (receiptnote_hdr_id == 0)
                        {
                            var response = "select concat(prefixtext, lpad(doc_number+1,7,'0')) as text from master_documentnumber a where doc_type=5 and a.unit=" + detail.branchid + " and a.orgid =" + detail.orgid + ";";
                            var seqno = await _connection.QuerySingleAsync<string>(response);

                            detailSqls = @"
                        INSERT INTO `tbl_IRNReceipt_detail`
                        (`ModeOfPaymentId`,`docno`, `docdate`,`supplier_id`,`grn_id`,`poid`,`receiptno`,`receiptdate`,`duedate`,`filepath` ,
                        `spc`,`isgenerated`,`createdby`,`createddate`,`isactive`,`filename`,`paymenttermid`, `po_amount`, `adv_payment`, `balance_payment`,`alreadyrecivedamount`, `balancepaymentamount`)
                        VALUES (@ModeOfPaymentId,@docno, @docdate, @supplierid, @grnid, @poid, @invoiceno, @invoicedate,@duedate,@filepath,@spc,0,@createdby,
                        NOW(),1,@filename,@paymenttermid, @poamount, @advpayment, @balancepayment, @alreadyrecivedamount, @balancepaymentamount);
                        SELECT LAST_INSERT_ID();";

                            var podid = await _connection.QuerySingleAsync<int>(detailSqls, new
                            {
                                ModeOfPaymentId=detail.ModeOfPaymentId,
                                receiptnote_hdr_id = detail.receiptnote_hdr_id,
                                docno = seqno,
                                docdate = detail.receipt_Date,
                                invoiceno = detail.invoiceno,
                                grnid = detail.grnid,
                                poid = detail.poid,
                                supplierid = detail.supplierid,
                                invoicedate = detail.invoicedate,
                                duedate = detail.duedate,
                                paymenttermid = detail.paymenttermid,
                                filepath = detail.filepath,
                                spc = detail.spc,
                                createdby = detail.createdby,
                                isactive = detail.isactive,
                                filename = detail.filename,
                                poamount = detail.po_amount,
                                advpayment = detail.adv_payment,
                                balancepayment = detail.balance_payment,
                                alreadyrecivedamount = detail.alreadyrecivedamount,
                                balancepaymentamount = detail.balancepaymentamount
                            });

                            var UpdateSeq = "update master_documentnumber set Doc_Number=Doc_Number+1 where Doc_Type=5 and unit=1; ";
                            Result = await _connection.ExecuteAsync(UpdateSeq, Obj.item); 

                        string updatepurchaseorder = "CALL proc_irnbalance(@irnid);";
                        await _connection.ExecuteAsync(updatepurchaseorder, new { irnid = detail.poid });

                        message = "Invoice Receipt Saved Successfully";
                        }
                        else
                        {
                            //detailSqls = @"UPDATE tbl_IRNReceipt_detail SET `isactive` = 0 WHERE receiptnote_hdr_id = @receiptnote_hdr_id;";
                            //await _connection.ExecuteAsync(detailSqls, new { receiptnote_hdr_id = detail.receiptnote_hdr_id });

                            var updateSqls = @"UPDATE tbl_IRNReceipt_detail SET `ModeOfPaymentId`=@ModeOfPaymentId, `docdate` = @docdate, `receiptno` = @invoiceno, `receiptdate` = @invoicedate, `duedate` = @duedate,
                        `po_amount` = @poamount,`adv_payment` = @advpayment,`balance_payment` = @balancepayment, `alreadyrecivedamount` = @alreadyrecivedamount,
                        `balancepaymentamount` = @balancepaymentamount, `modifyby` = @createdby, `modifydate` = NOW()
                        WHERE receiptnote_hdr_id = @receiptnote_hdr_id;";

                            await _connection.ExecuteAsync(updateSqls, new
                            {
                                ModeOfPaymentId=detail.ModeOfPaymentId,
                                receiptnote_hdr_id = detail.receiptnote_hdr_id,
                                docdate = detail.receipt_Date,
                                invoiceno = detail.invoiceno,
                                invoicedate = detail.invoicedate,
                                duedate = detail.duedate,
                                poamount = detail.po_amount,
                                advpayment = detail.adv_payment,
                                balancepayment = detail.balance_payment,
                                alreadyrecivedamount = detail.alreadyrecivedamount,
                                balancepaymentamount = detail.balancepaymentamount,
                                createdby = detail.createdby,
                            });

                        string updatepurchaseorder = "CALL proc_irnbalance(@irnid);";
                        await _connection.ExecuteAsync(updatepurchaseorder, new { irnid = detail.poid });

                        message = "Invoice Receipt updated Successfully";
                        }

                    }




                //if (Obj.Header.isGenerated == true)
                //{
                //    string updatetofinance = "call proc_InsertInvoiceToFinance(1," + recipid + ");";
                //    var exeresult = await _connection.ExecuteAsync(updatetofinance);
                //}

                return new ResponseModel()
                {
                    Data = null,
                    Message = message,
                    Status = true
                };

            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }
        public async Task<object> getIRNDetails(string branchid, string orgid, string fromdate, string todate)
        {
            try
            {
                var param = new DynamicParameters();
                param.Add("@opt", 4);
                param.Add("@branchid", branchid);
                param.Add("@orgid", orgid);
                param.Add("@supplierid", 0);
                param.Add("@fromdate", fromdate);
                param.Add("@todate", todate);

                var List = await _connection.QueryAsync(InvoiceReceiptBackEnd.InvoiceReceiptSearchBy, param: param, commandType: CommandType.StoredProcedure);
                var Modellist = List.ToList();

                return new ResponseModel() { Data = Modellist, Message = "Success", Status = true };
            }
            catch (Exception Ex)
            {
                return new ResponseModel() { Data = null, Message = "Something went wrong", Status = false };
            }
        }
        public async Task<object> InvoiceReceiptAttachment(int receiptnote_hdr_id, string file_path, string file_name)
        {
            try
            {
                

                const string updateDetailsSql = @"
                    UPDATE tbl_IRNReceipt_detail 
                    SET filepath = @file_path, filename = @file_name 
                    WHERE receiptnote_hdr_id = @recipid;";


                await _connection.ExecuteAsync(updateDetailsSql, new
                {
                    file_path = file_path,
                    file_name = file_name,
                    recipid = receiptnote_hdr_id
                });

                return new SharedModelWithResponse() { Data = null, Message = "Documents Uploaded successfully", Status = true };

            }
            catch (Exception Ex)
            {
                return new ResponseModel() { Data = null, Message = "Something went wrong", Status = false };
            }
        }
        public async Task<object> InvoiceReceiptDocAttachment(List<InvoiceReceiptAttachment> list)
        {
            try
            {
                const string insertDetailSql = @"
                INSERT INTO tbl_invoicereceipt_attachment (
                    receiptnote_hdr_id, filepath, filename, createdby,GrnId
                )
                VALUES (@receiptnote_hdr_id, @file_path, @file_name, @UserId,@GrnId);";

                //var data = list.Where(x => x.receiptnote_hdr_id != 0);
                //await _connection.ExecuteAsync(insertDetailSql, data);

                var parameterData = list.Where(x => x.receiptnote_hdr_id == 0).Select(x => new  {
                    receiptnote_hdr_id = x.receiptnote_hdr_id,
                    file_path = x.file_path,
                    file_name = x.file_name,
                    UserId = x.UserId,
                    GrnId=x.grn_id,
                });

                await _connection.ExecuteAsync(insertDetailSql, parameterData);

                return new SharedModelWithResponse()
                {
                    Data = null,
                    Message = "Success",
                    Status = true
                };

                return new SharedModelWithResponse() { Data = null, Message = "Documents Uploaded successfully", Status = true };

            }
            catch (Exception Ex)
            {
                return new ResponseModel() { Data = null, Message = "Something went wrong", Status = false };
            }
        }
        public async Task<object> GenerateInvoiceReceiptIRN(InvoiceEntry1 Obj)
        {
            try
            {
                var pridToPodidMap = new Dictionary<int, int>();
                int Result = 0;
                string message = "";
                var detailSqls = "";
                foreach (var detail in Obj.item)
                {
                    var response = "select concat(prefixtext, lpad(doc_number+1,7,'0')) as text from master_documentnumber a where doc_type=5 and a.unit=" + detail.branchid + " and a.orgid =" + detail.orgid + ";";
                    var seqno = await _connection.QuerySingleAsync<string>(response);

                    int receiptnote_hdr_id = detail.receiptnote_hdr_id;
                    int lastprimaryId = 0;
                    if (receiptnote_hdr_id == 0)
                    {
                        detailSqls = @"
                        INSERT INTO `tbl_IRNReceipt_detail`
                        (`ModeOfPaymentId`,`docno`, `docdate`,`supplier_id`,`grn_id`,`poid`, `receiptno`,`receiptdate`,`duedate`,`filepath` ,
                        `spc`,`isgenerated`,`createdby`,`createddate`,`isactive`,`filename`,`paymenttermid`, `po_amount`, `adv_payment`, `balance_payment`, `alreadyrecivedamount`, `balancepaymentamount`)
                        VALUES (@ModeOfPaymentId,@docno, @docdate, @supplierid, @grnid,@poid, @invoiceno, @invoicedate,@duedate,@filepath,@spc,1,@createdby,
                        NOW(),1,@filename,@paymenttermid, @poamount, @advpayment, @balancepayment, @alreadyrecivedamount, @balancepaymentamount);
                        SELECT LAST_INSERT_ID();";

                        //lastprimaryId = await _connection.QuerySingleAsync<int>("SELECT LAST_INSERT_ID();");
                        var UpdateSeq = "update master_documentnumber set Doc_Number=Doc_Number+1 where Doc_Type=5 and unit=" + detail.branchid + "; ";
                        Result = await _connection.ExecuteAsync(UpdateSeq, Obj.item);

                        var podid = await _connection.QuerySingleAsync<int>(detailSqls, new
                        {
                            ModeOfPaymentId=detail.ModeOfPaymentId,
                            receiptnote_hdr_id = detail.receiptnote_hdr_id,
                            docno = seqno,
                            docdate = detail.receipt_Date,
                            invoiceno = detail.invoiceno,
                            grnid = detail.grnid,
                            poid = detail.poid,
                            supplierid = detail.supplierid,
                            invoicedate = detail.invoicedate,
                            duedate = detail.duedate,
                            paymenttermid = detail.paymenttermid,
                            filepath = detail.filepath,
                            spc = detail.spc==true ? 1 : 0,
                            createdby = detail.createdby,
                            isactive = detail.isactive,
                            filename = detail.filename,
                            poamount = detail.po_amount,
                            advpayment = detail.adv_payment,
                            balancepayment = detail.balance_payment,
                            alreadyrecivedamount = detail.alreadyrecivedamount,
                            balancepaymentamount = detail.balancepaymentamount
                        });
                        lastprimaryId = await _connection.QuerySingleAsync<int>("SELECT LAST_INSERT_ID();");
                        var recipquery = "select isgenerated from tbl_IRNReceipt_detail a where receiptnote_hdr_id=" + lastprimaryId + ";";
                        var isgenerated = await _connection.QuerySingleAsync<string>(recipquery);

                        if (isgenerated == "1")
                        {
                            string updatetofinance = "call proc_InsertInvoiceToFinance(1," + lastprimaryId + ");";
                            var exeresult = await _connection.ExecuteAsync(updatetofinance);
                        }

                        message = "Invoice Receipt Generated Successfully";
                    }                  
                }

                foreach (var detail1 in Obj.item)
                {
                    if (detail1.receiptnote_hdr_id > 0)
                    {
                        int rec_id = detail1.receiptnote_hdr_id;

                        const string updateDetailsSql = @"
                            UPDATE tbl_IRNReceipt_detail 
                            SET isgenerated = 1 ,spc=@spc
                            WHERE receiptnote_hdr_id = @receiptnote_hdr_id;";

                        await _connection.ExecuteAsync(updateDetailsSql, new { receiptnote_hdr_id = rec_id,spc=detail1.spc==true ? 1 : 0 });
                        int lastprimaryId = rec_id;
                        var recipquery = "select isgenerated from tbl_IRNReceipt_detail a where receiptnote_hdr_id=" + lastprimaryId + ";";
                        var isgenerated = await _connection.QuerySingleAsync<string>(recipquery);

                        if (isgenerated == "1")
                        {
                            string updatetofinance = "call proc_InsertInvoiceToFinance(1," + lastprimaryId + ");";
                            var exeresult = await _connection.ExecuteAsync(updatetofinance);
                        }
                        string updatepurchaseorder = "CALL proc_irnbalance(@irnid);";
                        await _connection.ExecuteAsync(updatepurchaseorder, new { irnid = detail1.poid });
                        message = "Invoice Receipt updated Successfully";
                    }
                }
     
                




                return new ResponseModel()
                {
                    Data = null,
                    Message = "Invoice receipt Generated successfully",
                    Status = true
                };

            }
            catch (Exception Ex)
            {
                return new ResponseModel()
                {
                    Data = null,
                    Message = "Something went wrong",
                    Status = false
                };
            }
        }
    }
}