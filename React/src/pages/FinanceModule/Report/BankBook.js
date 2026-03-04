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
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import { GetBankList } from "common/data/mastersapi";
import { useHistory } from 'react-router-dom';
import axios from "axios";
import { PYTHON_API_URL } from "common/pyapiconfig";

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

            // --- AUTO SELECT CURRENCY LOGIC ---
            if (bankid) {
                const selectedBank = btgBankOptions.find(opt => opt.value === bankid);
                if (selectedBank) {
                    const bankName = selectedBank.label;
                    let targetCurrency = uniqueCurrency.find(c => bankName.includes(c.value));

                    if (!targetCurrency) {
                        const commonCurrencies = ["IDR", "SGD", "USD", "EUR", "AUD", "JPY", "CNY"];
                        const match = commonCurrencies.find(c => bankName.includes(c));
                        if (match) {
                            targetCurrency = { label: match, value: match };
                        }
                    }
                    if (targetCurrency) {
                        setCurrency(targetCurrency);
                    }
                }
            } else {
                setCurrency(null);
            }

            const transformed = resultData.map((item) => ({
                date: item.Date ? new Date(item.Date) : null,
                voucherNo: item.VoucherNo ? item.VoucherNo.split(" - ")[0] : "-",
                transactionType: item.TransactionType || "-",
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

    const filtered = currency
        ? bankBook.filter(item => item.currency === currency.value)
        : bankBook;

    const exportToExcel = () => {
        const hasOverdraft = filtered.some(ex => ex.overdraftLimit > 0);

        const exportData = filtered.map((ex) => {
            const row = {
                Date: ex.date ? ex.date.toLocaleDateString() : "",
                "Reference No": ex.voucherNo,
                "Transaction Type": ex.transactionType,
                "Party": ex.party,
                "Debit Out (IDR)": ex.debitOut,
                "Credit In (IDR)": ex.creditIn,
                "Balance (IDR)": ex.balance,
            };

            if (hasOverdraft) {
                row["OVER DRAFT"] = ex.overdraft;
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
                                    <Column field="voucherNo" header="Reference No" filter filterPlaceholder="Search Reference" />
                                    <Column field="transactionType" header="Transaction Type" filter filterPlaceholder="Search Type" />
                                    <Column field="party" header="Party" filter filterPlaceholder="Search Party" />

                                    {/* Debit First */}
                                    <Column field="debitOut" header="Debit" body={(d) => d.debitOut.toLocaleString('en-US', {
                                        style: 'decimal',
                                        minimumFractionDigits: 2
                                    })} className="text-end" />

                                    {/* Credit Second */}
                                    <Column field="creditIn" header="Credit" body={(d) => d.creditIn.toLocaleString('en-US', {
                                        style: 'decimal',
                                        minimumFractionDigits: 2
                                    })} className="text-end" />

                                    <Column field="balance" header="Balance" body={(d) => d.balance.toLocaleString('en-US', {
                                        style: 'decimal',
                                        minimumFractionDigits: 2
                                    })} className="text-end" />

                                    {filtered.some(ex => ex.overdraftLimit > 0) && (
                                        <Column field="overdraft" header="OVER DRAFT" body={(d) => {
                                            if (d.overdraftLimit > 0) {
                                                const val = d.overdraft;
                                                return val < 0 ? `(${Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2 })})` : <span style={{ color: 'red' }}>{val.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>;
                                            }
                                            return "";
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
                                                <th>D</th>
                                                <th>C</th>
                                                <th>Balance (IDR)</th>
                                                {filtered.some(ex => ex.overdraftLimit > 0) && (
                                                    <th>OVER DRAFT</th>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filtered.map((item, index) => {
                                                return (
                                                    <tr key={index}>
                                                        <td>{index + 1}</td>
                                                        <td>{formatPrintDate(item.date)}</td>
                                                        <td>{item.voucherNo}</td>
                                                        <td>{item.transactionType}</td>
                                                        <td>{item.party}</td>
                                                        <td className="text-end">{item.debitOut.toLocaleString('en-US', {
                                                            style: 'decimal',
                                                            minimumFractionDigits: 2
                                                        })}</td>
                                                        <td className="text-end">{item.creditIn.toLocaleString('en-US', {
                                                            style: 'decimal',
                                                            minimumFractionDigits: 2
                                                        })}</td>
                                                        <td className="text-end">{item.balance.toLocaleString('en-US', {
                                                            style: 'decimal',
                                                            minimumFractionDigits: 2
                                                        })}</td>
                                                        {filtered.some(ex => ex.overdraftLimit > 0) && (
                                                            <td className={`text-end ${item.overdraft >= 0 ? 'text-red' : ''}`}>
                                                                {item.overdraftLimit > 0 ? (item.overdraft < 0 ? `(${Math.abs(item.overdraft).toLocaleString('en-US', { minimumFractionDigits: 2 })})` : item.overdraft.toLocaleString('en-US', { minimumFractionDigits: 2 })) : ""}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default BankBook;