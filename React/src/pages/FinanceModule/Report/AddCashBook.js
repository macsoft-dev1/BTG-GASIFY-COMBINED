import React, { useState, useEffect } from "react";
import {
    Card,
    CardBody,
    Col,
    Container,
    Row,
    Label,
    Input,
    Button,
    Table,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Spinner
} from "reactstrap";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import axios from "axios";
import { toast } from "react-toastify";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Configuration
import { GetCustomerFilter } from "../../FinanceModule/service/financeapi";
import { GetBankList, GetAllCurrencies } from "common/data/mastersapi";
import { PYTHON_API_URL } from "common/pyapiconfig";

// --- IMPORT LOGO FOR PRINT ---
import logo from "../../../assets/images/logo.png";

// --- HELPER: Number to Words ---
const numberToWords = (amount) => {
    const units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];
    const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    const thousands = ["", "Thousand", "Million", "Billion"];

    const toWords = (num) => {
        if (num === 0) return "";
        else if (num < 10) return units[num];
        else if (num < 20) return teens[num - 10];
        else if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? " " + units[num % 10] : "");
        else return units[Math.floor(num / 100)] + " Hundred" + (num % 100 !== 0 ? " " + toWords(num % 100) : "");
    };

    if (amount === 0) return "Zero";

    let str = "";
    let i = 0;

    const parts = Math.abs(amount).toString().split(".");
    let num = parseInt(parts[0]);

    while (num > 0) {
        if (num % 1000 !== 0) {
            str = toWords(num % 1000) + " " + thousands[i] + " " + str;
        }
        num = Math.floor(num / 1000);
        i++;
    }

    return str.trim();
};

// --- HELPER: Date Formatter (dd-mm-yyyy) ---
const formatDatePrint = (dateInput) => {
    if (!dateInput || dateInput === "N/A") return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
};

const AddCashBook = () => {
    // --- UI STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    // --- DATA STATES ---
    const [bankList, setBankList] = useState([]);
    const [customerList, setCustomerList] = useState([]);
    const [supplierList, setSupplierList] = useState([]);
    const [entryList, setEntryList] = useState([]);
    const [salesList, setSalesList] = useState([]);
    const [customerDefaults, setCustomerDefaults] = useState({});

    // --- BATCH ENTRY STATES ---
    const [rows, setRows] = useState([]);
    const [totals, setTotals] = useState({ receipt: 0, payment: 0 });
    const [editMode, setEditMode] = useState(false);

    // --- CURRENCY STATES ---
    const [currencyList, setCurrencyList] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState(null);

    // --- PREVIEW MODAL STATES ---
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [invoiceList, setInvoiceList] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    // --- PRINT MODAL STATES ---
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printRecord, setPrintRecord] = useState(null);

    // --- INITIAL LOAD ---
    useEffect(() => {
        const loadInitialData = async () => {
            // Load Currencies
            try {
                const currRes = await GetAllCurrencies({ currencyCode: "", currencyName: "" });
                const currData = currRes.data || currRes;
                if (Array.isArray(currData)) {
                    setCurrencyList(currData.map(c => ({
                        value: c.CurrencyId,
                        label: c.CurrencyCode
                    })));
                }
            } catch (err) { console.error("Failed to load currencies", err); }

            // Load Banks First for Lookup
            const banks = await GetBankList(1, 1);
            setBankList(banks.map(item => ({ value: item.value, label: item.BankName, currencyId: item.CurrencyId })));

            // Load Customers
            const customers = await GetCustomerFilter(1, "%");
            setCustomerList(Array.isArray(customers) ? customers.map(c => ({
                value: Number(c.Id || c.CustomerID),
                label: c.CustomerName
            })) : []);

            // Load Suppliers
            try {
                const supResponse = await axios.get(`${PYTHON_API_URL}/AR/get-supplier-filter`);
                if (supResponse.data?.status === "success") {
                    setSupplierList(supResponse.data.data.map(s => ({
                        value: s.SupplierId,
                        label: s.SupplierName
                    })));
                }
            } catch (err) { console.error("Failed to load suppliers", err); }

            loadSalesPersons();
            loadCustomerDefaults();
        };
        loadInitialData();
    }, []);

    useEffect(() => {
        if (bankList.length > 0 && customerList.length > 0) {
            loadEntryList();
        }
    }, [bankList, customerList]);

    // --- CALCULATE TOTALS ---
    useEffect(() => {
        const t = rows.reduce((acc, row) => {
            const amt = parseFloat(row.amount || 0);
            if (row.type === 'Receipt' || row.type === 'Other Income') acc.receipt += amt;
            else acc.payment += amt;
            return acc;
        }, { receipt: 0, payment: 0 });
        setTotals(t);
    }, [rows]);

    const loadSalesPersons = async () => {
        try {
            const response = await axios.get(`${PYTHON_API_URL}/AR/get-sales-persons`);
            if (response.data?.status === "success") {
                setSalesList(response.data.data);
            }
        } catch (err) { console.error(err); }
    };

    const loadCustomerDefaults = async () => {
        try {
            const response = await axios.get(`${PYTHON_API_URL}/AR/get-customer-defaults`);
            if (response.data?.status === "success") {
                setCustomerDefaults(response.data.data);
            }
        } catch (err) { console.error("Failed to load customer defaults", err); }
    };

    const loadEntryList = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${PYTHON_API_URL}/AR/cash/get-daily-entries`);
            console.log("CASHBOOK API RESPONSE DATA:", response.data); // Added for debugging
            if (response.data?.status === "success" && Array.isArray(response.data.data)) {
                const mapped = response.data.data.map(item => ({
                    ...item,
                    bankName: bankList.find(b => b.value === parseInt(item.deposit_bank_id))?.label || "-",
                    customerName: customerList.find(c => c.value === item.customer_id)?.label || item.customerName || item.customer_id,
                    displayDate: item.date ? format(new Date(item.date), "dd-MMM-yyyy") : "-",
                    verificationStatus: item.verification_status,
                    is_submitted: item.is_submitted,
                    customerId: item.customer_id
                }));
                setEntryList(mapped);
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    // --- HANDLERS ---
    const handleAddRow = () => {
        setRows(prevRows => [...prevRows, {
            id: Date.now(),
            rowId: 0,
            type: "Receipt",
            date: new Date(),
            customerId: "",
            referenceNo: "",
            amount: "",
            salesPersonId: "",
            sendNotification: false
        }]);
    };

    const handleRemoveRow = (index) => {
        const newRows = [...rows];
        newRows.splice(index, 1);
        setRows(newRows);
    };

    // Helper to switch options based on type
    const getOptionsForType = (type) => {
        if (type === 'Receipt' || type === 'Other Income') return customerList;
        if (type === 'Payment') return supplierList;
        return [];
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];

        // Reset selections if type changes
        if (field === 'type' && newRows[index].type !== value) {
            newRows[index]['customerId'] = "";
            newRows[index]['salesPersonId'] = "";
        }

        newRows[index][field] = value;

        // Auto-populate Sales Person only for Receipts/Customers
        if (field === 'customerId' && (newRows[index].type === 'Receipt' || newRows[index].type === 'Other Income')) {
            const defaultSP = customerDefaults[value] || customerDefaults[String(value)];
            if (defaultSP) {
                const spID = Number(defaultSP);
                const exists = salesList.find(s => s.value === spID);
                if (!exists) {
                    const tempOption = { value: spID, label: `Unknown User (${spID})` };
                    setSalesList(prev => [...prev, tempOption]);
                }
                newRows[index]['salesPersonId'] = spID;
            } else {
                newRows[index]['salesPersonId'] = "";
            }
        }

        setRows(newRows);
    };

    const openNewModal = () => {
        setEditMode(false);
        setSelectedCurrency(null);
        setTotals({ receipt: 0, payment: 0 });

        const initialRow = {
            id: Date.now(),
            rowId: 0,
            type: "Receipt",
            date: new Date(),
            customerId: "",
            referenceNo: "",
            amount: "",
            salesPersonId: "",
            sendNotification: false
        };

        setRows([initialRow]);
        setIsModalOpen(true);
    };

    const openEditModal = (rowData) => {
        setEditMode(true);
        const amount = parseFloat(rowData.cash_amount);
        const type = amount < 0 ? "Payment" : "Receipt";

        setRows([{
            id: Date.now(),
            rowId: rowData.receipt_id,
            type: type,
            date: new Date(rowData.date || new Date()),
            customerId: rowData.customer_id,
            referenceNo: rowData.reference_no,
            amount: Math.abs(amount),
            salesPersonId: rowData.sales_person_id,
            sendNotification: rowData.send_notification
        }]);

        setIsModalOpen(true);
    };

    const handleBatchSubmit = async (mode) => {
        if (rows.length === 0) {
            toast.error("Please add at least one transaction row");
            return;
        }

        try {
            const isPosted = mode === "POST";
            const headerPayload = rows.map(row => {
                // Calculate amount (Negative for Payment)
                let finalAmount = Math.abs(parseFloat(row.amount));
                if (row.type === 'Payment') {
                    finalAmount = -finalAmount;
                }

                return {
                    receipt_id: row.rowId || 0,
                    customer_id: parseInt(row.customerId || 0),
                    cash_amount: finalAmount,
                    receipt_date: format(row.date, "yyyy-MM-dd"),
                    reference_no: row.referenceNo,
                    sales_person_id: row.salesPersonId ? parseInt(row.salesPersonId) : null,
                    send_notification: row.sendNotification,
                    status: isPosted ? "Posted" : "Saved",
                    is_posted: isPosted
                };
            });

            const payload = {
                orgId: 1,
                branchId: 1,
                userId: 505,
                userIp: "127.0.0.1",
                header: headerPayload
            };

            if (editMode) {
                const idToUpdate = rows[0].rowId;
                const endpoint = `${PYTHON_API_URL}/AR/cash/update/${idToUpdate}`;
                await axios.put(endpoint, payload);
            } else {
                const endpoint = `${PYTHON_API_URL}/AR/cash/create`;
                await axios.post(endpoint, payload);
            }

            toast.success(`${rows.length} Entries ${isPosted ? 'Posted' : 'Saved'} Successfully`);
            setIsModalOpen(false);
            loadEntryList();
        } catch (err) {
            console.error(err);
            toast.error("Error saving entries");
        }
    };

    const handleSubmitRow = async (id) => {
        try {
            await axios.put(`${PYTHON_API_URL}/AR/cash/submit/${id}`);
            toast.success("Marketing Verification Generated!");
            loadEntryList();
        } catch (err) {
            toast.error("Generation failed");
        }
    };

    const handleFinalizePost = async (id) => {
        try {
            await axios.put(`${PYTHON_API_URL}/AR/cash/post/${id}`);
            toast.success("Posted to Cash Book successfully!");
            loadEntryList();
        } catch (err) {
            toast.error("Final post failed");
        }
    };

    const handlePreview = async (rowData) => {
        setSelectedEntry(rowData);
        setIsPreviewOpen(true);
        setLoadingInvoices(true);
        setInvoiceList([]);

        if (rowData.customerId && parseFloat(rowData.cash_amount) > 0) {
            try {
                const response = await axios.get(`${PYTHON_API_URL}/AR/get-outstanding-invoices/${rowData.customerId}`, {
                    params: { receipt_id: rowData.receipt_id }
                });
                if (response.data && response.data.status === "success") {
                    setInvoiceList(response.data.data);
                } else {
                    setInvoiceList([]);
                }
            } catch (error) {
                console.error("Error fetching outstanding invoices:", error);
                toast.error("Failed to fetch invoice details");
            }
        }
        setLoadingInvoices(false);
    };

    const handleGenerateVerification = async () => {
        if (!selectedEntry) return;
        try {
            await axios.put(`${PYTHON_API_URL}/AR/cash/submit/${selectedEntry.receipt_id}`);
            toast.success("Marketing Verification Generated!");
            setIsPreviewOpen(false);
            loadEntryList();
        } catch (err) {
            toast.error("Failed to generate verification");
        }
    };

    // --- PRINT RECEIPT FUNCTIONS ---
    const handlePrintPreview = (rowData) => {
        setPrintRecord(rowData);
        setIsPrintModalOpen(true);
    };

    const getReceiptHTML = () => {
        const receiptContent = document.getElementById("receipt-print-section").innerHTML;
        const metaContent = document.getElementById("receipt-print-meta")?.innerHTML || "";
        return `
            <html>
                <head>
                    <title>Receipt Voucher - ${printRecord?.receipt_id}</title>
                    <base href="${window.location.origin}/" />
                    <style>
                        @page { size: A5 landscape; margin: 8mm; }
                        body { font-family: 'Times New Roman', serif; margin: 0; padding: 8px; }
                        .receipt-container { border: 2px solid #1a2c5b; padding: 18px 22px; position: relative; width: 100%; max-width: 700px; margin: auto; box-sizing: border-box; }
                        .header { display: flex; align-items: center; border-bottom: 2px solid #1a2c5b; padding-bottom: 6px; margin-bottom: 12px; }
                        .logo { width: 70px; margin-right: 15px; }
                        .company-details h2 { margin: 0; color: #1a2c5b; font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; }
                        .company-details p { margin: 1px 0; font-size: 9px; color: #333; }
                        .receipt-no { position: absolute; top: 18px; right: 22px; font-size: 14px; color: #d92525; font-weight: bold; font-family: monospace; text-align: right; }
                        .running-system { font-size: 8px; color: #666; font-style: italic; margin-top: 2px; }
                        .receipt-title { text-align: center; font-size: 15px; font-weight: bold; margin: 10px 0 18px 0; color: #1a2c5b; letter-spacing: 1.5px; text-decoration: underline double; }
                        .label { font-weight: bold; color: #1a2c5b; font-size: 11px; white-space: nowrap; }
                        .colon { font-weight: bold; color: #1a2c5b; font-size: 11px; text-align: center; }
                        .value { border-bottom: 1px solid #1a2c5b; padding-left: 6px; font-size: 11px; position: relative; min-height: 16px; color: #000; }
                        .slanted-box { border: 1px solid #1a2c5b; transform: skewX(-20deg); padding: 4px 6px; background: #fff; }
                        .print-meta { max-width: 700px; margin: 2px auto 0 auto; text-align: right; font-size: 6px; color: #aaa; padding-top: 1px; }
                    </style>
                </head>
                <body>
                    ${receiptContent}
                    ${metaContent}
                </body>
            </html>
        `;
    };

    const triggerPrint = () => {
        const printWindow = window.open("", "_blank");
        printWindow.document.write(getReceiptHTML());
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const triggerDownload = async () => {
        try {
            const receiptEl = document.getElementById("receipt-print-section");
            const metaEl = document.getElementById("receipt-print-meta");

            // Create a temporary wrapper to capture both elements together
            const wrapper = document.createElement("div");
            wrapper.style.position = "absolute";
            wrapper.style.left = "-9999px";
            wrapper.style.top = "0";
            wrapper.style.background = "#fff";
            wrapper.style.padding = "10px";
            wrapper.style.width = "700px";

            const receiptClone = receiptEl.cloneNode(true);
            wrapper.appendChild(receiptClone);

            if (metaEl) {
                const metaClone = metaEl.cloneNode(true);
                wrapper.appendChild(metaClone);
            }

            document.body.appendChild(wrapper);

            const canvas = await html2canvas(wrapper, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            document.body.removeChild(wrapper);

            const imgData = canvas.toDataURL("image/png");

            // A5 landscape: 210mm x 148mm
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a5'
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 5;
            const usableWidth = pageWidth - (margin * 2);
            const scaledHeight = (canvas.height * usableWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", margin, margin, usableWidth, scaledHeight);
            pdf.save(`Receipt_Voucher_${printRecord?.receipt_id || 'receipt'}.pdf`);

            toast.success("Receipt downloaded successfully!");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download receipt");
        }
    };

    const statusBodyTemplate = (rowData) => (
        <div className="d-flex justify-content-center">
            <span className={`circle-badge ${rowData.is_posted ? 'bg-posted' : 'bg-saved'}`}>
                {rowData.is_posted ? 'P' : 'S'}
            </span>
        </div>
    );

    const verificationBodyTemplate = (rowData) => {
        if (!rowData.is_posted) return null;
        const isCompleted = rowData.verificationStatus === 'Completed';
        const isPending = rowData.verificationStatus === 'Pending';

        if (isPending) return (<div className="d-flex justify-content-center"><span className="circle-badge bg-danger" title="Verification Pending">P</span></div>);
        if (isCompleted) return (<div className="d-flex justify-content-center"><span className="circle-badge bg-success" title="Verification Completed">C</span></div>);
        return null;
    };

    const actionBodyTemplate = (rowData) => {
        const isEditable = rowData.verificationStatus !== 'Completed';
        const isPreviewable = true;
        const isActionable = rowData.verificationStatus === 'Completed';
        const isPostable = isActionable && !rowData.is_submitted;

        const linkStyle = (enabled, color = '#0d6efd') => ({
            color: enabled ? color : '#adb5bd',
            cursor: enabled ? 'pointer' : 'not-allowed',
            fontWeight: '500',
            fontSize: '12px',
            textDecoration: 'none',
            padding: '0 2px',
            background: 'none',
            border: 'none',
        });

        const sep = <span style={{ color: '#ced4da', margin: '0 2px' }}>|</span>;

        return (
            <div className="d-flex justify-content-center align-items-center table-actions">
                <button style={linkStyle(isEditable, '#0d6efd')} onClick={() => { if (isEditable) openEditModal(rowData); }} disabled={!isEditable} title="Edit">Edit</button>
                {sep}
                <button style={linkStyle(isPreviewable, '#0dcaf0')} onClick={() => { if (isPreviewable) handlePreview(rowData); }} disabled={!isPreviewable} title="View">View</button>
                {sep}
                <button style={linkStyle(isActionable, '#6c757d')} onClick={() => { if (isActionable) handlePrintPreview(rowData); }} disabled={!isActionable} title="Print">Print</button>
                {sep}
                {rowData.is_submitted ? (
                    <span style={{ color: '#198754', fontSize: '11px', fontWeight: 'bold' }}>POSTED</span>
                ) : (
                    <button style={linkStyle(isPostable, '#198754')} onClick={() => { if (isPostable) handleFinalizePost(rowData.receipt_id); }} disabled={!isPostable} title="Post to Cash Book">Post</button>
                )}
            </div>
        );
    };

    const customSelectStyles = {
        control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px', borderColor: '#ced4da' }),
        menu: (base) => ({ ...base, fontSize: '12px', zIndex: 9999 }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 })
    };

    return (
        <div className="page-content bg-modern">
            <Container fluid>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="page-heading mb-0">CASH BOOK ENTRY</h5>
                    <div className="d-flex align-items-center">
                        <div className="d-flex gap-2">
                            <button className="btn-toolbar btn-new-green" onClick={openNewModal}><i className="bx bx-plus"></i> New Entry</button>
                        </div>
                    </div>
                </div>

                <Card className="main-card border-0">
                    <CardBody>
                        <div className="d-flex justify-content-end mb-2">
                            <input
                                type="text"
                                value={globalFilter}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                placeholder="Global Search"
                                className="form-control"
                                style={{ width: '250px' }}
                            />
                        </div>
                        <DataTable
                            value={entryList}
                            paginator
                            rows={20}
                            loading={loading}
                            globalFilter={globalFilter}
                            globalFilterFields={["displayDate", "customerName", "reference_no", "cash_amount"]}
                            className="p-datatable-modern"
                            responsiveLayout="scroll"
                            showGridlines
                            filterDisplay="menu"
                            filter
                            emptyMessage="No records found."
                        >
                            <Column field="displayDate" header="Date" sortable filter filterPlaceholder="Search Date" style={{ width: '10%' }} />
                            <Column field="customerName" header="Party" sortable filter filterPlaceholder="Search Party" style={{ width: '25%' }} />
                            <Column field="reference_no" header="Reference" sortable filter filterPlaceholder="Search Ref" style={{ width: '10%' }} />
                            <Column field="cash_amount" header="Amount" className="text-end" body={(d) => {
                                const val = parseFloat(d.cash_amount || 0);
                                return val === 0 ? "" : val.toLocaleString('en-US', { minimumFractionDigits: 2 });
                            }} style={{ width: '10%' }} />
                            <Column header="Status" body={statusBodyTemplate} style={{ width: '8%' }} className="text-center" />
                            <Column header="Verify" body={verificationBodyTemplate} style={{ width: '8%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                            <Column header="Action" body={actionBodyTemplate} style={{ width: '16%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                        </DataTable>
                    </CardBody>
                </Card>

                {/* --- BATCH ENTRY MODAL --- */}
                <Dialog
                    header={editMode ? "Edit Entry" : "New Cash Book Entry (Batch)"}
                    visible={isModalOpen}
                    onHide={() => setIsModalOpen(false)}
                    className="modern-dialog"
                    style={{ width: '90vw', maxWidth: '1250px' }}
                    draggable={false}
                    resizable={false}
                >
                    <div className="bg-light p-3 rounded mb-3 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3" style={{ width: '35%' }}>
                            <Label className="fw-bold mb-0 text-nowrap">Currency:</Label>
                            <Select
                                className="flex-grow-1"
                                options={currencyList}
                                value={selectedCurrency}
                                onChange={setSelectedCurrency}
                                placeholder="Currency..."
                                styles={customSelectStyles}
                                isClearable
                            />
                        </div>
                        <div className="d-flex gap-4">
                            <div className="text-end border-end pe-4">
                                <small className="text-muted d-block text-uppercase" style={{ fontSize: '10px', letterSpacing: '1px' }}>Total Receipts</small>
                                <h5 className="text-success m-0 fw-bold">{totals.receipt.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h5>
                            </div>
                            <div className="text-end">
                                <small className="text-muted d-block text-uppercase" style={{ fontSize: '10px', letterSpacing: '1px' }}>Total Payments</small>
                                <h5 className="text-danger m-0 fw-bold">{totals.payment.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h5>
                            </div>
                        </div>
                    </div>

                    <div className="table-responsive" style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: '4px' }}>
                        <Table className="table table-bordered align-middle table-sm table-hover mb-0">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th style={{ width: '90px' }} className="text-center">Type</th>
                                    <th style={{ width: '110px' }} className="text-center">Date</th>
                                    <th style={{ width: '220px' }}>Party</th>
                                    <th style={{ width: '120px' }}>Reference No.</th>
                                    <th style={{ width: '130px' }} className="text-end">Amount</th>
                                    <th style={{ width: '160px' }}>Sales Person</th>
                                    <th style={{ width: '40px' }} className="text-center">Del</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, index) => (
                                    <tr key={row.id}>
                                        <td>
                                            <select
                                                className="form-select form-select-sm"
                                                value={row.type}
                                                onChange={(e) => handleRowChange(index, 'type', e.target.value)}
                                                style={{ fontSize: '12px' }}
                                            >
                                                <option value="Receipt">Receipt</option>
                                                <option value="Payment">Payment</option>
                                                <option value="Other Income">Other Income</option>
                                            </select>
                                        </td>
                                        <td>
                                            <Flatpickr
                                                className="form-control form-control-sm"
                                                value={row.date}
                                                onChange={(date) => handleRowChange(index, 'date', date[0])}
                                                options={{ dateFormat: "d-M-Y" }}
                                                style={{ fontSize: '12px' }}
                                            />
                                        </td>
                                        <td>
                                            <Select
                                                options={getOptionsForType(row.type)}
                                                value={getOptionsForType(row.type).find(c => c.value === row.customerId)}
                                                onChange={(opt) => handleRowChange(index, 'customerId', opt?.value)}
                                                styles={customSelectStyles}
                                                menuPortalTarget={document.body}
                                                placeholder={row.type === 'Payment' ? "Select Supplier..." : "Select Customer..."}
                                            />
                                        </td>
                                        <td>
                                            <Input bsSize="sm" value={row.referenceNo} onChange={(e) => handleRowChange(index, 'referenceNo', e.target.value)} style={{ fontSize: '12px' }} />
                                        </td>
                                        <td>
                                            <Input type="number" bsSize="sm" value={row.amount} onChange={(e) => handleRowChange(index, 'amount', e.target.value)} className="text-end" style={{ fontSize: '12px' }} />
                                        </td>
                                        <td>
                                            <Select
                                                options={salesList}
                                                value={salesList.find(c => String(c.value) === String(row.salesPersonId))}
                                                onChange={(opt) => handleRowChange(index, 'salesPersonId', opt?.value)}
                                                styles={customSelectStyles}
                                                menuPortalTarget={document.body}
                                                placeholder="Select..."
                                                isDisabled={row.type !== 'Receipt' && row.type !== 'Other Income'}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <i className="bx bx-trash text-danger cursor-pointer" onClick={() => handleRemoveRow(index)}></i>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>

                    <div className="mt-2">
                        <Button color="primary" size="sm" onClick={handleAddRow} style={{ fontSize: '12px', padding: '5px 12px', color: 'white' }}>
                            <i className="bx bx-plus me-1"></i> Add Entry
                        </Button>
                    </div>

                    <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-3">
                        <button className="btn-modal btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                        <button className="btn-modal btn-save" onClick={() => handleBatchSubmit("SAVE")}>{editMode ? "Update" : "Save Draft"}</button>
                        <button className="btn-modal btn-post" onClick={() => handleBatchSubmit("POST")}>Post</button>
                    </div>
                </Dialog>

                {/* --- OUTSTANDING INVOICES MODAL (PREVIEW) --- */}
                <Dialog
                    header="Customer Preview"
                    visible={isPreviewOpen}
                    onHide={() => setIsPreviewOpen(false)}
                    className="modern-dialog"
                    style={{ width: '650px' }}
                    draggable={false}
                    resizable={false}
                >
                    {selectedEntry && (
                        <div className="pt-2">
                            <div className="p-3 bg-light rounded mb-3">
                                <span className="fw-bold text-secondary me-2">Party:</span>
                                <span className="fw-bold text-dark">{selectedEntry.customerName}</span>
                            </div>

                            {loadingInvoices ? (
                                <div className="text-center py-4"><Spinner color="primary" /></div>
                            ) : (
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    <Table bordered className="mb-0 text-center align-middle table-hover">
                                        <thead className="table-light sticky-top">
                                            <tr>
                                                <th>Invoice No.</th>
                                                <th>Date</th>
                                                <th>Balance Due</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceList.length > 0 ? (
                                                invoiceList.map((inv, idx) => (
                                                    <tr key={idx}>
                                                        <td>{inv.invoice_no}</td>
                                                        <td>{inv.invoice_date}</td>
                                                        <td className="text-end fw-bold">
                                                            {parseFloat(inv.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" className="text-muted py-3">No outstanding invoices found.</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            )}
                        </div>
                    )}
                    <ModalFooter className="border-0 pt-3">
                        <Button color="secondary" onClick={() => setIsPreviewOpen(false)}>Close</Button>
                    </ModalFooter>
                </Dialog>

                {/* --- PRINT RECEIPT MODAL --- */}
                <Modal
                    isOpen={isPrintModalOpen}
                    toggle={() => setIsPrintModalOpen(false)}
                    size="lg"
                    centered
                    style={{ maxWidth: '780px', width: '95%' }}
                >
                    <ModalHeader toggle={() => setIsPrintModalOpen(false)}>Receipt Preview</ModalHeader>
                    <ModalBody className="p-3" style={{ backgroundColor: '#f9f9f9', overflowX: 'auto' }}>
                        <div id="receipt-print-section" className="receipt-container" style={{
                            backgroundColor: 'white',
                            border: '2px solid #1a2c5b',
                            padding: '18px 22px',
                            position: 'relative',
                            width: '100%',
                            maxWidth: '700px',
                            margin: '0 auto',
                            color: '#000',
                            fontFamily: "'Times New Roman', serif",
                            boxSizing: 'border-box'
                        }}>
                            {/* Header */}
                            <div className="header" style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid #1a2c5b', paddingBottom: '6px', marginBottom: '12px' }}>
                                <div className="logo" style={{ width: '70px', marginRight: '15px', flexShrink: 0 }}>
                                    <img src={logo} alt="BTG Logo" style={{ width: '100%' }} />
                                </div>
                                <div className="company-details" style={{ flexGrow: 1 }}>
                                    <h2 style={{ margin: 0, color: '#1a2c5b', fontSize: '16px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>PT. BATAM TEKNOLOGI GAS</h2>
                                    <p style={{ margin: '1px 0', fontSize: '9px', color: '#333' }}>Jalan Brigjen Katamso KM. 3, Tanjung Uncang, Batam - Indonesia</p>
                                    <p style={{ margin: '1px 0', fontSize: '9px', color: '#333' }}>Telp: (+62) 778 462959, 391918</p>
                                    <p style={{ margin: '1px 0', fontSize: '9px', color: '#333' }}>Website: www.ptbtg.com | E-mail: ptbtg@ptbtg.com</p>
                                </div>
                                <div style={{ position: 'absolute', top: '18px', right: '22px', textAlign: 'right' }}>
                                    <div style={{ fontSize: '14px', color: '#d92525', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                        No. : {printRecord?.receipt_id}
                                    </div>
                                    <div style={{ fontSize: '8px', color: '#666', fontStyle: 'italic', marginTop: '2px' }}>
                                    </div>
                                </div>
                            </div>

                            {/* Title */}
                            <div className="receipt-title" style={{ textAlign: 'center', fontSize: '15px', fontWeight: 'bold', textDecoration: 'underline double', marginBottom: '18px', color: '#1a2c5b', letterSpacing: '1.5px' }}>
                                RECEIPT VOUCHER
                            </div>

                            {/* Content Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr', gridGap: '10px 4px', alignItems: 'baseline', marginBottom: '18px' }}>
                                <div className="label" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', whiteSpace: 'nowrap' }}>Received From</div>
                                <div className="colon" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', textAlign: 'center' }}>:</div>
                                <div className="value" style={{ borderBottom: '1px solid #1a2c5b', paddingLeft: '6px', fontSize: '11px' }}>
                                    {printRecord?.customerName || printRecord?.customer_name}
                                </div>

                                <div className="label" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', whiteSpace: 'nowrap' }}>The Sum Of</div>
                                <div className="colon" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', textAlign: 'center' }}>:</div>
                                <div className="slanted-box" style={{ border: '1px solid #1a2c5b', transform: 'skewX(-20deg)', padding: '4px 6px', background: '#fff' }}>
                                    <div style={{ transform: 'skewX(20deg)', fontWeight: 'bold', fontSize: '11px' }}>
                                        {numberToWords(parseFloat(printRecord?.cash_amount || 0))} Rupiah Only
                                    </div>
                                </div>

                                <div className="label" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', whiteSpace: 'nowrap' }}>Being Payment Of</div>
                                <div className="colon" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', textAlign: 'center' }}>:</div>
                                <div className="value" style={{ borderBottom: '1px solid #1a2c5b', paddingLeft: '6px', fontSize: '11px', lineHeight: '1.4' }}>
                                    {(() => {
                                        const ref = printRecord?.reference_no || "";
                                        const match = ref.match(/\(Inv:\s*(.*?)\)/);
                                        if (match && match[1]) {
                                            return match[1].split(',').map(i => i.trim()).join(', ');
                                        }
                                        return ref || "______________________";
                                    })()}
                                </div>
                            </div>

                            {/* Amount + Signature Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '18px' }}>
                                <div style={{ width: '58%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
                                        <div className="label" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', marginRight: '8px', whiteSpace: 'nowrap' }}>
                                            Amount Rp :
                                        </div>
                                        <div style={{
                                            border: '1px solid #1a2c5b',
                                            width: '200px',
                                            padding: '5px 8px',
                                            transform: 'skewX(-20deg)',
                                            textAlign: 'center',
                                            background: '#fff'
                                        }}>
                                            <span style={{ display: 'inline-block', transform: 'skewX(20deg)', fontWeight: 'bold', fontSize: '14px' }}>
                                                {parseFloat(printRecord?.cash_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                        <div className="label" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', marginRight: '6px', whiteSpace: 'nowrap' }}>
                                            Payment Method :
                                        </div>
                                        <div className="value" style={{ borderBottom: '1px solid #1a2c5b', flexGrow: 1, paddingLeft: '6px', fontSize: '11px', color: '#000' }}>
                                            Cash
                                        </div>
                                    </div>

                                    {/* Cash receipt footer note */}
                                    <div style={{ marginTop: '12px', fontSize: '9px', color: '#555', fontStyle: 'italic' }}>
                                        Payment received in cash. Valid upon realization.
                                    </div>
                                </div>

                                <div style={{ textAlign: 'center', width: '35%' }}>
                                    <div style={{ fontSize: '11px', marginBottom: '3px', color: '#000' }}>
                                        Batam, {formatDatePrint(printRecord?.date || printRecord?.receipt_date)}
                                    </div>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1a2c5b' }}>Received by,</div>

                                    <div style={{ fontSize: '10px', marginTop: '3px', fontWeight: 'bold' }}>( Admin )</div>
                                    <div style={{ fontSize: '8px', marginTop: '4px', color: '#666', fontStyle: 'italic' }}>This is computer generated, no signature required</div>
                                </div>
                            </div>

                        </div>
                        {/* Printed-by date OUTSIDE the border */}
                        <div id="receipt-print-meta" className="print-meta" style={{ maxWidth: '700px', margin: '2px auto 0 auto', textAlign: 'right', fontSize: '6px', color: '#aaa', paddingTop: '1px' }}>
                            printed by {formatDatePrint(new Date())}, {new Date().toLocaleTimeString()}
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={() => setIsPrintModalOpen(false)}>Close</Button>
                        <Button color="success" onClick={triggerDownload}><i className="bx bx-download me-1"></i> Download</Button>
                        <Button color="info" onClick={triggerPrint}><i className="bx bx-printer me-1"></i> Print</Button>
                    </ModalFooter>
                </Modal>

            </Container>

            <style>{`
                .bg-modern { background-color: #f4f7f9; min-height: 100vh; font-family: 'Public Sans', sans-serif; }
                .page-heading { font-size: 16px; color: #495057; font-weight: 700; text-transform: uppercase; }
                .btn-toolbar { display: flex; align-items: center; gap: 6px; padding: 8px 18px; font-size: 13px; font-weight: 500; border: none; border-radius: 4px; color: white; transition: opacity 0.2s; line-height: 1.2; }
                .btn-toolbar:hover { opacity: 0.9; }
                .btn-search-blue { background-color: #556ee6; }
                .btn-cancel-red { background-color: #c7625a; }
                .btn-export-grey { background-color: #74788d; }
                .btn-print-blue { background-color: #5584d4; }
                .btn-new-green { background-color: #6ea354; } 
                .btn-clear { display: flex; align-items: center; border: none; background: #c5645d; color: white; border-radius: 4px; padding: 0; overflow: hidden; height: 32px; width: 32px; justify-content: center; }
                .clear-icon { display: flex; align-items: center; justify-content: center; }
                .legend-label { font-size: 14px; font-weight: 700; color: #2a3142; }
                .minimal-search { border: 1px solid #ced4da; border-radius: 4px; padding: 5px 12px; font-size: 13px; width: 280px; outline: none; }
                .p-datatable-modern .p-datatable-thead > tr > th { background-color: #5584d4 !important; color: white !important; font-size: 12px; padding: 12px; border: 1px solid #ffffff22; }
                .verif-badge { padding: 4px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; width: 90px; text-align: center; }
                .bg-pend { background-color: #ffe8d6; color: #c05621; } 
                .bg-comp { background-color: #d1fae5; color: #065f46; border: 1px solid #065f46; } 
                .circle-badge { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 11px; }
                .bg-saved { background-color: #f46a6a; }
                .bg-posted { background-color: #34c38f; }
                .bg-danger { background-color: #f46a6a !important; }
                .bg-success { background-color: #34c38f !important; }
                .action-link { cursor: pointer; font-weight: 700; font-size: 12px; }
                .edit { color: #495057; }
                .query { color: #8e44ad; }
                .submit { color: #27ae60; }
                .preview { color: #17a2b8; } 
                .divider { color: #ced4da; }
                .modern-dialog .p-dialog-header { padding: 1.25rem; border-bottom: 1px solid #eff2f7; background: #fff; border-top-left-radius: 8px; border-top-right-radius: 8px; }
                .modern-dialog .p-dialog-content { padding: 1.5rem; background: #fff; }
                .modal-label { font-size: 13px; font-weight: 600; color: #495057; margin-bottom: 6px; }
                .btn-modal { padding: 8px 24px; font-size: 13px; font-weight: 600; border-radius: 4px; border: none; transition: 0.2s; }
                .btn-cancel { background: white; border: 1px solid #ced4da; color: #74788d; }
                .btn-save { background: white; border: 1px solid #556ee6; color: #556ee6; }
                .btn-save:hover { background: #556ee6; color: white; }
                .btn-post { background: #34c38f; color: white; }
                .btn-icon { background: none; border: none; cursor: pointer; padding: 2px; transition: transform 0.2s; }
                .btn-icon:hover { transform: scale(1.15); }
                .btn-icon:disabled { opacity: 0.4; cursor: not-allowed; }
            `}</style>
        </div>
    );
};

export default AddCashBook;