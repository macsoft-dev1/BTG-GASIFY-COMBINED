import React, { useState, useEffect } from "react";
import { useHistory } from "react-router-dom";
import {
    Container,
    Card,
    CardBody,
    Row,
    Col,
    Table,
    Input,
    Button
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import Select from "react-select";
import Flatpickr from "react-flatpickr";

import "flatpickr/dist/themes/material_blue.css";
// import axios from "axios"; // Removed
import { toast } from "react-toastify";
import { getCustomersDNCN, getOutstandingInvoices, createDebitNote, createCreditNote, getLedgerCurrencies, fetchGasListDSI, GetUoM, GetCurrency } from "../../common/data/mastersapi";


const AddDnCn = () => {
    const history = useHistory();

    const [customerOptions, setCustomerOptions] = useState([]);
    const [currencyOptions, setCurrencyOptions] = useState([]);
    const [gasOptions, setGasOptions] = useState([]);
    const [uomOptions, setUomOptions] = useState([]);

    useEffect(() => {
        fetchCustomers();
        fetchCurrencies();
        fetchGasItems();
        fetchUOMs();
    }, []);

    const fetchGasItems = async () => {
        const data = await fetchGasListDSI(1, 0);
        setGasOptions(data.map(g => ({ value: g.GasCodeId, label: g.GasName })));
    };

    const fetchUOMs = async () => {
        const data = await GetUoM(1, 0);
        if (Array.isArray(data)) {
            setUomOptions(data.map(u => ({ value: u.UoMId, label: u.UoM })));
        }
    };

    const fetchCustomers = async () => {
        try {
            const response = await getCustomersDNCN();
            if (response && response.status === "success") {
                const options = response.data.map(c => ({
                    value: c.Id,
                    label: c.CustomerName
                }));
                setCustomerOptions(options);
            }
        } catch (error) {
            console.error("Error fetching customers:", error);
        }
    };

    const fetchCurrencies = async () => {
        try {
            const response = await getLedgerCurrencies();
            if (response && response.status === "success") {
                const allowedCodes = ["IDR", "USD", "MYR", "SGD", "CNY"];
                const options = response.data
                    .filter(c => allowedCodes.includes(c.CurrencyCode))
                    .map(c => ({
                        value: c.CurrencyId,
                        label: c.CurrencyCode
                    }));
                setCurrencyOptions(options);
            }
        } catch (error) {
            console.error("Error fetching currencies:", error);
        }
    };


    const fetchInvoices = async (customerId) => {
        if (!customerId) return [];
        try {
            const response = await getOutstandingInvoices(customerId);
            if (response && response.status) {
                return response.data.map(inv => ({
                    value: inv.invoice_id,
                    label: `${inv.invoice_no || inv.InvoiceNo || inv.InvoiceNbr} (${formatAmount(inv.total_amount || inv.TotalAmount || 0)})`
                }));
            }
            return [];
        } catch (error) {
            console.error("Error fetching invoices:", error);
            return [];
        }
    };


    // Debit Note Header State
    const [debitHeader, setDebitHeader] = useState({
        dnNo: "",
        customer: null,
        date: new Date(),
        currency: null,
        invoiceOptions: []
    });

    // Debit Note Rows State
    const [debitRows, setDebitRows] = useState([
        { gas: null, qty: 1, uom: null, invoiceNo: null, amount: "", description: "" },
    ]);

    // Credit Note Header State
    const [creditHeader, setCreditHeader] = useState({
        cnNo: "",
        customer: null,
        date: new Date(),
        currency: null,
        invoiceOptions: []
    });

    // Credit Note Rows State
    const [creditRows, setCreditRows] = useState([
        { gas: null, qty: 1, uom: null, invoiceNo: null, amount: "", description: "" },
    ]);

    // Handlers for Debit Note
    // Handlers for Debit Note Header
    const handleDebitHeaderChange = async (field, value) => {
        const newHeader = { ...debitHeader, [field]: value };
        if (field === "customer") {
            if (value && value.value) {
                const invOptions = await fetchInvoices(value.value);
                newHeader.invoiceOptions = invOptions;
                // Reset invoice in all rows for this customer? 
                // Or just update the options so rows can select.
            } else {
                newHeader.invoiceOptions = [];
            }
        }
        setDebitHeader(newHeader);
    };

    const handleDebitChange = (index, field, value) => {
        const newRows = [...debitRows];
        newRows[index][field] = value;
        setDebitRows(newRows);
    };

    const addDebitRow = () => {
        setDebitRows([...debitRows, { gas: null, qty: 1, uom: null, invoiceNo: null, amount: "", description: "" }]);
    };

    const removeDebitRow = (index) => {
        if (debitRows.length > 1) {
            setDebitRows(debitRows.filter((_, i) => i !== index));
        }
    };

    // Handlers for Credit Note Header
    const handleCreditHeaderChange = async (field, value) => {
        const newHeader = { ...creditHeader, [field]: value };
        if (field === "customer") {
            if (value && value.value) {
                const invOptions = await fetchInvoices(value.value);
                newHeader.invoiceOptions = invOptions;
            } else {
                newHeader.invoiceOptions = [];
            }
        }
        setCreditHeader(newHeader);
    };

    const handleCreditChange = (index, field, value) => {
        const newRows = [...creditRows];
        newRows[index][field] = value;
        setCreditRows(newRows);
    };

    const addCreditRow = () => {
        setCreditRows([...creditRows, { gas: null, qty: 1, uom: null, invoiceNo: null, amount: "", description: "" }]);
    };

    const handleSaveDebit = async (isSubmitted) => {
        if (!debitHeader.dnNo || !debitHeader.customer) {
            toast.warning("Please fill required header fields (DN No, Customer)");
            return;
        }

        for (const row of debitRows) {
            if (!row.amount) continue;

            const payload = {
                DebitNoteNo: debitHeader.dnNo,
                Date: debitHeader.date ? debitHeader.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                DebitAmount: parseFloat(row.amount),
                Description: row.description || (row.gas ? row.gas.label : ""),
                CustomerId: debitHeader.customer.value,
                InvoiceNo: row.invoiceNo ? row.invoiceNo.value : null,
                CurrencyId: debitHeader.currency ? debitHeader.currency.value : 1,
                GasCodeId: row.gas ? row.gas.value : 0,
                Qty: parseFloat(row.qty) || 0,
                UomId: row.uom ? row.uom.value : 0,
                IsSubmitted: isSubmitted
            };

            try {
                await createDebitNote(payload);
            } catch (e) {
                console.error("Error saving debit note", e);
            }
        }
        toast.success("Debit Note process completed");
        history.push("/dn-cn");
    };

    const handleSaveCredit = async (isSubmitted) => {
        if (!creditHeader.cnNo || !creditHeader.customer) {
            toast.warning("Please fill required header fields (CN No, Customer)");
            return;
        }

        for (const row of creditRows) {
            if (!row.amount) continue;

            const payload = {
                CreditNoteNo: creditHeader.cnNo,
                Date: creditHeader.date ? creditHeader.date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                CreditAmount: parseFloat(row.amount),
                Description: row.description || (row.gas ? row.gas.label : ""),
                CustomerId: creditHeader.customer.value,
                InvoiceNo: row.invoiceNo ? row.invoiceNo.value : null,
                CurrencyId: creditHeader.currency ? creditHeader.currency.value : 1,
                GasCodeId: row.gas ? row.gas.value : 0,
                Qty: parseFloat(row.qty) || 0,
                UomId: row.uom ? row.uom.value : 0,
                IsSubmitted: isSubmitted
            };

            try {
                await createCreditNote(payload);
            } catch (e) {
                console.error("Error saving credit note", e);
            }
        }
        toast.success("Credit Note process completed");
        history.push("/dn-cn");
    };

    const removeCreditRow = (index) => {
        if (creditRows.length > 1) {
            const newRows = creditRows.filter((_, i) => i !== index);
            setCreditRows(newRows);
        }
    };

    const formatAmountInternal = (val) => {
        if (val === null || val === undefined || val === "") return "";
        // Don't use toFixed(2) during typing as it forces decimals and moves the cursor
        const parts = val.toString().split(".");
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
        return parts.join(".");
    };

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="Add DN/CN" />

                {/* Debit Note Block */}
                <Card>
                    <CardBody>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="card-title">Debit Note</h4>
                            <Button color="primary" style={{ color: "white" }} onClick={addDebitRow}><i className="bx bx-plus"></i> Add Line</Button>
                        </div>

                        {/* Debit Header */}
                        <Row className="mb-4">
                            <Col md={2}>
                                <label className="form-label">Debit Note No</label>
                                <Input
                                    type="text"
                                    value={debitHeader.dnNo}
                                    placeholder="Enter DN No"
                                    onChange={(e) => handleDebitHeaderChange("dnNo", e.target.value)}
                                />
                            </Col>
                            <Col md={2}>
                                <label className="form-label">Date</label>
                                <Flatpickr
                                    className="form-control d-block"
                                    placeholder="Date"
                                    options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }}
                                    value={debitHeader.date}
                                    onChange={(date) => handleDebitHeaderChange("date", date[0])}
                                />
                            </Col>
                            <Col md={5}>
                                <label className="form-label">Customer</label>
                                <Select
                                    value={debitHeader.customer}
                                    onChange={(opt) => handleDebitHeaderChange("customer", opt)}
                                    options={customerOptions}
                                    placeholder="Select Customer"
                                />
                            </Col>
                            <Col md={3}>
                                <label className="form-label">Currency</label>
                                <Select
                                    value={debitHeader.currency}
                                    onChange={(opt) => handleDebitHeaderChange("currency", opt)}
                                    options={currencyOptions}
                                    placeholder="Select Currency"
                                />
                            </Col>
                        </Row>

                        {/* Debit Grid */}
                        <div className="table-responsive">
                            <Table className="table-bordered mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ minWidth: '180px' }}>Gas Name</th>
                                        <th style={{ minWidth: '80px' }}>Qty</th>
                                        <th style={{ minWidth: '100px' }}>UOM</th>
                                        <th style={{ minWidth: '150px' }}>Invoice No</th>
                                        <th style={{ minWidth: '120px' }}>Amount</th>
                                        <th style={{ minWidth: '180px' }}>Description</th>
                                        <th style={{ width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {debitRows.map((row, index) => (
                                        <tr key={index}>
                                            <td className="p-1">
                                                <Select
                                                    value={row.gas}
                                                    onChange={(opt) => handleDebitChange(index, "gas", opt)}
                                                    options={gasOptions}
                                                    placeholder="Select Gas"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <Input
                                                    type="number"
                                                    bsSize="sm"
                                                    value={row.qty}
                                                    onChange={(e) => handleDebitChange(index, "qty", e.target.value)}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <Select
                                                    value={row.uom}
                                                    onChange={(opt) => handleDebitChange(index, "uom", opt)}
                                                    options={uomOptions}
                                                    placeholder="UOM"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <Select
                                                    value={row.invoiceNo}
                                                    onChange={(opt) => handleDebitChange(index, "invoiceNo", opt)}
                                                    options={debitHeader.invoiceOptions}
                                                    placeholder="Invoice"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <Input
                                                    type="text"
                                                    bsSize="sm"
                                                    value={formatAmountInternal(row.amount)}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/,/g, "");
                                                        if (/^\d*\.?\d*$/.test(val)) handleDebitChange(index, "amount", val);
                                                    }}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <Input
                                                    type="text"
                                                    bsSize="sm"
                                                    value={row.description}
                                                    onChange={(e) => handleDebitChange(index, "description", e.target.value)}
                                                />
                                            </td>
                                            <td className="text-center p-1">
                                                {debitRows.length > 1 && (
                                                    <i className="bx bx-trash text-danger font-size-18" style={{ cursor: 'pointer' }} onClick={() => removeDebitRow(index)}></i>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="7">
                                            <div className="d-flex justify-content-end gap-2 mt-3">
                                                <Button color="primary" onClick={() => handleSaveDebit(false)}>Save</Button>
                                                <Button color="success" onClick={() => handleSaveDebit(true)}>Post</Button>
                                                <Button color="danger" onClick={() => history.push("/dn-cn")}>Cancel</Button>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </Table>
                        </div>
                    </CardBody>
                </Card>

                {/* Credit Note Block */}
                <Card>
                    <CardBody>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="card-title">Credit Note</h4>
                            <Button color="primary" style={{ color: "white" }} onClick={addCreditRow}><i className="bx bx-plus"></i> Add Line</Button>
                        </div>

                        {/* Credit Header */}
                        <Row className="mb-4">
                            <Col md={2}>
                                <label className="form-label">Credit Note No</label>
                                <Input
                                    type="text"
                                    value={creditHeader.cnNo}
                                    placeholder="Enter CN No"
                                    onChange={(e) => handleCreditHeaderChange("cnNo", e.target.value)}
                                />
                            </Col>
                            <Col md={2}>
                                <label className="form-label">Date</label>
                                <Flatpickr
                                    className="form-control d-block"
                                    placeholder="Date"
                                    options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }}
                                    value={creditHeader.date}
                                    onChange={(date) => handleCreditHeaderChange("date", date[0])}
                                />
                            </Col>
                            <Col md={5}>
                                <label className="form-label">Customer</label>
                                <Select
                                    value={creditHeader.customer}
                                    onChange={(opt) => handleCreditHeaderChange("customer", opt)}
                                    options={customerOptions}
                                    placeholder="Select Customer"
                                />
                            </Col>
                            <Col md={3}>
                                <label className="form-label">Currency</label>
                                <Select
                                    value={creditHeader.currency}
                                    onChange={(opt) => handleCreditHeaderChange("currency", opt)}
                                    options={currencyOptions}
                                    placeholder="Select Currency"
                                />
                            </Col>
                        </Row>

                        {/* Credit Grid */}
                        <div className="table-responsive">
                            <Table className="table-bordered mb-0 align-middle">
                                <thead className="table-light">
                                    <tr>
                                        <th style={{ minWidth: '180px' }}>Gas Name</th>
                                        <th style={{ minWidth: '80px' }}>Qty</th>
                                        <th style={{ minWidth: '100px' }}>UOM</th>
                                        <th style={{ minWidth: '150px' }}>Invoice No</th>
                                        <th style={{ minWidth: '120px' }}>Amount</th>
                                        <th style={{ minWidth: '180px' }}>Description</th>
                                        <th style={{ width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {creditRows.map((row, index) => (
                                        <tr key={index}>
                                            <td className="p-1">
                                                <Select
                                                    value={row.gas}
                                                    onChange={(opt) => handleCreditChange(index, "gas", opt)}
                                                    options={gasOptions}
                                                    placeholder="Select Gas"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <Input
                                                    type="number"
                                                    bsSize="sm"
                                                    value={row.qty}
                                                    onChange={(e) => handleCreditChange(index, "qty", e.target.value)}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <Select
                                                    value={row.uom}
                                                    onChange={(opt) => handleCreditChange(index, "uom", opt)}
                                                    options={uomOptions}
                                                    placeholder="UOM"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <Select
                                                    value={row.invoiceNo}
                                                    onChange={(opt) => handleCreditChange(index, "invoiceNo", opt)}
                                                    options={creditHeader.invoiceOptions}
                                                    placeholder="Invoice"
                                                    menuPortalTarget={document.body}
                                                    styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <Input
                                                    type="text"
                                                    bsSize="sm"
                                                    value={formatAmountInternal(row.amount)}
                                                    onChange={(e) => {
                                                        const val = e.target.value.replace(/,/g, "");
                                                        if (/^\d*\.?\d*$/.test(val)) handleCreditChange(index, "amount", val);
                                                    }}
                                                />
                                            </td>
                                            <td className="p-1">
                                                <Input
                                                    type="text"
                                                    bsSize="sm"
                                                    value={row.description}
                                                    onChange={(e) => handleCreditChange(index, "description", e.target.value)}
                                                />
                                            </td>
                                            <td className="text-center p-1">
                                                {creditRows.length > 1 && (
                                                    <i className="bx bx-trash text-danger font-size-18" style={{ cursor: 'pointer' }} onClick={() => removeCreditRow(index)}></i>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan="9">
                                            <div className="d-flex justify-content-end gap-2 mt-3">
                                                <Button color="primary" onClick={() => handleSaveCredit(false)}>Save</Button>
                                                <Button color="success" onClick={() => handleSaveCredit(true)}>Post</Button>
                                                <Button color="danger" onClick={() => history.push("/dn-cn")}>Cancel</Button>
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </Table>
                        </div>
                    </CardBody>
                </Card>
            </Container>
        </div>
    );
};

const formatAmount = (val) => {
    if (val === undefined || val === null || val === "") return "";
    const parts = val.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
};

export default AddDnCn;