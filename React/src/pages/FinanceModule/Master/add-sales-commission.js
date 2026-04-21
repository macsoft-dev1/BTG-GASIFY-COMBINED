import React, { useState, useEffect } from "react";
import Select from "react-select";
import {
    Card, CardBody, Col, Container, Row, Label, FormGroup, Modal, ModalBody,
    ModalHeader, Input, Button as StrapButton, UncontrolledAlert
} from "reactstrap";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import { FilterMatchMode, FilterOperator } from "primereact/api";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Button } from "primereact/button";
import { useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    SaveSalesCommission, GetAllSalesCommissionListing, GetSalesCommissionById,
    UpdateSalesCommissionStatus, fetchGasList, GetCustomerFilter
} from "../../../common/data/mastersapi";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { startOfToday, format } from "date-fns";

const initFilters = () => ({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    CustomerName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    GasName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
});

const getUserDetails = () => {
    if (localStorage.getItem("authUser")) {
        const obj = JSON.parse(localStorage.getItem("authUser"));
        return obj;
    }
    return null;
};

const AddSalesCommission = () => {
    const history = useHistory();
    const [commissions, setCommissions] = useState([]);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState(initFilters());
    const [filteredCommissions, setFilteredCommissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [switchStates, setSwitchStates] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalOpen2, setIsModalOpen2] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [txtStatus, setTxtStatus] = useState(null);
    const [searchCustomer, setSearchCustomer] = useState(null);
    const [searchGas, setSearchGas] = useState(null);
    const [successMsg, setSuccessMsg] = useState("");
    const [errorMsg, setErrorMsg] = useState("");
    const [editMode, setEditMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial data for dropdowns
    const [customerList, setCustomerList] = useState([]);
    const [gasList, setGasList] = useState([]);

    const CommissionWatcher = ({ values }) => {
        const { customerId, gasId } = values;

        useEffect(() => {
            // Only trigger check if we are in "New" mode and both fields are selected
            if (customerId && gasId && !editMode) {
                const checkExisting = async () => {
                    try {
                        console.log(`Checking existing commission for Customer: ${customerId}, Gas: ${gasId}`);
                        const result = await GetAllSalesCommissionListing({ customerId, gasId });

                        if (result.status && result.data && result.data.length > 0) {
                            // Find the header ID for this combination
                            // The listing might return multiple rows (one per detail), we just need the first one's headerId
                            const existing = result.data[0];
                            const hId = existing.headerId || existing.HeaderId || existing.id;

                            if (hId) {
                                console.log("Matching record found! Switching to Edit Mode for HeaderId:", hId);
                                handleEdit(hId);
                            }
                        }
                    } catch (error) {
                        console.error("Auto-load check failed:", error);
                    }
                };
                checkExisting();
            }
        }, [customerId, gasId, editMode]);

        return null;
    };

    const initialValues = {
        customerId: "",
        gasId: "",
        sellingPrice: "",
        effectiveFrom: new Date(),
        members: [{ id: 0, contact: "", rate: "" }]
    };

    const [formInitialValues, setFormInitialValues] = useState(initialValues);

    const toggleModal = () => setIsModalOpen(!isModalOpen);

    const validationSchema = Yup.object().shape({
        customerId: Yup.string().required("Customer is required"),
        gasId: Yup.string().required("Gas is required"),
        sellingPrice: Yup.number().typeError("Must be a number").required("Selling Price is required").min(0, "Price cannot be negative"),
        effectiveFrom: Yup.date().required("Effective From Date is required"),
    });

    const loadDropdownData = async () => {
        try {
            const branchId = 1;

            // Fetch customers using GetCustomerFilter
            const customersData = await GetCustomerFilter(branchId, "%");
            if (customersData && Array.isArray(customersData)) {
                console.log("RAW Customer data from API:", customersData); // Critical Debug Log

                const mappedCustomers = customersData.map(c => {
                    // Try every possible ID field name found in the system
                    const cId = c.CustomerID || c.CustomerId || c.Id || c.id || c.value || 0;
                    const cName = c.CustomerName || c.customerName || c.Customer || c.name || c.label || "Unknown";

                    return { value: cId, label: cName };
                }).filter(c => c.value !== 0 && c.value !== "0");

                console.log("Mapped Customer List for Select:", mappedCustomers);
                setCustomerList(mappedCustomers);
            }

            const gases = await fetchGasList(branchId, 0);
            if (gases) {
                const mappedGases = gases.map(g => ({
                    ...g,
                    label: g.GasName || g.label
                }));
                setGasList(mappedGases);
            }
        } catch (error) {
            console.error("Error loading dropdown data:", error);
        }
    };

    const getAllCommissions = async (customerId = "", gasId = "") => {
        setLoading(true);
        const userData = getUserDetails();
        const bId = userData?.branchId || 1;
        const oId = userData?.orgId || 1;

        try {
            const result = await GetAllSalesCommissionListing({ customerId, gasId });
            if (result.status) {
                const rawData = result.data || [];
                console.log("Raw Response Data:", rawData);

                const updatedData = rawData.map(item => {
                    // Using new explicit names from API
                    const contactVal = item.contactName || item.ContactName || '';
                    const rateVal = item.contactRate || item.ContactRate || 0;

                    const hId = item.headerId || item.HeaderId || item.id;
                    const cId = item.customerId || item.CustomerId;
                    const gId = item.gasId || item.GasId;

                    return {
                        ...item,
                        contactNameDisplay: contactVal,
                        rateDisplay: parseFloat(rateVal).toFixed(2),
                        headerId: hId,
                        CustomerName: customerList.find(c => c.value == cId)?.label || cId,
                        GasName: gasList.find(g => g.value == gId)?.label || gId
                    };
                });

                setCommissions(updatedData);
                setFilteredCommissions(updatedData);

                const initialSwitchStates = {};
                updatedData.forEach(item => {
                    initialSwitchStates[item.headerId] = (item.isActive === 1 || item.IsActive === 1);
                });
                setSwitchStates(initialSwitchStates);
            } else {
                setCommissions([]);
                setFilteredCommissions([]);
                setSwitchStates({});
            }
        } catch (err) {
            console.error("Error fetching commissions:", err);
            setCommissions([]);
            setFilteredCommissions([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDropdownData();
    }, []);

    useEffect(() => {
        if (customerList.length > 0 && gasList.length > 0) {
            getAllCommissions();
        }
    }, [customerList, gasList]);

    useEffect(() => {
        if (errorMsg || successMsg) {
            const timer = setTimeout(() => {
                setErrorMsg(null);
                setSuccessMsg(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [errorMsg, successMsg]);

    const clearFilter = () => {
        setSearchCustomer(null);
        setSearchGas(null);
        setGlobalFilterValue("");
        setFilters(initFilters());
        getAllCommissions("", "");
    };

    const handleSearch = () => {
        getAllCommissions(searchCustomer ? searchCustomer.value : "", searchGas ? searchGas.value : "");
    };

    const handleSearchCancel = () => {
        setSearchCustomer(null);
        setSearchGas(null);
        getAllCommissions();
    };

    const handleSubmit = async (values) => {
        const cId = parseInt(values.customerId, 10);
        const gId = parseInt(values.gasId, 10);

        console.log("Saving form values:", values);
        console.log("Calculated CustomerId:", cId, "Calculated GasId:", gId);

        if (!cId || cId <= 0) {
            alert(`Error: Customer ID is 0 or invalid (${values.customerId}). Check console for mapping logs.`);
            toast.error("Please select a valid Customer.");
            return;
        }
        if (!gId || gId <= 0) {
            alert(`Error: Gas ID is 0 or invalid (${values.gasId}). Check console for mapping logs.`);
            toast.error("Please select a valid Gas.");
            return;
        }

        const userData = getUserDetails();
        const currentUserId = userData?.u_id || 1;

        const payload = {
            Header: {
                Id: editMode && values.Id ? parseInt(values.Id, 10) : 0,
                CustomerId: cId,
                GasId: gId,
                SellingPrice: parseFloat(values.sellingPrice) || 0,
                EffectiveFrom: new Date(values.effectiveFrom).toISOString(),
                IsActive: 1,
                DetailCount: 0, // Backend property
                CreatedBy: currentUserId,
                LastModifiedBy: currentUserId
            },
            Details: values.members
                .filter(m => m.contact && m.contact.trim() !== "")
                .map(m => ({
                    Id: m.id || 0,
                    SalesCommissionId: editMode && values.Id ? parseInt(values.Id, 10) : 0,
                    Contact: m.contact.trim(),
                    Rate: parseFloat(m.rate) || 0
                }))
        };

        console.log("Submitting Sales Commission Payload:", payload);

        try {
            setIsSubmitting(true);
            const response = await SaveSalesCommission(payload);
            if (response.status) {
                setIsModalOpen(false);
                setSuccessMsg(response.message || "Sales Commission saved successfully!");
                toast.success(response.message || "Saved successfully!");
                getAllCommissions();
            } else {
                setErrorMsg(response.message || "Failed to save.");
                toast.error(response.message || "Failed to save.");
            }
        } catch (error) {
            console.error("Error saving commission:", error);
            toast.error("An error occurred while saving.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const onGlobalFilterChange = (e) => {
        const value = e.target.value.toLowerCase().trim();
        setGlobalFilterValue(value);
        if (value === "") {
            setFilteredCommissions(commissions);
            return;
        }
        const filtered = commissions.filter(item =>
            ["CustomerName", "GasName"].some(field =>
                item[field] && String(item[field]).toLowerCase().includes(value)));
        setFilteredCommissions(filtered);
    };

    const openModal2Status = (rowData) => {
        console.log("Opening Status Modal for row:", rowData);
        setSelectedRow(rowData);
        const isActive = rowData.isActive ?? rowData.IsActive;
        setTxtStatus(isActive === 1 ? "deactivate" : "activate");
        setIsModalOpen2(true);
    };

    const onSwitchChange = async () => {
        try {
            if (!selectedRow) return;
            setIsSubmitting(true);
            const currentStatus = selectedRow.isActive ?? selectedRow.IsActive;
            const newStatus = currentStatus === 1 ? 0 : 1;
            const headerId = selectedRow.headerId || selectedRow.HeaderId || (selectedRow.id ?? selectedRow.Id);

            console.log("Toggling Status for HeaderId:", headerId, "to:", newStatus);

            const payload = {
                Id: headerId,
                IsActive: newStatus,
                UserId: getUserDetails()?.u_id || 1
            };

            const response = await UpdateSalesCommissionStatus(payload);
            console.log("Status Update Response:", response);

            if (response?.status) {
                // Update all rows that share the same headerId
                const headerId = payload.Id;
                setSwitchStates(prev => ({ ...prev, [headerId]: newStatus === 1 }));
                setSuccessMsg(`Status updated successfully!`);
                getAllCommissions();
            } else {
                setErrorMsg(response?.message || "Failed to update status!");
                toast.error(response?.message || "Status update failed.");
            }
        } catch (error) {
            console.error("Status update error:", error);
            toast.error("An error occurred during status update.");
        } finally {
            setIsSubmitting(false);
            setIsModalOpen2(false);
        }
    };

    const actionBodyTemplate = (rowData) => {
        const isActive = rowData.isActive ?? rowData.IsActive;
        const hId = rowData.headerId ?? rowData.HeaderId ?? (rowData.id ?? rowData.Id);

        return (
            <div className="actions">
                <span
                    onClick={() => isActive === 1 && handleEdit(hId)}
                    title={isActive === 1 ? "Edit" : "Cannot edit inactive record"}
                    style={{
                        cursor: isActive === 1 ? 'pointer' : 'not-allowed',
                        opacity: isActive === 1 ? 1 : 0.5
                    }}
                >
                    <i className="mdi mdi-square-edit-outline" style={{ fontSize: '1.5rem', color: isActive === 1 ? '#556ee6' : '#aab2bd' }}></i>
                </span>
            </div>
        );
    };

    const handleEdit = async (id) => {
        console.log("Editing Commission ID:", id);
        try {
            const result = await GetSalesCommissionById(id);
            console.log("Edit Data Result:", result);
            if (result && result.status) {
                const data = result.data.header || result.data.Header || result.data;
                const details = result.data.details || result.data.Details || [];

                setFormInitialValues({
                    Id: data.id || data.Id,
                    customerId: data.customerId || data.CustomerId,
                    gasId: data.gasId || data.GasId,
                    sellingPrice: data.sellingPrice || data.SellingPrice,
                    effectiveFrom: new Date(data.effectiveFrom || data.EffectiveFrom),
                    members: details.length > 0
                        ? details.map(d => ({
                            id: d.id || d.Id,
                            contact: d.contact || d.Contact,
                            rate: d.rate || d.Rate
                        }))
                        : [{ id: 0, contact: "", rate: "" }]
                });
                setEditMode(true);
                setIsModalOpen(true);
            } else {
                setErrorMsg("Record not found");
                toast.error("Failed to load record details.");
            }
        } catch (error) {
            console.error("Failed to fetch by ID:", error);
            toast.error("Error loading record.");
        }
    };

    const statusBodyTemplate = (rowData) => (
        <div className="square-switch" key={`switch-${rowData.id}`}>
            <Input
                type="checkbox"
                id={`square-switch-${rowData.id}`}
                switch="bool"
                onChange={() => openModal2Status(rowData)}
                checked={switchStates[rowData.headerId || rowData.HeaderId || rowData.id] ?? rowData.isActive === 1}
            />
            <label htmlFor={`square-switch-${rowData.id}`} data-on-label="Yes" data-off-label="No" style={{ margin: 0 }} />
        </div>
    );

    const openNewModal = () => {
        setFormInitialValues({
            ...initialValues,
            members: [{ id: 0, contact: "", rate: "" }]
        });
        setEditMode(false);
        setIsModalOpen(true);
    };

    const renderHeader = () => (
        <div className="row align-items-center g-3">
            <div className="col-lg-3">
                <Button className="btn btn-danger" onClick={clearFilter} outlined>
                    <i className="mdi mdi-filter-off label-icon" /> Clear
                </Button>
            </div>
            <div className="col-lg-3 offset-lg-6">
                <Input
                    type="text"
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="Keyword Search"
                />
            </div>
        </div>
    );

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Masters" breadcrumbItem="Sales Commission" />
                    <Row>
                        {errorMsg && <UncontrolledAlert color="danger" fade={false}>{errorMsg}</UncontrolledAlert>}
                        {successMsg && <UncontrolledAlert color="success" fade={false}>{successMsg}</UncontrolledAlert>}

                        <Card className="search-top">
                            <div className="row align-items-center g-1 quotation-mid px-3 py-2">
                                <div className="col-12 col-lg-8">
                                    <div className="row align-items-center">
                                        <div className="col-md-5 d-flex align-items-center">
                                            <Label className="mb-0 me-2" style={{ minWidth: '80px' }}>Customer</Label>
                                            <div style={{ flex: 1 }}>
                                                <Select
                                                    options={customerList}
                                                    value={searchCustomer}
                                                    onChange={selected => setSearchCustomer(selected)}
                                                    placeholder="All Customers"
                                                    isClearable
                                                    isSearchable
                                                    classNamePrefix="react-select"
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-5 d-flex align-items-center ms-auto">
                                            <Label className="mb-0 me-2" style={{ minWidth: '50px' }}>Gas</Label>
                                            <div style={{ flex: 1 }}>
                                                <Select
                                                    options={gasList}
                                                    value={searchGas}
                                                    onChange={selected => setSearchGas(selected)}
                                                    placeholder="All Gas"
                                                    isClearable
                                                    isSearchable
                                                    classNamePrefix="react-select"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 col-lg-4 text-end button-items">
                                    <button type="button" className="btn btn-info" onClick={handleSearch}>
                                        <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search
                                    </button>
                                    <button type="button" className="btn btn-danger" onClick={handleSearchCancel}>
                                        <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Cancel
                                    </button>
                                    <button type="button" className="btn btn-success" onClick={openNewModal}>
                                        <i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i> New
                                    </button>
                                </div>
                            </div>
                        </Card>
                    </Row>

                    <Row>
                        <Col lg="12">
                            <Card>
                                <DataTable
                                    value={filteredCommissions} paginator rows={10}
                                    loading={loading} dataKey="id" filters={filters}
                                    globalFilterFields={["CustomerName", "GasName"]}
                                    header={renderHeader()}
                                    emptyMessage="No commissions found." onFilter={(e) => setFilters(e.filters)}>
                                    <Column field="contactNameDisplay" header="Contact Name" filter filterPlaceholder="Search Contact" />
                                    <Column field="CustomerName" header="Customer" filter filterPlaceholder="Search Customer" />
                                    <Column field="GasName" header="Gas" filter filterPlaceholder="Search Gas" />
                                    <Column field="rateDisplay" header="Rate" sortable />
                                    <Column field="sellingPrice" header="Selling Price" />
                                    <Column field="effectiveFrom" header="Effective Date" body={(rowData) => rowData.effectiveFrom ? format(new Date(rowData.effectiveFrom), 'dd-MMM-yyyy') : ''} />
                                    <Column field="isActive" header="Active" body={statusBodyTemplate} style={{ textAlign: 'center' }} />
                                    <Column body={actionBodyTemplate} header="Action" style={{ textAlign: 'center' }} />
                                </DataTable>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            <Modal isOpen={isModalOpen} role="dialog" autoFocus={true} centered={true} size="lg" toggle={toggleModal}>
                <div className="modal-content">
                    <ModalHeader toggle={toggleModal} className="bg-model-hd">
                        {editMode ? "Edit Sales Commission" : "New Sales Commission"}
                    </ModalHeader>
                    <ModalBody>
                        <Formik
                            enableReinitialize
                            initialValues={formInitialValues}
                            validationSchema={validationSchema}
                            onSubmit={handleSubmit}
                        >
                            {({ errors, touched, setFieldValue, values }) => (
                                <Form>
                                    <Row>
                                        <Col md="6">
                                            <FormGroup>
                                                <Label className="fw-bold required-label">Customer</Label>
                                                <Select
                                                    options={customerList}
                                                    value={customerList.find(c => String(c.value) === String(values.customerId)) || null}
                                                    onChange={selected => setFieldValue("customerId", selected ? selected.value : "")}
                                                    placeholder="Select Customer"
                                                    isClearable
                                                    isSearchable
                                                    classNamePrefix="react-select"
                                                />
                                                <ErrorMessage name="customerId" component="div" className="text-danger" />
                                            </FormGroup>
                                        </Col>
                                        <Col md="6">
                                            <FormGroup>
                                                <Label className="fw-bold required-label">Gas</Label>
                                                <Select
                                                    options={gasList}
                                                    value={gasList.find(g => String(g.value) === String(values.gasId)) || null}
                                                    onChange={selected => setFieldValue("gasId", selected ? selected.value : "")}
                                                    placeholder="Select Gas"
                                                    isClearable
                                                    isSearchable
                                                    classNamePrefix="react-select"
                                                />
                                                <ErrorMessage name="gasId" component="div" className="text-danger" />
                                            </FormGroup>
                                        </Col>
                                        <Col md="3">
                                            <FormGroup>
                                                <Label className="fw-bold required-label">Selling Price</Label>
                                                <Field name="sellingPrice" type="number" className="form-control" />
                                                <ErrorMessage name="sellingPrice" component="div" className="text-danger" />
                                            </FormGroup>
                                        </Col>
                                        <Col md="3">
                                            <FormGroup>
                                                <Label className="fw-bold required-label">Effective From Date</Label>
                                                <DatePicker
                                                    selected={values.effectiveFrom}
                                                    dateFormat="dd-MMM-yyyy"
                                                    className="form-control"
                                                    onChange={(date) => setFieldValue("effectiveFrom", date)}
                                                />
                                                <ErrorMessage name="effectiveFrom" component="div" className="text-danger" />
                                            </FormGroup>
                                        </Col>
                                    </Row>

                                    <hr />
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <h5 className="mb-0 fw-bold">Commission Contacts</h5>
                                        <StrapButton
                                            color="success"
                                            size="sm"
                                            style={{
                                                backgroundColor: "#28a745",
                                                borderColor: "#28a745",
                                                color: "#fff",
                                                padding: "2px 10px",
                                                fontSize: "12px"
                                            }}
                                            className="fw-bold no-hover-change"
                                            onClick={() => {
                                                const newMembers = [{ id: 0, contact: "", rate: "" }, ...values.members];
                                                setFieldValue("members", newMembers);
                                            }}
                                        >
                                            + Add
                                        </StrapButton>
                                    </div>

                                    <table className="table table-bordered">
                                        <thead className="bg-light">
                                            <tr>
                                                <th className="fw-bold" style={{ width: '46%' }}>Contact Name</th>
                                                <th className="fw-bold" style={{ width: '46%' }}>Rate</th>
                                                <th className="fw-bold" style={{ width: '80px' }}>Action</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {values.members.map((member, index) => (
                                                <tr key={index}>
                                                    <td>
                                                        <Input
                                                            type="text"
                                                            value={member.contact}
                                                            onChange={(e) => {
                                                                const newMembers = [...values.members];
                                                                newMembers[index].contact = e.target.value;
                                                                setFieldValue("members", newMembers);
                                                            }}
                                                            placeholder="Enter name"
                                                            className="form-control"
                                                        />
                                                    </td>
                                                    <td>
                                                        <Input
                                                            type="number"
                                                            value={member.rate}
                                                            onChange={(e) => {
                                                                const newMembers = [...values.members];
                                                                newMembers[index].rate = e.target.value;
                                                                setFieldValue("members", newMembers);
                                                            }}
                                                            placeholder="0.00"
                                                            className="form-control"
                                                        />
                                                    </td>
                                                    <td className="text-center">
                                                        <StrapButton
                                                            color="danger"
                                                            size="sm"
                                                            style={{
                                                                backgroundColor: "#f46a6a",
                                                                borderColor: "#f46a6a",
                                                                color: "#fff"
                                                            }}
                                                            className="no-hover-change"
                                                            onClick={() => {
                                                                const newMembers = values.members.filter((_, i) => i !== index);
                                                                setFieldValue("members", newMembers);
                                                            }}
                                                        >
                                                            <i className="bx bx-trash"></i>
                                                        </StrapButton>
                                                    </td>
                                                </tr>
                                            ))}
                                            {values.members.length === 0 && (
                                                <tr>
                                                    <td colSpan="3" className="text-center text-muted">No members added yet.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>


                                    <div className="text-end mt-4">
                                        <CommissionWatcher values={values} />
                                        <StrapButton type="submit" color="primary" className="fw-bold px-4 py-2 me-2" style={{ backgroundColor: "#2196f3", borderColor: "#2196f3" }} disabled={isSubmitting}>
                                            <i className="bx bx-save font-size-18 align-middle me-2"></i>
                                            {isSubmitting ? editMode ? "Updating..." : "Saving..." : editMode ? "Update" : "Save"}
                                        </StrapButton>
                                        <StrapButton type="button" color="danger" className="fw-bold px-4 py-2" style={{ backgroundColor: "#e74c3c", borderColor: "#e74c3c" }} onClick={toggleModal}>
                                            <i className="bx bx-x-circle font-size-18 align-middle me-2"></i> Cancel
                                        </StrapButton>
                                    </div>
                                </Form>
                            )}
                        </Formik>
                    </ModalBody>
                </div>
            </Modal>

            <Modal isOpen={isModalOpen2} toggle={() => setIsModalOpen2(false)} centered>
                <ModalBody className="py-3 px-5 text-center">
                    <i className="mdi mdi-alert-circle-outline" style={{ fontSize: "5em", color: "orange" }} />
                    <h4 className="mt-2">Do you want to {txtStatus} this item?</h4>
                    <div className="mt-4 button-items">
                        <StrapButton color="success" size="lg" onClick={onSwitchChange} disabled={isSubmitting}>
                            {isSubmitting ? "Updating..." : "Yes"}
                        </StrapButton>
                        <StrapButton color="danger" size="lg" onClick={() => setIsModalOpen2(false)} disabled={isSubmitting}>Cancel</StrapButton>
                    </div>
                </ModalBody>
            </Modal>
        </React.Fragment>
    );
};

export default AddSalesCommission;