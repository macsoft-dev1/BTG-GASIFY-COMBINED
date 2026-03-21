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
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import { GetBankList, ClaimAndPaymentGetById } from "common/data/mastersapi";
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
        const voucherNo = row.VoucherNo;
        const receiptId = row.receipt_id;
        const isClaim = voucherNo?.startsWith("CLM");

        setShowClaimDetailModal(true);
        setLoadingClaimDetail(true);
        setClaimDetailData(null);

        try {
            if (isClaim) {
                // Extract numeric ID from CLM000XXXX or similar
                const claimId = parseInt(voucherNo?.replace(/\D/g, ''), 10);
                if (!claimId || isNaN(claimId)) {
                    toast.error("Invalid claim reference format.");
                    setLoadingClaimDetail(false);
                    return;
                }

                const res = await ClaimAndPaymentGetById(claimId, 1, 1);
                // API returns 'header' (lowercase), but code used 'Header' (PascalCase)
                const dataObj = res?.data || {};
                const header = dataObj.header || dataObj.Header;
                const details = dataObj.details || dataObj.Details || [];
                const firstDetail = details[0] || {};

                if (res?.status && header) {
                    setClaimDetailData({
                        IsClaim: true,
                        ...header,
                        ClaimPaymentId: header.ClaimId,
                        FormNo: header.ApplicationNo,
                        Date: header.ApplicationDate, // API uses ApplicationDate
                        CategoryName: header.claimcategory || header.CategoryName,
                        ExpenseType: firstDetail.claimtype || header.claimcategory || "-",
                        ExpenseDescription: firstDetail.Purpose || header.Remarks || "-",
                        TotalPaymentRequest: header.TotalAmountInIDR || header.ClaimAmountInTC,
                        Who: header.applicantname || header.ApplicantName,
                        Whom: header.SupplierName || header.suppliername || "-",
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
                    setClaimDetailData({
                        IsReceipt: true,
                        FormNo: data.receipt_no || voucherNo,
                        Date: data.receipt_date,
                        CustomerName: data.customer_name || row.Party || "-",
                        TotalAmount: (parseFloat(data.cash_amount) || 0) + (parseFloat(data.bank_amount) || 0) + (parseFloat(data.contra_amount) || 0),
                        PaymentMethod: data.bank_payment_via === 1 ? "Cheque" : (data.bank_payment_via === 4 ? "Cash" : "Bank Transfer"),
                        BankName: data.bank_name || "-",
                        Currency: data.CurrencyCode || "IDR",
                        ChequeNo: data.cheque_number || "-",
                        InvoiceNo: data.reference_no || "-"
                    });
                } else {
                    setClaimDetailData({ error: "No receipt details found.", VoucherNo: voucherNo });
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
                    from_date: fromDate || null,
                    to_date: toDate || null,
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
                voucherNo: item.VoucherNo ? item.VoucherNo.split(" - ")[0] : "-",
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
            if (item.transactionType === "OPENING BALANCE") {
                // Remove opening balance if its date is not in relevant date range
                // Usually skip if date is not defined or before fromDate
                const rowDate = item.date ? formatDate(item.date) : null;
                if (fromDate && rowDate && rowDate < fromDate) return false;
            }
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
                row["OVER DRAFT"] = val < 0 ? `- ${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : val.toLocaleString('en-US', { minimumFractionDigits: 2 });
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
                        <input
                            type="date"
                            className="form-control"
                            value={fromDate ?? ""}
                            onChange={(e) => setFromDate(e.target.value)}
                            max={toDate}
                        />
                    </Col>

                    <Col md="3">
                        <input
                            type="date"
                            className="form-control"
                            value={toDate ?? ""}
                            onChange={(e) => setToDate(e.target.value)}
                            min={fromDate}
                            max={today}
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
                                            if (rowData.groupedClaims && rowData.groupedClaims.length > 0) {
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
                                            return <span style={{ color: color }}>{val < 0 ? `- ${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : val.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>;
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
                                                                        ? ((item.overdraftLimit - item.balance) < 0 ? `- ${Math.abs(item.overdraftLimit - item.balance).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : (item.overdraftLimit - item.balance).toLocaleString('en-US', { minimumFractionDigits: 2 }))
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
                                    style={{ width: '40vw' }}
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
                                                    header="Receipt Number" 
                                                    body={(r) => {
                                                        const match = r.VoucherNo?.match(/(.*?)\s*\(Inv:\s*(.*?)\)/);
                                                        const receiptNo = match ? match[1] : (r.VoucherNo?.split(" - ")[0] || "-");
                                                        return (
                                                            <span
                                                                className="text-primary fw-bold"
                                                                style={{ cursor: "pointer", textDecoration: "underline" }}
                                                                onClick={() => fetchRecordDetail(r)}
                                                            >
                                                                {receiptNo}
                                                            </span>
                                                        );
                                                    }}
                                                />
                                                <Column 
                                                    header="Relevant Invoice" 
                                                    body={(r) => {
                                                        const match = r.VoucherNo?.match(/\(Inv:\s*(.*?)\)/);
                                                        const invoiceNo = match ? match[1] : "-";
                                                        return invoiceNo !== "-" ? (
                                                            <span
                                                                className="text-info fw-bold"
                                                                style={{ cursor: "pointer", textDecoration: "underline" }}
                                                                onClick={() => handleInvoiceClick(invoiceNo)}
                                                            >
                                                                {invoiceNo}
                                                            </span>
                                                        ) : "-";
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
                                    header={`Transaction Details: ${claimDetailData?.FormNo || claimDetailData?.VoucherNo || ''}`}
                                    visible={showClaimDetailModal}
                                    style={{ width: "45vw" }}
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
                                                .detail-table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
                                                .detail-table th, .detail-table td { padding: 8px 12px; border: 1px solid #eee; text-align: left; }
                                                .detail-table th { background-color: #f8f9fa; width: 35%; color: #495057; font-weight: 600; }
                                                .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
                                                .status-posted { background-color: #d4edda; color: #155724; }
                                                .status-saved { background-color: #fff3cd; color: #856404; }
                                                .header-info-box { background: #f0f4f8; padding: 12px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #5584d4; }
                                            `}</style>

                                            <div className="header-info-box d-flex justify-content-between">
                                                <div>
                                                    <div className="text-muted small text-uppercase fw-bold">Receipt Number</div>
                                                    <div className="fs-5 fw-bold text-primary">{claimDetailData.FormNo || "-"}</div>
                                                </div>
                                                <div className="text-end">
                                                    <div className="text-muted small text-uppercase fw-bold">Date</div>
                                                    <div className="fs-5 fw-bold">{claimDetailData.Date ? formatPrintDate(claimDetailData.Date) : "-"}</div>
                                                </div>
                                            </div>

                                            <table className="detail-table">
                                                <tbody>
                                                    {claimDetailData.IsClaim ? (
                                                        <>
                                                            <tr>
                                                                <th>Category</th>
                                                                <td>{claimDetailData.CategoryName || "-"}</td>
                                                            </tr>
                                                            <tr>
                                                                <th>Expense Type</th>
                                                                <td>{claimDetailData.ExpenseType || "-"}</td>
                                                            </tr>
                                                            <tr>
                                                                <th>Description</th>
                                                                <td>{claimDetailData.ExpenseDescription || claimDetailData.Description || "-"}</td>
                                                            </tr>
                                                            <tr>
                                                                <th>Amount</th>
                                                                <td className="fw-bold fs-6">
                                                                    {claimDetailData.Currency || 'IDR'} {parseFloat(claimDetailData.TotalPaymentRequest || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                                                </td>
                                                            </tr>
                                                            <tr>
                                                                <th>Party (Payer/Receiver)</th>
                                                                <td>{claimDetailData.Who || "-"}</td>
                                                            </tr>
                                                            <tr>
                                                                <th>To</th>
                                                                <td>{claimDetailData.Whom || "-"}</td>
                                                            </tr>
                                                            <tr>
                                                                <th>Status</th>
                                                                <td>
                                                                    <span className={`status-badge ${claimDetailData.Status === "Posted" ? "status-posted" : "status-saved"}`}>
                                                                        {claimDetailData.Status}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <tr>
                                                                <th>Customer</th>
                                                                <td>{claimDetailData.CustomerName || "-"}</td>
                                                            </tr>
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
                                                            <tr>
                                                                <th>Invoice Number</th>
                                                                <td>{claimDetailData.InvoiceNo || "-"}</td>
                                                            </tr>
                                                            {claimDetailData.ChequeNo && claimDetailData.ChequeNo !== "-" && (
                                                                <tr>
                                                                    <th>Cheque/Giro No</th>
                                                                    <td>{claimDetailData.ChequeNo}</td>
                                                                </tr>
                                                            )}
                                                        </>
                                                    )}
                                                </tbody>
                                            </table>
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
                                <Column field="gascodeid" header="Item Code" />
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
            </Container>
        </div>
    );
};

export default BankBook;