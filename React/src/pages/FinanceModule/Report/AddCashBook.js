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
    Spinner
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

// Configuration
import { GetCustomerFilter } from "../../FinanceModule/service/financeapi";
import { GetBankList, GetAllCurrencies, saveOrUpdatePettyCash } from "common/data/mastersapi";
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

const formatVoucherNumber = (id, type) => {
    if (!id || id === 0 || id === "0") return "-";
    let prefix = "";
    const t = String(type || "").toLowerCase();
    
    if (t === 'receipt' || t === 'deposit') {
        prefix = "RV - ";
    } else if (t === 'payment' || t === 'Transfer to PC Book') {
        prefix = "CV - ";
    } else if (t === 'other income') {
        prefix = "RCV - ";
    }
    
    return `${prefix}${id}`;
};

// --- HELPER: Split Reference No into Claim No and Purpose ---
const splitReferenceNo = (ref, backendPurpose) => {
    if (backendPurpose) {
        let claimNo = "";
        if (ref && ref.startsWith("CLM")) {
            claimNo = ref.split(" - ")[0].trim();
        }
        return { claimNo, purpose: backendPurpose };
    }
    
    if (!ref) return { claimNo: "", purpose: "" };
    if (ref.startsWith("CLM") && ref.includes(" - ")) {
        const [claimNo, ...descParts] = ref.split(" - ");
        return { claimNo: claimNo.trim(), purpose: descParts.join(" - ").trim() };
    }
    return { claimNo: "", purpose: ref };
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

// --- HELPER: Format Number with Commas ---
const formatWithCommas = (val) => {
    if (val === null || val === undefined || val === "") return "";
    // Remove all non-numeric characters except for the decimal point
    const cleanValue = String(val).replace(/[^0-9.]/g, '');
    const parts = cleanValue.split('.');
    // Format the integer part with commas
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    // Limit to two decimal places if needed or keep as is
    return parts.join('.');
};

// --- HELPER: Get Severity for Tags ---
const getSeverity = (status) => {
    switch (status) {
        case 'Posted':
        case 'Completed':
        case 'Approved':
            return 'success';
        case 'Saved':
            return 'danger';
        case 'Pending':
            return 'info';
        case 'Discussed':
            return 'warning';
        default:
            return 'info';
    }
};

// --- BREADCRUMBS COMPONENT ---
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
    const [editingId, setEditingId] = useState(null);
    const [selectedVouchers, setSelectedVouchers] = useState([]);

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

    // --- CANCEL MODAL STATES ---
    const [cancelModal, setCancelModal] = useState({ isOpen: false, rowIndex: null, claimId: null, remark: "" });

    // --- FILTER STATES ---
    const [filterFromDate, setFilterFromDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [filterToDate, setFilterToDate] = useState(new Date());
    const [filterCurrency, setFilterCurrency] = useState(null);

    // --- CLAIM STATES (per-row cache) ---
    const [claimListCache, setClaimListCache] = useState({});  // { category: [...options] }

    const CLAIM_CATEGORIES = [
        { value: 'Claim', label: 'Claim' },
        { value: 'Cash Advance', label: 'Cash Advance' },
        { value: 'Supplier Payment', label: 'Supplier Payment' },
    ];

    const loadClaimsForCategory = async (category, force = false) => {
        // Force reload if cache exists but lacks necessary party ID fields (older data format)
        const cachedData = claimListCache[category];
        const isStale = cachedData && cachedData.length > 0 && !Object.prototype.hasOwnProperty.call(cachedData[0], 'supplier_id');

        if (!force && cachedData && !isStale) return; 

        try {
            const res = await axios.get(`${PYTHON_API_URL}/AR/cash/get-cash-claims`, {
                params: { claim_category: category }
            });
            if (res.data?.status === 'success') {
                setClaimListCache(prev => ({ ...prev, [category]: res.data.data }));
            }
        } catch (err) {
            console.error(`Error loading claims for ${category}`, err);
        }
    };

    // --- INITIAL LOAD ---
    useEffect(() => {
        const loadInitialData = async () => {
            // Load Currencies
            try {
                const currRes = await GetAllCurrencies({ currencyCode: "", currencyName: "" });
                const currData = currRes.data || currRes;
                if (Array.isArray(currData)) {
                    const options = currData.map(c => ({
                        value: c.CurrencyId,
                        label: c.CurrencyCode
                    }));
                    setCurrencyList(options);
                    const idr = options.find(o => o.label === "IDR");
                    if (idr) setSelectedCurrency(idr);
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
            const amtStr = String(row.amount || 0).replace(/,/g, '');
            const amt = parseFloat(amtStr || 0);
            if (row.type === 'Receipt' || row.type === 'Other Income' || row.type === 'Round minus') acc.receipt += amt;
            // Payment group (cashbook deduction)
            else if (row.type === 'Payment' || row.type === 'Round plus' || row.type === 'Deposit' || row.type === 'Transfer to PC Book' || row.type === 'Deposit to Bank') acc.payment += amt;
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
                const mapped = response.data.data.map(item => {
                    const isPosted = item.is_posted === 1;
                    const isVerified = item.verification_status === "Completed";
                    let amountVal = parseFloat(item.cash_amount || 0);

                    // Force CLM receipts to show as Payment
                    let transactionType = item.transaction_type;
                    if (item.reference_no && item.reference_no.startsWith("CLM") && transactionType === "Receipt") {
                        transactionType = "Payment";
                    }

                    if (transactionType === 'transfer') {
                        amountVal = Math.abs(amountVal);
                    }

                    const isPayment = ['Payment', 'Deposit', 'Round plus'].includes(transactionType);
                    const lookupList = isPayment ? supplierList : customerList;
                    
                    const name = lookupList.find(c => String(c.value) === String(item.customer_id))?.label || item.customerName || item.customer_id || "-";
                    const customerName = (name === "Unknown Customer" || name === "unknown customer") ? "-" : name;

                    return {
                        ...item,
                        transaction_type: transactionType,
                        bankName: bankList.find(b => b.value === parseInt(item.deposit_bank_id))?.label || "-",
                        customerName: customerName,
                        displayDate: item.date ? format(new Date(item.date), "dd-MMM-yyyy") : "-",
                        verificationStatus: item.verification_status,
                        is_submitted: item.is_submitted,
                        customerId: item.customer_id,
                        currencyCode: currencyList.find(c => c.value === item.currencyid)?.label || "",
                        claimCategory: item.claim_category || item.claimCategory || "",
                        ar_id: item.ar_id || item.linked_claim_id,

                        // Searchable fields for global filter
                        receiptIdStr: formatVoucherNumber(item.receipt_id, transactionType),
                        searchableAmount: amountVal === 0 ? "" : amountVal.toLocaleString('en-US', { minimumFractionDigits: 2 }),
                        statusText: isPosted ? "Posted" : "Saved",
                        verificationText: (transactionType === 'Receipt' && isPosted) ? (isVerified ? "Completed" : "Pending") : ""
                    };
                });

                // --- GROUPING LOGIC FOR COMBINED ROWS ---
                const grouped = [];
                const groupMap = {}; // hashmap to track group indexes by combine_group_id

                mapped.forEach(item => {
                    if (item.is_combined && item.combine_group_id) {
                        const gid = item.combine_group_id;
                        if (groupMap[gid] !== undefined) {
                            const masterIdx = groupMap[gid];
                            // Accumulate amount (absolute for display)
                            const currentAmt = parseFloat(String(grouped[masterIdx].cash_amount || 0));
                            const itemAmt = parseFloat(String(item.cash_amount || 0));
                            grouped[masterIdx].cash_amount = currentAmt + itemAmt;
                            
                            // Re-format searchableAmount with new total
                            let displayAmt = grouped[masterIdx].cash_amount;
                            if (grouped[masterIdx].transaction_type === 'transfer') displayAmt = Math.abs(displayAmt);
                            grouped[masterIdx].searchableAmount = Math.abs(displayAmt).toLocaleString('en-US', { minimumFractionDigits: 2 });
                        } else {
                            groupMap[gid] = grouped.length;
                            // For master row, ensure we use the custom_voucher_no if available
                            grouped.push({
                                ...item,
                                cash_amount: parseFloat(String(item.cash_amount || 0)),
                                receiptIdStr: item.custom_voucher_no ? formatVoucherNumber(item.custom_voucher_no, item.transaction_type) : item.receiptIdStr
                            });
                        }
                    } else {
                        grouped.push(item);
                    }
                });

                setEntryList(grouped);
            }
        } catch (err) { console.error("Failed to load entries", err); }
        finally { setLoading(false); }
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
                const searchLower = globalFilter.toLowerCase();
                const match = [
                    entry.customerName,
                    entry.transaction_type,
                    entry.receiptIdStr,
                    entry.reference_no,
                    entry.searchableAmount,
                    entry.statusText,
                    entry.verificationText,
                    entry.displayDate,
                    entry.currencyCode
                ].some(val => val?.toString().toLowerCase().includes(searchLower));
                
                if (!match) return false;
            }

            return true;
        });
    }, [entryList, filterFromDate, filterToDate, filterCurrency, globalFilter]);

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

    // --- HANDLERS ---
    const openCancelModal = (index, claimId) => {
        if (!claimId) {
            toast.error("Please select a Claim No. first.");
            return;
        }
        setCancelModal({ isOpen: true, rowIndex: index, claimId, remark: "" });
    };

    const confirmCancelClaim = async () => {
        if (!cancelModal.claimId) return;
        if (!cancelModal.remark.trim()) {
            toast.error("Remark is required to cancel a claim.");
            return;
        }

        try {
            await axios.put(`${PYTHON_API_URL}/AR/cash/cancel-claim/${cancelModal.claimId}`, {
                remark: cancelModal.remark
            });
            toast.success("Claim cancelled successfully!");
            
            if (cancelModal.rowIndex !== null) {
                handleRemoveRow(cancelModal.rowIndex);
            }
            
            setCancelModal({ isOpen: false, rowIndex: null, claimId: null, remark: "" });
        } catch (err) {
            console.error(err);
            toast.error("Failed to cancel claim.");
        }
    };

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
            sendNotification: false,
            claimCategory: "",
            linkedClaimId: null
        }]);
    };

    const handleRemoveRow = (index) => {
        const newRows = [...rows];
        newRows.splice(index, 1);
        setRows(newRows);
    };

    const getFilteredClaims = (row) => {
        const allClaims = claimListCache[row.claimCategory] || [];
        let filtered = [];
        
        // 1. Initial Filtering
        if (['Claim', 'Cash Advance'].includes(row.claimCategory)) {
            filtered = [...allClaims];
        } else if (!row.customerId) {
            filtered = [];
        } else {
            const targetId = String(row.customerId).trim();
            filtered = allClaims.filter(c => {
                const claimSupId = c.supplier_id != null ? String(c.supplier_id).trim() : '';
                const claimAppId = c.applicant_id != null ? String(c.applicant_id).trim() : '';
                return claimSupId === targetId || claimAppId === targetId;
            });
        }

        // 1b. Transfer-specific filtering (Show only Petty Cash claims for transfers)
        if (row.type === 'Transfer to PC Book') {
            filtered = filtered.filter(c => {
                const t = String(c.type || "").trim().toUpperCase();
                return t === 'PETTY CASH' || t === 'PC' || t === 'PETTYCASH';
            });
        }

        // 2. ENHANCED RECOVERY LOGIC
        // Try to find the claim by ID if we have it
        let currentClaim = filtered.find(c => c.value === row.linkedClaimId);

        // If not found by ID, try to find by Claim Number string inside the referenceNo
        if (!currentClaim && row.referenceNo && row.referenceNo.startsWith("CLM")) {
            const claimNo = row.referenceNo.split(" - ")[0].trim();
            currentClaim = filtered.find(c => c.label.includes(claimNo));
            
            // If found by label, we effectively "recover" the missing ID
            if (currentClaim && !row.linkedClaimId) {
                row.linkedClaimId = currentClaim.value;
            }
        }

        // 3. AGGRESSIVE FALLBACK: If still not in the list (meaning the backend filtered it out),
        // we extract the claim number from the description and inject a Virtual Option.
        if (!currentClaim && row.referenceNo && row.referenceNo.startsWith("CLM")) {
            const claimNoPart = row.referenceNo.split(" - ")[0].trim();
            const virtualValue = row.linkedClaimId || ("VIRTUAL_" + claimNoPart);
            
            if (!filtered.some(c => c.value === virtualValue)) {
                filtered.push({
                    value: virtualValue,
                    label: row.referenceNo // Use the full existing description as the label
                });
            }
        }

        return filtered;
    };

    // Helper to switch options based on type and claim category
    const getOptionsForType = (type, claimCategory) => {
        if (['Receipt', 'Other Income', 'Round minus'].includes(type)) return customerList;
        if (['Payment', 'Round plus', 'Deposit'].includes(type)) {
            return supplierList;
        }
        if (type === 'Transfer to PC Book') return []; // No party selection for transfer
        if (type === 'Deposit to Bank') return bankList; // Use Bank List for deposits
        return [];
    };

    const handleRowChange = (index, field, value) => {
        const newRows = [...rows];

        // 1. Reset selections if type changes
        if (field === 'type' && newRows[index].type !== value) {
            newRows[index]['customerId'] = "";
            newRows[index]['salesPersonId'] = "";
            newRows[index]['claimCategory'] = "";
            newRows[index]['linkedClaimId'] = null;
            newRows[index]['referenceNo'] = "";
            newRows[index]['amount'] = "";
            
            // Auto-set claimCategory to "Claim" if transfer or Payment is selected
            if (value === 'Transfer to PC Book' || value === 'Payment') {
                newRows[index]['claimCategory'] = 'Claim';
                loadClaimsForCategory('Claim', true); // Force refresh
            }
        }

        // 2. Load claims and clear data when claim category changes
        if (field === 'claimCategory' && newRows[index].claimCategory !== value) {
            newRows[index]['linkedClaimId'] = null;
            newRows[index]['referenceNo'] = "";
            newRows[index]['amount'] = "";
            
            if (value) {
                loadClaimsForCategory(value);
                // Clear party if Cash Advance or Claim is selected for a Payment
                if (['Cash Advance', 'Claim'].includes(value) && newRows[index].type === 'Payment') {
                    newRows[index]['customerId'] = "";
                } else {
                    newRows[index]['customerId'] = "";
                }
            }
        }

        // 3. Reset claim data if Party changes
        if (field === 'customerId' && newRows[index].customerId !== value) {
            newRows[index]['linkedClaimId'] = null;
            newRows[index]['referenceNo'] = "";
            newRows[index]['amount'] = "";
        }

        // 4. Auto-fill from selected claim
        if (field === 'linkedClaimId' && value) {
            const cat = newRows[index].claimCategory;
            const claimOpt = (claimListCache[cat] || []).find(c => c.value === value);
            if (claimOpt) {
                newRows[index]['referenceNo'] = claimOpt.label;

                if (claimOpt.amount) {
                    newRows[index]['amount'] = formatWithCommas(claimOpt.amount);
                }
            }
        }

        // 5. Normal input handling with amount formatting
        if (field === 'amount') {
            newRows[index][field] = formatWithCommas(value);
        } else {
            newRows[index][field] = value;
        }

        // Auto-populate Sales Person only for Customer-based types
        const isCustomerType = ['Receipt', 'Other Income', 'Round minus'].includes(newRows[index].type);
        if (field === 'customerId' && isCustomerType) {
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

    const getInitialRow = () => ({
        id: Date.now(),
        rowId: 0,
        type: "Receipt",
        date: new Date(),
        customerId: "",
        referenceNo: "",
        amount: "",
        salesPersonId: "",
        sendNotification: false,
        claimCategory: "",
        linkedClaimId: null
    });

    const openNewModal = () => {
        setEditMode(false);
        setEditingId(null);
        const idr = currencyList.find(c => c.label === "IDR");
        setSelectedCurrency(idr || null);
        setTotals({ receipt: 0, payment: 0 });
        setRows([getInitialRow()]);
        loadClaimsForCategory('Claim', true); // Ensure claims are fresh
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
        const amount = parseFloat(rowData.cash_amount);
        const type = amount < 0 ? "Payment" : "Receipt";

        // Set currency from row data
        setSelectedCurrency(currencyList.find(c => c.value === rowData.currencyid) || null);

        setRows([{
            id: Date.now(),
            rowId: rowData.receipt_id,
            type: rowData.transaction_type || type,
            date: new Date(rowData.date || new Date()),
            customerId: rowData.customer_id,
            referenceNo: rowData.reference_no,
            amount: Math.abs(amount),
            salesPersonId: rowData.sales_person_id,
            sendNotification: rowData.send_notification,
            claimCategory: rowData.claimCategory || rowData.claim_category || "",
            linkedClaimId: rowData.ar_id || rowData.linked_claim_id || rowData.linkedClaimId || null,
            isPosted: isPosted
        }]);

        if (rowData.claimCategory) {
            loadClaimsForCategory(rowData.claimCategory);
        }

        setIsModalOpen(true);
    };

    const handleBatchSubmit = async (mode) => {
        if (rows.length === 0) {
            toast.error("Please add at least one transaction row");
            return;
        }

        if (!selectedCurrency) {
            toast.error("Please select a Currency");
            return;
        }

        for (let i = 0; i < rows.length; i++) {
            // Skip Party validation for types where it's not applicable
            const isOptionalParty = 
                ['Claim', 'Cash Advance'].includes(rows[i].claimCategory) || 
                ['transfer', 'Other Income', 'Round plus', 'Round minus', 'Deposit'].includes(rows[i].type);

            if (!isOptionalParty && !rows[i].customerId) {
                toast.error(`Please select a Party for row ${i + 1}`);
                return;
            }
            
            // Validate Claim No for transfer
            if (rows[i].type === 'Transfer to PC Book' && !rows[i].linkedClaimId) {
                toast.error(`Please select a Claim No. for transfer in row ${i + 1}`);
                return;
            }
        }

        try {
            const isPosted = mode === "POST";
            const headerPayload = rows.map(row => {
                // Calculate amount (Negative for Cash Book credit/deduction items)
                const amtStr = String(row.amount || 0).replace(/,/g, '');
                let finalAmount = Math.abs(parseFloat(amtStr || 0));
                
                if (['Payment', 'Round plus', 'Deposit', 'Transfer to PC Book', 'Deposit to Bank'].includes(row.type)) {
                    finalAmount = -finalAmount;
                }

                return {
                    receipt_id: row.rowId || 0,
                    customer_id: parseInt(row.customerId || 0),
                    cash_amount: finalAmount,
                    bank_amount: row.type === 'Deposit to Bank' ? Math.abs(parseFloat(amtStr || 0)) : 0,
                    deposit_bank_id: row.type === 'Deposit to Bank' ? String(row.customerId || "0") : "0",
                    currencyid: selectedCurrency?.value || 3,
                    receipt_date: format(row.date, "yyyy-MM-dd"),
                    reference_no: row.referenceNo,
                    sales_person_id: row.salesPersonId ? parseInt(row.salesPersonId) : null,
                    send_notification: row.sendNotification,
                    transaction_type: row.type,
                    claim_category: row.claimCategory,
                    linked_claim_id: row.linkedClaimId || null,
                    ar_id: row.linkedClaimId || null, // Standard field name
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
                const idToUpdate = editingId || rows[0]?.rowId;
                const endpoint = `${PYTHON_API_URL}/AR/cash/update/${idToUpdate}`;
                await axios.put(endpoint, payload);
            } else {
                const endpoint = `${PYTHON_API_URL}/AR/cash/create`;
                await axios.post(endpoint, payload);
            }

            // If posting and there are transfer rows, create petty cash records (debit) so PCBook shows them
            if (isPosted) {
                const transferRows = rows.filter(r => r.type === 'Transfer to PC Book');
                for (const tr of transferRows) {
                    try {
                        // Build petty cash header payload. Keep minimal required fields.
                        const amtStr = String(tr.amount || 0).replace(/,/g, '');
                        const amt = Math.abs(parseFloat(amtStr || 0)) || 0;

                        // Resolve currency id and code from selectedCurrency (fallback to 3/IDR)
                        const curId = selectedCurrency?.value || selectedCurrency?.CurrencyId || 3;
                        const curCode = (selectedCurrency?.label || selectedCurrency?.CurrencyCode || "IDR").toString();

                        // Compute AmountIDR.
                        // TODO: if you have an exchange rate available, multiply amt by exchangeRate here.
                        const amountidr = curCode === "IDR" ? amt : amt; // currently no rate available => keep same value

                        // Debug: log important values to help trace why PC record may lack currency/amount
                        console.log("Creating petty cash for transfer:", {
                            reference: tr.referenceNo,
                            amount_raw: tr.amount,
                            parsed_amount: amt,
                            currency_selected: selectedCurrency,
                            currency_id: curId,
                            currency_code: curCode,
                            amount_idr: amountidr
                        });

                        const pettyHeader = {
                            // Keep multiple common variants so backend receives expected keys
                            VoucherNo: tr.referenceNo || "",
                            ExpDate: format(tr.date, "yyyy-MM-dd"),
                            ExpenseType: null,
                            ExpenseDescription: tr.referenceNo || "",
                            BillNumber: "",
                            ExpenseFileName: "",
                            ExpenseFilePath: "",
                            FileUpdatedDate: new Date().toISOString(),
                            Who: "Payer",
                            Whom: (tr.customerId ? (customerList.find(c => String(c.value) === String(tr.customerId))?.label || "") : (tr.referenceNo || "")),
                            // Provide amount fields in multiple common names
                            Amount: amt,
                            AmountIDR: amountidr,
                            amount: amt,
                            amountidr: amountidr,
                            // Currency fields in common variants
                            currencyid: curId,
                            currencycode: curCode,
                            CurrencyId: curId,
                            CurrencyCode: curCode,
                            IsSubmitted: true,
                            OrgId: 1,
                            BranchId: 1,
                            IsActive: true,
                            category_id: 1, // Change to 1 for Debit (Receipt) in PC
                            userid: 505,
                            CreatedIP: "127.0.0.1",
                            ModifiedIP: "127.0.0.1"
                        };

                        const pettyPayload = { Header: pettyHeader };

                        // Use helper from common/data/mastersapi which wraps the API call
                        await saveOrUpdatePettyCash(pettyPayload, false);
                    } catch (pcErr) {
                        // Don't break the whole operation if petty creation fails - log for debugging
                        console.error("Failed to create petty cash for transfer row", tr, pcErr);
                    }
                }
            }

            toast.success(`${rows.length} Entries ${isPosted ? 'Posted' : 'Saved'} Successfully`);

            // Stay in the modal and reset it for the next entry (for both new and edit modes)
            setRows([getInitialRow()]);
            setTotals({ receipt: 0, payment: 0 });
            setEditMode(false);
            setEditingId(null);
            // We keep the selectedCurrency as the user might want to enter multiple records for the same currency

            loadEntryList();
        } catch (err) {
            console.error(err);
            toast.error("Error saving entries");
        }
    };

    const handleSubmitRow = async (id) => {
        try {
            const entry = entryList.find(e => e.receipt_id === id);
            const isReceipt = entry?.transaction_type === 'Receipt';
            
            await axios.put(`${PYTHON_API_URL}/AR/cash/submit/${id}`, {});
            toast.success(isReceipt ? "Marketing Verification Generated!" : "Posted to Cash Book Successfully!");
            // Clear claim cache to force re-fetch of now-processed claims
            setClaimListCache({});
            loadEntryList();
        } catch (err) {
            toast.error("Process failed");
        }
    };

    const handleFinalizePost = async (id) => {
        try {
            await axios.put(`${PYTHON_API_URL}/AR/cash/post/${id}`, {});
            toast.success("Posted to Cash Book successfully!");
            // Clear claim cache to force re-fetch of now-processed claims
            setClaimListCache({});
            loadEntryList();
        } catch (err) {
            toast.error("Final post failed");
        }
    };

    const handleCombineVouchers = async () => {
        if (selectedVouchers.length < 2) {
            toast.warning("Please select at least two vouchers to combine.");
            return;
        }

        // Basic consistency check: Same Type, Party, Currency
        const first = selectedVouchers[0];
        const mismatch = selectedVouchers.some(v =>
            v.customer_id !== first.customer_id ||
            v.transaction_type !== first.transaction_type ||
            v.currencyid !== first.currencyid
        );

        if (mismatch) {
            toast.error("Combined vouchers must have the same Type, Party, and Currency.");
            return;
        }

        // Status checks
        const invalidStatus = selectedVouchers.some(v => {
            if (v.transaction_type === 'Receipt') {
                return v.verificationStatus !== "Completed";
            } else {
                return v.is_posted === 1;
            }
        });

        if (invalidStatus) {
            toast.error("Receipts must be Verified. Other types must be in 'Saved' status (not posted).");
            return;
        }

        try {
            const voucherNums = selectedVouchers.map(v => v.receiptIdStr).join(", ");
            const reference = `combined - ${voucherNums}`;
            const user = getUserDetails();

            const payload = {
                receipt_ids: selectedVouchers.map(v => v.receipt_id),
                new_reference: reference,
                userId: user?.u_id || 505,
                orgId: 1,
                branchId: 1,
                userIp: "127.0.0.1"
            };

            const res = await axios.post(`${PYTHON_API_URL}/AR/cash/combine-vouchers`, payload);
            if (res.data?.status === "success") {
                toast.success("Vouchers combined successfully!");
                setSelectedVouchers([]);
                loadEntryList();
            }
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.detail || "Failed to combine vouchers.");
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
            await axios.put(`${PYTHON_API_URL}/AR/cash/submit/${selectedEntry.receipt_id}`, {});
            toast.success("Marketing Verification Generated!");
            
            // Clear claim cache to force re-fetch of now-processed claims
            setClaimListCache({});
            
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
        const isPayment = printRecord?.transaction_type === 'Payment';
        const receiptContent = document.getElementById("receipt-print-section").innerHTML;
        const metaContent = document.getElementById("receipt-print-meta")?.innerHTML || "";
        
        return `
            <html>
                <head>
                    <title>${isPayment ? 'Payment' : 'Receipt'} Voucher - ${printRecord?.receipt_id}</title>
                    <base href="${window.location.origin}/" />
                    <style>
                        @page { size: A5 landscape; margin: 5mm; }
                        body { 
                            font-family: ${isPayment ? 'Arial, sans-serif' : "'Times New Roman', serif"}; 
                            margin: 0; 
                            padding: 8px; 
                            ${isPayment ? 'font-size: 11.5px; zoom: 0.95;' : ''}
                        }
                        .receipt-container { 
                            border: ${isPayment ? 'none' : '2px solid #1a2c5b'}; 
                            padding: ${isPayment ? '0' : '18px 22px'}; 
                            position: relative; 
                            width: 100%; 
                            max-width: 700px; 
                            margin: auto; 
                            box-sizing: border-box; 
                        }
                        .header { 
                            display: flex; 
                            align-items: center; 
                            border-bottom: ${isPayment ? '0.5px solid #000' : '2px solid #1a2c5b'}; 
                            padding-bottom: 6px; 
                            margin-bottom: 12px; 
                        }
                        .logo { width: ${isPayment ? '90px' : '70px'}; margin-right: 15px; }
                        .company-details h2 { 
                            margin: 0; 
                            color: ${isPayment ? '#000' : '#1a2c5b'}; 
                            font-size: ${isPayment ? '16px' : '16px'}; 
                            font-weight: bold; 
                            text-transform: uppercase; 
                            letter-spacing: 0.5px; 
                        }
                        .company-details p { margin: 1px 0; font-size: 12px; color: ${isPayment ? '#000' : '#333'}; }
                        .receipt-no { position: absolute; top: 18px; right: 22px; font-size: 14px; color: #d92525; font-weight: bold; font-family: monospace; text-align: right; }
                        .running-system { font-size: 8px; color: #666; font-style: italic; margin-top: 2px; }
                        .receipt-title { 
                            text-align: center; 
                            font-size: ${isPayment ? '18px' : '15px'}; 
                            font-weight: bold; 
                            margin: 10px 0 18px 0; 
                            color: ${isPayment ? '#000' : '#1a2c5b'}; 
                            letter-spacing: ${isPayment ? '2px' : '1.5px'}; 
                            ${isPayment ? 'text-transform: uppercase;' : 'text-decoration: underline double;' } 
                        }
                        .label { font-weight: bold; color: ${isPayment ? '#000' : '#1a2c5b'}; font-size: 11px; white-space: nowrap; }
                        .colon { font-weight: bold; color: ${isPayment ? '#000' : '#1a2c5b'}; font-size: 11px; text-align: center; }
                        .value { border-bottom: 1px solid #1a2c5b; padding-left: 6px; font-size: 11px; position: relative; min-height: 16px; color: #000; }
                        .slanted-box { border: 1px solid #1a2c5b; transform: skewX(-20deg); padding: 4px 6px; background: #fff; }
                        .print-meta { max-width: 700px; margin: 2px auto 0 auto; text-align: right; font-size: 6px; color: #aaa; padding-top: 1px; }
                        
                        /* Payment Voucher Specific - Matching PPP.js */
                        .pv-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; border: 1px solid #000; }
                        .pv-table th { background-color: #f2f2f2; color: #000; font-weight: bold; padding: 6px 8px; border: 1px solid #000; text-align: center; }
                        .pv-table td { padding: 6px 8px; border: 1px solid #000; vertical-align: top; color: #000; }
                        .pv-total-row td { font-weight: bold; background-color: #f2f2f2; }
                        .two-col-table { width: 100%; border-collapse: separate; font-size: 14px; border: none; margin-bottom: 20px; }
                        .two-col-table td { border: none; padding: 4px 2px; vertical-align: top; }
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
            const fileName = printRecord?.transaction_type === 'Payment' ? 'Payment_Voucher' : 'Receipt_Voucher';
            pdf.save(`${fileName}_${printRecord?.receipt_id || 'receipt'}.pdf`);

            toast.success("Receipt downloaded successfully!");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download receipt");
        }
    };

    const statusBodyTemplate = (rowData) => {
        const isPosted = rowData.is_posted === 1;
        const statusVal = isPosted ? "Posted" : "Saved";
        const statusShort = isPosted ? "P" : "S";
        return <Tag value={statusShort} severity={getSeverity(statusVal)} />;
    };

    const verificationBodyTemplate = (rowData) => {
        if (rowData.transaction_type !== 'Receipt' || rowData.is_posted !== 1) return null;
        const isVerified = rowData.verificationStatus === "Completed";
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
        const isReceipt = rowData.transaction_type === 'Receipt';
        const isPrintable = isReceipt 
            ? rowData.verificationStatus === 'Completed' 
            : rowData.is_posted === 1;

        return (
            <div className="d-flex justify-content-center">
                <i
                    className={`bx bx-printer font-size-22 ${isPrintable ? 'text-secondary cursor-pointer' : 'text-muted opacity-50'}`}
                    onClick={() => isPrintable && handlePrintPreview(rowData)}
                    title={isPrintable ? "Print" : (isReceipt ? "Pending Verification" : "Pending Posting")}
                    style={{ cursor: isPrintable ? 'pointer' : 'not-allowed' }}
                ></i>
            </div>
        );
    };

    const postBodyTemplate = (rowData) => {
        const isReceipt = rowData.transaction_type === 'Receipt';
        const isSaved = rowData.is_posted === 0;
        
        const isReceiptReady = isReceipt && rowData.is_posted === 1 && rowData.verificationStatus === 'Completed' && rowData.is_submitted !== 1;
        const isOtherSaved = !isReceipt && isSaved;
        const isCombinedSaved = rowData.is_combined && isSaved;

        const isActionable = isOtherSaved || isReceiptReady || isCombinedSaved;

        const handleAction = () => {
            if (!isActionable) return;
            // Combined entries always use handleFinalizePost which is now group-aware
            if (rowData.is_combined || isReceiptReady) {
                handleFinalizePost(rowData.receipt_id);
            } else {
                handleSubmitRow(rowData.receipt_id);
            }
        };

        const getTooltip = () => {
            if (rowData.is_submitted === 1 || (rowData.is_posted === 1 && rowData.transaction_type !== 'Receipt')) return "Already Posted";
            if (isActionable) return "Post to Cash Book";
            return "Pending Verification (P+C required)";
        };

        return (
            <div className="d-flex justify-content-center">
                <i
                    className={`bx bx-check-circle font-size-22 ${isActionable ? 'text-secondary cursor-pointer' : 'text-muted opacity-50'}`}
                    onClick={handleAction}
                    title={getTooltip()}
                    style={{ cursor: isActionable ? 'pointer' : 'not-allowed' }}
                ></i>
            </div>
        );
    };

    const actionBodyTemplate = (rowData) => {
        const user = getUserDetails();
        const isSuperAdmin = user?.u_id === 158;
        const isPosted = rowData.transaction_type === 'Receipt' ? (rowData.is_submitted === 1) : (rowData.is_posted === 1);

        // Disable edit for combined entries or posted entries
        const canEdit = (!isPosted && !rowData.is_combined) || isSuperAdmin;

        return (
            <div className="d-flex justify-content-center">
                <i
                    className={`mdi mdi-square-edit-outline ${canEdit ? '' : 'text-muted opacity-50'}`}
                    style={{ fontSize: '1.5rem', cursor: canEdit ? 'pointer' : 'not-allowed', color: canEdit ? '#495057' : undefined }}
                    onClick={() => canEdit && openEditModal(rowData)}
                    title={canEdit ? "Edit" : "Only Super Admin can edit posted entries"}
                ></i>
            </div>
        );
    };

    return (
        <div className="page-content bg-modern">
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="Cash Book Entry" />
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
                                <button type="button" className="btn btn-primary btn-label" onClick={handleCombineVouchers}>
                                    <i className="bx bx-git-merge label-icon font-size-16 align-middle me-2"></i> Combine ({selectedVouchers.length})
                                </button>
                            )}
                            <button type="button" className="btn btn-success" onClick={openNewModal}>
                                <i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i>New
                            </button>
                        </div>
                    </Col>
                </Row>

                <Card className="main-card border-0">
                    <CardBody>
                        <DataTable
                            value={filteredEntries}
                            sortField="date"
                            sortOrder={1}
                            paginator
                            rows={20}
                            loading={loading}
                            globalFilter={globalFilter}
                            globalFilterFields={["displayDate", "transaction_type", "receiptIdStr", "customerName", "reference_no", "searchableAmount", "statusText", "verificationText", "currencyCode"]}
                            className="blue-bg"
                            responsiveLayout="scroll"
                            showGridlines
                            filterDisplay="menu"
                            filter
                            header={header}
                            emptyMessage="No records found."
                            selection={selectedVouchers}
                            onSelectionChange={(e) => setSelectedVouchers(e.value)}
                            dataKey="receipt_id"
                            rowClick={false}
                            selectionMode="checkbox"
                        >
                            <Column selectionMode="multiple" headerStyle={{ width: '3em' }}></Column>
                            <Column field="displayDate" sortField="date" header="Date" sortable filter filterPlaceholder="Search Date" style={{ width: '10%' }} />
                            <Column field="transaction_type" header="Type" sortable filter filterPlaceholder="Search Type" style={{ width: '10%' }} />
                            <Column 
                                field="receiptIdStr" 
                                header="Voucher Number" 
                                sortable 
                                filter 
                                filterPlaceholder="Search Voucher" 
                                body={(rowData) => (
                                    <span title={rowData.reference_no || ""}>
                                        {rowData.is_combined && rowData.custom_voucher_no ? rowData.custom_voucher_no : rowData.receiptIdStr}
                                    </span>
                                )}
                                style={{ width: '10%' }} 
                            />
                            <Column 
                                header="Party" 
                                body={(rowData) => {
                                    if (rowData.transaction_type === 'Deposit to Bank') {
                                        const bank = bankList.find(b => parseInt(b.value) === parseInt(rowData.customerId || rowData.customer_id));
                                        return bank ? bank.label : (rowData.customerName || "-");
                                    }
                                    return (rowData.customerName === "Unknown Customer" || rowData.customerName === "unknown customer") ? "-" : (rowData.customerName || "-");
                                }}
                                sortable filter filterPlaceholder="Search Party" style={{ width: '25%' }} 
                            />
                            <Column field="reference_no" header="Description" sortable filter filterPlaceholder="Search Desc" style={{ width: '10%' }} />
                            <Column field="cash_amount" header="Amount" sortable className="text-end" body={(d) => {
                                const val = parseFloat(d.cash_amount || 0);
                                return val === 0 ? "" : val.toLocaleString('en-US', { minimumFractionDigits: 2 });
                            }} style={{ width: '10%' }} />
                            <Column field="is_posted" header="Status" sortable body={statusBodyTemplate} style={{ width: '6%' }} className="text-center" />
                            <Column field="verificationStatus" header="Verify" sortable body={verificationBodyTemplate} style={{ width: '6%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                            <Column header="View" body={viewBodyTemplate} style={{ width: '6%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                            <Column header="Print" body={printBodyTemplate} style={{ width: '6%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                            <Column header="Post" body={postBodyTemplate} style={{ width: '6%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                            <Column header="Action" body={actionBodyTemplate} style={{ width: '6%' }} className="text-center" headerStyle={{ textAlign: 'center' }} />
                        </DataTable>
                    </CardBody>
                </Card>

                {/* --- BATCH ENTRY MODAL --- */}
                <Dialog
                    header={editMode ? "Edit Entry" : "New Cash Book Entry"}
                    visible={isModalOpen}
                    onHide={() => setIsModalOpen(false)}
                    className="modern-dialog"
                    style={{ width: '98vw', maxWidth: '1600px' }}
                    draggable={false}
                    resizable={false}
                >
                    <div className="bg-light p-3 rounded mb-3 d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center gap-3" style={{ width: '35%' }}>
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

                    <div className="table-responsive" style={{ maxHeight: '450px', overflowY: 'auto', border: '1px solid #e9ecef', borderRadius: '4px' }}>
                        <Table className="table table-bordered align-middle table-sm table-hover mb-0">
                            <thead className="table-light sticky-top">
                                <tr>
                                    <th style={{ width: '90px' }} className="text-center">Type</th>
                                    <th style={{ width: '110px' }} className="text-center">Date</th>
                                    <th style={{ width: '110px' }}>Claim Category</th>
                                    <th style={{ width: '170px' }}>Party <span className="text-danger">*</span></th>
                                    <th style={{ width: '180px' }}>Claim No.</th>
                                    <th style={{ width: '110px' }}>Description</th>
                                    <th style={{ width: '110px' }} className="text-end">Amount</th>
                                    <th style={{ width: '140px' }}>Sales Person</th>
                                    <th style={{ width: '45px' }} className="text-center">Del</th>
                                    <th style={{ width: '60px' }} className="text-center">Cancel</th>
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
                                                <option value="Transfer to PC Book">Transfer to PC Book</option>
                                                <option value="Other Income">Other Income</option>
                                                <option value="Round plus">Round plus</option>
                                                <option value="Round minus">Round minus</option>
                                                <option value="Deposit">Deposit</option>
                                                <option value="Deposit to Bank">Deposit to Bank</option>
                                            </select>
                                        </td>
                                        <td>
                                            <Flatpickr
                                                className="form-control form-control-sm"
                                                value={row.date}
                                                onChange={(date) => handleRowChange(index, 'date', date[0])}
                                                options={{ dateFormat: "d-M-Y" }}
                                                style={{ fontSize: '12px', backgroundColor: row.isPosted ? '#e9ecef' : 'white' }}
                                                disabled={row.isPosted}
                                            />
                                        </td>
                                        {/* Claim Category — shown for Payment and transfer */}
                                        <td>
                                            <Select
                                                options={CLAIM_CATEGORIES}
                                                value={CLAIM_CATEGORIES.find(c => c.value === row.claimCategory) || null}
                                                onChange={(opt) => handleRowChange(index, 'claimCategory', opt?.value || '')}
                                                styles={customSelectStyles}
                                                isDisabled={row.type !== 'Payment'}
                                                menuPortalTarget={document.body}
                                                placeholder={row.type === 'Payment' ? "Select..." : (row.type === 'Transfer to PC Book' ? "Claim" : "")}
                                            />
                                        </td>
                                        <td>
                                            <Select
                                                options={getOptionsForType(row.type, row.claimCategory)}
                                                value={
                                                    (['Transfer to PC Book', 'Other Income', 'Round plus', 'Round minus', 'Deposit'].includes(row.type) || 
                                                     (row.type === 'Payment' && ['Cash Advance', 'Claim'].includes(row.claimCategory)))
                                                    ? null 
                                                    : getOptionsForType(row.type, row.claimCategory).find(c => c.value === row.customerId) || null
                                                }
                                                onChange={(opt) => handleRowChange(index, 'customerId', opt?.value)}
                                                styles={customSelectStyles}
                                                isDisabled={
                                                    row.isPosted || 
                                                    ['Transfer to PC Book', 'Other Income', 'Round plus', 'Round minus', 'Deposit'].includes(row.type) || 
                                                    (row.type === 'Payment' && ['Cash Advance', 'Claim'].includes(row.claimCategory))
                                                }
                                                menuPortalTarget={document.body}
                                                placeholder="Select..."
                                            />
                                        </td>
                                        {/* Claim No — enabled for Payment with category or transfer with Claim category */}
                                        <td>
                                            <Select
                                                options={getFilteredClaims(row)}
                                                value={
                                                    getFilteredClaims(row).find(c => c.value === row.linkedClaimId) || 
                                                    getFilteredClaims(row).find(c => row.referenceNo && c.label.includes(row.referenceNo.split(' - ')[0])) ||
                                                    null
                                                }
                                                onChange={(opt) => handleRowChange(index, 'linkedClaimId', opt?.value)}
                                                styles={customSelectStyles}
                                                isDisabled={
                                                    ['Receipt', 'Other Income', 'Round minus', 'Round plus', 'Deposit', 'Deposit to Bank'].includes(row.type) ||
                                                    (row.type === 'Payment' && !row.claimCategory) ||
                                                    (row.type === 'Payment' && row.claimCategory === 'Supplier Payment' && getFilteredClaims(row).length === 0) ||
                                                    (row.type === 'Transfer to PC Book' && row.claimCategory !== 'Claim')
                                                }
                                                menuPortalTarget={document.body}
                                                placeholder={(['Payment', 'Transfer to PC Book'].includes(row.type) && row.claimCategory) ? (getFilteredClaims(row).length > 0 ? "Select Claim..." : "No Claims Found") : ""}
                                            />
                                        </td>
                                        <td>
                                            <Input bsSize="sm" value={row.referenceNo} onChange={(e) => handleRowChange(index, 'referenceNo', e.target.value)} style={{ fontSize: '12px' }} />
                                        </td>
                                        <td>
                                            <Input type="text" bsSize="sm" value={row.amount} onChange={(e) => handleRowChange(index, 'amount', e.target.value)} className="text-end" style={{ fontSize: '12px' }} disabled={row.claimCategory === 'Supplier Payment'} />
                                        </td>
                                        <td>
                                            <Select
                                                options={salesList}
                                                value={salesList.find(c => String(c.value) === String(row.salesPersonId))}
                                                onChange={(opt) => handleRowChange(index, 'salesPersonId', opt?.value)}
                                                styles={customSelectStyles}
                                                menuPortalTarget={document.body}
                                                placeholder="Select..."
                                                isDisabled={!['Receipt'].includes(row.type)}
                                            />
                                        </td>
                                        <td className="text-center">
                                            <i className="bx bx-trash text-danger cursor-pointer" onClick={() => handleRemoveRow(index)}></i>
                                        </td>
                                        <td className="text-center">
                                            {(row.type === 'Payment' || row.type === 'transfer') && ['Claim', 'Cash Advance'].includes(row.claimCategory) && (
                                                <i 
                                                    className="bx bx-x-circle text-warning cursor-pointer fs-5 align-middle" 
                                                    onClick={() => openCancelModal(index, row.linkedClaimId)}
                                                    title="Cancel Claim"
                                                ></i>
                                            )}
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

                    <div className="d-flex justify-content-end gap-2 border-top pt-3 mt-3">
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
                    <ModalHeader toggle={() => setIsPrintModalOpen(false)}>Voucher Preview</ModalHeader>
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
                            <div className="header" style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                borderBottom: printRecord?.transaction_type === 'Payment' ? '0.5px solid #000' : '2px solid #1a2c5b', 
                                paddingBottom: '6px', 
                                marginBottom: '12px' 
                            }}>
                                <div className="logo" style={{ width: ['Payment', 'Transfer to PC Book'].includes(printRecord?.transaction_type) ? '90px' : '70px', marginRight: '15px', flexShrink: 0 }}>
                                    <img src={logo} alt="BTG Logo" style={{ width: '100%' }} />
                                </div>
                                <div className="company-details" style={{ flexGrow: 1 }}>
                                    <h2 style={{ 
                                        margin: 0, 
                                        color: printRecord?.transaction_type === 'Payment' ? '#000' : '#1a2c5b', 
                                        fontSize: '16px', 
                                        fontWeight: 'bold', 
                                        textTransform: 'uppercase', 
                                        letterSpacing: '0.5px' 
                                    }}>PT. BATAM TEKNOLOGI GAS</h2>
                                    <p style={{ margin: '1px 0', fontSize: '12px', color: ['Payment', 'Transfer to PC Book'].includes(printRecord?.transaction_type) ? '#000' : '#333' }}>Jalan Brigjen Katamso KM. 3, Tanjung Uncang, Batam - Indonesia</p>
                                    <p style={{ margin: '1px 0', fontSize: '12px', color: ['Payment', 'Transfer to PC Book'].includes(printRecord?.transaction_type) ? '#000' : '#333' }}>Telp: (+62) 778 462959, 391918</p>
                                    <p style={{ margin: '1px 0', fontSize: '12px', color: ['Payment', 'Transfer to PC Book'].includes(printRecord?.transaction_type) ? '#000' : '#333' }}>Website: www.ptbtg.com | E-mail: ptbtg@ptbtg.com</p>
                                </div>
                                {! (['Payment', 'Transfer to PC Book'].includes(printRecord?.transaction_type)) && (
                                    <div style={{ position: 'absolute', top: '18px', right: '22px', textAlign: 'right' }}>
                                        <div style={{ fontSize: '14px', color: '#d92525', fontWeight: 'bold', fontFamily: 'monospace' }}>
                                            No. : {formatVoucherNumber(printRecord?.receipt_id, printRecord?.transaction_type)}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            {/* Title */}
                            <div className="receipt-title" style={{ 
                                textAlign: 'center', 
                                fontSize: ['Payment', 'Transfer to PC Book'].includes(printRecord?.transaction_type) ? '18px' : '15px', 
                                fontWeight: 'bold', 
                                textDecoration: ['Payment', 'Transfer to PC Book'].includes(printRecord?.transaction_type) ? 'none' : 'underline double', 
                                marginBottom: '18px', 
                                color: ['Payment', 'Transfer to PC Book'].includes(printRecord?.transaction_type) ? '#000' : '#1a2c5b', 
                                letterSpacing: ['Payment', 'Transfer to PC Book'].includes(printRecord?.transaction_type) ? '2px' : '1.5px',
                                textTransform: ['Payment', 'Transfer to PC Book'].includes(printRecord?.transaction_type) ? 'uppercase' : 'none'
                            }}>
                                {(() => {
                                    const type = String(printRecord?.transaction_type || "").toLowerCase();
                                    if (type === 'payment' || type === 'transfer to pc book') return 'CASH VOUCHER';
                                    if (type === 'other income') return 'RECEIPT CASH VOUCHER';
                                    return 'RECEIPT VOUCHER';
                                })()}
                            </div>

                            {['Payment', 'Transfer to PC Book'].includes(printRecord?.transaction_type) ? (
                                <>
                                    {/* Payment Voucher Header Fields - Matching PPP.js Table Style */}
                                    <div style={{ width: "100%", marginBottom: "20px" }}>
                                        <table style={{ width: "100%", borderCollapse: "separate", fontSize: "14px", border: "none" }}>
                                            <tbody>
                                                <tr>
                                                    <td style={{ width: "120px", textAlign: "left", padding: "4px 2px", fontWeight: "bold", border: "none" }}>Payment To</td>
                                                    <td style={{ width: "10px", padding: "4px 2px", border: "none" }}>:</td>
                                                    <td style={{ width: "220px", padding: "4px 2px", verticalAlign: "top", border: "none" }}>{printRecord?.customerName}</td>
                                                    
                                                    <td style={{ width: "60px", textAlign: "left", padding: "4px 2px", fontWeight: "bold", border: "none" }}>PV #</td>
                                                    <td style={{ width: "10px", padding: "4px 2px", border: "none" }}>:</td>
                                                    <td style={{ width: "120px", padding: "4px 2px", verticalAlign: "top", border: "none" }}>{formatVoucherNumber(printRecord?.receipt_id, printRecord?.transaction_type)}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ textAlign: "left", padding: "4px 2px", fontWeight: "bold", border: "none" }}>Payment Method</td>
                                                    <td style={{ padding: "4px 2px", border: "none" }}>:</td>
                                                    <td style={{ padding: "4px 2px", verticalAlign: "top", border: "none" }}>{(printRecord?.bankName && printRecord?.bankName !== "-") ? "Bank Transfer" : "Cash"}</td>
                                                    
                                                    <td style={{ textAlign: "left", padding: "4px 2px", fontWeight: "bold", border: "none" }}>Date</td>
                                                    <td style={{ padding: "4px 2px", border: "none" }}>:</td>
                                                    <td style={{ padding: "4px 2px", verticalAlign: "top", border: "none" }}>{formatDatePrint(printRecord?.date)}</td>
                                                </tr>
                                                <tr>
                                                    <td style={{ textAlign: "left", padding: "4px 2px", fontWeight: "bold", border: "none" }}>Account Name</td>
                                                    <td style={{ padding: "4px 2px", border: "none" }}>:</td>
                                                    <td style={{ padding: "4px 2px", verticalAlign: "top", border: "none" }}>{(printRecord?.bankName && printRecord?.bankName !== "-") ? printRecord.bankName : "Cash in hand"}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Payment Item Table - Matching PPP.js */}
                                    <Table style={{ width: '100%', marginBottom: '18px', fontSize: '11px', borderCollapse: 'collapse', border: '1px solid #000' }} className="align-middle">
                                        <thead>
                                            <tr>
                                                <th style={{ width: '3%', backgroundColor: '#f2f2f2', color: '#000', fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }} className="text-center">No</th>
                                                <th style={{ width: '10%', backgroundColor: '#f2f2f2', color: '#000', fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }} className="text-center">Claim No</th>
                                                <th style={{ width: '62%', backgroundColor: '#f2f2f2', color: '#000', fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }} className="text-center">Purpose</th>
                                                <th style={{ width: '25%', backgroundColor: '#f2f2f2', color: '#000', fontWeight: 'bold', border: '1px solid #000', padding: '6px 8px' }} className="text-center">Amount IDR</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(() => {
                                                const { claimNo, purpose } = splitReferenceNo(printRecord?.reference_no, printRecord?.purpose);
                                                const amountValue = Math.abs(parseFloat(printRecord?.cash_amount || 0));
                                                return (
                                                    <>
                                                        <tr>
                                                            <td style={{ border: '1px solid #000', padding: '6px 8px' }} className="text-center">1</td>
                                                            <td style={{ border: '1px solid #000', padding: '6px 8px' }} className="text-center">{claimNo || "-"}</td>
                                                            <td style={{ border: '1px solid #000', padding: '6px 8px' }}>{purpose}</td>
                                                            <td style={{ border: '1px solid #000', padding: '6px 8px' }} className="text-end">
                                                                {amountValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                        <tr style={{ backgroundColor: '#f2f2f2' }}>
                                                            <td colSpan="3" className="text-end fw-bold" style={{ textTransform: 'uppercase', border: '1px solid #000', padding: '6px 8px' }}>Total</td>
                                                            <td className="text-end fw-bold" style={{ border: '1px solid #000', padding: '6px 8px' }}>
                                                                {amountValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                            </td>
                                                        </tr>
                                                    </>
                                                );
                                            })()}
                                        </tbody>
                                    </Table>

                                    <div style={{ fontSize: '11.5px', marginTop: '20px', fontStyle: 'italic' }}>
                                        <strong>Amount in Words :</strong> {numberToWords(Math.abs(parseFloat(printRecord?.cash_amount || 0)))} Rupiah Only
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px" }}>
                                        <div style={{ display: "flex", gap: "40px" }}>
                                            <div style={{ textAlign: "center", minWidth: "120px" }}>
                                                <span>Approved by Director and GM</span>
                                            </div>
                                        </div>
                                        <div style={{ textAlign: "center" }}>
                                            <div style={{ border: "1px solid black", width: "180px", height: "50px", marginBottom: "5px" }}></div>
                                            <span style={{ fontSize: "11px" }}>{`Applicant's Signature`}</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Receipt Voucher Content Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '120px 10px 1fr', gridGap: '10px 4px', alignItems: 'baseline', marginBottom: '18px' }}>
                                        <div className="label" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', whiteSpace: 'nowrap' }}>Received From</div>
                                        <div className="colon" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', textAlign: 'center' }}>:</div>
                                        <div className="value" style={{ borderBottom: '1px solid #1a2c5b', paddingLeft: '6px', fontSize: '11px' }}>
                                            {printRecord?.customerName || printRecord?.customer_name}
                                        </div>

                                        <div className="label" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', whiteSpace: 'nowrap' }}>Account Name</div>
                                        <div className="colon" style={{ fontWeight: 'bold', color: '#1a2c5b', fontSize: '11px', textAlign: 'center' }}>:</div>
                                        <div className="value" style={{ borderBottom: '1px solid #1a2c5b', paddingLeft: '6px', fontSize: '11px' }}>
                                            {(printRecord?.bankName && printRecord?.bankName !== "-") ? printRecord.bankName : "Cash in hand"}
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
                                                    {(printRecord?.bankName && printRecord?.bankName !== "-") ? "Bank Transfer" : "Cash"}
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
                                </>
                            )}

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

                <Modal isOpen={cancelModal.isOpen} toggle={() => setCancelModal({ isOpen: false, rowIndex: null, claimId: null, remark: "" })} centered size="lg" zIndex={2000} style={{ zIndex: 2000 }}>
                    <ModalHeader toggle={() => setCancelModal({ isOpen: false, rowIndex: null, claimId: null, remark: "" })}>Cancel Claim</ModalHeader>
                    <ModalBody>
                        <div className="mb-3">
                            <Label for="cancelRemark">Remark <span className="text-danger">*</span></Label>
                            <Input 
                                type="textarea" 
                                id="cancelRemark" 
                                value={cancelModal.remark} 
                                onChange={(e) => setCancelModal({...cancelModal, remark: e.target.value})} 
                                maxLength={100} 
                                rows="3"
                                placeholder="Enter reason for cancellation (max 100 characters)" 
                            />
                            <small className="text-muted">{cancelModal.remark.length}/100</small>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={() => setCancelModal({ isOpen: false, rowIndex: null, claimId: null, remark: "" })}>Cancel</Button>
                        <Button color="primary" onClick={confirmCancelClaim}>OK</Button>
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