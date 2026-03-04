import React, { useState, useEffect } from "react";
import { Toast } from 'primereact/toast';

import {
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Modal,
  ModalHeader,
  ModalBody,
  Label,
  Button,
  Form,
  FormGroup,
  Input,
  InputGroup,
  UncontrolledAlert,
} from "reactstrap";
import { useHistory } from "react-router-dom";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import Select from "react-select";
import { Dropdown } from "primereact/dropdown";
import { Calendar } from "primereact/calendar";
import { Tag } from "primereact/tag";
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "flatpickr/dist/themes/material_blue.css";
import Flatpickr from "react-flatpickr";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import { GetSqAll, GetSqList, IsAdminUser, SQtoggleactivestatus } from "../../../common/data/mastersapi";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useRef } from "react";
import SQPrintColumn from './SQPrintColumn'; // make sure path is correct
const getUserDetails = () => {
  if (localStorage.getItem("authUser")) {
    const obj = JSON.parse(localStorage.getItem("authUser"))
    return obj;
  }
}

const ManageQuotations = () => {
  const dt = useRef(null);
  // Format quantity with comma separation
  const qtyBodyTemplate = (rowData) => {
    if (rowData.SQ_Qty !== undefined && rowData.SQ_Qty !== null) {
      return rowData.SQ_Qty.toLocaleString();
    }
    return '';
  };
  const history = useHistory();
  const [isClearable, setIsClearable] = useState(true);
  const [isSearchable, setIsSearchable] = useState(true);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isRtl, setIsRtl] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [sqList, setSQList] = useState([]);
  const [cansearch, setCansearch] = useState(false);
  const [filteredQuotes, setFilteredQuotes] = useState(false);
  const [errormsg, setErrormsg] = useState();
  const currentDate = new Date();
  const currentYear = new Date().getFullYear();
  const formatDate = date => date.toISOString().split("T")[0];
  const today = new Date();
  const sevenDaysAgo = new Date();

  sevenDaysAgo.setDate(today.getDate() - 7);
  const [quotefilter, setQuoteFilter] = useState({
    SQID: 0,
    FromDate: formatDate(sevenDaysAgo),
    ToDate: formatDate(new Date()),
    BranchId: 1,
  });
  const [isseacrch, setIsseacrch] = useState(false);
  const [filters, setFilters] = useState(null);
  const [UserData, setUserData] = useState(null);
  const [IsAdmin, setIsAdmin] = useState(0);
  const [successMsg, setSuccessMsg] = useState("");
  const [successStatus, setSuccessStatus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalFilterValue, setGlobalFilterValue] = useState("");
  const globalFilterTimeout = useRef(null);
  const [statuses] = useState([
    { label: "Unqualified", value: "unqualified" },
    { label: "Qualified", value: "qualified" },
    { label: "New", value: "new" },
    { label: "Negotiation", value: "negotiation" },
    { label: "Renewal", value: "renewal" },
    { label: "Proposal", value: "proposal" },
  ]);
  const [switchStates, setSwitchStates] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [txtStatus, setTxtStatus] = useState(null);
  const toast = useRef(null);

  const getSeverity = Status => {
    switch (Status) {
      case "unqualified":
        return "danger";
      case "qualified":
        return "success";
      case "Posted":
        return "success";
      case "Saved":
        return "danger";
      case "new":
        return "info";
      case "negotiation":
        return "warning";
      case "renewal":
        return null;
      case "Ready To Post":
        return "info";

    }
  };

  useEffect(() => {
    const loadSQList = async () => {
      const data = await GetSqList("%", 1);
      setSQList(data);
      debugger;

    };
    loadSQList();

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await GetSqAll(
          quotefilter.SQID,
          quotefilter.FromDate,
          quotefilter.ToDate,
          quotefilter.BranchId
        );
        setQuotes(response);
        console.log("get", response);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);

        setIsseacrch(!isseacrch);
      };



    };
    fetchData();
    initFilters();
  }, [cansearch]);

  const clearFilter = () => {
    initFilters();
  };

  const onGlobalFilterChange = e => {
    // Only update the local input state on change. Don't apply the DataTable
    // global filter immediately — we'll apply it explicitly (e.g. on Enter).
    const value = e.target.value;
    setGlobalFilterValue(value);
  };

  // Apply keyword (global) filter as user types (debounced) without triggering
  // a server fetch. This keeps server-side fetching tied to the Search button
  // while providing immediate client-side filtering.
  const onGlobalFilterType = e => {
    const value = e.target.value;
    setGlobalFilterValue(value);

    // debounce updates to prevent excessive re-renders
    if (globalFilterTimeout.current) {
      clearTimeout(globalFilterTimeout.current);
    }
    globalFilterTimeout.current = setTimeout(() => {
      // ensure filters object exists and apply the global value
      let _filters = filters ? { ...filters } : { global: { value: null, matchMode: FilterMatchMode.CONTAINS } };
      if (!_filters.global) {
        _filters.global = { value: null, matchMode: FilterMatchMode.CONTAINS };
      }
      _filters.global.value = value;
      setFilters(_filters);
    }, 250);
  };

  // cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (globalFilterTimeout.current) clearTimeout(globalFilterTimeout.current);
    };
  }, []);

  const applyGlobalFilter = () => {
    // Ensure filters object has a global filter; then apply current input value.
    let _filters = filters ? { ...filters } : { global: { value: null, matchMode: FilterMatchMode.CONTAINS } };
    if (!_filters.global) {
      _filters.global = { value: null, matchMode: FilterMatchMode.CONTAINS };
    }
    _filters.global.value = globalFilterValue;
    setFilters(_filters);
  };

  const initFilters = () => {
    setFilters({
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },
      Sys_SQ_Nbr: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
      },
      SQ_Nbr: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
      },
      customername: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
      },
      customercontact: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
      },
      SQ_Date: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
      },
      SQ_Qty: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
      },
      salesperson: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
      },
      Status: {
        operator: FilterOperator.OR,
        constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
      },
      Price: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
      },
      createdby: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
      },
      Modifiedby: {
        operator: FilterOperator.AND,
        constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }],
      },
    });
    setGlobalFilterValue("");
  };

  const renderHeader = () => {
    return (
      <div className="row align-items-center g-3 clear-spa">
        <div className="col-12 col-lg-4">
          <Button className="btn btn-danger btn-label" onClick={clearFilter}>
            <i className="mdi mdi-filter-off label-icon" /> Clear
          </Button>
        </div>
        <div className="col-12 col-lg-5 text-end">
          <span className="me-4">
            <Tag value="S" severity={getSeverity("Saved")} /> Saved
          </span>
          <span className="me-4">
            <Tag value="RTP" severity={getSeverity("Ready To Post")} /> Ready To Post
          </span>
          <span className="me-1">
            <Tag value="P" severity={getSeverity("Posted")} /> Posted
          </span>
        </div>
        <div className="col-12 col-lg-3">
          <input
            className="form-control"
            type="text"
            value={globalFilterValue}
            onChange={onGlobalFilterType}
            placeholder="Keyword Search"
          />
        </div>
      </div>
    );
  };

  const statusBodyTemplate = rowData => {
    const statusShort =
      rowData.Status === "Saved"
        ? "S"
        : rowData.Status === "Posted"
          ? "P"
          : rowData.Status === "Ready To Post"
            ? "RTP"
            : rowData.Status;
    return <Tag value={statusShort} severity={getSeverity(rowData.Status)} />;
  };

  const statusFilterTemplate = options => {
    return (
      <Dropdown
        value={options.value}
        options={statuses}
        onChange={e => options.filterCallback(e.value, options.index)}
        itemTemplate={statusItemTemplate}
        placeholder="Select One"
        className="p-column-filter"
        showClear
      />
    );
  };

  const statusItemTemplate = option => {
    return <Tag value={option} severity={getSeverity(option)} />;
  };

  const actionBodyTemplate = rowData => {
    return (
      <div className="actions row align-items-center g-3">
        <div className="col-12 col-lg-6">
          {rowData.Status != "Posted" && rowData.IsActive == 1 && (
            <span
              style={{ marginRight: "0.5rem" }}
              title="Edit"
              onClick={() => editRow(rowData)}
            >
              <i
                className="mdi mdi-square-edit-outline"
                style={{ fontSize: "1.5rem" }}
                title="Edit"
              ></i>
            </span>
          )}

          {rowData.Status == "Posted" && rowData.IsSoTaken == 0 && rowData.IsActive == 1 && IsAdmin == 1 && (
            <span
              style={{ marginRight: "0.5rem" }}
              title="Edit"
              onClick={() => editPriceRow(rowData)}
            >
              <i
                className="mdi mdi-square-edit-outline"
                style={{ fontSize: "1.5rem" }}
                title="Edit"
              ></i>
            </span>
          )}
        </div>
        <div className="col-12 col-lg-6">
          <span
            style={{ marginRight: "0.5rem" }}
            title="Copy"
            onClick={() => copyRow(rowData)}
          >
            <i
              className="mdi mdi-content-copy"
              style={{ fontSize: "1.5rem" }}
              title="Copy"
            ></i>
          </span>
        </div>
      </div>
    );
  };

  const createdBodyTemplate = rowData => {
    return (
      <div className="actions row align-items-center g-3">
        <div className="col-12 col-lg-12">
          {rowData.createdby && rowData.CreatedDate ? (
            <>
              <span>{rowData.createdby}</span> /{" "}
              <span>{rowData.CreatedDate}</span>
            </>
          ) : (
            <span></span>
          )}
        </div>
      </div>
    );
  };
  const modifiedBodyTemplate = rowData => {
    return (
      <div className="actions row align-items-center g-3">
        <div className="col-12 col-lg-12">
          {rowData.Modifiedby && rowData.ModifiedDate ? (
            <>
              <span>{rowData.Modifiedby}</span> /{" "}
              <span>{rowData.ModifiedDate}</span>
            </>
          ) : (
            <span></span>
          )}
        </div>
      </div>
    );
  };

  const dateFilterTemplate = options => {
    return (
      <Input
        type="text"
        value={options.value || ''}
        onChange={e => options.filterCallback(e.target.value, options.index)}
        placeholder="Enter date"
        className="form-control"
      />
    );
  };

  const header = renderHeader();

  const editRow = rowData => {
    console.log("Edit row:", rowData);
    history.push("/edit-quotation/" + rowData.id);
  };
  const editPriceRow = rowData => {
    console.log("Edit row:", rowData);
    history.push("/price-quotation/" + rowData.id);
  };
  const copyRow = rowData => {
    console.log("Edit row:", rowData);
    history.push("/copy-quotation/" + rowData.id);
  };
  const handleAddQuote = () => {
    history.push("/add-quotation");
  };

  const handleSqChange = option => {
    setQuoteFilter(prevState => ({
      ...prevState,
      SQID: option ? option.value : "0",
    }));
  };

  const handleDateChange = (selectedDates, dateStr, instance) => {
    const fieldName = instance.element.getAttribute("id");

    if (selectedDates.length > 0) {
      const localDate = selectedDates[0];
      const yyyy = localDate.getFullYear();
      const mm = String(localDate.getMonth() + 1).padStart(2, "0");
      const dd = String(localDate.getDate()).padStart(2, "0");
      const formatted = `${yyyy}-${mm}-${dd}`;

      setQuoteFilter(prevState => ({
        ...prevState,
        [fieldName]: formatted,
      }));
    }
  };

  // Removed automatic fetch on quotefilter changes so data is only
  // refreshed when the user explicitly clicks the Search button.


  useEffect(() => {

    const loadIsadmindetails = async () => {
      const userData = getUserDetails();
      setUserData(userData);
      setIsAdmin(userData.IsAdmin);


    }
    loadIsadmindetails();
    searchhData();
    debugger
  }, [isseacrch]);

  const searchhData = async () => {
    debugger
    if (
      quotefilter.FromDate &&
      quotefilter.ToDate &&
      quotefilter.FromDate <= quotefilter.ToDate
    ) {
      setLoading(true);
      try {
        const response = await GetSqAll(
          quotefilter.SQID,
          quotefilter.FromDate,
          quotefilter.ToDate,
          quotefilter.BranchId
        );
        setQuotes(response);
        console.log("Fetched with:", quotefilter, response);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    } else {
      setErrormsg("To date should not be lesser than From date");
    }
  };

  // Handler for the Search button: perform server fetch and then apply
  // the client-side global filter (so table filtering only happens on click).
  const handleSearchClick = async () => {
    await searchhData();
    // Apply the global filter only after search click
    applyGlobalFilter();
  };

  const cancelFilter = async () => {
    const resetFilter = {
      SQID: 0,
      FromDate: formatDate(sevenDaysAgo),
      ToDate: formatDate(new Date()),
      BranchId: 1,
    };
    setQuoteFilter(resetFilter);
    // Force Flatpickr to update
    document
      .getElementById("FromDate")
      ._flatpickr.setDate(resetFilter.FromDate, false);
    document
      .getElementById("ToDate")
      ._flatpickr.setDate(resetFilter.ToDate, false);
    setLoading(false);
    setIsseacrch(!isseacrch);
  };

  // const exportToExcel = () => {
  //   const tableData =
  //     dt.current?.state?.filteredValue ?? dt.current?.props?.value ?? quotes;

  //   const displayedData = dt.current?.state?.filteredValue ?? quotes;
  //   const filteredData = dt.current?.filteredValue || quotes;
  //   const exportData = quotes.map(item => ({
  //     "Manual SQ No.": item.Sys_SQ_Nbr,
  //     "System Seq. No.": item.SQ_Nbr,
  //     "Quotation Date": item.SQ_Date,
  //     "Customer Name": item.customername,
  //     "Created by / Date": item.createdby,
  //     "Modified by / Date": item.Modifiedby,
  //     Status: item.Status,
  //   }));

  //   const worksheet = XLSX.utils.json_to_sheet(exportData);
  //   const workbook = XLSX.utils.book_new();
  //   XLSX.utils.book_append_sheet(workbook, worksheet, "Quotations");

  //   const now = new Date();
  //   const fileName = `Quotations-${now.getFullYear()}-${
  //     now.getMonth() + 1
  //   }-${now.getDate()}.xlsx`;

  //   const excelBuffer = XLSX.write(workbook, {
  //     bookType: "xlsx",
  //     type: "array",
  //   });
  //   const data = new Blob([excelBuffer], {
  //     type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //   });

  //   saveAs(data, fileName);
  // };

  // const exportCSV = () => {
  //   dt.current.exportCSV({ fileName: "quotation_list" });
  // };

  const exportToExcel = () => {
    const tableData = dt.current?.state?.filteredValue ?? dt.current?.props?.value ?? quotes;

    const displayedData = dt.current?.state?.filteredValue ?? quotes;
    const filteredData = dt.current?.filteredValue || quotes;
    const exportData = quotes.map((item) => ({
      "Manual SQ No.": item.Sys_SQ_Nbr,
      "System Seq. No.": item.SQ_Nbr,
      "Quotation Date": item.SQ_Date,
      "Customer Contact": item.customercontact,
      "Customer Name": item.customername,
      "Sales Person": item.salesperson,
      "SQ Qty": item.SQ_Qty,
      "Status": item.Status
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Quotations");

    const now = new Date();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = String(now.getDate()).padStart(2, "0");
    const month = months[now.getMonth()];
    const year = now.getFullYear();

    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12 || 12;

    const timeStr = `${hours}:${minutes}${ampm}`;

    const fileName = `BTG-Quotations-${day}${month}${year}-${timeStr}.xlsx`;


    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(data, fileName);
  };


  const exportCSV = () => {
    dt.current.exportCSV({ fileName: 'quotation_list' });


  }

  const onSwitchChange = async () => {
    if (!selectedRow) return;
    const newStatus = !switchStates[selectedRow.id];
    let statusid = 0;
    if (newStatus == false) {
      statusid = 0
    }
    else {
      statusid = 1;
    }
    const payload = {
      Id: selectedRow.id,
      IsActive: statusid,
      userid: 1
    };
    try {
      setLoading(true);
      const response = await SQtoggleactivestatus(payload);
      if (response?.status) {

        toast.current.show({ severity: 'info', summary: 'Info', detail: response.data });

        console.log('Status updated successfully');
        searchhData();

      } else {
        toast.current.show({ severity: 'danger', summary: 'Error', detail: response.data });
        console.warn('Failed to update status');
      }
    } catch (error) {
      setLoading(false);
      console.error('API Error:', error);
      // Optionally revert UI changes on failure
    }
    setIsModalOpen(false);
  };

  useEffect(() => {
    const initialSwitchStates = {};
    quotes.forEach(quotes => {
      initialSwitchStates[quotes.id] = quotes.IsActive === 1;
    });
    setSwitchStates(initialSwitchStates);
  }, [quotes]);


  const openModal = (rowData) => {
    const value = rowData.IsActive == 1 ? "deactive" : "active";
    setTxtStatus(value);
    setSelectedRow(rowData);
    setIsModalOpen(true);
  };
  const actionBodyTemplate2 = (rowData) => {
    if (rowData.IsSoTaken == 0) {
      return (
        <div className="square-switch">
          <Input
            type="checkbox"
            id={`square-switch-${rowData.id}`}
            switch="bool"
            onChange={() => openModal(rowData)}
            checked={switchStates[rowData.id] || false}
          />
          <label htmlFor={`square-switch-${rowData.id}`} data-on-label="Yes" data-off-label="No" style={{ margin: 0 }} />
        </div>
      );
    }
  };
  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Toast ref={toast} />

          <Breadcrumbs title="Sales" breadcrumbItem="Quotations" />
          <Row>
            {errormsg && (
              <UncontrolledAlert color="danger">
                {errormsg}
              </UncontrolledAlert>
            )}
            <Card className="search-top mb-0">
              <div className="row align-items-center g-1 quotation-mid">
                <div className="col-12 col-lg-3 mt-1">
                  <div className="d-flex align-items-center gap-2">
                    <div className="col-12 col-lg-4 col-md-4 col-sm-4 text-center">
                      <label htmlFor="SQID" className="form-label mb-0">
                        Manual SQ No.
                      </label>
                    </div>
                    <div className="col-12 col-lg-8 col-md-8 col-sm-8">
                      {/* <Input type="text" name="SQID" id="SQID" onChange={handleInputChange} maxLength={20} className="form-control" /> */}
                      <Select
                        name="SQID"
                        id="SQID"
                        options={sqList}
                        value={
                          sqList.find(
                            option => option.value === quotefilter.SQID
                          ) || null
                        }
                        onChange={option => handleSqChange(option)}
                        classNamePrefix="select"
                        isDisabled={isDisabled}
                        isLoading={isLoading}
                        isClearable={isClearable}
                        isRtl={isRtl}
                        isSearchable={isSearchable}
                      />
                    </div>
                  </div>
                </div>

                <div
                  className="col-12 col-lg-1 mt-1 d-flex justify-content-center align-items-center"
                  style={{ width: "74px" }}
                >
                  <span style={{ color: "#800517", fontWeight: "bold" }}>
                    OR
                  </span>
                </div>

                <div className="col-12 col-lg-2 mt-1">
                  <div className="d-flex align-items-center gap-2">
                    <div className="col-12 col-lg-3 col-md-4 col-sm-4 text-center">
                      <label htmlFor="fromDate" className="form-label mb-0">
                        From
                      </label>
                    </div>
                    <div className="col-12 col-lg-9 col-md-8 col-sm-8">
                      <FormGroup>
                        <Label></Label>
                        <InputGroup>
                          <Flatpickr
                            name="FromDate"
                            id="FromDate"
                            className="form-control d-block"
                            placeholder="dd-mm-yyyy"
                            options={{
                              altInput: true,
                              altFormat: "d-M-Y",
                              dateFormat: "Y-m-d",
                            }}
                            value={quotefilter.FromDate}
                            onChange={handleDateChange}
                            style={{ cursor: "default" }}
                          />

                        </InputGroup>
                      </FormGroup>
                    </div>
                  </div>
                </div>
                <div
                  className="col-12 col-lg-2 mt-1"

                >
                  <div className="d-flex align-items-center gap-2">
                    <div className="col-12 col-lg-3 col-md-4 col-sm-4 text-center">
                      <label htmlFor="toDate" className="form-label mb-0">
                        To
                      </label>
                    </div>
                    <div className="col-12 col-lg-9 col-md-8 col-sm-8">
                      <FormGroup>
                        <Label></Label>
                        <InputGroup>
                          <Flatpickr
                            name="ToDate"
                            id="ToDate"
                            className="form-control d-block"
                            placeholder="dd-mm-yyyy"
                            options={{
                              altInput: true,
                              altFormat: "d-M-Y",
                              dateFormat: "Y-m-d",
                              clickOpens: true,
                            }}
                            value={quotefilter.ToDate}
                            onChange={handleDateChange}
                          />

                        </InputGroup>
                      </FormGroup>
                    </div>
                  </div>
                </div>
                <div
                  className="col-12 col-lg-4 text-end button-items"
                >
                  <button
                    type="button"
                    className="btn btn-info"
                    onClick={handleSearchClick}
                  >
                    {" "}
                    <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i>{" "}
                    Search
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => { cancelFilter(); clearFilter(); }}
                  >
                    <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={exportToExcel}
                  >
                    {" "}
                    <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i>{" "}
                    Export
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleAddQuote}
                  >
                    <i className="bx bx-plus label-icon font-size-16 align-middle"></i>
                    New
                  </button>

                  {/* <Button label="Export to CSV" icon="pi pi-file" className="p-button-success" onClick={exportCSV} /> */}
                </div>
              </div>
            </Card>
            <Col lg="12 quotation-btm">
              <Card>
                <DataTable
                  dataKey="id"
                  ref={dt}
                  value={quotes}
                  paginator
                  showGridlines
                  rows={10}
                  loading={loading}
                  filters={filters}
                  globalFilterFields={[
                    "id",
                    "customername",
                    "Sys_SQ_Nbr",
                    "SQ_Nbr",
                    "Status",
                    "SQ_Date",
                  ]}
                  header={header}
                  emptyMessage="No quotation found."
                  onFilter={e => {
                    setFilters(e.filters);
                    if (e.filteredValue) {
                      setFilteredQuotes(e.filteredValue);
                    } else {
                      setFilteredQuotes([]);
                    }
                  }}
                  className="blue-bg"
                  sortField="id"
                  sortOrder={-1}
                >
                  <Column
                    field="Sys_SQ_Nbr"
                    header="Manual SQ No."
                    filter
                    filterPlaceholder="Search by SQ No."
                    className="text-center"
                    style={{ width: "155px" }}
                  />
                  <Column
                    field="SQ_Nbr"
                    header="Sys Seq. No."
                    filter
                    filterPlaceholder="Search by Sys Seq. No"
                    className="text-center"
                    style={{ width: "130px" }}
                  />
                  <Column
                    field="SQ_Date"
                    header="SQ_Date"
                    filter
                    filterPlaceholder="Search by date"
                    filterElement={dateFilterTemplate}
                    className="text-center"
                    style={{ width: "110px" }}
                  />
                  <Column
                    field="customername"
                    header="Customer Name"
                    filter
                    filterPlaceholder="Search by customername"
                    className="text-left"
                  />
                  <Column
                    field="customercontact"
                    header="Customer Contact"
                    filter
                    filterPlaceholder="Search by customercontact"
                    className="text-left"
                  />
                  <Column
                    field="salesperson"
                    header="Sales Person"
                    filter
                    filterPlaceholder="Search by salesperson"
                    className="text-left"
                  />
                  <Column
                    field="SQ_Qty"
                    header="SQ_Qty"
                    filter
                    filterPlaceholder="Search by SQ_Qty"
                    body={qtyBodyTemplate}
                    bodyClassName="text-end"
                  />
                  {/* <Column
                    field="createdby"
                    header="Created by / Date"
                    filter
                    filterPlaceholder="Search by created by"
                    className="text-left"
                    body={createdBodyTemplate}
                  /> */}
                  {/* <Column
                    field="Modifiedby"
                    header="Modified by / Date"
                    filter
                    filterPlaceholder="Search by customername"
                    className="text-left"
                    body={modifiedBodyTemplate}
                  /> */}
                  <Column
                    field="Status"
                    header="Status"
                    filterMenuStyle={{ width: "14rem" }}
                    body={statusBodyTemplate}
                    filter
                    className="text-center"
                  />
                  {/* <Column field="Price" header="Price (IDR)" filter className="text-end" style={{width:"10%"}}/> */}
                  <Column
                    field="SQ_Nbr"
                    header="Action"
                    showFilterMatchModes={false}
                    body={actionBodyTemplate}
                    className="text-center"
                    style={{ width: "8%" }}
                    exportable={false}
                  />

                  <Column field="Actionstatus" header="IsActive" showFilterMatchModes={false}
                    body={actionBodyTemplate2} className="text-center" headerClassName="text-center" style={{ width: '8%' }} />

                  <Column field="id" header="Print" showFilterMatchModes={false}
                    body={(rowData) => <SQPrintColumn sqid={rowData.id} />}
                    className="text-center" />

                </DataTable>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(false)} centered>
        <ModalBody className="py-3 px-5">
          <Row>
            <Col lg={12}>
              <div className="text-center">
                <i className="mdi mdi-alert-circle-outline" style={{ fontSize: "9em", color: "orange" }} />

                <h4>Do you want to {txtStatus} this SQ?</h4>
              </div>
            </Col>
          </Row>
          <Row>
            <Col>
              <div className="text-center mt-3 button-items">
                <Button className="btn btn-info" color="success" size="lg" onClick={onSwitchChange}>
                  Yes
                </Button>
                <Button color="danger" size="lg" className="btn btn-danger" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
              </div>
            </Col>
          </Row>
        </ModalBody>
      </Modal>

    </React.Fragment>
  );
};

export default ManageQuotations;
