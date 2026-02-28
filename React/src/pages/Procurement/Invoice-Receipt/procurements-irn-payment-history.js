import React, { useEffect, useState } from "react";
import { Row, Col, Label, Button, Input } from "reactstrap";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import Flatpickr from "react-flatpickr";

import { GetAllClaimAndPayment } from "../../../common/data/mastersapi";


const PaymentHistory = ({ irnId, poNo, supplierName }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (irnId) {
      fetchPaymentHistory(irnId);
    }
  }, [irnId, poNo]);

  const fetchPaymentHistory = async (supplierId) => {
    try {
      const authUser = localStorage.getItem("authUser");
      const userObj = authUser ? JSON.parse(authUser) : {};
      const userId = userObj.u_id || 0;

      console.log("Fetching Claims for SupplierId:", supplierId, "User:", userId);

      const res = await GetAllClaimAndPayment(0, 0, 1, 1, userId);

      const claimList = (res && res.status && Array.isArray(res.data)) ? res.data : (Array.isArray(res) ? res : []);
      console.log("Total Claims Fetched:", claimList.length);

      if (claimList.length > 0) {
        // Log keys of the first item to debug
        console.log("First Item Keys:", Object.keys(claimList[0]));
        console.log("First Item Data:", claimList[0]);

        // Filter by Supplier ONLY (Relaxed PO check)
        const filteredData = claimList.filter((item) => {
          // Check Supplier (Flexible property names)
          const sid = item.supplierid || item.SupplierId || item.header?.SupplierId || 0;
          // Loose match
          return String(sid) == String(supplierId);
        });

        console.log("Claims matching Supplier:", filteredData.length);

        if (filteredData.length === 0 && claimList.length > 0) {
          console.log("No claims matched SupplierId", supplierId, ". Check if supplierId field exists.");
        }

        const mappedData = filteredData.map(item => ({
          ...item,
          receipt_no: item.claimno || item.ApplicationNo,
          voucherno: item.voucherno || item.header?.voucherNo || '-',
          paymentmethod: item.paymentmethod || item.header?.paymentMethod || '-',
          display_pono: item.pono || "N/A" // For debug column
        }));

        setData(mappedData);
      } else {
        setData([]);
      }
    } catch (err) {
      console.error("Error fetching payment history from claims:", err);
      setData([]);
    }
  };

  return (
    <div className="container mt-0">
      {/* Info Box */}
      <div className="p-2 mb-1" style={{ backgroundColor: "#f8f9fa", borderRadius: "5px", border: "1px solid #dee2e6" }}>
        <Row>
          <Col md="6">
            <strong>Supplier Name:</strong> <span className="ms-2" style={{ color: "firebrick", fontWeight: "bold" }}>{supplierName || "N/A"}</span>
          </Col>
          {(poNo && poNo !== "N/A") && (
            <Col md="6">
              <strong>PO Number:</strong> <span className="ms-2" style={{ color: "firebrick", fontWeight: "bold" }}>{poNo}</span>
            </Col>
          )}
        </Row>
      </div>

      <DataTable value={data} paginator rows={5} responsiveLayout="scroll" emptyMessage="No payment history found."
        showGridlines
        header={null}
      >
        <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} style={{ width: '50px' }} />
        <Column field="receipt_no" header="CLAIM NUMBER" />
        <Column field="voucherno" header="PV NUMBER" />
        <Column field="paymentmethod" header="MODE OF PAYMENT" />
        <Column field="display_irnno" header="IRN NO" />
      </DataTable>
    </div>
  );
};

export default PaymentHistory;
