import React, { useState, useEffect, useMemo } from "react";
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
    Spinner,
    Badge
} from "reactstrap";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Dialog } from "primereact/dialog";
import { Tag } from "primereact/tag";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import axios from "axios";
import { toast } from "react-toastify";
import { format } from "date-fns";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

// Import Breadcrumb
import Breadcrumbs from "components/Common/Breadcrumb";

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

const formatDatePrint = (dateInput) => {
    if (!dateInput || dateInput === "N/A") return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return dateInput;

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}-${month}-${year}`;
};

const getUserDetails = () => {
    if (localStorage.getItem("authUser")) {
        try {
            return JSON.parse(localStorage.getItem("authUser"));
        } catch (e) {
            return null;
        }
    }
    return null;
};

// --- HELPER: Parse Invoices from Reference (handles combined pipes as well) ---
const parseInvoices = (refNo) => {
    if (!refNo) return [];

    // Split by pipe for combined vouchers: "Ref1 | Ref2"
    const parts = refNo.split('|').map(p => p.trim());
    let allInvoices = [];

    parts.forEach(part => {
        const match = part.match(/\(Inv:\s*(.*?)\)/);
        if (match && match[1]) {
            const invoices = match[1].split(',').map(i => i.trim()).filter(i => i);
            allInvoices = [...allInvoices, ...invoices];
        } else if (part) {
            allInvoices.push(part);
        }
    });

    // Remove duplicates
    return [...new Set(allInvoices)];
};

// --- HELPER: Number with Commas ---
const formatWithCommas = (val) => {
    if (val === null || val === undefined || val === "") return "";
    const cleanValue = String(val).replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join('.');
};

// --- HELPER: Tag Severities ---
const getSeverity = (status) => {
    switch (status) {
        case 'Posted':
        case 'Completed':
            return 'success';
        case 'Saved':
            return 'danger';
        case 'Pending':
            return 'info';
        default:
            return 'info';
    }
};

const AddBankBook = () => {
    // --- UI STATES ---
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loading, setLoading] = useState(false);

    // --- DATA STATES ---
    const [bankList, setBankList] = useState([]);
    const [customerList, setCustomerList] = useState([]);
    const [supplierList, setSupplierList] = useState([]); // Added Supplier List
    const [entryList, setEntryList] = useState([]);
    const [salesList, setSalesList] = useState([]);
    const [customerDefaults, setCustomerDefaults] = useState({});

    // --- BATCH ENTRY STATES ---
    const [selectedBank, setSelectedBank] = useState(null);
    const [rows, setRows] = useState([]);
    const [totals, setTotals] = useState({ receipt: 0, payment: 0 });
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // --- CURRENCY STATES ---
    const [currencyList, setCurrencyList] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState(null);

    // --- PREVIEW MODAL STATES ---
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [invoiceList, setInvoiceList] = useState([]);
    const [loadingInvoices, setLoadingInvoices] = useState(false);

    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printRecord, setPrintRecord] = useState(null);

    // --- COMBINE VOUCHERS STATES ---
    const [selectedVouchers, setSelectedVouchers] = useState([]);
    const [isCombineModalOpen, setIsCombineModalOpen] = useState(false);
    const [combineReference, setCombineReference] = useState("");
    const [customVoucherNo, setCustomVoucherNo] = useState("");
    const [isCombining, setIsCombining] = useState(false);

    // --- MESSAGING STATES ---
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [messageHistory, setMessageHistory] = useState([]);
    const [newMessage, setNewMessage] = useState("");

    // --- FILTER STATES ---
    const [filterFromDate, setFilterFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [filterToDate, setFilterToDate] = useState(new Date());
    const [filterCurrency, setFilterCurrency] = useState(null);

    // --- INITIAL LOAD ---
    useEffect(() => {
        const loadInitialData = async () => {
            const banks = await GetBankList(1, 1);
            setBankList(banks.map(item => ({ value: item.value, label: item.BankName, currencyId: item.CurrencyId })));

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

            // 1. Load Customers
            const customers = await GetCustomerFilter(1, "%");
            setCustomerList(Array.isArray(customers) ? customers.map(c => ({
                value: Number(c.Id || c.CustomerID),
                label: c.CustomerName
            })) : []);

            // 2. Load Suppliers (Added for Payments)
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
            if (row.type === 'Receipt' || row.type === 'Other Income' || row.type === 'Bank transfer' || row.type === 'Bank Interest' || row.type === 'Cash Deposit') acc.receipt += amt;
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
            const response = await axios.get(`${PYTHON_API_URL}/AR/get-daily-entries`);
            if (response.data?.status === "success" && Array.isArray(response.data.data)) {
                const mapped = response.data.data.map(item => {
                    let cName = item.customerName;
                    if (item.transaction_type === 'Bank transfer' || item.transaction_type === 'Bank Interest' || item.transaction_type === 'Cash Deposit') {
                        cName = bankList.find(b => b.value === item.customer_id)?.label || item.customerName;
                    } else if (item.customer_id !== 0) {
                        const cust = customerList.find(c => c.value === item.customer_id) || supplierList.find(s => s.value === item.customer_id);
                        if (cust) cName = cust.label;
                    }

                    const curId = item.currencyid || currencyList.find(c => c.label === item.CurrencyCode)?.value;
                    const curCode = item.CurrencyCode || currencyList.find(c => c.value === item.currencyid)?.label || "";

                    return {
                        ...item,
                        bankName: bankList.find(b => b.value === parseInt(item.deposit_bank_id))?.label || item.bank_name || item.deposit_bank_id,
                        customerName: cName,
                        displayDate: item.date ? format(new Date(item.date), "dd-MMM-yyyy") : "-",
                        verificationStatus: item.verification_status,
                        customerId: item.customer_id,
                        currencyid: curId,
                        currencyCode: curCode
                    };
                });
                setEntryList(mapped);
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    // --- CLIENT-SIDE FILTERING ---
    const filteredEntries = useMemo(() => {
        return entryList.filter(entry => {
            // 1. Date Filter
            if (entry.date) {
                const entryDate = new Date(entry.date);
                entryDate.setHours(0, 0, 0, 0); // Normalize to midnight
                
                const from = new Date(filterFromDate);
                from.setHours(0, 0, 0, 0);
                
                const to = new Date(filterToDate);
                to.setHours(23, 59, 59, 999);

                if (entryDate < from || entryDate > to) return false;
            }

            // 2. Currency Filter
            if (filterCurrency && entry.currencyid !== filterCurrency.value) {
                return false;
            }

            // 3. Global Filter (Keyword)
            if (globalFilter) {
                const searchTerm = globalFilter.toLowerCase();
                const match = 
                    (entry.customerName?.toLowerCase().includes(searchTerm)) ||
                    (entry.bankName?.toLowerCase().includes(searchTerm)) ||
                    (entry.receipt_id?.toString().includes(searchTerm)) ||
                    (entry.custom_voucher_no?.toLowerCase().includes(searchTerm)) ||
                    (entry.reference_no?.toLowerCase().includes(searchTerm)) ||
                    (entry.bank_amount?.toString().includes(searchTerm));
                
                if (!match) return false;
            }

            return true;
        });
    }, [entryList, filterFromDate, filterToDate, filterCurrency, globalFilter]);

    const handleMessageOpen = async (rowData) => {
        setSelectedEntry(rowData);
        setIsMessageModalOpen(true);
        setMessageHistory([]);
        setNewMessage("");
        try {
            const res = await axios.get(`${PYTHON_API_URL}/AR/get-messages/${rowData.receipt_id}`, {
                params: { role: "Finance" }
            });
            if (res.data?.status === "success") {
                setMessageHistory(res.data.data);
                // Clear unread count locally
                setEntryList(prev => prev.map(e => e.receipt_id === rowData.receipt_id ? { ...e, unread_count: 0 } : e));
            }
        } catch (err) { console.error("Failed to load history", err); }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return;
        try {
            await axios.post(`${PYTHON_API_URL}/AR/send-message`, {
                receipt_id: selectedEntry.receipt_id,
                sender_role: "Finance",
                message_text: newMessage
            });
            setNewMessage("");
            const res = await axios.get(`${PYTHON_API_URL}/AR/get-messages/${selectedEntry.receipt_id}`);
            if (res.data?.status === "success") setMessageHistory(res.data.data);
        } catch (err) { toast.error("Failed to send message"); }
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
            bankCharges: "",
            salesPersonId: "",
            bank_payment_via: 2,
            cheque_number: "",
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
        if (type === 'Bank transfer') {
            return bankList.filter(b => Number(b.value) !== Number(selectedBank?.value));
        }
        return [];
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];

        // Reset selections if type changes (e.g. Receipt -> Payment)
        if (field === 'type' && newRows[index].type !== value) {
            newRows[index]['customerId'] = "";
            newRows[index]['salesPersonId'] = "";
            newRows[index]['bank_payment_via'] = 2;
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
        setEditingId(null);
        setSelectedBank(null);
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
            bankCharges: "",
            salesPersonId: "",
            bank_payment_via: 2,
            cheque_number: "",
            sendNotification: false
        };

        setRows([initialRow]); // Ensures fresh start
        setIsModalOpen(true);
    };

    const openEditModal = (rowData) => {
        const user = getUserDetails();
        const isSuperAdmin = user?.u_id === 158;
        const isPosted = rowData.is_posted === 1;

        if (isPosted && !isSuperAdmin) {
            toast.error("Only Super Admin can edit posted entries.");
            return;
        }

        setEditMode(true);
        setEditingId(rowData.receipt_id);
        const bank = bankList.find(b => b.value === parseInt(rowData.deposit_bank_id));
        setSelectedBank(bank || null);

        // Fetch and set selected currency (Handle null currencyid by falling back to CurrencyCode)
        const currency = currencyList.find(c => c.value === rowData.currencyid) || 
                         currencyList.find(c => c.label === rowData.CurrencyCode);
        setSelectedCurrency(currency || null);

        const amount = parseFloat(rowData.bank_amount);
        const type = amount < 0 ? "Payment" : "Receipt";

        setRows([{
            id: Date.now(),
            rowId: rowData.receipt_id,
            type: type,
            date: new Date(rowData.date || new Date()),
            customerId: rowData.customer_id,
            referenceNo: rowData.reference_no,
            amount: Math.abs(amount),
            bankCharges: rowData.bank_charges,
            salesPersonId: rowData.sales_person_id,
            bank_payment_via: rowData.bank_payment_via || (parseFloat(rowData.cash_amount || 0) !== 0 ? 4 : 2),
            cheque_number: rowData.cheque_number || "",
            sendNotification: rowData.send_notification,
            isPosted: isPosted
        }]);

        setIsModalOpen(true);
    };

    const handleBatchSubmit = async (mode) => {
        if (!selectedBank) {
            toast.error("Please select a Bank first");
            return;
        }
        if (!selectedCurrency) {
            toast.error("Please select a Currency");
            return;
        }
        if (rows.length === 0) {
            toast.error("Please add at least one transaction row");
            return;
        }

        // Validate each row for mandatory party (for relevant types)
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const needsParty = !['Bank Charges', 'Bank Interest', 'Cash Deposit'].includes(row.type);
            if (needsParty && !row.customerId) {
                toast.error(`Please select a Party for row ${i + 1}`);
                return;
            }
            if (!row.amount || parseFloat(row.amount) <= 0) {
                toast.error(`Please enter a valid amount for row ${i + 1}`);
                return;
            }
        }

        try {
            const isPosted = mode === "POST";
            const headerPayload = rows.map(row => {
                // Calculate amount (Negative for Payment/Charges)
                let finalAmount = Math.abs(parseFloat(row.amount));
                const typeLower = row.type?.toLowerCase();
                if (typeLower === 'payment' || typeLower === 'bank charges' || typeLower === 'bank transfer') {
                    finalAmount = -finalAmount;
                }

                // Detect if the target of a Bank Transfer is "Cash in Hand"
                const targetBank = bankList.find(b => String(b.value) === String(row.customerId));
                const isTransferToCash = typeLower === 'bank transfer' && targetBank?.label?.toLowerCase().includes("cash in hand");

                return {
                    receipt_id: row.rowId || 0,
                    transaction_type: row.type,
                    customer_id: (row.type === 'Bank Charges' || row.type === 'Bank Interest' || row.type === 'Cash Deposit') ? 0 : parseInt(row.customerId || 0),
                    bank_amount: isTransferToCash ? -Math.abs(finalAmount) : (typeLower === 'bank transfer' ? -Math.abs(finalAmount) : (row.bank_payment_via === 4 ? 0 : finalAmount)),
                    cash_amount: isTransferToCash ? Math.abs(finalAmount) : (typeLower === 'bank transfer' ? 0 : (row.bank_payment_via === 4 ? finalAmount : 0)),
                    bank_charges: parseFloat(row.bankCharges) || 0,
                    deposit_bank_id: parseInt(selectedBank.value),
                    receipt_date: format(row.date, "yyyy-MM-dd"),
                    reference_no: row.referenceNo,
                    sales_person_id: row.salesPersonId ? parseInt(row.salesPersonId) : null,
                    send_notification: row.sendNotification,
                    status: isPosted ? "Posted" : "Saved",
                    is_posted: isPosted,
                    contra_amount: 0,
                    tax_rate: 0,
                    bank_payment_via: parseInt(row.bank_payment_via),
                    cheque_number: row.cheque_number || "",
                    proof_missing: false
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
                const idToUpdate = editingId || rows[0]?.rowId;
                // Step 1: Always save the data fields
                await axios.put(`${PYTHON_API_URL}/AR/update/${idToUpdate}`, payload);

                // Step 2: If Post was clicked, call submit to set is_posted=True + pending_verification=True
                if (isPosted) {
                    await axios.put(`${PYTHON_API_URL}/AR/submit/${idToUpdate}`, {});
                }
            } else {
                // New entry: create the record first
                const createRes = await axios.post(`${PYTHON_API_URL}/AR/create`, payload);

                // If Post was clicked, call submit on each newly created id
                if (isPosted && createRes.data?.ids?.length > 0) {
                    for (const newId of createRes.data.ids) {
                        await axios.put(`${PYTHON_API_URL}/AR/submit/${newId}`, {});
                    }
                }
            }

            toast.success(`${rows.length} ${isPosted ? 'Posted' : 'Saved'} Successfully`);
            setEditMode(false);
            setEditingId(null);
            setIsModalOpen(false);
            loadEntryList();
        } catch (err) {
            console.error(err);
            toast.error("Error saving entries");
        }
    };


    const handleSubmitRow = async (id) => {
        try {
            await axios.put(`${PYTHON_API_URL}/AR/post/${id}`, {});
            toast.success("Transaction Posted Successfully!");
            loadEntryList();
        } catch (err) {
            toast.error("Posting failed");
        }
    };

    const handleDeleteEntry = async (rowData) => {
        const user = getUserDetails();
        const isSuperAdmin = user?.u_id === 158;

        if (!isSuperAdmin) {
            toast.error("Only Super Admin can delete entries.");
            return;
        }
        const confirmDelete = window.confirm(
            `Are you sure you want to delete Receipt #${rowData.receipt_id}?`
        );
        if (!confirmDelete) return;

        try {
            const res = await axios.delete(`${PYTHON_API_URL}/AR/delete/${rowData.receipt_id}`);
            if (res.data?.status === "success") {
                toast.success(res.data.message || "Entry deleted successfully!");
                loadEntryList();
            } else {
                toast.error(res.data?.detail || "Failed to delete entry");
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Failed to delete entry");
        }
    };


    const handlePreview = async (rowData) => {
        setInvoiceList([]); // Clear previous invoices immediately

        if (rowData.customerId && parseFloat(rowData.bank_amount) > 0) { // Only preview for receipts
            if (rowData.verificationStatus !== "Completed") {
                toast.warn("Allocations can only be previewed after Marketing Verification.");
                return;
            }

            setLoadingInvoices(true);
            setIsPreviewOpen(true);
            setSelectedEntry(rowData);
            try {
                let receiptsToFetch = [rowData]; // Default to single
                if (rowData.is_combined && rowData.grouped_receipt_ids && rowData.grouped_receipt_ids.length > 0) {
                    receiptsToFetch = rowData.grouped_receipt_ids.map(id => ({
                        ...rowData,
                        receipt_id: id // Override with specific ID for fetch
                    }));
                }

                let allInvoices = [];
                await Promise.all(receiptsToFetch.map(async (rec) => {
                    try {
                        const response = await axios.get(`${PYTHON_API_URL}/AR/get-outstanding-invoices/${rec.customerId || rec.customer_id}`, {
                            params: {
                                receipt_id: rec.receipt_id,
                                only_allocated: true
                            }
                        });
                        if (response.data && response.data.status === "success") {
                            // Add parent context
                            const invs = response.data.data.map(inv => ({
                                ...inv,
                                parent_receipt_id: rec.receipt_id
                            }));
                            allInvoices = [...allInvoices, ...invs];
                        }
                    } catch (err) {
                        console.error("Failed to fetch invoices for receipt", rec.receipt_id, err);
                    }
                }));

                setInvoiceList(allInvoices);
            } catch (error) {
                console.error("Error fetching outstanding invoices:", error);
                toast.error("Failed to fetch invoice details");
            } finally {
                setLoadingInvoices(false);
            }
        } else {
            // If not a receipt or no customer, just open modal without loading invoices
            setSelectedEntry(rowData);
            setIsPreviewOpen(true);
            setLoadingInvoices(false);
        }
    };

    const handleCombineVouchers = async () => {
        if (selectedVouchers.length < 2) {
            toast.warning("Please select at least two vouchers to combine.");
            return;
        }

        // Basic consistency check: Same Date, Party, Bank
        const first = selectedVouchers[0];
        const mismatch = selectedVouchers.some(v =>
            v.receipt_date !== first.receipt_date ||
            v.customer_id !== first.customer_id ||
            v.deposit_bank_id !== first.deposit_bank_id
        );

        if (mismatch) {
            toast.error("Combined vouchers must have the same Date, Party, and Bank Account.");
            return;
        }

        const isReceipt = selectedVouchers.every(v => v.transaction_type === "Receipt");
        if (!isReceipt) {
            toast.error("Only 'Receipt' type vouchers can be combined at this time.");
            return;
        }

        const notVerified = selectedVouchers.some(v => v.verificationStatus !== "Completed");
        if (notVerified) {
            toast.error("Only verified receipts can be combined. Please verify the receipts first.");
            return;
        }

        setIsCombining(true);
        try {
            const payload = {
                receipt_ids: selectedVouchers.map(v => v.receipt_id),
                new_reference: combineReference,
                userId: 505,
                orgId: 1,
                branchId: 1,
                userIp: "127.0.0.1"
            };

            const res = await axios.post(`${PYTHON_API_URL}/AR/combine-vouchers`, payload);
            if (res.data?.status === "success") {
                toast.success("Vouchers combined successfully! New Receipt Number generated.");
                setIsCombineModalOpen(false);
                setSelectedVouchers([]);
                setCombineReference("");
                loadEntryList();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Failed to combine vouchers.");
        } finally {
            setIsCombining(false);
        }
    };

    const handleGenerateVerification = async () => {
        if (!selectedEntry) return;
        try {
            await axios.put(`${PYTHON_API_URL}/AR/submit/${selectedEntry.receipt_id}`, {});
            toast.success("Marketing Verification Generated!");
            setIsPreviewOpen(false);
            loadEntryList();
        } catch (err) {
            toast.error("Failed to generate verification");
        }
    };

    // --- PRINT RECEIPT FUNCTIONS ---
    const handlePrintPreview = async (rowData) => {
        setPrintRecord(rowData);
        setIsPrintModalOpen(true);

        // Fetch allocated invoices for the printout to populate "Being Payment Of"
        if (rowData.customerId && parseFloat(rowData.bank_amount) > 0) {
            try {
                let receiptsToFetch = [rowData];
                if (rowData.is_combined && rowData.grouped_receipt_ids && rowData.grouped_receipt_ids.length > 0) {
                    receiptsToFetch = rowData.grouped_receipt_ids.map(id => ({
                        ...rowData,
                        receipt_id: id
                    }));
                }

                let allInvoices = [];
                await Promise.all(receiptsToFetch.map(async (rec) => {
                    try {
                        const response = await axios.get(`${PYTHON_API_URL}/AR/get-outstanding-invoices/${rec.customerId || rec.customer_id}`, {
                            params: { receipt_id: rec.receipt_id, only_allocated: true }
                        });
                        if (response.data && response.data.status === "success") {
                            allInvoices = [...allInvoices, ...response.data.data];
                        }
                    } catch (err) {
                        console.error("Failed to fetch invoices for print", rec.receipt_id, err);
                    }
                }));

                setPrintRecord(prev => ({ ...prev, fetched_invoices: allInvoices }));
            } catch (error) {
                console.error("Error fetching outstanding invoices for print:", error);
            }
        }
    };

    const getPrintBankName = () => {
        if (!printRecord) return "";
        const bId = printRecord.deposit_bank_id || printRecord.bank_id;
        // 🟢 FIX: Find the master bank entry and take only the first part (e.g. "BCA" from "BCA - Cash in Bank")
        const masterBank = bankList.find(b => b.value == bId);
        const fullName = masterBank?.label || printRecord.bankName || printRecord.bank_name || "";

        return fullName.split(' - ')[0];
    };

    const getFormattedPaymentMethod = (record) => {
        if (!record) return "";
        const via = record.bank_payment_via;
        let method = "Bank Transfer";

        if (via === 1) method = "Cheque";
        else if (via === 2) method = "Bank Transfer";
        else if (via === 3) method = "Giro";
        else if (via === 4) method = "Cash";

        const bName = getPrintBankName();

        if (via === 4) return "Cash";
        if (via === 1 && record.cheque_number) return `Cheque - ${record.cheque_number}`;

        // 🟢 FIX: Clean format "Method - Bank Name"
        return bName ? `${method} - ${bName}` : method;
    };

    const getReceiptHTML = () => {
        const invoices = parseInvoices(printRecord?.reference_no);
        const isA4 = invoices.length > 5;
        const pageSize = isA4 ? "A4 portrait" : "A5 landscape";
        const containerMaxWidth = isA4 ? "800px" : "700px";

        const receiptContent = document.getElementById("receipt-print-section").innerHTML;
        const metaContent = document.getElementById("receipt-print-meta")?.innerHTML || "";
        return `
            <html>
                <head>
                    <title>Receipt Voucher - ${printRecord?.receipt_id}</title>
                    <base href="${window.location.origin}/" />
                    <style>
                        @page { size: ${pageSize}; margin: 10mm; }
                        body { font-family: 'Times New Roman', serif; margin: 0; padding: 10px; }
                        .receipt-container {
                            border: 2px solid #1a2c5b;
                            padding: 24px 28px;
                            position: relative;
                            width: 100%;
                            max-width: ${containerMaxWidth};
                            margin: auto;
                            box-sizing: border-box;
                            min-height: ${isA4 ? '260mm' : 'auto'};
                        }
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
            const invoices = parseInvoices(printRecord?.reference_no);
            const isA4 = invoices.length > 5;

            const receiptEl = document.getElementById("receipt-print-section");
            const metaEl = document.getElementById("receipt-print-meta");

            // Create a temporary wrapper to capture both elements together
            const wrapper = document.createElement("div");
            wrapper.style.position = "absolute";
            wrapper.style.left = "-9999px";
            wrapper.style.top = "0";
            wrapper.style.background = "#fff";
            wrapper.style.padding = "10px";
            wrapper.style.width = isA4 ? "800px" : "700px";

            const receiptClone = receiptEl.cloneNode(true);
            // Ensure the clone has the correct layout
            receiptClone.style.maxWidth = isA4 ? '800px' : '700px';

            wrapper.appendChild(receiptClone);

            if (metaEl) {
                const metaClone = metaEl.cloneNode(true);
                metaClone.style.maxWidth = isA4 ? '800px' : '700px';
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

            const pdf = new jsPDF({
                orientation: isA4 ? 'portrait' : 'landscape',
                unit: 'mm',
                format: isA4 ? 'a4' : 'a5'
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

    const statusBodyTemplate = (rowData) => {
        const isPosted = rowData.is_posted;
        const statusVal = isPosted ? "Posted" : "Saved";
        const statusShort = isPosted ? "P" : "S";
        return <Tag value={statusShort} severity={getSeverity(statusVal)} />;
    };

    const verificationBodyTemplate = (rowData) => {
        if (!rowData.is_posted) return null;
        const isVerified = rowData.verificationStatus === 'Completed';
        const statusVal = isVerified ? "Completed" : "Pending";
        const statusShort = isVerified ? "C" : "MP";
        return <Tag value={statusShort} severity={getSeverity(statusVal)} />;
    };

    const viewBodyTemplate = (rowData) => {
        return (
            <div className="d-flex justify-content-center">
                <i
                    className="fas fa-eye text-secondary cursor-pointer font-size-18"
                    onClick={() => handlePreview(rowData)}
                    title="View Details"
                ></i>
            </div>
        );
    };

    const printBodyTemplate = (rowData) => {
        return (
            <div className="d-flex justify-content-center">
                <i
                    className="bx bx-printer text-secondary cursor-pointer font-size-22"
                    onClick={() => handlePrintPreview(rowData)}
                    title="Print"
                    style={{ cursor: 'pointer' }}
                ></i>
            </div>
        );
    };

    const postBodyTemplate = (rowData) => {
        const isActionable = rowData.verificationStatus === 'Completed';
        return (
            <div className="d-flex justify-content-center">
                <i
                    className={`bx bx-check-circle font-size-22 ${isActionable ? 'text-secondary cursor-pointer' : 'text-muted opacity-50'}`}
                    onClick={() => { if (isActionable) handleSubmitRow(rowData.receipt_id); }}
                    title={isActionable ? "Post" : "Verification Pending"}
                    style={{ cursor: isActionable ? 'pointer' : 'not-allowed' }}
                ></i>
            </div>
        );
    };

    const actionBodyTemplate = (rowData) => {
        const user = getUserDetails();
        const isSuperAdmin = user?.u_id === 158;
        const isPosted = rowData.is_posted === 1;

        const canEdit = !isPosted || isSuperAdmin;

        // Delete is only allowed when verify status is "MP" (posted + pending verification)
        const canDelete = isPosted && rowData.verificationStatus !== 'Completed';

        return (
            <div className="d-flex justify-content-center align-items-center gap-3">
                <i
                    className="mdi mdi-square-edit-outline"
                    style={{
                        fontSize: '1.5rem',
                        cursor: canEdit ? 'pointer' : 'not-allowed',
                        color: canEdit ? '#495057' : '#ced4da',
                        opacity: canEdit ? 1 : 0.5
                    }}
                    onClick={() => { if (canEdit) openEditModal(rowData); else handlePreview(rowData); }}
                    title={canEdit ? "Edit" : "Only Super Admin can edit posted entries"}
                ></i>
                <i
                    className="mdi mdi-delete-outline"
                    style={{
                        fontSize: '1.5rem',
                        cursor: canDelete ? 'pointer' : 'not-allowed',
                        color: canDelete ? '#e11d48' : '#ced4da',
                        opacity: canDelete ? 1 : 0.5
                    }}
                    onClick={() => { if (canDelete) handleDeleteEntry(rowData); }}
                    title={canDelete ? "Delete" : "Delete only available for MP (pending verification) entries"}
                ></i>
                <div style={{ position: 'relative', display: 'inline-block' }}>
                    <i
                        className={`bx bx-chat font-size-20 ${(rowData.is_posted && !rowData.is_combined) ? (rowData.unread_count > 0 ? 'text-danger' : 'text-dark cursor-pointer') : 'text-muted opacity-50'}`}
                        title={rowData.is_combined ? "Messaging unavailable for combined entries" : (!rowData.is_posted ? "Comments only available for posted entries" : "Comments")}
                        onClick={() => rowData.is_posted && !rowData.is_combined && handleMessageOpen(rowData)}
                        style={{ cursor: (rowData.is_posted && !rowData.is_combined) ? 'pointer' : 'default' }}
                    ></i>
                    {rowData.unread_count > 0 && !rowData.is_combined && rowData.is_posted && (
                        <Badge
                            color="danger"
                            pill
                            style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-8px',
                                fontSize: '8px',
                                padding: '2px 4px',
                                border: '1px solid white'
                            }}
                        >
                            {rowData.unread_count}
                        </Badge>
                    )}
                </div>
            </div>
        );
    };

    const customSelectStyles = {
        control: (base) => ({ ...base, minHeight: '32px', fontSize: '12px', borderColor: '#ced4da' }),
        menu: (base) => ({ ...base, fontSize: '12px', zIndex: 9999 }),
        menuPortal: (base) => ({ ...base, zIndex: 9999 })
    };

    const renderHeader = () => {
        const handleClearAll = () => {
            setGlobalFilter('');
            setFilterFromDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
            setFilterToDate(new Date());
            setFilterCurrency(null);
        };

        return (
            <div className="d-flex justify-content-between align-items-center">
                <Button color="danger" onClick={handleClearAll} className="btn-label" style={{ minWidth: '100px' }}>
                    <i className="mdi mdi-filter-off label-icon font-size-16 align-middle me-2"></i> Clear
                </Button>
                <div className="d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center gap-3 border-end pe-3">
                        <div className="d-flex align-items-center gap-1">
                            <span className="fw-bold me-1" style={{ fontSize: '11px' }}>Status:</span>
                            <Tag value="S" severity={getSeverity("Saved")} /> <small className="text-muted" style={{ fontSize: '10px' }}>Saved</small>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <Tag value="P" severity={getSeverity("Posted")} /> <small className="text-muted" style={{ fontSize: '10px' }}>Posted</small>
                        </div>
                        <div className="d-flex align-items-center gap-1 border-start ps-3">
                            <span className="fw-bold me-1" style={{ fontSize: '11px' }}>Verify:</span>
                            <Tag value="MP" severity={getSeverity("Pending")} /> <small className="text-muted" style={{ fontSize: '10px' }}>Pending</small>
                        </div>
                        <div className="d-flex align-items-center gap-1">
                            <Tag value="C" severity={getSeverity("Completed")} /> <small className="text-muted" style={{ fontSize: '10px' }}>Completed</small>
                        </div>
                    </div>
                    <input
                        className="form-control"
                        type="text"
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder="Keyword Search..."
                        style={{ width: '250px' }}
                    />
                </div>
            </div>
        );
    };

    const header = renderHeader();

    return (
        <div className="page-content bg-modern">
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="Bank Book Entries" />

                <Row className="mb-3 align-items-center g-3">
                    <Col lg="2" md="4" className="d-flex align-items-center">
                        <label className="mb-0 me-2 fw-bold text-nowrap">From</label>
                        <Flatpickr
                            className="form-control"
                            value={filterFromDate}
                            onChange={(d) => setFilterFromDate(d[0])}
                            options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }}
                        />
                    </Col>

                    <Col lg="2" md="4" className="d-flex align-items-center">
                        <label className="mb-0 me-2 fw-bold text-nowrap">To</label>
                        <Flatpickr
                            className="form-control"
                            value={filterToDate}
                            onChange={(d) => setFilterToDate(d[0])}
                            options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }}
                        />
                    </Col>

                    <Col lg="2" md="4" className="d-flex align-items-center">
                        <label className="mb-0 me-1 fw-bold text-nowrap" style={{ minWidth: '70px' }}>Currency</label>
                        <Select
                            className="flex-grow-1"
                            options={currencyList}
                            value={filterCurrency}
                            onChange={setFilterCurrency}
                            isClearable
                            placeholder="All"
                            styles={{
                                control: (base) => ({ ...base, minHeight: '38px', fontSize: '13px', borderColor: '#ced4da' }),
                                menu: (base) => ({ ...base, fontSize: '13px', zIndex: 9999 }),
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                container: (base) => ({ ...base, width: '100%' })
                            }}
                        />
                    </Col>

                    <Col lg="6" className="text-end">
                        <div className="d-flex gap-2 justify-content-end align-items-center">
                            {selectedVouchers.length >= 2 && (
                                <button type="button" className="btn btn-primary btn-label" onClick={() => setIsCombineModalOpen(true)}>
                                    <i className="bx bx-git-merge label-icon font-size-16 align-middle me-2"></i> Combine ({selectedVouchers.length})
                                </button>
                            )}
                            <button type="button" className="btn btn-success btn-label" onClick={openNewModal}>
                                <i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i> New
                            </button>
                        </div>
                    </Col>
                </Row>

                <Card className="main-card border-0">
                    <CardBody>
                        <DataTable
                            value={filteredEntries}
                            paginator
                            rows={20}
                            loading={loading}
                            globalFilter={globalFilter}
                            header={header}
                            emptyMessage="No records found."
                            showGridlines
                            className="blue-bg"
                            responsiveLayout="scroll"
                            selection={selectedVouchers}
                            onSelectionChange={(e) => setSelectedVouchers(e.value)}
                            dataKey="receipt_id"
                            rowClick={false}
                            selectionMode="checkbox"
                            sortField="date"
                            sortOrder={-1}
                        >
                            <Column selectionMode="multiple" headerStyle={{ width: '3em' }}></Column>
                            <Column field="displayDate" sortField="date" filterField="displayDate" header="Date" sortable filter style={{ width: '8%' }} />
                            <Column field="bankName" header="Bank Name" sortable filter style={{ width: '12%' }} />
                            <Column field="customerName" header="Party" sortable filter style={{ width: '20%' }} />
                            <Column
                                field="receipt_id"
                                header="Voucher"
                                sortable
                                filter
                                body={(rowData) => {
                                    if (rowData.verificationStatus !== 'Completed') {
                                        return <span title="">-</span>;
                                    }
                                    return (
                                        <span title={rowData.reference_no || ""}>
                                            {rowData.is_combined && rowData.custom_voucher_no ? rowData.custom_voucher_no : rowData.receipt_id}
                                        </span>
                                    );
                                }}
                                style={{ width: '10%' }}
                            />
                            <Column field="bank_amount" header="Amount" className="text-end" body={(d) => {
                                const val = parseFloat(d.bank_amount || 0);
                                return val === 0 ? "" : val.toLocaleString('en-US', { minimumFractionDigits: 2 });
                            }} style={{ width: '10%' }} />
                            <Column field="bank_charges" header="Bank Charges" className="text-end" body={(d) => {
                                const val = parseFloat(d.bank_charges || 0);
                                return val === 0 ? "" : val.toLocaleString('en-US', { minimumFractionDigits: 2 });
                            }} style={{ width: '10%' }} />
                            <Column header="Status" body={statusBodyTemplate} style={{ width: '5%' }} className="text-center" />
                            <Column header="Verify" body={verificationBodyTemplate} style={{ width: '5%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                            <Column header="View" body={viewBodyTemplate} style={{ width: '5%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                            <Column header="Print" body={printBodyTemplate} style={{ width: '5%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                            <Column header="Post" body={postBodyTemplate} style={{ width: '5%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                            <Column header="Action" body={actionBodyTemplate} style={{ width: '8%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                        </DataTable>
                    </CardBody>
                </Card>

                <style>{`
                    .cursor-pointer { cursor: pointer; }
                    .btn-toolbar {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        padding: 6px 16px;
                        border-radius: 4px;
                        font-size: 13px;
                        font-weight: 600;
                        transition: all 0.2s;
                        border: 1px solid transparent;
                    }
                    .btn-toolbar i { font-size: 16px; }
                    .btn-save { background: #eef2ff; color: #4b6cb7; border-color: #d1d5db; }
                    .btn-save:hover { background: #4b6cb7; color: white; }
                    .btn-post { background: #ecfdf5; color: #059669; border-color: #d1d5db; }
                    .btn-post:hover { background: #059669; color: white; }
                    .btn-cancel { background: #fff1f2; color: #e11d48; border-color: #d1d5db; }
                    .btn-cancel:hover { background: #e11d48; color: white; }
                `}</style>

                {/* --- BATCH ENTRY MODAL --- */}
                <Dialog
                    header={editMode ? "Edit Entry" : "New Bank Book Entry"}
                    visible={isModalOpen}
                    onHide={() => setIsModalOpen(false)}
                    className="modern-dialog"
                    style={{ width: '90vw', maxWidth: '1250px' }}
                    draggable={false}
                    resizable={false}
                >
                    <div className="bg-light p-3 rounded mb-3 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3" style={{ width: '55%' }}>
                            <Label className="fw-bold mb-0 text-nowrap">Bank Account <span className="text-danger">*</span>:</Label>
                            <Select
                                className="flex-grow-1"
                                options={bankList}
                                value={selectedBank}
                                onChange={(bank) => {
                                    setSelectedBank(bank);
                                    if (bank && bank.currencyId) {
                                        const matchCur = currencyList.find(c => c.value === bank.currencyId);
                                        if (matchCur) setSelectedCurrency(matchCur);
                                    }

                                    // Clear customerId for 'Bank transfer' rows if it matches the new main bank
                                    setRows(prevRows => prevRows.map(row => {
                                        if (row.type === 'Bank transfer' && Number(row.customerId) === Number(bank?.value)) {
                                            return { ...row, customerId: "" };
                                        }
                                        return row;
                                    }));
                                }}
                                placeholder="Select Bank..."
                                styles={customSelectStyles}
                                isDisabled={editMode}
                            />
                            <Label className="fw-bold mb-0 text-nowrap">Currency <span className="text-danger">*</span>:</Label>
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

                    <div className="table-responsive" style={{ maxHeight: '450px', overflowY: 'auto', borderRadius: '4px' }}>
                        <Table className="table table-bordered align-middle table-sm table-hover mb-0">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th style={{ width: '90px' }} className="text-center">Type</th>
                                    <th style={{ width: '110px' }} className="text-center">Date</th>
                                    <th style={{ width: '220px' }}>Party <span className="text-danger">*</span></th>
                                    <th style={{ width: '120px' }}>Reference No.</th>
                                    <th style={{ width: '130px' }} className="text-end">Amount</th>
                                    <th style={{ width: '130px' }}>Method</th>
                                    <th style={{ width: '100px' }} className="text-end">Charges</th>
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
                                                disabled={row.isPosted}
                                            >
                                                <option value="Receipt">Receipt</option>
                                                <option value="Payment">Payment</option>
                                                <option value="Other Income">Other Income</option>
                                                <option value="Bank Charges">Bank Charges</option>
                                                <option value="Bank transfer">Bank transfer</option>
                                                <option value="Bank Interest">Bank Interest</option>
                                                <option value="Cash Deposit">Cash Deposit</option>
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
                                                placeholder={(row.type === 'Bank Charges' || row.type === 'Bank Interest' || row.type === 'Cash Deposit') ? "Disabled" :
                                                    (row.type === 'Payment' ? "Select Supplier..." :
                                                        (row.type === 'Bank transfer' ? "Select Bank..." : "Select Customer..."))}
                                                isDisabled={row.type === 'Bank Charges' || row.type === 'Bank Interest' || row.type === 'Cash Deposit'}
                                            />
                                        </td>
                                        <td>
                                            <Input bsSize="sm" value={row.referenceNo} onChange={(e) => handleRowChange(index, 'referenceNo', e.target.value)} style={{ fontSize: '12px' }} />
                                        </td>
                                        <td>
                                            <Input
                                                type="text"
                                                bsSize="sm"
                                                value={formatWithCommas(row.amount)}
                                                onChange={(e) => handleRowChange(index, 'amount', e.target.value.replace(/,/g, ''))}
                                                className="text-end"
                                                style={{ fontSize: '12px' }}
                                            />
                                        </td>
                                        <td>
                                            <div className="d-flex flex-column gap-1">
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={row.bank_payment_via}
                                                    onChange={(e) => handleRowChange(index, 'bank_payment_via', parseInt(e.target.value))}
                                                    style={{ fontSize: '11px' }}
                                                    disabled={true}
                                                >
                                                    <option value={2}>Bank Transfer</option>
                                                    <option value={1}>Cheque</option>
                                                    <option value={3}>Giro</option>
                                                    <option value={4}>Cash</option>
                                                </select>
                                                {row.bank_payment_via === 1 && (
                                                    <Input
                                                        bsSize="sm"
                                                        placeholder="Cheque No"
                                                        value={row.cheque_number}
                                                        onChange={(e) => handleRowChange(index, 'cheque_number', e.target.value)}
                                                        style={{ fontSize: '10px', height: '24px' }}
                                                    />
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <Input
                                                type="text"
                                                bsSize="sm"
                                                value={formatWithCommas(row.bankCharges)}
                                                onChange={(e) => handleRowChange(index, 'bankCharges', e.target.value.replace(/,/g, ''))}
                                                className="text-end"
                                                style={{ fontSize: '12px' }}
                                            />
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
                            <i className="bx bx-plus me-1"></i>
                        </Button>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                        <button type="button" className="btn btn-info btn-label" onClick={() => handleBatchSubmit("SAVE")}>
                            <i className="bx bx-comment-check label-icon font-size-16 align-middle me-2"></i> {editMode ? "Update" : "Save"}
                        </button>
                        <button type="button" className="btn btn-success btn-label" onClick={() => handleBatchSubmit("POST")}>
                            <i className="bx bxs-save label-icon font-size-16 align-middle me-2"></i> Post
                        </button>
                        <button type="button" className="btn btn-danger btn-label" onClick={() => setIsModalOpen(false)}>
                            <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Close
                        </button>
                    </div>
                </Dialog>



                {/* --- OUTSTANDING INVOICES MODAL (PREVIEW) --- */}
                <Dialog
                    header="Customer Preview"
                    visible={isPreviewOpen}
                    onHide={() => setIsPreviewOpen(false)}
                    className="modern-dialog"
                    style={{ width: '850px' }}
                    draggable={false}
                    resizable={false}
                >
                    {selectedEntry && (
                        <div className="pt-2">
                            <div className="p-3 bg-light rounded mb-3">
                                {selectedEntry?.is_combined && selectedEntry?.custom_voucher_no && (
                                    <div className="mb-3 border-bottom pb-2">
                                        <span className="fw-bold text-secondary me-2">Combined Receipt No:</span>
                                        <span className="fw-bold fs-5 text-primary">
                                            {selectedEntry.custom_voucher_no}
                                        </span>
                                    </div>
                                )}
                                <Row className="align-items-center">
                                    <Col md={6} className="d-flex align-items-center">
                                        <span className="fw-bold text-secondary me-2" style={{ minWidth: '120px' }}>Receipt Amount:</span>
                                        <span className="fw-bold fs-5" style={{ color: '#B22222' }}>
                                            {selectedEntry.currencyCode} {parseFloat(selectedEntry.bank_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </span>
                                    </Col>
                                    <Col md={6} className="d-flex align-items-center">
                                        <span className="fw-bold text-secondary me-2" style={{ minWidth: '60px' }}>Party:</span>
                                        <span className="fw-bold text-dark fs-6">{selectedEntry.customerName}</span>
                                    </Col>
                                </Row>
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
                                                <th className="text-end">Invoice Amount</th>
                                                <th>Balance</th>
                                                <th>Allocated</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invoiceList.length > 0 ? (
                                                invoiceList.map((inv, idx) => (
                                                    <tr key={idx}>
                                                        <td>{inv.invoice_no}</td>
                                                        <td>{inv.invoice_date}</td>
                                                        <td className="text-end">
                                                            {parseFloat(inv.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="text-end">
                                                            {parseFloat(inv.balance_due).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="text-end fw-bold text-success">
                                                            {parseFloat(inv.allocated_here).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-muted py-3">No outstanding invoices found.</td>
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
                                        No. : {printRecord?.is_combined && printRecord?.custom_voucher_no ? printRecord.custom_voucher_no : printRecord?.receipt_id}
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
                                        {numberToWords(Math.abs(parseFloat(printRecord?.bank_amount || 0)))} {printRecord?.currencyCode === "IDR" ? "Rupiah" : (printRecord?.currencyCode || "Rupiah")} Only
                                    </div>
                                </div>

                                <div className="label" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', whiteSpace: 'nowrap' }}>Being Payment Of</div>
                                <div className="colon" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', textAlign: 'center' }}>:</div>
                                <div className="value" style={{ borderBottom: '1px solid #1a2c5b', paddingLeft: '6px', fontSize: '11px', lineHeight: '1.4' }}>
                                    {(() => {
                                        if (printRecord?.fetched_invoices && printRecord.fetched_invoices.length > 0) {
                                            return [...new Set(printRecord.fetched_invoices.map(i => i.invoice_no))].join(', ');
                                        }
                                        return parseInvoices(printRecord?.reference_no).join(', ') || "______________________";
                                    })()}
                                </div>
                            </div>

                            {/* Amount + Signature Row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '18px' }}>
                                <div style={{ width: '58%' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '14px' }}>
                                        <div className="label" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', marginRight: '8px', whiteSpace: 'nowrap' }}>
                                            Amount {printRecord?.currencyCode === 'IDR' ? 'Rp' : (printRecord?.currencyCode || 'Rp')} :
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
                                                {Math.abs(parseFloat(printRecord?.bank_amount || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Bank Charges Row (Only if charges exist) */}
                                    {parseFloat(printRecord?.bank_charges || 0) !== 0 && (
                                        <div style={{ fontSize: '10px', color: '#1a2c5b', fontStyle: 'italic', marginBottom: '8px', paddingLeft: '2px' }}>
                                            Note: Bank Charges {Math.abs(parseFloat(printRecord?.bank_charges || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                        <div className="label" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', marginRight: '6px', whiteSpace: 'nowrap' }}>
                                            Payment Method :
                                        </div>
                                        <div className="value" style={{ borderBottom: '1px solid #1a2c5b', flexGrow: 1, paddingLeft: '6px', fontSize: '11px', color: '#000' }}>
                                            {getFormattedPaymentMethod(printRecord)}
                                        </div>
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
                .btn-combine-blue { background-color: #007bff !important; border: 1px solid #0056b3 !important; }
                .btn-new-green { background-color: #6ea354; } 
                .btn-clear { display: flex; align-items: center; border: none; background: #c5645d; color: white; border-radius: 4px; padding: 0; overflow: hidden; height: 32px; width: 32px; justify-content: center; }
                .clear-icon { display: flex; align-items: center; justify-content: center; }
                .legend-label { font-size: 14px; font-weight: 700; color: #2a3142; }
                .minimal-search { border: 1px solid #ced4da; border-radius: 4px; padding: 5px 12px; font-size: 13px; width: 280px; outline: none; }
                .p-datatable-modern .p-datatable-thead > tr > th { font-size: 13px; padding: 12px; border: 1px solid #ffffff22; }
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
                .modern-dialog .p-dialog-header { padding: 0.75rem 1.25rem; border-bottom: 1px solid #eff2f7; background: #fff; border-top-left-radius: 8px; border-top-right-radius: 8px; }
                .modern-dialog .p-dialog-content { padding: 1rem 1.25rem; background: #fff; }
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
            {/* --- COMBINE VOUCHERS DIALOG --- */}
            <Dialog
                header="Combine Vouchers"
                visible={isCombineModalOpen}
                style={{ width: '450px' }}
                onHide={() => setIsCombineModalOpen(false)}
                footer={
                    <div className="d-flex justify-content-end gap-2">
                        <Button color="secondary" outline onClick={() => setIsCombineModalOpen(false)}>Cancel</Button>
                        <Button color="primary" onClick={handleCombineVouchers} disabled={isCombining}>
                            {isCombining ? <Spinner size="sm" /> : "Combine Now"}
                        </Button>
                    </div>
                }
            >
                <div className="p-2">
                    <div className="alert alert-info py-2 small mb-3">
                        <i className="bx bx-info-circle me-1"></i>
                        Combining will merge <strong>{selectedVouchers.length} vouchers</strong> into one new entry.
                        Total amount: <strong>{selectedVouchers.reduce((acc, v) => acc + parseFloat(v.bank_amount || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
                    </div>

                    <div className="mb-3">
                        <Label className="small fw-bold">Combined Reference Description (Optional)</Label>
                        <Input
                            type="text"
                            placeholder="e.g. Combined payment for..."
                            value={combineReference}
                            onChange={(e) => setCombineReference(e.target.value)}
                        />
                    </div>


                    <div className="mt-3">
                        <Label className="small fw-bold">Vouchers to be merged:</Label>
                        <ul className="small text-muted ps-3">
                            {selectedVouchers.map(v => (
                                <li key={v.receipt_id}>Voucher #{v.receipt_id} - {v.customerName} ({v.bank_amount.toLocaleString()})</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Dialog>

            {/* --- MESSAGING DIALOG --- */}
            <Dialog
                header={`${selectedEntry?.customerName || ""}`}
                visible={isMessageModalOpen}
                style={{ width: '1050px' }}
                onHide={() => setIsMessageModalOpen(false)}
                footer={
                    <div className="d-flex justify-content-end gap-2">
                        <Button color="secondary" outline onClick={() => setIsMessageModalOpen(false)}>Close</Button>
                        <Button color="primary" onClick={handleSendMessage} disabled={!newMessage.trim()}>
                            Send <i className="bx bx-send ms-1"></i>
                        </Button>
                    </div>
                }
            >
                <div className="p-2">
                    <div className="mb-3" style={{ maxHeight: '700px', overflowY: 'auto', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '8px', border: '1px solid #eee' }}>
                        {messageHistory.length === 0 ? (
                            <div className="text-center text-muted py-3 small">No previous messages.</div>
                        ) : (
                            messageHistory.map((msg, i) => (
                                <div key={i} className={`mb-2 d-flex ${msg.sender_role === 'Finance' ? 'justify-content-end' : 'justify-content-start'}`}>
                                    <div style={{
                                        maxWidth: '85%',
                                        padding: '8px 12px',
                                        borderRadius: '12px',
                                        backgroundColor: msg.sender_role === 'Finance' ? '#e1f5fe' : '#f5f5f5',
                                        fontSize: '13px',
                                        border: '1px solid #d1d1d1'
                                    }}>
                                        <div className="fw-bold mb-1" style={{ fontSize: '10px', color: '#888' }}>
                                            {msg.sender_role} • {new Date(msg.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                        </div>
                                        {msg.message_text}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    <div>
                        <Label className="small fw-bold">Reply to Marketing:</Label>
                        <Input
                            type="textarea"
                            rows="4"
                            placeholder="Enter your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            style={{ fontSize: '13px' }}
                        />
                    </div>
                </div>
            </Dialog>
        </div>
    );
};

export default AddBankBook;