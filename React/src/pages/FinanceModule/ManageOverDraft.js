import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Modal,
  ModalBody,
  ModalHeader,
} from "reactstrap";
import Select from "react-select";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { FilterMatchMode } from "primereact/api";
import { Tag } from "primereact/tag";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "primereact/resources/primereact.min.css";

import { getOverDraftList } from "../../../src/common/data/mastersapi";

const Breadcrumbs = ({ title, breadcrumbItem }) => (
  <div className="page-title-box d-sm-flex align-items-center justify-content-between">
    <h4 className="mb-sm-0 font-size-18">{breadcrumbItem}</h4>
    <div className="page-title-right">
      <ol className="breadcrumb m-0">
        <li className="breadcrumb-item"><a href="/#">{title}</a></li>
        <li className="breadcrumb-item active"><a href="/#">{breadcrumbItem}</a></li>
      </ol>
    </div>
  </div>
);

const ManageOverDraft = () => {
  const history = useHistory();
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Authentication & Authorization check
  const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
  const isAuthorized = authUser.IsAdmin === 1 || authUser.superAdmin === 1 || authUser.roleName === "Admin";

  const [overDraftList, setOverDraftList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedInterest, setSelectedInterest] = useState(null);
  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
  });
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const overDraftTypeOptions = [
    { value: "Request", label: "Request" },
    { value: "Provided", label: "Provided" },
  ];

  const interestTypeOptions = [
    { value: "Fixed", label: "Fixed" },
    { value: "Variable", label: "Variable" },
  ];

  const getSeverity = (Status) => {
    switch (Status) {
      case 'NotApproved': return 'danger';
      case 'Approved': return 'success';
      case 'Posted': return 'success';
      case 'Saved': return 'danger';
      case 'Closed': return 'info';
      case 'Cancelled': return 'tag-lightred';
      case 'renewal': return null;
      case 'Pending': return 'danger';
      case 'Director Approved': return 'success';
      case 'GM Approved': return 'success';
      case 'GM Discussed': return 'warning';
      case 'Director Discussed': return 'warning';
      case 'Yes': return 'success';
      case 'No': return 'danger';
      default: return 'secondary';
    }
  };

  useEffect(() => {
    fetchOverDrafts();
  }, [selectedType, selectedInterest]);

  const fetchOverDrafts = async () => {
    try {
      setLoading(true);
      const orgId = 1;
      const branchId = 1;
      const type = selectedType?.value || null;
      const interest = selectedInterest?.value || null;

      const data = await getOverDraftList(null, type, interest, branchId, orgId);
      if (!data || data.length === 0) {
        setOverDraftList([]);
        toast.info("No OverDraft records found");
        setLoading(false);
        return;
      }

      const transformed = data.map((item) => ({
        overDraftId: item.OverDraftId,
        voucherNo: item.VoucherNo,
        overDraftDate: new Date(item.OverDraftDate),
        overDraftType: item.OverDraftType,
        bank: item.Bank,
        interestType: item.InterestType,
        odInterest: item.ODInterest,
        odAmountIDR: item.ODAmountIDR,
        repayInMonths: item.RepayInMonths,
        isSubmitted: item.IsSubmitted ? "Posted" : "Saved",
      }));

      setOverDraftList(transformed);
      setLoading(false);
    } catch (error) {
      console.error("Error loading overdrafts:", error);
      toast.error("Failed to fetch OverDraft data");
      setLoading(false);
    }
  };

  const handleEdit = async (overDraftId) => {
    try {
      const data = await getOverDraftList(overDraftId, null, null, 1, 1);
      if (data && data.length > 0) {
        const overDraftData = data[0];
        history.push(`/overDraft/edit/${overDraftId}`, { overDraftData });
      } else {
        toast.error("No data found for selected OverDraft");
      }
    } catch (error) {
      console.error("Error loading overdraft data:", error);
      toast.error("Failed to load data for editing");
    }
  };

  const statusBodyTemplate = (rowData) => {
    const statusShort = rowData.isSubmitted === "Saved" ? "S" : rowData.isSubmitted === "Posted" ? "P" : rowData.isSubmitted;
    return <Tag value={statusShort} severity={getSeverity(rowData.isSubmitted)} />;
  };

  const actionBodyTemplate = (rowData) => (
    <div className="d-flex gap-2 justify-content-center">
      {(rowData.isSubmitted === "Saved" || isAuthorized) ? (
        <button className="btn btn-link btn-sm" onClick={() => handleEdit(rowData.overDraftId)} title="Edit Record">
          <i className="mdi mdi-pencil" style={{ color: "#3e90e2", fontSize: "1.2rem" }}></i>
        </button>
      ) : (
        <button className="btn btn-link btn-sm text-muted" disabled title="Only Authorized Personnel can edit Posted records">
          <i className="mdi mdi-pencil" style={{ fontSize: "1.2rem" }}></i>
        </button>
      )}

      {/* <button className="btn btn-link btn-sm">
        <i className="mdi mdi-delete"></i>
      </button> */}
    </div>
  );

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    let _filters = { ...filters };
    _filters["global"].value = value;
    setFilters(_filters);
    setGlobalFilterValue(value);
  };

  const exportToExcel = () => {
    const exportData = overDraftList.map((d) => ({
      "Voucher No": d.voucherNo,
      "Date": new Date(d.overDraftDate).toLocaleDateString(),
      "Type": d.overDraftType,
      "Bank": d.bank,
      "Interest Type": d.interestType,
      "Interest (%)": d.odInterest,
      "Amount (IDR)": d.odAmountIDR,
      "Repay (Months)": d.repayInMonths,
      "Status": d.isSubmitted,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "OverDrafts");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(data, `OverDrafts-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const dAddOverDraft = () => {
    history.push("/overDraft/add");
  };

  const handleCancelFilters = () => {
    setSelectedType(null);
    setSelectedInterest(null);
    fetchOverDrafts();
  };

  const renderHeader = () => {
    return (
      <div className="row align-items-center g-3 clear-spa">
        <div className="col-12 col-lg-3"></div>
        <div className="col-12 col-lg-6 text-end">
          <span className="me-3">
            <Tag value="S" severity="danger" /> Saved
          </span>
          <span className="me-3">
            <Tag value="P" severity="success" /> Posted
          </span>
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

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Finance" breadcrumbItem="OverDraft" />

          {/* Filters */}
          <Row className="pt-2 pb-3 align-items-end">
            <Col md="3">
              <Select
                placeholder="Select OverDraft Type"
                value={selectedType}
                onChange={(val) => setSelectedType(val)}
                options={overDraftTypeOptions}
                isClearable
              />
            </Col>
            <Col md="3" className="d-flex align-items-center">
              <div className="flex-grow-1 me-2">
                <Select
                  placeholder="Select Interest Type"
                  value={selectedInterest}
                  onChange={(val) => setSelectedInterest(val)}
                  options={interestTypeOptions}
                  isClearable
                />   
              </div>
            
            </Col>
            <Col md="6" className="d-flex justify-content-end gap-2">
            <button className="btn btn-primary me-2" onClick={fetchOverDrafts}>Search</button>
            <button className="btn btn-danger" onClick={handleCancelFilters}>Cancel</button>
              <button className="btn btn-info" onClick={dAddOverDraft}>New</button>
              <button className="btn btn-secondary" onClick={exportToExcel}>
                <i className="bx bx-export me-2"></i> Export
              </button>
            </Col>
          </Row>

          {/* DataTable */}
          <Row>
            <Col lg="12">
              <Card>
                <DataTable
                  value={overDraftList}
                  loading={loading}
                  paginator
                  rows={20}
                  dataKey="overDraftId"
                  filters={filters}
                  globalFilterFields={[
                    "voucherNo",
                    "overDraftType",
                    "bank",
                    "interestType",
                    "isSubmitted",
                    "repayInMonths",
                    "odInterest","odAmountIDR","overDraftDate"
                  ]}
                  emptyMessage="No OverDrafts found."
                  showGridlines
                  header={header}
                >
                  <Column header="S.No." body={(_, { rowIndex }) => rowIndex + 1} />
                  <Column field="voucherNo" header="Voucher No" sortable />
                  <Column
                    field="overDraftDate"
                    header="Date"
                    body={(d) => new Date(d.overDraftDate).toLocaleDateString()}
                    sortable
                  />
                  <Column field="overDraftType" header="Type" sortable />
                  <Column field="bank" header="Bank" sortable />
                  <Column field="interestType" header="Interest" sortable />
                  <Column field="odInterest" header="Interest (%)" sortable 
                  body={(d) => Number(d.odInterest).toLocaleString('en-US', {
                    style: 'decimal',
                    minimumFractionDigits: 2
                })}
                />
                  <Column
                    field="odAmountIDR"
                    header="Amount (IDR)"
                    body={(d) => Number(d.odAmountIDR).toLocaleString('en-US', {
                      style: 'decimal',
                      minimumFractionDigits: 2
                  })}
                    className="text-end"
                  />
                  <Column field="repayInMonths" header="Repay (Months)" sortable />
                  <Column field="isSubmitted" style={{textAlign:"center"}} header="Status" body={statusBodyTemplate} sortable />
                  <Column header="Action" body={actionBodyTemplate} />
                </DataTable>
              </Card>
            </Col>
          </Row>

          {/* Modal (optional future use) */}
          <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(false)} centered>
            <ModalHeader toggle={() => setIsModalOpen(false)}>Confirm Action</ModalHeader>
            <ModalBody className="py-3 px-5 text-center">
              <i className="mdi mdi-alert-circle-outline" style={{ fontSize: "6em", color: "orange" }} />
              <h4>Do you want to proceed?</h4>
              <div className="mt-3 d-flex justify-content-center gap-3">
                <button className="btn btn-success btn-lg" onClick={() => setIsModalOpen(false)}>Yes</button>
                <button className="btn btn-danger btn-lg" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </ModalBody>
          </Modal>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default ManageOverDraft;
