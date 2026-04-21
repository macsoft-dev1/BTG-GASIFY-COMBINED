using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Core.Master.SalesCommission
{
    public class SalesCommissionHeader
    {
        public int Id { get; set; }
        public int CustomerId { get; set; }
        public int GasId { get; set; }
        public decimal SellingPrice { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public int IsActive { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int? LastModifiedBy { get; set; }
        public DateTime? LastModifiedDate { get; set; }
        public int DetailCount { get; set; }
    }

    public class SalesCommissionDetail
    {
        public int Id { get; set; }
        public int SalesCommissionId { get; set; }
        public string Contact { get; set; }
        public decimal Rate { get; set; }
        public int? CreatedBy { get; set; }
        public DateTime? CreatedDate { get; set; }
        public int? LastModifiedBy { get; set; }
        public DateTime? LastModifiedDate { get; set; }
    }

    public class SalesCommissionListing
    {
        public int Id { get; set; }           // DetailId
        public int HeaderId { get; set; }     // HeaderId
        public int CustomerId { get; set; }
        public int GasId { get; set; }
        public decimal SellingPrice { get; set; }
        public DateTime EffectiveFrom { get; set; }
        public int IsActive { get; set; }
        public string ContactName { get; set; }
        public decimal ContactRate { get; set; }
        public int DetailCount { get; set; }
    }

    public class SalesCommissionItem
    {
        public SalesCommissionHeader Header { get; set; }
        public List<SalesCommissionDetail> Details { get; set; } = new List<SalesCommissionDetail>();
    }
}
