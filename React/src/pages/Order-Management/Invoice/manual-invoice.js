import React, { useState, useEffect } from "react";
import {
  Card,
  Col,
  Container,
  Row,
  UncontrolledAlert,
  Button as RButton
} from "reactstrap";
import { useHistory } from "react-router-dom";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { Tag } from "primereact/tag";
import Select from "react-select";
import { Dropdown } from "primereact/dropdown";
import { Dialog } from 'primereact/dialog'; // IMPORTED DIALOG
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "flatpickr/dist/themes/material_blue.css";
import Flatpickr from "react-flatpickr";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import { GetCustomer } from "../../../common/data/mastersapi";
import { Tooltip } from "primereact/tooltip";
import useAccess from "../../../common/access/useAccess";
import {
  GetALLInvoices,
  GetGasItems
} from "../../../common/data/invoiceapi";

const ManualInvoice = () => {
  const { access, applyAccessUI } = useAccess("Invoice", " Direct Sales Invoice");
  const history = useHistory();
  const [invoiceList, setInvoiceList] = useState(null);
  const [filters, setFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const [errormsg, setErrormsg] = useState();
  const [successMsg, setSuccessMsg] = useState("");

  // --- HISTORY STATE ---
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const formatDate = date => date.toISOString().split("T")[0];
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  // Current Month Calculation for History
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const auth = localStorage.getItem("authUser");
  const authUser = auth ? JSON.parse(auth) : null;
  const isSuperAdmin = authUser && (authUser.superAdmin || authUser.IsAdmin || authUser.role_name === "Super Admin");

  // Main Filter (IsAR: 0 -> Saved/Drafts, 2 -> All for Super Admin)
  const [invoiceFilter, setInvoiceFilter] = useState({
    customerid: 0,
    FromDate: formatDate(sevenDaysAgo),
    ToDate: formatDate(new Date()),
    BranchId: 1,
    IsAR: isSuperAdmin ? 2 : 0
  });

  // History Filter (Default Current Month)
  const [historyFilter, setHistoryFilter] = useState({
    FromDate: formatDate(startOfMonth),
    ToDate: formatDate(endOfMonth)
  });

  const [isseacrch, setIsseacrch] = useState(false);
  const [CustomerList, setCustomerList] = useState([]);
  const [gasItemList, setGasItemList] = useState([]);

  const getSeverity = Status => {
    switch (Status) {
      case "unqualified": return "danger";
      case "qualified": return "success";
      case "Posted": return "success";
      case "Saved": return "danger";
      case "new": return "info";
      case "negotiation": return "warning";
      case "renewal": return null;
      default: return "info";
    }
  };

  useEffect(() => {
    if (!access.loading) {
      applyAccessUI();
    }
  }, [access, applyAccessUI]);

  useEffect(() => {
    setLoading(false);
    initFilters();
  }, []);

  useEffect(() => {
    const loadGasItems = async () => {
      const gasData = await GetGasItems();
      setGasItemList(gasData);
    };
    loadGasItems();
  }, []);

  const clearFilter = () => {
    initFilters();
  };

  const onGlobalFilterChange = e => {
    const value = e.target.value;
    setFilters({
      ...filters,
      global: { value, matchMode: FilterMatchMode.CONTAINS },
    });
    setGlobalFilterValue(value);
  };

  const initFilters = () => {
    setFilters({
      InvoiceNbr: { value: null, matchMode: FilterMatchMode.CONTAINS },
      CustomerName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      CurrencyCode: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      PONumber: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      CalculatedPrice: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
      Salesinvoicesdate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] },
      DONO: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      TotalAmount: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      Status: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
    });
    setGlobalFilterValue("");
  };

  const renderHeader = () => {
    return (
      <div className="row align-items-center g-3 clear-spa">
        <div className="col-12 col-lg-6">
          <Button className="btn btn-danger btn-label" onClick={clearFilter}>
            <i className="mdi mdi-filter-off label-icon" /> Clear
          </Button>
        </div>
        <div className="col-12 col-lg-3 text-end">
          {/* Show P legend for Super Admin since they see posted entries too */}
          <span className="me-4"><Tag value="S" severity={getSeverity("Saved")} /> Saved</span>
          {isSuperAdmin && <span className="me-4"><Tag value="P" severity={getSeverity("Posted")} /> Posted</span>}
        </div>
        <div className="col-12 col-lg-3">
          <input
            className="form-control"
            type="text"
            value={globalFilterValue}
            onChange={onGlobalFilterChange}
            placeholder="Keyword Search"
          />
        </div>
      </div>
    );
  };

  const header = renderHeader();
  const linkAddinvoice = () => {
    history.push("/add-manual-invoice");
  };

  useEffect(() => {
    const loadCustomerList = async () => {
      const data = await GetCustomer(1, 0);
      setCustomerList(data);
    };
    loadCustomerList();
    GetALLInvoiceList();
    initFilters();
  }, []);

  const handleDateChange = (selectedDates, dateStr, instance) => {
    const fieldName = instance.element.getAttribute("id");
    if (selectedDates.length > 0) {
      const localDate = selectedDates[0];
      const yyyy = localDate.getFullYear();
      const mm = String(localDate.getMonth() + 1).padStart(2, "0");
      const dd = String(localDate.getDate()).padStart(2, "0");

      const formatted = `${yyyy}-${mm}-${dd}`;
      setInvoiceFilter(prevState => ({ ...prevState, [fieldName]: formatted }));
    }
  };

  // Date Change for History Popup
  const handleHistoryDateChange = (selectedDates, dateStr, instance) => {
    const fieldName = instance.element.getAttribute("id"); // "HistFromDate" or "HistToDate"
    const key = fieldName === "HistFromDate" ? "FromDate" : "ToDate";

    if (selectedDates.length > 0) {
      const localDate = selectedDates[0];
      const yyyy = localDate.getFullYear();
      const mm = String(localDate.getMonth() + 1).padStart(2, "0");
      const dd = String(localDate.getDate()).padStart(2, "0");
      const formatted = `${yyyy}-${mm}-${dd}`;

      setHistoryFilter(prevState => ({ ...prevState, [key]: formatted }));
    }
  };

  // FETCH MAIN LIST (IsAR: 0)
  const GetALLInvoiceList = async () => {
    setErrormsg("");
    if (!invoiceFilter.FromDate || !invoiceFilter.ToDate) {
      setErrormsg("Please select both From and To dates.");
      return;
    }
    if (invoiceFilter.FromDate > invoiceFilter.ToDate) {
      setErrormsg("To date should not be earlier than From date.");
      return;
    }
    setLoading(true);
    try {
      // Pass IsAR = 0 (Saved)
      const response = await GetALLInvoices(
        invoiceFilter.customerid,
        invoiceFilter.FromDate,
        invoiceFilter.ToDate,
        invoiceFilter.BranchId,
        invoiceFilter.IsAR // IsAR Flag
      );
      if (response?.status) {
        setInvoiceList(response?.data || []);
      } else if (Array.isArray(response)) {
        setInvoiceList(response);
      } else {
        console.log("Failed to fetch invoices");
      }
    } catch (err) {
      console.log("err > ", err);
    } finally {
      setLoading(false);
    }
  };

  // FETCH HISTORY LIST (IsAR: 1)
  const GetHistoryList = async () => {
    setHistoryLoading(true);
    try {
      const response = await GetALLInvoices(
        0, // All Customers
        historyFilter.FromDate,
        historyFilter.ToDate,
        1, // Branch
        1 // IsAR Flag = 1 (Posted/History)
      );
      if (response?.status) {
        setHistoryList(response?.data || []);
      } else if (Array.isArray(response)) {
        setHistoryList(response);
      }
    } catch (err) {
      console.log("err > ", err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Auto-fetch history when dialog opens or dates change while open
  useEffect(() => {
    if (showHistory) {
      GetHistoryList();
    }
  }, [showHistory]);

  const handleCustomerChange = option => {
    if (!option) {
      setInvoiceFilter(prevState => ({ ...prevState, ["customerid"]: 0 }));
    } else {
      setInvoiceFilter(prevState => ({ ...prevState, ["customerid"]: option.value }));
    }
  };

  const actionBodyTemplate = rowData => {
    if (!access?.canEdit) return null;
    return (
      <div className="actions">
        {(rowData.Status != "Posted" || isSuperAdmin) && (
          <span style={{ marginRight: "0.5rem" }} title="Edit" onClick={() => editRow(rowData)}>
            <i className="mdi mdi-square-edit-outline" style={{ fontSize: "1.5rem" }}></i>
          </span>
        )}
      </div>
    );
  };

  const statusBodyTemplate = rowData => {
    const statusShort = rowData.Status === "Saved" ? "S" : rowData.Status === "Posted" ? "P" : rowData.Status;
    return <Tag value={statusShort} severity={getSeverity(rowData.Status)} />;
  };

  const statusFilterTemplate = options => {
    return (
      <Dropdown
        value={options.value}
        options={[{ value: "P", label: "P" }, { value: "S", label: "S" }]}
        onChange={e => options.filterCallback(e.value, options.index)}
        itemTemplate={statusItemTemplate}
        placeholder="Select One"
        className="p-column-filter"
        showClear
      />
    );
  };
  const statusItemTemplate = option => <Tag value={option.label} severity={getSeverity(option.value)} />;

  const editRow = rowData => history.push(`/edit-manual-invoice/${rowData.InvoiceId}`);

  const cancelFilter = async () => {
    const resetFilter = {
      customerid: 0,
      FromDate: formatDate(sevenDaysAgo),
      ToDate: formatDate(new Date()),
      BranchId: 1,
      IsAR: isSuperAdmin ? 2 : 0
    };
    setInvoiceFilter(resetFilter);
    setIsseacrch(!isseacrch);
  };

  useEffect(() => { GetALLInvoiceList(); }, [isseacrch]);

  const poNumberBody = (rowData) => {
    const value = rowData.PONumber || "";
    const shortValue = value.length > 20 ? value.substring(0, 20) + "..." : value;
    const tooltipId = `po-tooltip-${rowData.InvoiceId}`;
    return (
      <span id={tooltipId} style={{ cursor: "pointer" }}>
        {shortValue}
        <Tooltip target={`#${tooltipId}`} content={value} position="top" />
      </span>
    );
  };

  if (!access.loading && !access.canView) {
    return (
      <div style={{ background: "white", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
        <h3>You do not have permission to view this page.</h3>
      </div>
    );
  }

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Sales" breadcrumbItem="Direct Sales Invoice" />
          <Row>
            {errormsg && (
              <UncontrolledAlert color="danger">{errormsg}</UncontrolledAlert>
            )}
            {successMsg && (
              <UncontrolledAlert color="success">{successMsg}</UncontrolledAlert>
            )}

            <Card className="search-top mb-2">
              <div className="row align-items-center g-1 quotation-mid">
                {/* Customer Filter */}
                <div className="col-12 col-lg-4 mt-1">
                  <div className="d-flex align-items-center gap-2">
                    <div className="col-4 text-center"><label className="form-label mb-0">Customer</label></div>
                    <div className="col-8">
                      <Select
                        options={CustomerList}
                        value={CustomerList.find(opt => opt.value === invoiceFilter.customerid) || null}
                        onChange={handleCustomerChange}
                        placeholder="Select..."
                      />
                    </div>
                  </div>
                </div>
                {/* Date Filters */}
                <div className="col-12 col-lg-2 mt-1">
                  <div className="d-flex align-items-center gap-2">
                    <div className="col-3 text-center"><label>From</label></div>
                    <div className="col-9">
                      <Flatpickr
                        id="FromDate"
                        className="form-control"
                        options={{
                          altInput: true,
                          altFormat: "d-m-Y",
                          dateFormat: "Y-m-d"
                        }}
                        value={invoiceFilter.FromDate}
                        onChange={handleDateChange}
                      />
                    </div>
                  </div>
                </div>
                <div className="col-12 col-lg-2 mt-1">
                  <div className="d-flex align-items-center gap-2">
                    <div className="col-3 text-center"><label>To</label></div>
                    <div className="col-9">
                      <Flatpickr
                        id="ToDate"
                        className="form-control"
                        options={{
                          altInput: true,
                          altFormat: "d-m-Y",
                          dateFormat: "Y-m-d"
                        }}
                        value={invoiceFilter.ToDate}
                        onChange={handleDateChange}
                      />
                    </div>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="col-12 col-lg-4 text-end button-items d-flex justify-content-end gap-2 flex-wrap">
                  <button type="button" className="btn btn-info" onClick={GetALLInvoiceList}>
                    <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i>
                    Search
                  </button>
                  <button type="button" className="btn btn-danger" onClick={cancelFilter}>
                    <i className="bx bx-x-circle label-icon font-size-16 align-middle me-2"></i>
                    Cancel
                  </button>

                  <button type="button" className="btn btn-secondary" onClick={() => setShowHistory(true)}>
                    <i className="bx bx-time-five label-icon font-size-16 align-middle me-2"></i>
                    History
                  </button>

                  <button type="button" className="btn btn-success" onClick={linkAddinvoice}>
                    <i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i>
                    New
                  </button>
                </div>
              </div>
            </Card>

            <Col lg="12">
              <Card>
                <DataTable value={invoiceList} paginator rows={10} loading={loading} header={header} filters={filters} className="blue-bg" dataKey="InvoiceId">
                  <Column field="InvoiceNbr" header="Invoice No." filter filterPlaceholder="Search" />
                  <Column field="Salesinvoicesdate" header="Date" filter filterPlaceholder="Date" />
                  <Column field="CustomerName" header="Customer" filter filterPlaceholder="Customer" />
                  <Column field="PONumber" header="PO No." body={poNumberBody} filter filterPlaceholder="PO" />
                  <Column field="TotalAmount" header="Total" className="text-end" body={(r) => r.TotalAmount ? r.TotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'} />
                  <Column field="Status" header="Status" body={statusBodyTemplate} filterElement={statusFilterTemplate} className="text-center" />
                  <Column header="Action" body={actionBodyTemplate} className="text-center" />
                </DataTable>
              </Card>
            </Col>
          </Row>
          {/* HISTORY DIALOG */}
          <Dialog
            header="Posted Invoices History"
            visible={showHistory}
            style={{ width: '85vw' }}
            onHide={() => setShowHistory(false)}
            pt={{
              closeButton: {
                style: {
                  color: 'black'
                }
              },
              closeButtonIcon: {
                style: {
                  color: 'black',
                  fontWeight: 'bold'
                }
              }
            }}
          >
            <div className="row mb-3 align-items-center">
              <div className="col-md-3">
                <label className="form-label">From Date</label>
                <Flatpickr
                  id="HistFromDate"
                  className="form-control"
                  options={{ altInput: true, altFormat: "d-m-Y", dateFormat: "Y-m-d" }}
                  value={historyFilter.FromDate}
                  onChange={handleHistoryDateChange}
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">To Date</label>
                <Flatpickr
                  id="HistToDate"
                  className="form-control"
                  options={{ altInput: true, altFormat: "d-m-Y", dateFormat: "Y-m-d" }}
                  value={historyFilter.ToDate}
                  onChange={handleHistoryDateChange}
                />
              </div>
              <div className="col-md-2 mt-4">
                <button className="btn btn-primary w-100" onClick={GetHistoryList}>
                  <i className="bx bx-refresh"></i> Refresh
                </button>
              </div>
            </div>

            <DataTable value={historyList} paginator rows={10} loading={historyLoading} className="p-datatable-sm p-datatable-gridlines">
              <Column field="InvoiceNbr" header="Invoice No." sortable filter filterPlaceholder="Search" />
              <Column field="Salesinvoicesdate" header="Date" sortable />
              <Column field="CustomerName" header="Customer" sortable filter filterPlaceholder="Customer" />
              <Column field="PONumber" header="PO No." />
              <Column field="TotalAmount" header="Total" className="text-end" body={(r) => r.TotalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
              <Column field="Status" header="Status" body={() => <Tag value="Posted" severity="success" />} />
            </DataTable>
          </Dialog>

        </Container>
      </div>
    </React.Fragment>
  );
};
export default ManualInvoice;