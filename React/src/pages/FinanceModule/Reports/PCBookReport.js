import React, { useState, useRef, useMemo, useEffect } from "react";
import { Container, Row, Col, Card, CardBody, Label } from "reactstrap";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_green.css";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { toast } from "react-toastify";
import axios from "axios";
import { PYTHON_API_URL } from "../../../common/pyapiconfig";
import { Dialog } from "primereact/dialog";
import { Tag } from "primereact/tag"; // Match target page
import { ClaimAndPaymentGetById, getPettyCashCurrency, getPettyCashCategories, getPettyCashExpenseTypes, getPettyCashById, DownloadFileById, GetAllClaimAndPayment } from "../../../common/data/mastersapi";
import Select from "react-select";

const generateDailyVoucherID = (dateInput) => {
    if (!dateInput) return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `PCV-${year}${month}${day}`;
};

const PCBookReport = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const [pcData, setPcData] = useState([]);
    const [fromDate, setFromDate] = useState(firstDay);
    const [toDate, setToDate] = useState(today);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loadingData, setLoadingData] = useState(false);
    const [partyFilter, setPartyFilter] = useState("");
    const [currencyOptions, setCurrencyOptions] = useState([]);
    const [selectedCurrency, setSelectedCurrency] = useState(null);
    const [printModalVisible, setPrintModalVisible] = useState(false);
    const [printData, setPrintData] = useState([]);
    const [printVoucherId, setPrintVoucherId] = useState("");
    const [typeMap, setTypeMap] = useState({});
    const [categoryMap, setCategoryMap] = useState({}); // New state for category names
    const [printFilter, setPrintFilter] = useState("expenses"); // 'expenses' or 'transfer'
    const [pcDetailVisible, setPcDetailVisible] = useState(false);
    const [selectedPcDetail, setSelectedPcDetail] = useState(null);
    const [claimDetailVisible, setClaimDetailVisible] = useState(false);
    const [selectedClaimDetail, setSelectedClaimDetail] = useState(null);
    const [sortField, setSortField] = useState(null);
    const [sortOrder, setSortOrder] = useState(null);

    const dtRef = useRef(null);
    const printAreaRef = useRef(null);

    // openPrintModal was removed and shifted to ManageExpense screen.
    // Top-level Print button now groups and prints all filtered data.

    const handlePrintVoucher = () => {
        const printContent = document.getElementById("printableVoucherArea");
        const WindowPrt = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');
        WindowPrt.document.write(`
            <html>
                <head>
                    <title>Petty Cash Voucher - ${printVoucherId}</title>
                    <style>
                        body { font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
                        .header { border-bottom: 2px solid #333; margin-bottom: 30px; padding-bottom: 15px; position: relative; }
                        .print-time { position: absolute; right: 0; top: -20px; font-size: 11px; color: #888; }
                        .title { font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #000; margin: 0; }
                        
                        .metadata-container { display: flex; justify-content: space-between; margin-bottom: 30px; background: #fcfcfc; padding: 20px; border: 1px solid #eee; border-radius: 4px; }
                        .metadata-column { flex: 1; }
                        .metadata-item { display: flex; margin-bottom: 8px; font-size: 13px; }
                        .metadata-label { width: 140px; font-weight: 600; color: #555; position: relative; }
                        .metadata-label::after { content: ":"; position: absolute; right: 15px; }
                        .metadata-value { font-weight: 500; color: #000; flex: 1; }

                        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                        th { background-color: #f4f4f4; color: #333; font-weight: 700; border: 1px solid #ddd; padding: 12px 10px; text-transform: uppercase; font-size: 11px; }
                        td { border: 1px solid #eee; padding: 10px; text-align: left; }
                        tr:nth-child(even) { background-color: #fafafa; }
                        
                        .text-end { text-align: right; }
                        .fw-bold { font-weight: 700; }
                        
                        @media print {
                            body { padding: 0; }
                            .metadata-container { border: 1px solid #ddd; -webkit-print-color-adjust: exact; }
                            th { background-color: #f4f4f4 !important; -webkit-print-color-adjust: exact; }
                        }
                    </style>
                </head>
                <body>
                    ${printContent.innerHTML}
                </body>
            </html>
        `);
        WindowPrt.document.close();
        WindowPrt.focus();
        setTimeout(() => {
            WindowPrt.print();
            WindowPrt.close();
        }, 500);
    };

    const fetchPCBook = async () => {
        if (!fromDate || !toDate) {
            toast.warning("Please select both From and To dates");
            return;
        }
        setLoadingData(true);
        try {
            const from = fromDate ? format(fromDate, "yyyy-MM-dd") : "";
            const to = toDate ? format(toDate, "yyyy-MM-dd") : "";
            const curId = selectedCurrency ? selectedCurrency.value : 0;
            let openingBalance = 0;

            const [response, typesData, categoriesData] = await Promise.all([
                axios.get(`${PYTHON_API_URL}/pettycash/list?orgid=1&branchid=1&FromDate=${from}&ToDate=${to}&currencyid=${curId}`),
                getPettyCashExpenseTypes(1, 1), // orgid=1, branchid=1
                getPettyCashCategories(1, 1)
            ]);

            const tMap = {};
            if (typesData) {
                typesData.forEach(t => tMap[t.id] = t.expense_type);
            }
            setTypeMap(tMap);

            const cMap = {};
            if (categoriesData) {
                categoriesData.forEach(c => cMap[c.id] = c.category_name);
            }
            setCategoryMap(cMap);

            const result = response.data;
            if (result.status && result.data) {
                // Filter: Show only posted entries OR any CLM claim entries
                result.data = result.data.filter(item =>
                    item.issubmitted === 1 ||
                    item.issubmitted === true ||
                    item.IsSubmitted === 1 ||
                    item.IsSubmitted === true ||
                    (item.pc_number && item.pc_number.startsWith("CLM"))
                );
            }

            let allItems = result.data.map(item => {
                const isClaim = item.pc_number && item.pc_number.startsWith("CLM");
                return {
                    ...item,
                    isClaim,
                    expenseTypename: isClaim ? "-" : (tMap[item.expense_type_id] || item.expense_type || "-"),
                    categoryName: isClaim ? "-" : (cMap[item.category_id] || item.category_name || "-")
                };
            });

            // Debug: log detected transfer rows (category_id === 6 or categoryName contains 'transfer')
            try {
                const transferRows = allItems.filter(it =>
                    it.category_id === 6 ||
                    (it.categoryName && String(it.categoryName).toLowerCase().includes("transfer")) ||
                    (it.description && String(it.description).toLowerCase().includes("transfer"))
                );
                console.log("PCBookReport (Reports) - detected transfer rows:", transferRows.length, transferRows.slice(0, 10));
            } catch (e) {
                console.debug("PCBookReport (Reports) - transfer log error:", e);
            }
            
            // 2. Filter by date FIRST
            if (fromDate && toDate) {
                const f = new Date(fromDate); f.setHours(0, 0, 0, 0);
                const t = new Date(toDate); t.setHours(23, 59, 59, 999);
                allItems = allItems.filter(row => {
                    const rd = new Date(row.expdate || row.ExpDate);
                    return rd >= f && rd <= t;
                });
            }

            // 3. Custom Sorting: Opening Balance at top, then Others by Reference DESC
            const openingBalanceRow = allItems.find(item => 
                (item.pc_number && item.pc_number.toUpperCase().includes("OPENING")) ||
                (item.description && item.description.toUpperCase().includes("OPENING BALANCE"))
            );
            const others = allItems.filter(item => item !== openingBalanceRow);

            // Sort others by Date DESC, then Reference No ASC
            others.sort((a, b) => {
                const dateA = new Date(a.expdate || a.ExpDate);
                const dateB = new Date(b.expdate || b.ExpDate);
                
                if (dateB - dateA !== 0) {
                    return dateB - dateA; // Date DESC
                }
                
                const refA = a.pc_number || "";
                const refB = b.pc_number || "";
                return refA.localeCompare(refB, undefined, { numeric: true, sensitivity: 'base' }); // Ref ASC
            });

            const finalSorted = openingBalanceRow ? [openingBalanceRow, ...others] : others;

            let processed = finalSorted.map((row) => {
                const amount = parseFloat(row.amount || row.Amount) || 0;
                // Treat category_id === 6 (Transfer) as Debit as well
                const rawDesc = (row.expensedescription || row.ExpenseDescription || row.description || row.Description || row.remarks || row.Remarks || "").toUpperCase();
                const isDebit = (
                    row.category_id == 1 ||
                    rawDesc.includes("OPENING")
                );

                const debit = isDebit ? amount : 0;
                const credit = isDebit ? 0 : amount;
                
                let amountidr = parseFloat(row.amountidr || row.AmountIDR || 0);
                if (amountidr === 0 && (selectedCurrency?.label === "IDR" || (row.pc_number && row.pc_number.startsWith("CLM")))) {
                    amountidr = amount;
                }

                return {
                    ...row,
                    debit,
                    credit,
                    amount,
                    amountidr,
                    dailyVoucher: row.dailyvoucher || row.dailyVoucher || generateDailyVoucherID(row.expdate || row.ExpDate),
                    COA: row.coa || row.COA || row.account_name || "",
                    description: row.expensedescription || row.ExpenseDescription || row.description || row.Description || row.remarks || row.Remarks || ""
                };
            });

            setPcData(processed);
        } catch (err) {
            console.error("Error fetching PC Book:", err);
            toast.error("Failed to load Petty Cash data.");
            setPcData([]);
        } finally {
            setLoadingData(false);
        }
    };

    const loadCurrencies = async () => {
        try {
            const res = await getPettyCashCurrency(1, 1);
            const allowed = ['IDR', 'USD', 'MYR', 'SGD', 'CNY'];
            const options = res
                .filter(c => allowed.includes(c.CurrencyCode || c.currency_code || c.Currency || c.currency))
                .map(c => ({
                    value: c.CurrencyId || c.currencyid || c.id,
                    label: c.Currency || c.CurrencyCode || c.currency || c.currency_code
                }));
            setCurrencyOptions(options);
            const idr = options.find(o => o.label === "IDR");
            if (idr) setSelectedCurrency(idr);
        } catch (err) {
            console.error("Failed to load currencies", err);
        }
    };

    useEffect(() => {
        loadCurrencies();
    }, []);

    const processedPcData = useMemo(() => {
        let items = [...pcData];

        // 1. Filter
        if (globalFilter) {
            const lowFilter = globalFilter.toLowerCase();
            items = items.filter(item => {
                return (
                    (item.pc_number && item.pc_number.toLowerCase().includes(lowFilter)) ||
                    (item.description && item.description.toLowerCase().includes(lowFilter)) ||
                    (item.dailyVoucher && item.dailyVoucher.toLowerCase().includes(lowFilter))
                );
            });
        }

        // 2. Sort
        // Separate Opening Balance to always keep it at the top
        const openingBalanceRow = items.find(item => 
            (item.pc_number && item.pc_number.toUpperCase().includes("OPENING")) ||
            (item.description && item.description.toUpperCase().includes("OPENING BALANCE"))
        );
        let others = items.filter(item => item !== openingBalanceRow);

        if (sortField) {
            others.sort((a, b) => {
                let valA = a[sortField];
                let valB = b[sortField];
                
                if (sortField === "expdate") {
                    valA = new Date(a.expdate || a.ExpDate).getTime();
                    valB = new Date(b.expdate || b.ExpDate).getTime();
                    
                    if (valA === valB) {
                        const refA = a.pc_number || "";
                        const refB = b.pc_number || "";
                        // Secondary sort by reference number ASC
                        const secondaryResult = refA.localeCompare(refB, undefined, { numeric: true, sensitivity: 'base' });
                        // If we are sorting Date DESC, we need to negate the secondary result if we want it to stay ASC, 
                        // because the whole return value is negated at the end.
                        return sortOrder === 1 ? secondaryResult : -secondaryResult;
                    }
                }

                let result = 0;
                if (valA < valB) result = -1;
                else if (valA > valB) result = 1;

                return sortOrder === 1 ? result : -result;
            });
        }

        const finalSorted = openingBalanceRow ? [openingBalanceRow, ...others] : others;

        // 3. Recalculate cumulative
        let runningTotal = 0;
        return finalSorted.map(row => {
            runningTotal += (row.debit - row.credit);
            return { ...row, cumulativeAmount: runningTotal };
        });
    }, [pcData, globalFilter, sortField, sortOrder]);

    useEffect(() => {
        if (selectedCurrency && fromDate && toDate) {
            fetchPCBook();
        }
    }, [selectedCurrency, fromDate, toDate]);

    const totalDebit = processedPcData.reduce((sum, r) => sum + (r.debit || 0), 0);
    const totalCredit = processedPcData.reduce((sum, r) => sum + (r.credit || 0), 0);

    const exportExcel = () => {
        const exportData = processedPcData.map((item) => ({
            "Date": item.expdate || item.ExpDate,
            "Reference number": item.pc_number || "",
            "Description": item.description,
            "Debit (+)": item.debit,
            "Credit (-)": item.credit,
            "Cumulative Amount": item.cumulativeAmount,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "PC Book");
        XLSX.writeFile(wb, `PC_Book_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    };

    const fmtNum = (val) =>
        val != null
            ? Number(val).toLocaleString("en-US", { minimumFractionDigits: 2 })
            : "0.00";

    const handleReferenceClick = async (row) => {
        const ref = row.pc_number || "";
        if (ref.startsWith("CLM")) {
            setLoadingData(true);
            try {
                let claimId = null;

                // 1. Fetch ALL claims to find the one with matching claimno
                // This is required because the row is a Petty Cash record, so its IDs are PC IDs, not Claim IDs.
                const listRes = await GetAllClaimAndPayment(0, 0, 1, 1, 0);
                if (listRes?.status && listRes.data) {
                    const match = listRes.data.find(c => c.claimno === ref);
                    if (match) {
                        claimId = match.Claim_ID;
                    }
                }

                // Fallback to parsing digits from "CLM0001647" -> 1647 if not found in list
                if (!claimId) {
                    claimId = parseInt(ref.replace(/\D/g, ''), 10);
                }

                if (!claimId || isNaN(claimId)) {
                    toast.error("Claim ID could not be identified from reference number.");
                    setLoadingData(false);
                    return;
                }

                const res = await ClaimAndPaymentGetById(claimId, 1, 1);
                if (res && res.status) {
                    setSelectedClaimDetail(res.data);
                    setClaimDetailVisible(true);
                } else {
                    toast.error("Failed to fetch claim details");
                }
            } catch (err) {
                console.error("Error fetching claim details:", err);
                toast.error("Error loading claim info");
            } finally {
                setLoadingData(false);
            }
        } else if (ref.startsWith("PC")) {
            const pcId = row.petty_cash_id || row.pettycashid || row.id;
            if (!pcId) {
                toast.error("Petty Cash ID not found");
                return;
            }
            setLoadingData(true);
            try {
                const res = await getPettyCashById(pcId, 1, 1);
                if (res) {
                    setSelectedPcDetail({ ...res, dailyVoucher: row.dailyVoucher });
                    setPcDetailVisible(true);
                } else {
                    toast.error("Failed to fetch petty cash details");
                }
            } catch (err) {
                console.error("Error fetching petty cash details:", err);
                toast.error("Error loading petty cash info");
            } finally {
                setLoadingData(false);
            }
        }
    };

    const handleDownloadAttachment = async (path, filename) => {
        if (!path) return;
        try {
            const fileUrl = await DownloadFileById(0, path);
            // DownloadFileById often handles the open/download internally or returns a blob URL
        } catch (err) {
            console.error("Download failed:", err);
            toast.error("Failed to download attachment");
        }
    };

    const clearFilter = () => {
        setFromDate(firstDay);
        setToDate(today);
        setGlobalFilter("");
        setPartyFilter("");
        setSelectedCurrency(null);
    };

    const renderHeader = () => {
        return (
            <div className="row align-items-center g-3 clear-spa">
                <div className="col-12 col-lg-9">
                    <button type="button" className="btn btn-danger btn-label" onClick={clearFilter}>
                        <i className="mdi mdi-filter-off label-icon" /> Clear
                    </button>
                </div>
                <div className="col-12 col-lg-3">
                    <input
                        className="form-control"
                        type="search"
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder="Keyword Search"
                    />
                </div>
            </div>
        );
    };

    const header = renderHeader();

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="Petty Cash Book" />
                <Row>
                    <Col lg="12">
                        <Card className="shadow-sm">
                            <CardBody>
                                <Row className="mb-3 align-items-center g-2">
                                    <Col md="auto" className="d-flex align-items-center pe-1">
                                        <Label className="fw-bold mb-0 me-1 text-nowrap">From</Label>
                                        <Flatpickr
                                            className="form-control form-control-sm"
                                            value={fromDate}
                                            onChange={(date) => setFromDate(date[0])}
                                            options={{
                                                altInput: true,
                                                altFormat: "d-M-Y",
                                                dateFormat: "Y-m-d",
                                            }}
                                            style={{ width: "100px", height: "31px" }}
                                        />
                                    </Col>
                                    <Col md="auto" className="d-flex align-items-center pe-1">
                                        <Label className="fw-bold mb-0 me-1 text-nowrap">To</Label>
                                        <Flatpickr
                                            className="form-control form-control-sm"
                                            value={toDate}
                                            onChange={(date) => setToDate(date[0])}
                                            options={{
                                                altInput: true,
                                                altFormat: "d-M-Y",
                                                dateFormat: "Y-m-d",
                                            }}
                                            style={{ width: "100px", height: "31px" }}
                                        />
                                    </Col>
                                    <Col md="auto" className="d-flex align-items-center">
                                        <Label className="fw-bold mb-0 me-1 text-nowrap">Currency</Label>
                                        <Select
                                            options={currencyOptions}
                                            value={selectedCurrency}
                                            onChange={(opt) => setSelectedCurrency(opt)}
                                            isClearable
                                            placeholder="All"
                                            styles={{
                                                control: (base) => ({
                                                    ...base,
                                                    minHeight: '31px',
                                                    height: '31px',
                                                    fontSize: '12px',
                                                    width: '85px'
                                                }),
                                                valueContainer: (base) => ({
                                                    ...base,
                                                    padding: '0 4px',
                                                    height: '31px'
                                                }),
                                                indicatorsContainer: (base) => ({
                                                    ...base,
                                                    height: '31px'
                                                }),
                                                dropdownIndicator: (base) => ({
                                                    ...base,
                                                    padding: '2px'
                                                }),
                                                clearIndicator: (base) => ({
                                                    ...base,
                                                    padding: '2px'
                                                })
                                            }}
                                        />
                                    </Col>
                                    <Col md="auto" className="d-flex gap-1 ms-auto">
                                        <button
                                            type="button"
                                            className="btn btn-info"
                                            onClick={fetchPCBook}
                                            disabled={loadingData}
                                        >
                                            <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i>
                                            {loadingData ? "Loading..." : "Search"}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={exportExcel}
                                        >
                                            <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i>
                                            Export
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={() => { setPrintFilter("expenses"); setPrintModalVisible(true); }}
                                        >
                                            Expenses Print
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-success"
                                            onClick={() => { setPrintFilter("transfer"); setPrintModalVisible(true); }}
                                        >
                                            Cash Transfer Print
                                        </button>
                                    </Col>
                                </Row>
                                <Row className="mb-3 border-top pt-3">
                                    <Col md="4">
                                        <div className="d-flex align-items-center">
                                            <h5 className="mb-0 me-2 fw-bold text-dark">Total Debit:</h5>
                                            <h4
                                                className="mb-0 fw-bold"
                                                style={{ color: "green" }}
                                            >
                                                {fmtNum(totalDebit)}
                                            </h4>
                                        </div>
                                    </Col>
                                    <Col md="4">
                                        <div className="d-flex align-items-center">
                                            <h5 className="mb-0 me-2 fw-bold text-dark">Total Credit:</h5>
                                            <h4
                                                className="mb-0 fw-bold"
                                                style={{ color: "firebrick" }}
                                            >
                                                {fmtNum(totalCredit)}
                                            </h4>
                                        </div>
                                    </Col>
                                    <Col md="4">
                                        <div className="d-flex align-items-center">
                                            <h5 className="mb-0 me-2 fw-bold text-dark">Balance:</h5>
                                            <h4
                                                className="mb-0 fw-bold"
                                                style={{ color: "navy" }}
                                            >
                                                {fmtNum(totalDebit - totalCredit)}
                                            </h4>
                                        </div>
                                    </Col>
                                </Row>

                                <div className="mt-2">
                                    <DataTable
                                        ref={dtRef}
                                        value={processedPcData}
                                        paginator
                                        rows={10}
                                        header={header}
                                        loading={loadingData}
                                        sortField={sortField}
                                        sortOrder={sortOrder}
                                        onSort={(e) => {
                                            setSortField(e.sortField);
                                            setSortOrder(e.sortOrder);
                                        }}
                                        className="blue-bg"
                                        responsiveLayout="scroll"
                                        showGridlines
                                    >
                                        <Column
                                            field="expdate"
                                            header="Date"
                                            body={(row) => format(new Date(row.expdate || row.ExpDate), "dd-MMM-yyyy")}
                                            sortable
                                            className="text-left text-nowrap"
                                        />
                                        <Column
                                            field="pc_number"
                                            header="Reference"
                                            body={(row) => (
                                                <span
                                                    className="fw-bold cursor-pointer"
                                                    style={{ color: "blue", textDecoration: "underline", cursor: "pointer" }}
                                                    onClick={() => handleReferenceClick(row)}
                                                >
                                                    {row.pc_number || "N/A"}
                                                </span>
                                            )}
                                            sortable
                                            className="text-left"
                                            headerStyle={{ whiteSpace: "nowrap" }}
                                        />
                                        <Column
                                            field="dailyVoucher"
                                            header="PCV No"
                                            body={(row) => (
                                                <span className="text-muted">
                                                    {row.dailyVoucher}
                                                </span>
                                            )}
                                            sortable
                                            headerStyle={{ whiteSpace: "nowrap", minWidth: "130px" }}
                                            className="text-center"
                                        />
                                        <Column
                                            field="description"
                                            header="Description"
                                        />
                                        <Column
                                            field="debit"
                                            header="Debit"
                                            body={(r) => (
                                                <span style={{ color: "green" }}>
                                                    {r.debit > 0 ? fmtNum(r.debit) : ""}
                                                </span>
                                            )}
                                            className="text-end"
                                            sortable
                                        />
                                        <Column
                                            field="credit"
                                            header="Credit"
                                            body={(r) => (
                                                <span style={{ color: "firebrick" }}>
                                                    {r.credit > 0 ? fmtNum(r.credit) : ""}
                                                </span>
                                            )}
                                            className="text-end"
                                            sortable
                                        />
                                        <Column
                                            field="cumulativeAmount"
                                            header="Cumulative Amount"
                                            body={(r) => (
                                                <span
                                                    className="fw-bold"
                                                    style={{
                                                        color:
                                                            r.cumulativeAmount >= 0 ? "navy" : "firebrick",
                                                    }}
                                                >
                                                    {fmtNum(r.cumulativeAmount)}
                                                </span>
                                            )}
                                            className="text-end"
                                            headerStyle={{ whiteSpace: "nowrap" }}
                                        />
                                    </DataTable>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>

                <Dialog
                    header="Print Petty Cash Vouchers"
                    visible={printModalVisible}
                    style={{ width: "85vw" }}
                    headerStyle={{ padding: '12px 1.5rem', borderBottom: '1px solid #dee2e6' }}
                    closable={false}
                    onHide={() => setPrintModalVisible(false)}
                    footer={
                        <div className="d-flex justify-content-end gap-2 px-3 pb-2">
                            <button className="btn btn-secondary" style={{ minWidth: '100px' }} onClick={() => setPrintModalVisible(false)}>
                                Close
                            </button>
                            <button className="btn btn-primary" style={{ minWidth: '150px' }} onClick={handlePrintVoucher}>
                                <i className="mdi mdi-printer me-1"></i> Confirm Print All
                            </button>
                        </div>
                    }
                >
                    <div id="printableVoucherArea">
                        <style>{`
                            .pc-voucher-page { page-break-after: always; font-family: 'Inter', sans-serif; padding: 10px 15px 40px 15px; color: #333; line-height: 1.6; }
                            .pc-voucher-page:last-child { page-break-after: auto; }
                            .v-header { border-bottom: 2px solid #333; margin-bottom: 10px; padding-bottom: 5px; position: relative; }
                            .v-print-time { position: absolute; right: 0; top: -20px; font-size: 11px; color: #888; }
                            .v-title { font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #000; margin: 0; text-align: left; }
                            
                            .v-metadata { 
                                display: grid; 
                                grid-template-columns: repeat(3, 1fr); 
                                gap: 15px 25px; 
                                margin-bottom: 10px; 
                                background: #fcfcfc; 
                                padding: 20px; 
                                border: 1px solid #eee; 
                                border-radius: 4px; 
                            }
                            .v-meta-item { display: flex; align-items: baseline; font-size: 13px; }
                            .v-label { width: 120px; font-weight: 600; color: #555; position: relative; }
                            .v-label::after { content: ":"; position: absolute; right: 10px; }
                            .v-value { font-weight: 500; color: #000; flex: 1; }
                            
                            .v-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                            .v-table th { background-color: #f4f4f4; color: #333; font-weight: 700; border: 1px solid #ddd; padding: 12px 10px; text-transform: uppercase; font-size: 11px; text-align: left; }
                            .v-table th.nowrap, .v-table td.nowrap { white-space: nowrap; }
                            .v-table td { border: 1px solid #eee; padding: 10px; text-align: left; }
                            .v-table tr:nth-child(even) { background-color: #fafafa; }
                            
                            @media print {
                                .v-metadata { border: 1px solid #ddd; -webkit-print-color-adjust: exact; }
                                .v-table th { background-color: #f4f4f4 !important; -webkit-print-color-adjust: exact; }
                            }
                        `}</style>

                        {(() => {
                            const filtered = pcData.filter(item =>
                                printFilter === "expenses" ? (item.category_id !== 6 && !item.isClaim) : item.category_id === 6
                            );
                            const grouped = {};
                            filtered.forEach(ex => {
                                const dateStr = ex.dailyVoucher || "DATELESS";
                                if (!grouped[dateStr]) grouped[dateStr] = [];
                                grouped[dateStr].push(ex);
                            });

                            return Object.entries(grouped).map(([pcvNo, items], gIdx) => (
                                <div key={gIdx} className="pc-voucher-page">
                                    <div className="v-header">
                                        <div className="v-print-time">Printed on: {format(new Date(), "dd-MMM-yyyy, HH:mm")}</div>
                                        <div className="v-title">{pcvNo}</div>
                                    </div>
                                    <div className="v-metadata">
                                        <div className="v-meta-item"><span className="v-label">PC Date</span><span className="v-value">{format(new Date(items[0].expdate || items[0].ExpDate), "dd-MMM-yyyy")}</span></div>
                                        <div className="v-meta-item"><span className="v-label">Currency</span><span className="v-value">{selectedCurrency?.label || "IDR"}</span></div>
                                        <div className="v-meta-item"><span className="v-label">Total Amount</span><span className="v-value">{fmtNum(items.reduce((s, i) => s + (parseFloat(i.amount || 0)), 0))}</span></div>
                                    </div>
                                    <table className="v-table">
                                        <thead>
                                            <tr><th>S.no</th><th className="nowrap">PC Date</th>{printFilter !== "transfer" && <><th>Expense Category</th><th>Expense Type</th></>}<th>Description</th><th>Whom</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
                                        </thead>
                                        <tbody>
                                            {items.map((it, idx) => (
                                                <tr key={idx}>
                                                    <td>{idx + 1}</td>
                                                    <td className="nowrap">{format(new Date(it.expdate || it.ExpDate), "dd-MMM-yyyy")}</td>
                                                    {printFilter !== "transfer" && (
                                                        <>
                                                            <td>{it.categoryName}</td>
                                                            <td>{it.expenseTypename}</td>
                                                        </>
                                                    )}
                                                    <td>{it.description}</td>
                                                    <td>{it.whom || it.Whom || "-"}</td>
                                                    <td style={{ textAlign: 'right' }}>{fmtNum(it.amount)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ));
                        })()}
                    </div>
                </Dialog>

                {/* Petty Cash Detail Modal */}
                <Dialog
                    header={`Petty Cash Details - ${selectedPcDetail?.pc_number || ""} ${selectedPcDetail?.dailyVoucher ? `| ${selectedPcDetail.dailyVoucher}` : ""}`}
                    visible={pcDetailVisible}
                    style={{ width: "70vw" }}
                    onHide={() => setPcDetailVisible(false)}
                    footer={
                        <div>
                            <button className="btn btn-secondary" onClick={() => setPcDetailVisible(false)}>
                                Close
                            </button>
                        </div>
                    }
                >
                    {selectedPcDetail ? (
                        <div className="p-3">
                            <style>{`
                                .claim-label { font-weight: 700; color: #333; font-size: 13px; white-space: nowrap; }
                                .claim-value { font-weight: 500; color: #000; font-size: 13px; }
                                .claim-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px 30px; margin-bottom: 25px; background: #fcfcfc; padding: 20px; border: 1px solid #eee; border-radius: 4px; }
                                .claim-item { display: flex; gap: 8px; align-items: baseline; }
                            `}</style>

                            <div className="claim-grid shadow-sm">
                                <div className="claim-item"><div className="claim-label">Date:</div><div className="claim-value">{format(new Date(selectedPcDetail.expdate || selectedPcDetail.ExpDate), "dd-MMM-yyyy")}</div></div>
                                <div className="claim-item"><div className="claim-label">Reference No:</div><div className="claim-value">{selectedPcDetail.pc_number || "-"}</div></div>
                                <div className="claim-item"><div className="claim-label">Currency:</div><div className="claim-value">{selectedCurrency?.label || "IDR"}</div></div>
                            </div>

                            <div className="table-responsive">
                                <DataTable
                                    value={[selectedPcDetail]}
                                    className="p-datatable-sm showGridlines blue-bg"
                                    responsiveLayout="scroll"
                                    showGridlines
                                >
                                    <Column header="#" body={() => 1} style={{ width: '50px' }} />
                                    <Column header="Expense Type" body={() => typeMap[selectedPcDetail.expense_type_id] || selectedPcDetail.expense_type || "-"} />
                                    <Column header="Description" body={(r) => r.ExpenseDescription || r.expensedescription || r.description || "-"} />
                                    <Column header="Whom" body={(r) => r.Whom || r.whom || "-"} />
                                    <Column
                                        header="Amount"
                                        className="text-end"
                                        body={(r) => fmtNum(r.Amount || r.amount)}
                                    />
                                    <Column
                                        header="Amount (IDR)"
                                        className="text-end"
                                        body={(r) => fmtNum(r.AmountIDR || r.amountidr)}
                                        headerStyle={{ whiteSpace: "nowrap" }}
                                    />
                                </DataTable>
                            </div>

                            {selectedPcDetail.filepath && (
                                <div className="mt-4 pt-3 border-top">
                                    <Label className="fw-bold text-muted mb-1">Attachment:</Label>
                                    <div>
                                        <button
                                            className="btn btn-link p-0 text-decoration-underline"
                                            onClick={() => handleDownloadAttachment(selectedPcDetail.filepath, selectedPcDetail.filename)}
                                        >
                                            <i className="bx bx-paperclip me-1"></i> {selectedPcDetail.filename || "Download Attachment"}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center p-4">Loading details...</div>
                    )}
                </Dialog>

                {/* Claim Detail Modal */}
                <Dialog
                    header={`Claim Details - ${selectedClaimDetail?.header?.claimno || selectedClaimDetail?.header?.ApplicationNo || selectedClaimDetail?.claimno || selectedClaimDetail?.ApplicationNo || ""}`}
                    visible={claimDetailVisible}
                    style={{ width: "70vw" }}
                    onHide={() => setClaimDetailVisible(false)}
                    footer={
                        <div>
                            <button className="btn btn-secondary" onClick={() => setClaimDetailVisible(false)}>
                                Close
                            </button>
                        </div>
                    }
                >
                    {selectedClaimDetail ? (
                        <div className="p-3">
                            <style>{`
                                .claim-label { font-weight: 700; color: #333; font-size: 13px; white-space: nowrap; }
                                .claim-value { font-weight: 500; color: #000; font-size: 13px; }
                                .claim-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px 30px; margin-bottom: 25px; background: #fcfcfc; padding: 20px; border: 1px solid #eee; border-radius: 4px; }
                                .claim-item { display: flex; gap: 8px; align-items: baseline; }
                            `}</style>

                            <div className="claim-grid shadow-sm">
                                <div className="claim-item"><div className="claim-label">Category:</div><div className="claim-value">{selectedClaimDetail.header?.claimcategory || selectedClaimDetail.claimcategory || "-"}</div></div>
                                <div className="claim-item"><div className="claim-label">Application Date:</div><div className="claim-value">{selectedClaimDetail.header?.ApplicationDatevw || selectedClaimDetail.ApplicationDatevw || selectedClaimDetail.header?.ApplicationDate || selectedClaimDetail.ApplicationDate || "-"}</div></div>
                                <div className="claim-item"><div className="claim-label">Application No:</div><div className="claim-value">{selectedClaimDetail.header?.ApplicationNo || selectedClaimDetail.header?.claimno || selectedClaimDetail.ApplicationNo || selectedClaimDetail.claimno || "-"}</div></div>

                                <div className="claim-item"><div className="claim-label">Department:</div><div className="claim-value">{selectedClaimDetail.header?.departmentname || selectedClaimDetail.departmentname || "-"}</div></div>
                                <div className="claim-item"><div className="claim-label">Applicant:</div><div className="claim-value">{selectedClaimDetail.header?.applicantname || selectedClaimDetail.applicantname || "-"}</div></div>
                                <div className="claim-item"><div className="claim-label">HOD:</div><div className="claim-value">{selectedClaimDetail.header?.HOD_Name || selectedClaimDetail.HOD_Name || "-"}</div></div>

                                <div className="claim-item"><div className="claim-label">Currency:</div><div className="claim-value">{selectedClaimDetail.header?.transactioncurrency || selectedClaimDetail.transactioncurrency || "-"}</div></div>
                                <div className="claim-item"><div className="claim-label fw-bold">Amount (TC):</div><div className="claim-value fw-bold text-primary">{fmtNum(selectedClaimDetail.header?.ClaimAmountInTC || selectedClaimDetail.ClaimAmountInTC || selectedClaimDetail.header?.TotalAmountInIDR || selectedClaimDetail.TotalAmountInIDR)}</div></div>
                            </div>

                            <div className="table-responsive">
                                <DataTable
                                    value={selectedClaimDetail.details}
                                    className="p-datatable-sm showGridlines blue-bg"
                                    responsiveLayout="scroll"
                                    showGridlines
                                >
                                    <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} style={{ width: '50px' }} />
                                    <Column field="claimtype" header="Claim Type" />
                                    <Column field="PaymentDescription" header="Description" />
                                    <Column field="ExpenseDatevw" header="Expense Date" className="text-center" />
                                    <Column field="Purpose" header="Purpose" />
                                    <Column
                                        field="TotalAmount"
                                        header="Amount"
                                        className="text-end"
                                        body={(r) => fmtNum(r.TotalAmount)}
                                        headerStyle={{ whiteSpace: "nowrap" }}
                                    />
                                </DataTable>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center p-4">Loading details...</div>
                    )}
                </Dialog>
            </Container>
        </div>
    );
};

export default PCBookReport;