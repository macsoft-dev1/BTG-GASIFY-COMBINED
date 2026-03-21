import React, { useState, useEffect, useRef, useMemo } from "react";
import { Container, Row, Col, Card, CardBody, Label, Button, Spinner, Modal, ModalHeader, ModalBody, ModalFooter, Input } from "reactstrap";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_green.css";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import Select from "react-select";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { toast } from "react-toastify";
import axios from "axios";
import { PYTHON_API_URL } from "common/pyapiconfig";

import { getARBook, GetCustomerFilter } from "../service/financeapi";
import { GetAllCurrencies } from "../../../common/data/mastersapi";

const ARBookDOReport = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth() - 2, 1);

  const [arBook, setArBook] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [globalFilter, setGlobalFilter] = useState("");
  const dtRef = useRef(null);

  // --- SELECTION & CONVERSION STATES ---
  const [selectedRows, setSelectedRows] = useState([]);
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [newInvoiceNo, setNewInvoiceNo] = useState("");
  const [isSaving, setIsSaving] = useState(false);


  useEffect(() => {
    const loadMasters = async () => {
      try {
        const custRes = await GetCustomerFilter(1, "%");
        setCustomers(custRes);
        if (custRes && custRes.length > 0) {
          setSelectedCustomer(custRes[0]);
        }
      } catch (error) {
        console.error("Error loading masters:", error);
      }
    };
    loadMasters();
  }, []);

  useEffect(() => {
    if (selectedCustomer) {
      fetchARBook();
    }
  }, [selectedCustomer]);

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    return new Date(dateStr);
  };

  const fetchARBook = async () => {
    try {
      setSelectedRows([]); // Reset selection on refresh
      const data = await getARBook(
        selectedCustomer ? selectedCustomer.value : 0,
        1,
        1,
        fromDate ? format(fromDate, "yyyy-MM-dd") : null,
        toDate ? format(toDate, "yyyy-MM-dd") : null
      );

      if (data.status && data.data?.length > 0) {
        let rawData = data.data;
        rawData.sort((a, b) => parseDate(a.ledger_date) - parseDate(b.ledger_date));

        const processedData = rawData.map(row => {
          return {
            ...row,
            uniqueId: row.transaction_id || row.ar_id,
            invoiceAmount: parseFloat(row.invoice_amount) || 0,
            receiptAmount: parseFloat(row.receipt_amount) || 0,
            debitNote: parseFloat(row.debit_note_amount) || 0,
            creditNote: parseFloat(row.credit_note_amount) || 0,
          };
        });

        setArBook(processedData);
      } else {
        setArBook([]);
      }
    } catch (err) {
      toast.error("Failed to load AR data");
      setArBook([]);
    }
  };

  // --- CONVERT TO INVOICE HANDLER (UPDATED) ---
  const handleConvertSubmit = async () => {
    if (!newInvoiceNo.trim()) {
      toast.error("Please enter an Invoice Number");
      return;
    }
    if (selectedRows.length === 0) return;

    setIsSaving(true);

    // Extract valid IDs
    const idsToUpdate = selectedRows
      .map(row => row.uniqueId)
      .filter(id => id !== undefined && id !== null);

    if (idsToUpdate.length === 0) {
      toast.error("Selected rows have invalid IDs.");
      setIsSaving(false);
      return;
    }

    try {
      const response = await axios.put(`${PYTHON_API_URL}/AR/bulk-update-reference`, {
        ids: idsToUpdate,
        new_reference: newInvoiceNo
      });

      if (response.data.status === "success") {
        toast.success(`Success! Converted ${selectedRows.length} record(s) to ${newInvoiceNo}`);
        setIsConvertModalOpen(false);
        setNewInvoiceNo("");
        
        // Refresh data to remove converted rows from this view
        fetchARBook();
      } else {
        toast.error("Failed to convert records.");
      }

    } catch (err) {
      console.error(err);
      toast.error("An error occurred while converting.");
    } finally {
      setIsSaving(false);
    }
  };

  const finalProcessedData = useMemo(() => {
    // --- FILTER LOGIC: Only show "DO" or "27" ---
    const filtered = arBook.filter(item => {
      const ref = item.invoice_no ? String(item.invoice_no).trim().toUpperCase() : "";
      return ref.startsWith("DO") || ref.startsWith("27");
    });

    let runningBalance = 0;
    return filtered.map((row, index) => {
      const rowKey = row.uniqueId + "_" + index;
      const rowBalance = row.invoiceAmount + row.debitNote - row.creditNote - row.receiptAmount;
      runningBalance += rowBalance;

      return {
        ...row,
        rowKey,
        cumulativeBalance: runningBalance
      };
    });
  }, [arBook]);

  const exportExcel = () => {
    const exportData = finalProcessedData.map(item => ({
      Date: format(new Date(item.ledger_date), "dd-MMM-yyyy"),
      "Reference No.": item.invoice_no,
      "Invoice Amount (A)": item.invoiceAmount,
      "Debit Note (B)": item.debitNote,
      "Receipt (C)": item.receiptAmount,
      "Credit Note (D)": item.creditNote,
      "Balance ((A+B)-(C+D))": item.cumulativeBalance
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AR Book DO");
    XLSX.writeFile(wb, "AR_Book_DO.xlsx");
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Reports" breadcrumbItem="AR Book DO" />
        <Row>
          <Col lg="12">
            <Card>
              <CardBody>
                {/* Filters Section */}
                <Row className="mb-3 align-items-end">
                  <Col md="3" className="d-flex align-items-center">
                    <Label className="me-2 mb-0">Customer:</Label>
                    <Select options={customers} onChange={setSelectedCustomer} value={selectedCustomer} isClearable className="flex-grow-1" />
                  </Col>
                  <Col md="4" className="d-flex align-items-center">
                    <Label className="me-2 mb-0">From:</Label>
                    <Flatpickr className="form-control" value={fromDate} onChange={(date) => setFromDate(date[0])} options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }} />
                  </Col>
                  <Col md="4" className="d-flex align-items-center">
                    <Label className="me-2 mb-0">To:</Label>
                    <Flatpickr className="form-control" value={toDate} onChange={(date) => setToDate(date[0])} options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }} />
                  </Col>

                  {/* BUTTONS ROW */}
                  <Col md="12" className="text-end mt-3">
                    <Button
                      color="warning"
                      className="me-2"
                      onClick={() => setIsConvertModalOpen(true)}
                      disabled={selectedRows.length === 0}
                    >
                      <i className="bx bx-refresh me-1"></i> Convert to Invoice
                    </Button>

                    <button type="button" className="btn btn-primary me-2" onClick={fetchARBook}>Search</button>
                    <button type="button" className="btn btn-success me-2" onClick={exportExcel}>Export</button>
                    <button type="button" className="btn btn-secondary" onClick={() => window.print()}>Print</button>
                  </Col>
                </Row>

                <div className="table-responsive">
                  <DataTable
                    ref={dtRef}
                    value={finalProcessedData}
                    paginator rows={20}
                    globalFilter={globalFilter}
                    header={
                      <div className="d-flex justify-content-end">
                        <InputText type="search" placeholder="Global Search" className="form-control" style={{ width: "250px" }} value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
                      </div>
                    }
                    responsiveLayout="scroll"
                    selection={selectedRows}
                    onSelectionChange={e => setSelectedRows(e.value)}
                    dataKey="uniqueId"
                  >
                    {/* SELECTION COLUMN */}
                    <Column selectionMode="multiple" headerStyle={{ width: '3em' }}></Column>

                    <Column field="ledger_date" header="Date"
                      body={(row) => format(new Date(row.ledger_date), "dd-MMM-yyyy")}
                      headerStyle={{ whiteSpace: 'nowrap' }} />

                    <Column field="invoice_no" header="Reference No." headerStyle={{ whiteSpace: 'nowrap' }} />

                    <Column field="invoiceAmount" header="Invoice Amount (A)"
                      body={(d) => d.invoiceAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      headerStyle={{ whiteSpace: 'nowrap' }} className="text-end" />

                    <Column field="debitNote" header="Debit Note (B)"
                      body={(d) => d.debitNote?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      headerStyle={{ whiteSpace: 'nowrap' }} className="text-end" />

                    <Column field="receiptAmount" header="Receipt (C)"
                      body={(d) => d.receiptAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      headerStyle={{ whiteSpace: 'nowrap' }} className="text-end" />

                    <Column field="creditNote" header="Credit Note (D)"
                      body={(d) => d.creditNote?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      headerStyle={{ whiteSpace: 'nowrap' }} className="text-end" />

                    <Column field="cumulativeBalance" header="Balance ((A+B)-(C+D))"
                      body={(d) => d.cumulativeBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      headerStyle={{ whiteSpace: 'nowrap' }} className="text-end" />
                  </DataTable>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* --- CONVERT TO INVOICE POPUP --- */}
        <Modal isOpen={isConvertModalOpen} toggle={() => setIsConvertModalOpen(false)} centered>
          <ModalHeader toggle={() => setIsConvertModalOpen(false)}>Convert DO to Invoice</ModalHeader>
          <ModalBody>
            <div className="alert alert-info">
              You have selected <strong>{selectedRows.length}</strong> DO(s) to convert.
              <br />
              <small>This will update both the Finance Book and Sales Header.</small>
            </div>
            <div className="mb-3">
              <Label className="fw-bold">New Invoice Number:</Label>
              <Input
                type="text"
                placeholder="Enter Invoice No (e.g. INV-2025-001)"
                value={newInvoiceNo}
                onChange={(e) => setNewInvoiceNo(e.target.value)}
              />
              <small className="text-muted">This invoice number will be applied to all selected entries.</small>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="secondary" onClick={() => setIsConvertModalOpen(false)}>Cancel</Button>
            <Button color="primary" onClick={handleConvertSubmit} disabled={isSaving}>
              {isSaving ? <Spinner size="sm" /> : "Confirm Conversion"}
            </Button>
          </ModalFooter>
        </Modal>

      </Container>
    </div>
  );
};

export default ARBookDOReport;