import React, { useState, useEffect } from "react";
import { Card, CardBody, Col, Container, Row } from "reactstrap";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { FilterMatchMode } from "primereact/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toast } from "react-toastify";
import Select from "react-select";
import axios from "axios";
import { PYTHON_API_URL } from "common/pyapiconfig";
import { GetBankList } from "common/data/mastersapi";

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

// Shared style: force React Select to the same height as Bootstrap controls (38px)
const selectSm = {
    control: (base) => ({ ...base, minHeight: "38px", height: "38px", fontSize: "14px" }),
    valueContainer: (base) => ({ ...base, padding: "0 8px" }),
    indicatorsContainer: (base) => ({ ...base, height: "38px" }),
    dropdownIndicator: (base) => ({ ...base, padding: "8px" }),
    clearIndicator: (base) => ({ ...base, padding: "8px" }),
    container: (base) => ({ ...base, width: "100%" }),
};

const CashBook = () => {
    const firstDayOfMonth = formatDate(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const today = formatDate(new Date());

    const [cashBook, setCashBook] = useState([]);
    const [loading, setLoading] = useState(false);
    const [globalFilter, setGlobalFilter] = useState("");
    const [filters, setFilters] = useState({
        description: { value: null, matchMode: FilterMatchMode.CONTAINS },
        voucherNo: { value: null, matchMode: FilterMatchMode.CONTAINS },
        transactionType: { value: null, matchMode: FilterMatchMode.CONTAINS },
        party: { value: null, matchMode: FilterMatchMode.CONTAINS },
        date: { value: null, matchMode: FilterMatchMode.DATE_IS },
    });


    const [fromDate, setFromDate] = useState(firstDayOfMonth);
    const [toDate, setToDate] = useState(today);

    // --- NEW: CASH ACCOUNT FILTER ---
    const [cashAccounts, setCashAccounts] = useState([]);
    const [selectedCashAccount, setSelectedCashAccount] = useState(null);

    const fetchCashBook = async () => {
        try {
            setLoading(true);
            setCashBook([]);

            // Use the Python API Report Endpoint
            const response = await axios.get(`${PYTHON_API_URL}/AR/cash/get-report`, {
                params: {
                    from_date: fromDate || null,
                    to_date: toDate || null,
                    bank_id: selectedCashAccount ? selectedCashAccount.value : 0
                }
            });

            const resultData = response.data?.data || [];



            const transformed = resultData.map((item) => ({
                date: item.Date ? new Date(item.Date) : null,
                voucherNo: item.VoucherNo || "-",
                transactionType: item.TransactionType || "-",
                party: item.Party || "-",
                description: item.Description || "-",

                actamount: item.NetAmount,
                cashIn: parseFloat(item.CashIn || 0),
                cashOut: parseFloat(item.CashOut || 0),
                balance: parseFloat(item.Balance || 0),
            }));

            setCashBook(transformed);
        } catch (error) {
            toast.error("Error fetching cash book data.");
        } finally {
            setLoading(false);
        }
    };

    const loadCashAccounts = async () => {
        const data = await GetBankList(1, 1);
        const options = data.map(item => ({
            value: item.value,
            label: item.BankName
        }));
        setCashAccounts(options);
    };



    useEffect(() => {
        loadCashAccounts();
        fetchCashBook();
    }, []);



    const exportToExcel = () => {
        const exportData = cashBook.map((ex) => ({
            Date: ex.date ? ex.date.toLocaleDateString() : "",
            "Voucher No": ex.voucherNo,
            "Transaction Type": ex.transactionType,
            "Party / Account": ex.party,

            "Cash In (IDR)": ex.cashIn,
            "Cash Out (IDR)": ex.cashOut,
            "Balance (IDR)": ex.balance,
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Cash Book");
        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        saveAs(data, `CashBook-${new Date().toISOString().slice(0, 10)}.xlsx`);
    };

    const handlePrint = () => {
        const tableHTML = document.getElementById("print-section").innerHTML;
        const from = formatPrintDate(fromDate);
        const to = formatPrintDate(toDate);

        const printWindow = window.open("", "_blank");
        printWindow.document.write(`
            <html>
                <head>
                    <title>Cash Book</title>
                    <style>
                        body { font-family: Arial, sans-serif; font-size: 10px; margin: 20px; }
                        h2 { text-align: center; font-size: 12px; margin-bottom: 5px; }
                        p { text-align: center; font-size: 10px; margin-bottom: 10px; }
                        table { width: 100%; border-collapse: collapse; font-size: 9px; }
                        th, td { padding: 5px; border: 1px solid #ccc; text-align: left; }
                        th { background-color: #f8f8f8; }
                        .text-end { text-align: right; }
                    </style>
                </head>
                <body>
                    <h2>Cash Book Report</h2>
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
        setSelectedCashAccount(null);
        setFromDate(firstDayOfMonth);
        setToDate(today);
        setFilters({
            description: { value: null, matchMode: FilterMatchMode.CONTAINS },
            voucherNo: { value: null, matchMode: FilterMatchMode.CONTAINS },
            transactionType: { value: null, matchMode: FilterMatchMode.CONTAINS },
            party: { value: null, matchMode: FilterMatchMode.CONTAINS },
            date: { value: null, matchMode: FilterMatchMode.DATE_IS },
        });
        setGlobalFilter("");
        setTimeout(() => fetchCashBook(), 100);
    };

    const dateBodyTemplate = (rowData) => {
        return formatPrintDate(rowData.date);
    };

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="Cash Book" />

                {/* Filter & Buttons Section — all in one line */}
                <Row className="pt-2 pb-3 align-items-center g-2">
                    <Col md="4">
                        <Select
                            options={cashAccounts}
                            placeholder="Cash Account"
                            value={selectedCashAccount}
                            onChange={setSelectedCashAccount}
                            isClearable
                            styles={selectSm}
                        />
                    </Col>
                    <Col md="2">
                        <input
                            type="date"
                            className="form-control"
                            value={fromDate ?? ""}
                            onChange={(e) => setFromDate(e.target.value)}
                            max={toDate}
                            style={{ height: "38px" }}
                        />
                    </Col>
                    <Col md="2">
                        <input
                            type="date"
                            className="form-control"
                            value={toDate ?? ""}
                            onChange={(e) => setToDate(e.target.value)}
                            min={fromDate}
                            max={today}
                            style={{ height: "38px" }}
                        />
                    </Col>
                    <Col md="4" className="d-flex gap-1 align-items-center">
                        <button type="button" className="btn btn-primary" style={{ color: "#fff", height: "38px", fontSize: "13px", padding: "0 12px", whiteSpace: "nowrap" }} onClick={fetchCashBook}>
                            <i className="bx bx-search me-1"></i>Search
                        </button>
                        <button type="button" className="btn btn-danger" style={{ color: "#fff", height: "38px", fontSize: "13px", padding: "0 12px", whiteSpace: "nowrap" }} onClick={handleCancelFilters}>
                            <i className="bx bx-x me-1"></i>Cancel
                        </button>
                        <button type="button" className="btn btn-info" style={{ color: "#fff", height: "38px", fontSize: "13px", padding: "0 12px", whiteSpace: "nowrap" }} onClick={handlePrint}>
                            <i className="bx bx-printer me-1"></i>Print
                        </button>
                        <button type="button" className="btn btn-secondary" style={{ color: "#fff", height: "38px", fontSize: "13px", padding: "0 12px", whiteSpace: "nowrap" }} onClick={exportToExcel}>
                            <i className="bx bx-export me-1"></i>Excel
                        </button>
                    </Col>
                </Row>

                {/* Data Table */}
                <Row>
                    <Col lg="12">
                        <Card>
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
                                    value={cashBook}
                                    loading={loading}
                                    paginator
                                    rows={20}
                                    filters={filters}
                                    onFilter={(e) => setFilters(e.filters)}
                                    globalFilter={globalFilter}
                                    globalFilterFields={["date", "GLcode", "description", "voucherNo", "party", "transactionType", "cashIn", "cashOut", "balance"]}
                                    emptyMessage="No records found."
                                    showGridlines
                                    filterDisplay="menu"
                                    filter
                                >
                                    <Column field="date" header="Date" body={dateBodyTemplate} />
                                    <Column field="voucherNo" header="Voucher No" filter filterPlaceholder="Search Voucher" />
                                    <Column field="transactionType" header="Transaction Type" filter filterPlaceholder="Search Type" />
                                    <Column field="party" header="Party / Account" filter filterPlaceholder="Search Party" />
                                    <Column field="description" header="Description" filter filterPlaceholder="Search Description" />


                                    <Column field="cashIn" header="Cash In (IDR)" body={(d) => d.cashIn.toLocaleString('en-US', {
                                        style: 'decimal',
                                        minimumFractionDigits: 2
                                    })} className="text-end" />
                                    <Column field="cashOut" header="Cash Out (IDR)" body={(d) => d.cashOut.toLocaleString('en-US', {
                                        style: 'decimal',
                                        minimumFractionDigits: 2
                                    })} className="text-end" />
                                    <Column field="balance" header="Balance (IDR)" body={(d) => d.balance.toLocaleString('en-US', {
                                        style: 'decimal',
                                        minimumFractionDigits: 2
                                    })} className="text-end" />
                                </DataTable>

                                <div id="print-section" style={{ display: "none" }}>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>S.No.</th>
                                                <th>Date</th>
                                                <th>Voucher No</th>
                                                <th>Transaction Type</th>
                                                <th>Party / Account</th>
                                                <th>Description</th>
                                                <th>Cash In (IDR)</th>
                                                <th>Cash Out (IDR)</th>
                                                <th>Balance (IDR)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {cashBook.map((item, index) => (
                                                <tr key={index}>
                                                    <td>{index + 1}</td>
                                                    <td>{formatPrintDate(item.date)}</td>
                                                    <td>{item.voucherNo}</td>
                                                    <td>{item.transactionType}</td>
                                                    <td>{item.party}</td>
                                                    <td>{item.description}</td>
                                                    <td className="text-end">{item.cashIn.toLocaleString('en-US', {
                                                        style: 'decimal',
                                                        minimumFractionDigits: 2
                                                    })}</td>
                                                    <td className="text-end">{item.cashOut.toLocaleString('en-US', {
                                                        style: 'decimal',
                                                        minimumFractionDigits: 2
                                                    })}</td>
                                                    <td className="text-end">{item.balance.toLocaleString('en-US', {
                                                        style: 'decimal',
                                                        minimumFractionDigits: 2
                                                    })}</td>
                                                </tr>
                                            ))}
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

export default CashBook;