import React, { useState, useEffect } from "react";
import {
    Card,
    CardBody,
    Col,
    Container,
    Row,
} from "reactstrap";
import Select from "react-select";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { FilterMatchMode } from "primereact/api";
import { Dialog } from "primereact/dialog";
import { InputText } from "primereact/inputtext";
import { Tooltip } from "primereact/tooltip";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_green.css";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import { GetBankList, ClaimAndPaymentGetById, GetAllClaimAndPayment } from "common/data/mastersapi";
import { useHistory } from 'react-router-dom';
import axios from "axios";
import { PYTHON_API_URL } from "common/pyapiconfig";
import { GetInvoiceDetails } from "../../../common/data/invoiceapi";

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

// Format date to yyyy-MM-dd
const formatDate = (date) => {
    const d = new Date(date);
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    return `${d.getFullYear()}-${month}-${day}`;
};
const formatPrintDate = (date) => {
    if (!date) return "-";
    const d = new Date(date);
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

const BankBook = () => {
    const firstDayOfMonth = formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const today = formatDate(new Date());

    const history = useHistory();
    const [bankBook, setBankBook] = useState([]);
    const [loading, setLoading] = useState(false);
    const [btgBankOptions, setBtgBankOptions] = useState([]);

    const [filters, setFilters] = useState({
        description: { value: null, matchMode: FilterMatchMode.CONTAINS },
        voucherNo: { value: null, matchMode: FilterMatchMode.CONTAINS },
        transactionType: { value: null, matchMode: FilterMatchMode.CONTAINS },
        // account removed from filters
        party: { value: null, matchMode: FilterMatchMode.CONTAINS },
        date: { value: null, matchMode: FilterMatchMode.DATE_IS },

        glcode: { value: null, matchMode: FilterMatchMode.CONTAINS },
        currency: { value: null, matchMode: FilterMatchMode.CONTAINS },
        actamount: { value: null, matchMode: FilterMatchMode.CONTAINS },
        creditIn: { value: null, matchMode: FilterMatchMode.CONTAINS },
        debitOut: { value: null, matchMode: FilterMatchMode.CONTAINS },
        balance: { value: null, matchMode: FilterMatchMode.CONTAINS },

    });
    const [currency, setCurrency] = useState(null);
    const [currencyList, setCurrencyList] = useState([]);
    const [globalFilter, setGlobalFilter] = useState("");
    const [fromDate, setFromDate] = useState(firstDayOfMonth);
    const [toDate, setToDate] = useState(today);
    const [bankid, setBankid] = useState(null);

    // --- DIALOG STATE FOR GROUPED CLAIMS ---
    const [showClaimsDialog, setShowClaimsDialog] = useState(false);
    const [selectedClaims, setSelectedClaims] = useState(null);
    const [claimsFilter, setClaimsFilter] = useState("");
    
    // --- NESTED DETAIL DIALOG STATE ---
    const [showClaimDetailModal, setShowClaimDetailModal] = useState(false);
    const [claimDetailData, setClaimDetailData] = useState(null);
    const [loadingClaimDetail, setLoadingClaimDetail] = useState(false);

    // --- INVOICE DETAIL STATE ---
    const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
    const [invoiceDetails, setInvoiceDetails] = useState(null);
    const [loadingInvoiceDetails, setLoadingInvoiceDetails] = useState(false);

    const handleInvoiceClick = async (invoiceNo) => {
        if (!invoiceNo || invoiceNo === "-") return;
        setLoadingInvoiceDetails(true);
        setShowInvoiceDialog(true);
        setInvoiceDetails(null);
        try {
            const data = await GetInvoiceDetails(invoiceNo);
            if (data) {
                setInvoiceDetails(data);
            } else {
                toast.warning("No details found for this invoice.");
            }
        } catch (err) {
            console.error("Fetch invoice error:", err);
            toast.error("Failed to fetch invoice details.");
        } finally {
            setLoadingInvoiceDetails(false);
        }
    };

    const fetchRecordDetail = async (row) => {
        if (row.transactionType?.toLowerCase() === "cash deposit") return;
        
        const voucherNo = row.VoucherNo;
        const receiptId = row.receipt_id;
        const isClaim = voucherNo?.startsWith("CLM");

        setShowClaimDetailModal(true);
        setLoadingClaimDetail(true);
        setClaimDetailData(null);

        try {
            if (isClaim) {
                // Remove everything after ' - ' to get pure claim number
                const pureClaimNo = voucherNo.split(" - ")[0];
                
                // 1. Fetch ALL claims to find the one with matching ApplicationNo
                // Searching by ApplicationNo is the only reliable way since digits in string != Claim_ID necessarily
                const listRes = await GetAllClaimAndPayment(0, 0, 1, 1, 0);
                let claimId = null;
                
                if (listRes?.status && listRes.data) {
                    const match = listRes.data.find(c => c.claimno === pureClaimNo);
                    if (match) {
                        claimId = match.Claim_ID;
                    }
                }

                // Fallback to parsing digits if not found in list (though list is better)
                if (!claimId) {
                    claimId = parseInt(pureClaimNo.replace(/\D/g, ''), 10);
                }

                if (!claimId || isNaN(claimId)) {
                    toast.error("Invalid claim reference format.");
                    setLoadingClaimDetail(false);
                    return;
                }

                const res = await ClaimAndPaymentGetById(claimId, 1, 1);
                const dataObj = res?.data || {};
                const header = dataObj.header || dataObj.Header;
                const details = dataObj.details || dataObj.Details || [];

                if (res?.status && header) {
                    setClaimDetailData({
                        IsClaim: true,
                        ...header,
                        Details: details,
                        ClaimPaymentId: header.ClaimId,
                        FormNo: header.ApplicationNo,
                        Date: header.ApplicationDate,
                        CategoryType: header.claimcategory || "-",
                        Department: header.departmentname || "-",
                        Applicant: header.applicantname || "-",
                        TransCurrency: header.transactioncurrency || "-", // Using field from opt=2
                        HOD: header.HOD_Name || "-", // Using field from opt=2
                        Supplier: header.SupplierName || "-",
                        CostCenter: header.CostCenter || "-",
                        ClaimAmtInTC: header.ClaimAmountInTC || 0,
                        ApplicationNo: pureClaimNo,
                        Attachment: header.AttachmentName || "No Attachment",
                        PaymentMode: header.paymentmethodname || "-", // From Manageclaim&Payment.js logic
                        Status: (header.issubmitted === 1 || header.IsSubmitted === 1) ? "Posted" : "Saved"
                    });
                } else {
                    setClaimDetailData({ error: "No associated claim details found.", VoucherNo: voucherNo });
                }
            } else {
                // Fetch Receipt Details
                if (!receiptId) {
                    setClaimDetailData({ error: "No Receipt ID available for this record.", VoucherNo: voucherNo });
                    return;
                }

                const res = await axios.get(`${PYTHON_API_URL}/AR/get-by-id`, {
                    params: { receipt_id: receiptId }
                });

                    if (res.data?.status === "success" && res.data?.data) {
                        const data = res.data.data;
                        
                        // 🟢 Fetch Allocated Invoices
                        let allocatedInvoices = [];
                        try {
                            const invRes = await axios.get(`${PYTHON_API_URL}/AR/get-outstanding-invoices/${data.customer_id}`, {
                                params: {
                                    receipt_id: receiptId,
                                    only_allocated: true
                                }
                            });
                            if (invRes.data?.status === "success") {
                                allocatedInvoices = invRes.data.data;
                            }
                        } catch (err) {
                            console.error("Failed to fetch allocated invoices", err);
                        }

                        setClaimDetailData({
                            IsReceipt: true,
                            FormNo: receiptId || data.receipt_no || voucherNo,
                            Date: data.receipt_date,
                            CustomerName: data.customer_name || row.Party || "-",
                            TotalAmount: (parseFloat(data.cash_amount) || 0) + (parseFloat(data.bank_amount) || 0) + (parseFloat(data.contra_amount) || 0),
                            PaymentMethod: data.bank_payment_via === 1 ? "Cheque" : (data.bank_payment_via === 4 ? "Cash" : "Bank Transfer"),
                            BankName: data.bank_name || "-",
                            Currency: data.CurrencyCode || "IDR",
                            ChequeNo: data.cheque_number || "-",
                            InvoiceNo: data.reference_no || "-",
                            TransactionType: data.transaction_type || row.transactionType || "Receipt",
                            AllocatedInvoices: allocatedInvoices,
                            verified: row.pending_verification === 0
                        });
                    } else {
                        setClaimDetailData({ error: "No receipt details found.", VoucherNo: voucherNo, verified: row.pending_verification === 0 });
                    }
            }
        } catch (error) {
            console.error("Error fetching record details:", error);
            setClaimDetailData({ error: "Failed to fetch details from server.", VoucherNo: voucherNo });
        } finally {
            setLoadingClaimDetail(false);
        }
    };

    const fetchBankBook = async () => {
        try {
            setLoading(true);
            setBankBook([]);

            const response = await axios.get(`${PYTHON_API_URL}/AR/get-report`, {
                params: {
                    from_date: fromDate ? formatDate(fromDate) : null,
                    to_date: toDate ? formatDate(toDate) : null,
                    bank_id: bankid == undefined || bankid == null ? 0 : bankid
                }
            });

            const resultData = response.data?.data || [];

            const uniqueCurrency = [
                ...new Set(resultData.map((x) => x.Currency))
            ].filter(c => c && c !== '-').map((c) => ({ label: c, value: c }));

            setCurrencyList(uniqueCurrency);

            setCurrencyList(uniqueCurrency);

            const transformed = resultData.map((item) => ({
                date: item.Date ? new Date(item.Date) : null,
                voucherNo: (() => {
                    const verifiedClaims = (item.GroupedClaims || []).filter(c => c.pending_verification === 0);
                    if (verifiedClaims.length > 0) {
                        return verifiedClaims[0].VoucherNo ? verifiedClaims[0].VoucherNo.split(" - ")[0] : "-";
                    }
                    return "-";
                })(),
                transactionType: item.TransactionType === "Bank" ? "Bank Transfer" : (item.TransactionType || "-"),
                glcode: "",
                // account removed from mapping
                party: item.Party || "-",
                description: item.Description || "-",
                currency: item.Currency || "IDR",
                actamount: item.NetAmount,
                creditIn: parseFloat(item.CreditIn || 0),
                debitOut: parseFloat(item.DebitOut || 0),
                balance: parseFloat(item.Balance || 0),
                overdraftLimit: parseFloat(item.OverdraftLimit || 0),
                overdraft: parseFloat(item.OverDraft || 0),
                chequeNumber: item.cheque_number || "",
                partyDetail: item.PartyDetail || "",
                groupedClaims: item.GroupedClaims || []
            }));

            setBankBook(transformed);
        } catch (error) {
            console.error(error);
            toast.error("Error fetching bank book data.");
        } finally {
            setLoading(false);
        }
    };

    const Bankmaster = async () => {
        const data = await GetBankList(1, 1);
        const options = data.map(item => ({
            value: item.value,
            label: item.BankName
        }));
        setBtgBankOptions(options);
    }

    // State to hold manually typed exchange rates per voucher
    const [rates, setRates] = useState({});

    // Filter by currency, then apply exchange rates and recalculate the running balance
    const filteredWithRates = React.useMemo(() => {
        let runningBalance = 0;

        const baseFiltered = currency
            ? bankBook.filter(item => item.currency === currency.value)
            : bankBook;

        return baseFiltered.map((item, index) => {
            const rowKey = item.voucherNo + "_" + index;
            const currentRate = rates[rowKey] !== undefined ? rates[rowKey] : 1;

            const convertedDebit = item.debitOut * currentRate;
            const convertedCredit = item.creditIn * currentRate;

            const totalConverted = (currentRate !== 1)
                ? (item.debitOut > 0 ? item.debitOut : item.creditIn)
                : 0;

            if (index === 0 && item.transactionType === "OPENING BALANCE") {
                runningBalance = convertedDebit;
            } else {
                runningBalance += (convertedDebit - convertedCredit);
            }

            const odLimit = item.overdraftLimit || 0;

            return {
                ...item,
                rowKey: rowKey,
                exchangeRate: currentRate,
                totalConverted: totalConverted,
                convertedDebit: convertedDebit,
                convertedCredit: convertedCredit,
                balance: runningBalance,
                overdraftLimit: odLimit
            };
        }).filter(item => {
            if (item.transactionType === "OPENING BALANCE") return true; 
            
            // Filter other transactions by date range
            const rowDate = item.date ? formatDate(item.date) : null;
            if (fromDate && rowDate && rowDate < fromDate) return false;
            if (toDate && rowDate && rowDate > toDate) return false;
            
            return true;
        });
    }, [bankBook, currency, rates, fromDate]);

    const filtered = filteredWithRates;

    const handleRateChange = (rowKey, newRate) => {
        const val = parseFloat(newRate);
        setRates(prev => ({
            ...prev,
            [rowKey]: isNaN(val) ? 1 : val // fallback to 1 if empty
        }));
    };

    const exportToExcel = () => {
        const hasOverdraft = filtered.some(ex => ex.overdraftLimit > 0);

        const exportData = filtered.map((ex) => {
            const row = {
                Date: ex.date ? ex.date.toLocaleDateString() : "",
                "Reference No": ex.voucherNo,
                "Transaction Type": ex.transactionType,
                "Party": ex.party,
                "Currency": ex.currency,
                "Exchange Rate": ex.exchangeRate,
                "Total (Converted)": ex.totalConverted > 0 ? ex.totalConverted : "-",
                "Debit Out": ex.convertedDebit,
                "Credit In": ex.convertedCredit,
                "Balance": ex.balance,
            };

            if (hasOverdraft) {
                const val = ex.overdraftLimit - ex.balance;
                row["OVER DRAFT"] = val < 0 ? `-${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : val.toLocaleString('en-US', { minimumFractionDigits: 2 });
                row["Total"] = ex.overdraftLimit.toLocaleString('en-US', { minimumFractionDigits: 2 });
            }

            return row;
        });

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Bank Book");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        saveAs(data, `BankBook-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handlePrint = () => {
        const tableHTML = document.getElementById("print-section").innerHTML;
        const from = formatPrintDate(fromDate);
        const to = formatPrintDate(toDate);

        const hasOverdraft = filtered.some(ex => ex.overdraftLimit > 0);
        const overDraftHeader = hasOverdraft ? "<th>OVER DRAFT</th>" : "";

        const printWindow = window.open("", "_blank");

        printWindow.document.write(`
            <html>
                <head>
                    <title>Bank Book Report</title> 
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
                        h2 { text-align: center; font-size: 12px; margin-bottom: 5px; }
                        p { text-align: center; font-size: 10px; margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; font-size: 9px; }
                        th, td { padding: 5px; border: 1px solid #ccc; text-align: left; }
                        th { background-color: #f8f8f8; }
                        .text-end { text-align: right; }
                        .text-red { color: red; }
                        .text-blue { color: #0B5ED7; }
                    </style>
                </head>
                <body>
                    <h2>Bank Book Report</h2>
                    <p>From: ${from} To: ${to}</p>
                    ${tableHTML}
                </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();

        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);
    };

    const handleCancelFilters = () => {
        setCurrency(null);
        setFromDate(firstDayOfMonth);
        setToDate(today);
        setBankid(null);
        setFilters({
            description: { value: null, matchMode: FilterMatchMode.CONTAINS },
            voucherNo: { value: null, matchMode: FilterMatchMode.CONTAINS },
            transactionType: { value: null, matchMode: FilterMatchMode.CONTAINS },
            // account removed from default filters
            party: { value: null, matchMode: FilterMatchMode.CONTAINS },
            date: { value: null, matchMode: FilterMatchMode.DATE_IS },
        });
        setGlobalFilter("");
        setTimeout(() => fetchBankBook(), 100);
    };

    useEffect(() => {
        fetchBankBook();
        Bankmaster();
    }, []);

    const dateBodyTemplate = (rowData) => {
        return formatPrintDate(rowData.date);
    };

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="Bank Book" />

                <Row className="pt-2 pb-3 align-items-end">
                    <Col md="3">
                        <Select
                            name="depositBankId"
                            id="depositBankId"
                            options={btgBankOptions}
                            isClearable={true}
                            value={btgBankOptions.find((o) => o.value === bankid) || null}
                            onChange={(option) => {
                                setBankid(option?.value || null);
                            }}
                            placeholder="Select BTG Bank"
                        />
                    </Col>



                    <Col md="3">
                        <Flatpickr
                            className="form-control"
                            value={fromDate}
                            onChange={(date) => setFromDate(date[0])}
                            options={{
                                altInput: true,
                                altFormat: "d-M-Y",
                                dateFormat: "Y-m-d"
                            }}
                            placeholder="From Date"
                        />
                    </Col>

                    <Col md="3">
                        <Flatpickr
                            className="form-control"
                            value={toDate}
                            onChange={(date) => setToDate(date[0])}
                            options={{
                                altInput: true,
                                altFormat: "d-M-Y",
                                dateFormat: "Y-m-d"
                            }}
                            placeholder="To Date"
                        />
                    </Col>

                    <Col md="12" className="text-end mt-2">
                        <button type="button" className="btn btn-primary me-2" onClick={fetchBankBook}>
                            Search
                        </button>
                        <button type="button" className="btn btn-danger me-2" onClick={handleCancelFilters}>
                            Cancel
                        </button>
                        <button type="button" className="btn btn-info me-2" onClick={handlePrint}>
                            <i className="bx bx-printer me-2"></i> Print
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={exportToExcel}>
                            <i className="bx bx-export me-2"></i> Export
                        </button>
                    </Col>
                </Row>

                <Row>
                    <Col lg="12">
                        <Card>
                            <CardBody>
                                <div className="d-flex justify-content-end mb-2">
                                    <input
                                        type="text"
                                        placeholder="Global Search"
                                        className="form-control w-auto"
                                        value={globalFilter}
                                        onChange={(e) => setGlobalFilter(e.target.value)}
                                    />
                                </div>
                                <DataTable
                                    value={filtered}
                                    loading={loading}
                                    paginator
                                    rows={20}
                                    filters={filters}
                                    onFilter={(e) => setFilters(e.filters)}
                                    globalFilterFields={["glcode", "currency", "actamount", "date", "creditIn", "debitOut", "balance", "voucherNo", "party", "transactionType"]}
                                    globalFilter={globalFilter}
                                    emptyMessage="No records found."
                                    showGridlines
                                    filterDisplay="menu"
                                    filter
                                >
                                    <Column field="date" header="Date" body={dateBodyTemplate} style={{ width: '120px' }} />
                                    {/* Reference No column removed from Grid per request */}

                                    <Column 
                                        field="transactionType" 
                                        header="Transaction Type" 
                                        filter 
                                        filterPlaceholder="Search Type" 
                                        body={(rowData) => (
                                            <span>
                                                {rowData.transactionType} 
                                                {rowData.currency && (
                                                    <span style={{ marginLeft: '4px', color: 'black' }}>
                                                        (<span style={{ color: 'firebrick', fontWeight: 'bold' }}>{rowData.currency}</span>)
                                                    </span>
                                                )}
                                                {rowData.chequeNumber ? ` (${rowData.chequeNumber})` : ''}
                                            </span>
                                        )}
                                        style={{ minWidth: '150px' }}
                                    />

                                    <Column
                                        field="party"
                                        header="Party"
                                        filter
                                        filterPlaceholder="Search Party"
                                        body={(rowData) => {
                                            const isSpecialType = ["bank transfer", "bank interest", "bank charges", "cash deposit"].includes(rowData.transactionType?.toLowerCase());
                                            
                                            if (!isSpecialType && rowData.groupedClaims && rowData.groupedClaims.length > 0) {
                                                return (
                                                    <span
                                                        className="text-primary fw-bold"
                                                        style={{ cursor: "pointer", textDecoration: "underline" }}
                                                        onClick={() => {
                                                            setSelectedClaims({
                                                                party: rowData.party,
                                                                date: rowData.date,
                                                                claims: rowData.groupedClaims
                                                            });
                                                            setClaimsFilter("");
                                                            setShowClaimsDialog(true);
                                                        }}
                                                    >
                                                        {rowData.party} {rowData.groupedClaims.length > 1 && `(${rowData.groupedClaims.length})`}
                                                    </span>
                                                );
                                            }

                                            if (isSpecialType && rowData.partyDetail) {
                                                const tooltipId = `tooltip-${rowData.rowKey || Math.random().toString(36).substr(2, 9)}`;
                                                return (
                                                    <span 
                                                        className="custom-tooltip-target"
                                                        data-pr-tooltip={rowData.partyDetail}
                                                        style={{ cursor: 'help' }}
                                                    >
                                                        {rowData.party}
                                                    </span>
                                                );
                                            }

                                            return rowData.party;
                                        }}
                                    />


                                    <Column header="Exchange Rate" body={(rowData) => {
                                        const isIDR = rowData.currency === "IDR";

                                        return (
                                            <input
                                                type="number"
                                                className={`form-control form-control-sm text-end ${isIDR ? 'bg-light text-muted' : ''}`}
                                                style={{ width: '80px', display: 'inline-block' }}
                                                value={isIDR ? 1 : (rates[rowData.rowKey] !== undefined ? rates[rowData.rowKey] : 1)}
                                                step="0.01"
                                                min="0.01"
                                                disabled={isIDR}
                                                onChange={(e) => handleRateChange(rowData.rowKey, e.target.value)}
                                            />
                                        );
                                    }} style={{ width: '100px' }} />

                                    {/* Total (Converted) - foreign currency amount */}
                                    <Column field="totalConverted" header="Total (Converted)" body={(d) => {
                                        if (!d.totalConverted || d.totalConverted === 0) return "-";
                                        return d.totalConverted.toLocaleString('en-US', {
                                            style: 'decimal',
                                            minimumFractionDigits: 2
                                        });
                                    }} className="text-end" />

                                    {/* Debit Out (IDR converted) */}
                                    <Column field="convertedDebit" header="Debit Out" body={(d) => {
                                        if (d.convertedDebit === 0) return "-";
                                        return d.convertedDebit.toLocaleString('en-US', {
                                            style: 'decimal',
                                            minimumFractionDigits: 2
                                        });
                                    }} className="text-end" />

                                    {/* Credit In (IDR converted) */}
                                    <Column field="convertedCredit" header="Credit In" body={(d) => {
                                        if (d.convertedCredit === 0) return "-";
                                        return d.convertedCredit.toLocaleString('en-US', {
                                            style: 'decimal',
                                            minimumFractionDigits: 2
                                        });
                                    }} className="text-end" />

                                    {/* Balance */}
                                    <Column field="balance" header="Balance" body={(d) => d.balance.toLocaleString('en-US', {
                                        style: 'decimal',
                                        minimumFractionDigits: 2
                                    })} className="text-end" />

                                    {/* OVER DRAFT - shows remaining limit or "-" when over limit */}
                                    {filtered.some(ex => ex.overdraftLimit > 0) && (
                                        <Column field="overdraft" header="OVER DRAFT" body={(d) => {
                                            if (d.overdraftLimit <= 0) return "";
                                            const val = d.overdraftLimit - d.balance;
                                            const color = val < 0 ? '#0B5ED7' : 'red';
                                            return <span style={{ color: color, whiteSpace: 'nowrap' }}>{val < 0 ? `-${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : val.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>;
                                        }} className="text-end fw-bold" />
                                    )}

                                    {/* Total (OD) - shows OD limit */}
                                    {filtered.some(ex => ex.overdraftLimit > 0) && (
                                        <Column header="Total" body={(d) => {
                                            if (d.overdraftLimit <= 0) return "";
                                            return d.overdraftLimit.toLocaleString('en-US', { minimumFractionDigits: 2 });
                                        }} className="text-end fw-bold" />
                                    )}
                                </DataTable>

                                {/* Print Section - Account Column Removed */}
                                <div id="print-section" style={{ display: "none" }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>S.No.</th>
                                                <th>Date</th>
                                                <th>Reference No</th>
                                                <th>Transaction Type</th>
                                                <th>Party</th>
                                                <th>Currency</th>
                                                <th>Exc. Rate</th>
                                                <th>Total (Converted)</th>
                                                <th>Debit Out</th>
                                                <th>Credit In</th>
                                                <th>Balance</th>
                                                {filtered.some(ex => ex.overdraftLimit > 0) && (
                                                    <>
                                                        <th>OVER DRAFT</th>
                                                        <th>Total</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.map((item, index) => {
                                                const hasOD = filtered.some(ex => ex.overdraftLimit > 0);
                                                return (
                                                    <tr key={index}>
                                                        <td>{index + 1}</td>
                                                        <td>{formatPrintDate(item.date)}</td>
                                                        <td>{item.voucherNo}</td>
                                                        <td>{item.transactionType} {item.chequeNumber ? `(${item.chequeNumber})` : ''}</td>
                                                        <td>{item.party}</td>
                                                        <td>{item.currency}</td>
                                                        <td className="text-end">{item.exchangeRate}</td>
                                                        <td className="text-end">
                                                            {item.totalConverted > 0 ? item.totalConverted.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "-"}
                                                        </td>
                                                        <td className="text-end">
                                                            {item.convertedDebit > 0 ? item.convertedDebit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "-"}
                                                        </td>
                                                        <td className="text-end">
                                                            {item.convertedCredit > 0 ? item.convertedCredit.toLocaleString('en-US', { minimumFractionDigits: 2 }) : "-"}
                                                        </td>
                                                        <td className="text-end">{item.balance.toLocaleString('en-US', {
                                                            style: 'decimal',
                                                            minimumFractionDigits: 2
                                                        })}</td>
                                                        {hasOD && (
                                                            <>
                                                                <td className={"text-end " + ((item.overdraftLimit - item.balance) < 0 ? "text-blue" : "text-red")}>
                                                                    {item.overdraftLimit > 0
                                                                        ? ((item.overdraftLimit - item.balance) < 0 ? `-${Math.abs(item.overdraftLimit - item.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : (item.overdraftLimit - item.balance).toLocaleString('en-US', { minimumFractionDigits: 2 }))
                                                                        : ""}
                                                                </td>
                                                                <td className="text-end">
                                                                    {item.overdraftLimit > 0
                                                                        ? item.overdraftLimit.toLocaleString('en-US', { minimumFractionDigits: 2 })
                                                                        : ""}
                                                                </td>
                                                            </>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* --- GROUPED DETAILS DIALOG --- */}
                                <Dialog
                                    header={`Transaction Details for ${selectedClaims?.party || ''}`}
                                    visible={showClaimsDialog}
                                    style={{ width: '70vw' }}
                                    onHide={() => setShowClaimsDialog(false)}
                                    draggable={false}
                                    resizable={false}
                                >
                                    {selectedClaims && (
                                        <div className="p-3">
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <div className="fw-bold" style={{ color: "#495057" }}>
                                                    Date: {selectedClaims.date ? formatPrintDate(selectedClaims.date) : ""}
                                                </div>
                                                <InputText
                                                    type="search"
                                                    placeholder="Search..."
                                                    className="form-control form-control-sm w-auto"
                                                    value={claimsFilter}
                                                    onChange={(e) => setClaimsFilter(e.target.value)}
                                                />
                                            </div>

                                            <DataTable
                                                value={selectedClaims.claims}
                                                className="p-datatable-sm p-datatable-gridlines"
                                                responsiveLayout="scroll"
                                                globalFilter={claimsFilter}
                                                globalFilterFields={['VoucherNo']}
                                                emptyMessage="No matching records found."
                                            >
                                                <Column 
                                                    header="Voucher Number" 
                                                    body={(r) => {
                                                        const isClaim = r.VoucherNo?.startsWith("CLM");
                                                        const isCashDeposit = r.transactionType?.toLowerCase() === "cash deposit";
                                                        let val = r.pending_verification === 0 ? (r.VoucherNo || "") : "-";
                                                        if (isClaim && r.pending_verification === 0) {
                                                            // Strip invoice suffix and party name suffix
                                                            val = val.split(" (Inv:")[0].split(" - ")[0];
                                                        } else if (r.pending_verification === 0) {
                                                            val = r.receipt_id || "-";
                                                        }

                                                        if (isCashDeposit) {
                                                            return <span>{val}</span>;
                                                        }

                                                        return (
                                                            <span
                                                                className="text-primary fw-bold"
                                                                style={{ cursor: "pointer", textDecoration: "underline" }}
                                                                onClick={() => fetchRecordDetail(r)}
                                                                title={r.pending_verification === 0 ? (r.VoucherNo || "") : ""}
                                                            >
                                                                {val}
                                                            </span>
                                                        );
                                                    }}
                                                />
                                                <Column 
                                                    header="Relevant Invoice" 
                                                    body={(r) => {
                                                        const match = r.VoucherNo?.match(/\(Inv:\s*(.*?)\)/);
                                                        let invoiceNoStr = match ? match[1] : (r.InvoiceNo || "-");
                                                        
                                                        // Fallback: if it's still "-", try to split VoucherNo
                                                        if ((!invoiceNoStr || invoiceNoStr === "-") && r.VoucherNo?.includes(" - ")) {
                                                            invoiceNoStr = r.VoucherNo.split(" - ").slice(1).join(" - ");
                                                        }

                                                        if (!invoiceNoStr || invoiceNoStr === "-") return "-";
                                                        
                                                        const invoices = invoiceNoStr.split(',').map(i => i.trim()).filter(i => i);
                                                        
                                                        return (
                                                            <div>
                                                                {invoices.map((inv, idx) => (
                                                                    <span key={idx}>
                                                                        <span
                                                                            className="text-primary fw-bold"
                                                                            style={{ cursor: "pointer", textDecoration: "underline", marginRight: "3px" }}
                                                                            onClick={() => handleInvoiceClick(inv)}
                                                                        >
                                                                            {inv}
                                                                        </span>
                                                                        {idx < invoices.length - 1 && <span style={{ marginRight: "3px" }}>,</span>}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        );
                                                    }}
                                                />
                                                <Column
                                                    field="Amount"
                                                    header="Amount"
                                                    body={(r) => Math.abs(r.Amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                    className="text-end"
                                                />
                                            </DataTable>

                                            <div className="text-end mt-3">
                                                <button className="btn btn-secondary btn-sm" onClick={() => setShowClaimsDialog(false)}>Close</button>
                                            </div>
                                        </div>
                                    )}
                                </Dialog>

                                {/* --- NESTED RECORD DETAIL DIALOG --- */}
                                <Dialog
                                    header={`Details: ${claimDetailData?.verified ? (claimDetailData?.FormNo || claimDetailData?.VoucherNo || '') : '-'}`}
                                    visible={showClaimDetailModal}
                                    style={{ width: "85vw" }}
                                    onHide={() => setShowClaimDetailModal(false)}
                                    draggable={false}
                                    resizable={false}
                                >
                                    {loadingClaimDetail ? (
                                        <div className="text-center p-4">Loading details...</div>
                                    ) : claimDetailData?.error ? (
                                        <div className="text-center p-4">
                                            <h5 className="text-danger">Info</h5>
                                            <p>{claimDetailData.error}</p>
                                            <p className="text-muted">Extracted Ref: {claimDetailData.VoucherNo}</p>
                                        </div>
                                    ) : claimDetailData ? (
                                        <div className="p-2">
                                            <style>{`
                                                .metadata-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px; padding: 15px; background: #fff; border-bottom: 1px solid #f0f0f0; }
                                                .metadata-item { display: flex; font-size: 13px; }
                                                .metadata-label { font-weight: 600; color: #495057; width: 140px; }
                                                .metadata-value { color: #6c757d; }
                                                .claims-datatable .p-datatable-thead > tr > th { background-color: #3b71ca !important; color: white !important; font-size: 13px; }
                                                .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
                                                .detail-table th, .detail-table td { padding: 8px 12px; border: 1px solid #eee; text-align: left; }
                                                .detail-table th { background-color: #f8f9fa; width: 35%; color: #495057; font-weight: 600; }
                                            `}</style>

                                            {claimDetailData.IsClaim ? (
                                                <>
                                                    <div className="metadata-grid">
                                                        <div className="metadata-item"><span className="metadata-label">Category Type</span><span className="metadata-value">: {claimDetailData.CategoryType}</span></div>
                                                        <div className="metadata-item"><span className="metadata-label">Application Date</span><span className="metadata-value">: {claimDetailData.Date ? formatPrintDate(claimDetailData.Date) : "-"}</span></div>
                                                        <div className="metadata-item"><span className="metadata-label">Claim Number</span><span className="metadata-value">: {claimDetailData.ApplicationNo}</span></div>
                                                        
                                                        <div className="metadata-item"><span className="metadata-label">Department</span><span className="metadata-value">: {claimDetailData.Department}</span></div>
                                                        <div className="metadata-item"><span className="metadata-label">Applicant</span><span className="metadata-value">: {claimDetailData.Applicant}</span></div>
                                                        <div className="metadata-item"></div>
                                                        
                                                        <div className="metadata-item"><span className="metadata-label">Trans Currency</span><span className="metadata-value">: {claimDetailData.TransCurrency}</span></div>
                                                        <div className="metadata-item"><span className="metadata-label">HOD</span><span className="metadata-value">: {claimDetailData.HOD}</span></div>
                                                        <div className="metadata-item"><span className="metadata-label">Supplier</span><span className="metadata-value">: {claimDetailData.Supplier}</span></div>
                                                        
                                                        <div className="metadata-item"><span className="metadata-label">Cost Center</span><span className="metadata-value">: {claimDetailData.CostCenter}</span></div>
                                                        <div className="metadata-item"><span className="metadata-label">Claim Amount in TC</span><span className="metadata-value">: {claimDetailData.ClaimAmtInTC?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
                                                        <div className="metadata-item"></div>
                                                    </div>

                                                    <DataTable
                                                        value={claimDetailData.Details || []}
                                                        className="claims-datatable p-datatable-sm p-datatable-gridlines mb-3"
                                                        responsiveLayout="scroll"
                                                    >
                                                        <Column header="#" body={(rowData, options) => options.rowIndex + 1} style={{ width: '50px' }} />
                                                        <Column field="claimtype" header="Claim Type" />
                                                        <Column field="Purpose" header="Claim & Payment Description" body={(r) => r.Purpose || r.ClaimAndPaymentDesc || "-"} />
                                                        <Column field="Amount" header="Amount" className="text-end" body={(r) => r.Amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                                        <Column field="ExpenseDate" header="Expense Date" body={(r) => r.ExpenseDate ? formatPrintDate(r.ExpenseDate) : "-"} />
                                                        <Column field="Purpose" header="Purpose" />
                                                    </DataTable>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="header-info-box d-flex justify-content-between" style={{ background: "#f0f4f8", padding: "12px", borderRadius: "6px", marginBottom: "15px", borderLeft: "4px solid #5584d4" }}>
                                                        <div>
                                                            <div className="text-muted small text-uppercase fw-bold">{claimDetailData.IsClaim ? "Claim Number" : "Receipt Number"}</div>
                                                            <div className="fs-5 fw-bold text-primary">{claimDetailData.verified ? (claimDetailData.FormNo || "-") : "-"}</div>
                                                        </div>
                                                        <div className="text-end">
                                                            <div className="text-muted small text-uppercase fw-bold">Date</div>
                                                            <div className="fs-5 fw-bold">{claimDetailData.Date ? formatPrintDate(claimDetailData.Date) : "-"}</div>
                                                        </div>
                                                    </div>
                                                    <table className="detail-table">
                                                        <tbody>
                                                            {(!["bank charges", "bank interest"].includes(claimDetailData.TransactionType?.toLowerCase())) && (
                                                                <tr>
                                                                    <th>{claimDetailData.TransactionType?.toLowerCase() === "bank transfer" ? "Bank transfer to" : "Customer"}</th>
                                                                    <td>{claimDetailData.CustomerName || "-"}</td>
                                                                </tr>
                                                            )}
                                                            <tr>
                                                                <th>Amount</th>
                                                                <td className="fw-bold fs-6">
                                                                    {claimDetailData.Currency || 'IDR'} {parseFloat(claimDetailData.TotalAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <th>Bank Name</th>
                                                                <td>{claimDetailData.BankName || "-"}</td>
                                                            </tr>
                                                            <tr>
                                                                <th>Payment Method</th>
                                                                <td>{claimDetailData.PaymentMethod || "-"}</td>
                                                            </tr>
                                                            {claimDetailData.ChequeNo && claimDetailData.ChequeNo !== "-" && (
                                                                <tr>
                                                                    <th>Cheque/Giro No</th>
                                                                    <td>{claimDetailData.ChequeNo}</td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>

                                                    {claimDetailData.AllocatedInvoices && claimDetailData.AllocatedInvoices.length > 0 && (
                                                        <div className="mt-4">
                                                            <h6 className="fw-bold mb-3" style={{ color: "#3b71ca" }}>Allocated Invoices</h6>
                                                            <DataTable
                                                                value={claimDetailData.AllocatedInvoices}
                                                                className="claims-datatable p-datatable-sm p-datatable-gridlines"
                                                                responsiveLayout="scroll"
                                                            >
                                                                <Column header="#" body={(rowData, options) => options.rowIndex + 1} style={{ width: '50px' }} />
                                                                <Column field="invoice_no" header="Invoice Number" body={(r) => (
                                                                    <span 
                                                                        className="text-primary fw-bold" 
                                                                        style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                                                        onClick={() => handleInvoiceClick(r.invoice_no)}
                                                                    >
                                                                        {r.invoice_no}
                                                                    </span>
                                                                )} />
                                                                <Column field="invoice_date" header="Date" />
                                                                <Column 
                                                                    header="Invoice Amount" 
                                                                    className="text-end" 
                                                                    body={(r) => parseFloat(r.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} 
                                                                />
                                                                <Column 
                                                                    header="Allocated" 
                                                                    className="text-end fw-bold text-success" 
                                                                    body={(r) => parseFloat(r.allocated_here || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} 
                                                                />
                                                            </DataTable>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            <div className="mt-3 text-end">
                                                <button className="btn btn-secondary btn-sm" onClick={() => setShowClaimDetailModal(false)}>
                                                    Close
                                                </button>
                                            </div>
                                        </div>
                                    ) : null}
                                </Dialog>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                {/* --- INVOICE DETAIL DIALOG --- */}
                <Dialog
                    header={`Invoice Details: ${invoiceDetails?.InvoiceNo || ''}`}
                    visible={showInvoiceDialog}
                    style={{ width: '60vw' }}
                    onHide={() => setShowInvoiceDialog(false)}
                    draggable={false}
                    resizable={false}
                >
                    {loadingInvoiceDetails ? (
                        <div className="text-center p-4">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        </div>
                    ) : invoiceDetails ? (
                        <div>
                            <div className="mb-4">
                                <Row className="mb-2">
                                    <Col md={6} className="d-flex">
                                        <span className="fw-bold me-2" style={{ minWidth: '120px' }}>Customer</span>
                                        <span>: {invoiceDetails.CustomerName}</span>
                                    </Col>
                                    <Col md={6} className="d-flex">
                                        <span className="fw-bold me-2" style={{ minWidth: '120px' }}>Invoice Date</span>
                                        <span>: {invoiceDetails.Salesinvoicesdate ? new Date(invoiceDetails.Salesinvoicesdate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</span>
                                    </Col>
                                </Row>
                                <Row className="mb-2">
                                    <Col md={6} className="d-flex">
                                        <span className="fw-bold me-2" style={{ minWidth: '120px' }}>Total Amount</span>
                                        <span>: {invoiceDetails.TotalAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                    </Col>
                                    <Col md={6} className="d-flex">
                                        <span className="fw-bold me-2" style={{ minWidth: '120px' }}>PO No</span>
                                        <span>: {invoiceDetails.PONumber || '-'}</span>
                                    </Col>
                                </Row>
                            </div>
                            <DataTable
                                value={invoiceDetails.Items || []}
                                className="p-datatable-sm p-datatable-gridlines"
                                responsiveLayout="scroll"
                            >

                                <Column field="GasName" header="Description" body={(r) => r.GasName || r.ItemName || "Item"} />
                                <Column field="PickedQty" header="Qty" className="text-end" />
                                <Column field="UnitPrice" header="Unit Price" className="text-end" body={(r) => r.UnitPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                <Column field="TotalPrice" header="Total" className="text-end" body={(r) => r.TotalPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                            </DataTable>

                            <div className="text-end mt-3">
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowInvoiceDialog(false)}>Close</button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-3 text-muted">No details found for this invoice.</div>
                    )}
                </Dialog>

                <Tooltip 
                    target=".custom-tooltip-target" 
                    mouseTrack 
                    mouseTrackLeft={10} 
                    style={{ 
                        fontSize: '15px', 
                        maxWidth: '300px' 
                    }}
                    contentStyle={{
                        backgroundColor: '#ffffff',
                        color: '#333333',
                        padding: '10px 15px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        fontWeight: '500'
                    }}
                />
            </Container>
        </div>
    );
};

export default BankBook;