import React, { useState, useRef, useEffect } from "react";
import { Container, Row, Col, Card, CardBody, Label } from "reactstrap";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_green.css";

import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import { Modal, ModalHeader, ModalBody, Button } from "reactstrap";
import { PYTHON_API_URL } from "../../../common/pyapiconfig";

// PrimeReact Styles
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";



const SalesCommissionReport = () => {
    const dtRef = useRef(null);

    // ===== STATES =====
    const [customers, setCustomers] = useState([]);
    const [contacts, setContacts] = useState([]);

    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [selectedContact, setSelectedContact] = useState(null);
    const [selectedCurrency, setSelectedCurrency] = useState(null);
    const [fromDate, setFromDate] = useState(null);
    const [toDate, setToDate] = useState(null);
    const [globalFilter, setGlobalFilter] = useState("");
    const [tableData, setTableData] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);


    useEffect(() => {
        fetch(`${PYTHON_API_URL}/api/sales/customers`)
            .then(res => res.json())
            .then(data => {
                const list = data?.data || [];   // ✅ SAFE

                const formatted = list.map(item => ({
                    label: item.CustomerName,
                    value: item.Id
                }));

                setCustomers(formatted);
            })
            .catch(err => console.error(err));
    }, []);



    useEffect(() => {
        if (!selectedCustomer?.value) {
            setContacts([]);
            setSelectedContact(null);
            return;
        }

        const fetchContacts = async () => {
            setSelectedContact(null); // reset BEFORE fetch
            setContacts([]);

            const res = await fetch(
                `${PYTHON_API_URL}/api/sales/contacts?customer_id=${selectedCustomer.value}`
            );
            const data = await res.json();

            const formatted = (data?.data || []).map(item => ({
                label: item.Contact,
                value: item.Contact
            }));

            setContacts(formatted);
        };

        fetchContacts();
    }, [selectedCustomer]);




    // ===== DUMMY DROPDOWN DATA =====




    // ===== HANDLERS =====
    const handleSearch = () => {
        // Build query params, only adding non-empty values
        const params = new URLSearchParams();

        if (selectedCustomer?.value) {
            params.append("customer_id", selectedCustomer.value);
        }
        if (selectedContact?.value) {
            params.append("contact", selectedContact.value);
        }
        if (fromDate) {
            params.append("from_date", fromDate.toISOString().split("T")[0]);
        }

        if (toDate) {
            params.append("to_date", toDate.toISOString().split("T")[0]);
        }

        console.log("Search params:", params.toString());

        fetch(`${PYTHON_API_URL}/api/sales/get-sales-commission?${params}`)
            .then(res => {
                if (!res.ok) {
                    throw new Error(`API Error: ${res.status} ${res.statusText}`);
                }
                return res.json();
            })
            .then(res => {
                console.log("Full API Response:", res);
                console.log("Data array:", res?.data);
                console.log("First item:", res?.data?.[0]);

                if (!res || !res.data) {
                    console.error("Invalid response structure:", res);

                    return;
                }

                if (res.data.length === 0) {
                    console.warn("No data returned from API");
                    setTableData([]);
                    return;
                }

                // Log the first item to see the actual field names
                console.log("Sample data item:", res.data[0]);
                const firstItem = res.data[0];
                console.log("Available fields:", Object.keys(firstItem));

                const grouped = {};

                res.data.forEach(item => {
                    const key = item.invoiceId;

                    if (!grouped[key]) {
                        grouped[key] = {
                            refNo: item.invoiceId,            // ✅ correct
                            date: item.invoiceDate,
                            customerName: item.customerName,
                            contact: item.contactName,
                            total: 0,
                            items: []
                        };
                    }

                    grouped[key].items.push({
                        gasName: item.gasName,
                        qty: item.qty,
                        rate: item.rate,
                        commission: item.commission
                    });

                    grouped[key].total += item.commission;
                });




                const formatted = Object.values(grouped);
                setTableData(formatted);
                console.log("Formatted data:", formatted);
                setTableData(formatted);
            })
            .catch(err => {
                console.error("Search Error:", err);
                alert(`Error fetching data: ${err.message}`);
            });
    };

    const handleCancel = () => {
        setSelectedCustomer(null);
        setSelectedContact(null);
        setSelectedCurrency(null);
        setFromDate(null);
        setToDate(null);
        setTableData([]);
        setGlobalFilter("");
    };

    const handleNew = () => {
        alert("New Entry Clicked");
    };

    // ===== DATE FORMAT =====
    const formatDate = (date) => {
        if (!date) return "";

        const d = new Date(date);

        return d.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });
    };

    const totalCommission = tableData.reduce(
        (sum, row) => sum + (row.total || 0),
        0
    );

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Reports" breadcrumbItem="Sales Commission Report" />

                <Row>
                    <Col lg="12">
                        <Card>
                            <CardBody>

                                {/* ===== FILTER ROW 1 ===== */}
                                <Row className="mb-3">
                                    <Col md="4" className="d-flex align-items-center">
                                        <Label className="me-2" style={{ minWidth: "100px" }}>
                                            Customer:
                                        </Label>
                                        <Select
                                            options={customers}
                                            value={selectedCustomer}
                                            onChange={(value) => {
                                                setSelectedCustomer(value);
                                                setSelectedContact(null);
                                                setContacts([]);
                                            }}
                                            isClearable

                                            className="flex-grow-1"
                                        />
                                    </Col>

                                    <Col md="4" className="d-flex align-items-center">
                                        <Label className="me-2" style={{ minWidth: "100px" }}>
                                            Contact:
                                        </Label>
                                        <Select
                                            options={contacts}
                                            value={contacts.find(c => c.value === selectedContact?.value) || null}
                                            onChange={(val) => setSelectedContact(val)}
                                            isClearable
                                            className="flex-grow-1"
                                        />
                                    </Col>


                                </Row>

                                {/* ===== FILTER ROW 2 ===== */}
                                <Row className="mb-3">
                                    <Col md="4" className="d-flex align-items-center">
                                        <Label className="me-2" style={{ minWidth: "100px" }}>
                                            From:
                                        </Label>
                                        <Flatpickr
                                            className="form-control"
                                            value={fromDate}
                                            onChange={(date) => setFromDate(date[0])}
                                            options={{
                                                altInput: true,
                                                altFormat: "d-M-Y",
                                                dateFormat: "Y-m-d",
                                            }}
                                        />
                                    </Col>

                                    <Col md="4" className="d-flex align-items-center">
                                        <Label className="me-2" style={{ minWidth: "100px" }}>
                                            To:
                                        </Label>
                                        <Flatpickr
                                            className="form-control"
                                            value={toDate}
                                            onChange={(date) => setToDate(date[0])}
                                            options={{
                                                altInput: true,
                                                altFormat: "d-M-Y",
                                                dateFormat: "Y-m-d",
                                            }}
                                        />
                                    </Col>
                                </Row>

                                {/* ===== BUTTONS ===== */}
                                <Row className="mb-3 align-items-center">
                                    {/* LEFT SIDE → TOTAL */}
                                    <Col md="6">
                                        <h5 style={{ margin: 0 }}>
                                            Total Commission Value:{" "}
                                            <span style={{ fontWeight: "bold" }}>
                                                {totalCommission.toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                })}
                                            </span>
                                        </h5>
                                    </Col>

                                    {/* RIGHT SIDE → BUTTONS */}
                                    <Col md="6" className="d-flex justify-content-end">
                                        <button className="btn btn-info me-2" onClick={handleSearch}>
                                            <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i>
                                            Search
                                        </button>

                                        <button className="btn btn-secondary me-2" onClick={handleCancel}>
                                            <i className="bx bx-x-circle label-icon font-size-16 align-middle me-2"></i>
                                            Cancel
                                        </button>


                                    </Col>
                                </Row>

                                {/* ===== TABLE ===== */}
                                <div className="table-responsive">
                                    <DataTable
                                        ref={dtRef}
                                        value={tableData}
                                        paginator
                                        rows={10}
                                        showGridlines
                                        globalFilter={globalFilter}
                                        responsiveLayout="scroll"
                                        style={{ fontSize: "15px" }}
                                        header={
                                            <div className="d-flex justify-content-end">
                                                <InputText
                                                    value={globalFilter}
                                                    onChange={(e) => setGlobalFilter(e.target.value)}
                                                    placeholder="Search..."
                                                    style={{ width: "250px" }}
                                                />
                                            </div>
                                        }
                                    >
                                        <Column

                                            header=" Invoice Date"
                                            body={(row) => formatDate(row.date)}
                                            bodyStyle={{ padding: "12px" }}
                                            headerStyle={{ padding: "12px" }}
                                        />

                                        <Column
                                            field="Invoice No"
                                            header="Invoice No"
                                            body={(rowData) => (
                                                <span
                                                    style={{ color: "#007bff", cursor: "pointer", textDecoration: "underline" }}
                                                    onClick={() => {
                                                        setSelectedRow(rowData);
                                                        setModalOpen(true);
                                                    }}
                                                >
                                                    {rowData.refNo}
                                                </span>
                                            )}
                                        />

                                        <Column
                                            header="Commission"
                                            body={(row) =>
                                                (row.total || 0).toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                })
                                            }
                                            bodyStyle={{ padding: "10px" }}
                                            className="text-end"
                                        />

                                        <Column
                                            header="Cummulative"
                                            body={(rowData, options) => {
                                                let sum = 0;

                                                for (let i = 0; i <= options.rowIndex; i++) {
                                                    sum += tableData[i].total || 0;
                                                }

                                                return sum.toLocaleString("en-US", {
                                                    minimumFractionDigits: 2,
                                                });
                                            }}
                                            bodyStyle={{ padding: "10px" }}
                                            className="text-end"
                                        />
                                    </DataTable>

                                    <Modal isOpen={modalOpen} toggle={() => setModalOpen(false)} size="lg">
                                        <ModalHeader toggle={() => setModalOpen(false)}>
                                            Invoice View: {selectedRow?.refNo}
                                        </ModalHeader>

                                        <ModalBody>
                                            {selectedRow && (
                                                <>
                                                    {/* HEADER */}
                                                    <Row className="mb-3">
                                                        <Col md="6">
                                                            <strong>Customer:</strong> {selectedRow.customerName}
                                                        </Col>
                                                        <Col md="6">
                                                            <strong>Invoice Date:</strong> {formatDate(selectedRow.date)}
                                                        </Col>
                                                    </Row>

                                                    <Row className="mb-3">
                                                        <Col md="6">
                                                            <strong>Contact:</strong> {selectedRow.contact}
                                                        </Col>
                                                        <Col md="6">
                                                            <strong>Total:</strong>{" "}
                                                            {selectedRow.total.toLocaleString("en-US", {
                                                                minimumFractionDigits: 2,
                                                            })}
                                                        </Col>
                                                    </Row>

                                                    {/* GRID */}
                                                    <h6>Item Summary</h6>
                                                    <table className="table table-bordered">
                                                        <thead>
                                                            <tr>
                                                                <th>Gas Name</th>
                                                                <th>Total Qty</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {selectedRow.items.map((item, index) => (
                                                                <tr key={index}>
                                                                    <td>{item.gasName}</td>
                                                                    <td>{item.qty}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>

                                                    <div className="text-end">
                                                        <Button color="secondary" onClick={() => setModalOpen(false)}>
                                                            Close
                                                        </Button>
                                                    </div>
                                                </>
                                            )}
                                        </ModalBody>
                                    </Modal>
                                </div>

                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};




export default SalesCommissionReport;