using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Procurement.InvoiceReceipt
{
    public class InvoiceEntry
    {
        public POSupplierItemHeader Header { get; set; }
        public List<POSupplierItemSummary> Details { get; set; }
        public List<POSupplierItemDetail> Requisition { get; set; }    
        public List<InvoiceReceiptEntry> item { get; set; }
    }

    public class InvoiceEntry1
    {
        public List<InvoiceReceiptEntry> item { get; set; }
    }
    public class uploadentry
    {
        public List<InvoiceReceiptAttachment> attachmentList { get; set; }
    }
    public class POSupplierItemHeader
    {
        public int receiptnote_hdr_id { get; set; }
        public int supplier_id { get; set; }
        public int category_id { get; set; }
        public string po_id { get; set; }
        public string receipt_no { get; set; }
        public string receipt_date { get; set; }
        public int isactive { get; set; }
        public int userid { get; set; }
        public string createdip { get; set; }
        public string modifiedip { get; set; }
        public int branchid { get; set; }
        public int orgid { get; set; }
        public bool isGenerated { get; set; }
    }

    public class POSupplierItemSummary
    {
        public Int32 receiptsummarydtl_id { get; set; }
        public int receiptnote_hdr_id { get; set; }
        public int po_id { get; set; }
        public string invoice_no { get; set; }
        public string invoice_date { get; set; }
        public string due_date { get; set; }
        public string file_attach_path { get; set; }
        public string file_name { get; set; }
        public int spc { get; set; }
        public int isactive { get; set; }
        public int userid { get; set; }
        public string createdip { get; set; }
        public string modifiedip { get; set; }
        public int branchid { get; set; }
        public int orgid { get; set; }
        public int grn_id { get; set; }
    }
    public class POSupplierItemDetail
    {
        public Int32 receiptsummarydtl_id { get; set; }
        public Int32 receiptdtl_id { get; set; }
        public int currencyid { get; set; }
        public int receiptnote_hdr_id { get; set; }
        public int item_id { get; set; }
        public decimal unit_price { get; set; }
        public decimal qty { get; set; }
        public decimal rate { get; set; }
        public decimal total_amount { get; set; }
        public decimal tax_perc { get; set; }
        public decimal total_value { get; set; }
        public decimal vat_perc { get; set; }
        public decimal vat_value { get; set; }
        public decimal net_amount { get; set; }
        public int create_by { get; set; }
        public string ip_address { get; set; }
        public int isactive { get; set; }
        public int branchid { get; set; }
        public int orgid { get; set; }
    }
    public class InvoiceGenerate
    {
        public POSupplierItemHeader Header { get; set; }
    }

    public class InvoiceReceiptEntry
    {
        public Int32 ModeOfPaymentId { get; set; }
        public int receiptnote_hdr_id { get; set; }
        public string grnid { get; set; }
        public int poid { get; set; }
        public int supplierid { get; set; }
        public string invoiceno { get; set; }
        public string invoicedate { get; set; }
        public string receipt_Date { get; set; }
        public string duedate { get; set; }
        public string paymenttermid { get; set; }
        public string filepath { get; set; }
        public string filename { get; set; }
        public bool spc { get; set; }
        public bool isactive { get; set; }
        public int createdby { get; set; }
        public string createdip { get; set; }
        public string modifiedip { get; set; }
        public int branchid { get; set; }
        public int orgid { get; set; }
        public decimal po_amount { get; set; }
        public decimal adv_payment { get; set; }
        public decimal balance_payment { get; set; }
        public decimal alreadyrecivedamount { get; set; }
        public decimal balancepaymentamount { get; set; }
    }
}