import React, { useState, useRef, useMemo } from "react";
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

const formatDate = (dateInput) => {
    if (!dateInput || dateInput === "N/A") return "";
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

const PCBookReport = () => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const [pcData, setPcData] = useState([]);
    const [fromDate, setFromDate] = useState(firstDay);
    const [toDate, setToDate] = useState(today);
    const [globalFilter, setGlobalFilter] = useState("");
    const [loadingData, setLoadingData] = useState(false);
    const dtRef = useRef(null);

    const fetchPCBook = async () => {
        setLoadingData(true);
        try {
            const from = fromDate ? format(fromDate, "yyyy-MM-dd") : "";
            const to = toDate ? format(toDate, "yyyy-MM-dd") : "";

            const response = await axios.get(
                `${PYTHON_API_URL}/pettycash/list?orgid=1&branchid=1&FromDate=${from}&ToDate=${to}`
            );

            const result = response.data;
            if (result.status && result.data?.length > 0) {
                // Sort by date ascending for cumulative calculation
                const sorted = [...result.data].sort(
                    (a, b) => new Date(a.ExpDate) - new Date(b.ExpDate)
                );

                let cumulative = 0;
                const processed = sorted.map((row) => {
                    const amount = parseFloat(row.Amount) || 0;

                    // Determine Receipt vs Expense based on category
                    // category_id: 1 = Receipt, others = Expense
                    const isReceipt = row.category_id === 1;
                    const receipt = isReceipt ? amount : 0;
                    const expense = isReceipt ? 0 : amount;

                    cumulative += receipt - expense;

                    return {
                        ...row,
                        receipt,
                        expense,
                        amount,
                        cumulativeAmount: cumulative,
                    };
                });

                setPcData(processed);
            } else {
                setPcData([]);
                toast.info("No Petty Cash records found for selected date range.");
            }
        } catch (err) {
            console.error("Error fetching PC Book:", err);
            toast.error("Failed to load Petty Cash data.");
            setPcData([]);
        } finally {
            setLoadingData(false);
        }
    };

    const totalAmount = useMemo(() => {
        return pcData.reduce((sum, r) => sum + (r.amount || 0), 0);
    }, [pcData]);

    const totalReceipt = useMemo(() => {
        return pcData.reduce((sum, r) => sum + (r.receipt || 0), 0);
    }, [pcData]);

    const totalExpense = useMemo(() => {
        return pcData.reduce((sum, r) => sum + (r.expense || 0), 0);
    }, [pcData]);

    const exportExcel = () => {
        const exportData = pcData.map((item) => ({
            "Date": formatDate(item.ExpDate),
            "PC Number": item.pc_number || "",
            "Voucher No": item.VoucherNo || "",
            "Receipt": item.receipt,
            "Expense": item.expense,
            "Amount": item.amount,
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

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="PC Book" />
                <Row>
                    <Col lg="12">
                        <Card>
                            <CardBody>
                                {/* Date Filters */}
                                <Row className="mb-3">
                                    <Col md="3" className="d-flex align-items-center mb-2">
                                        <Label className="me-2 mb-0" style={{ minWidth: "50px" }}>
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
                                    <Col md="3" className="d-flex align-items-center mb-2">
                                        <Label className="me-2 mb-0" style={{ minWidth: "30px" }}>
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
                                    <Col md="auto" className="d-flex justify-content-start gap-2 align-items-center mb-2">
                                        <button
                                            type="button"
                                            className="btn btn-primary"
                                            onClick={fetchPCBook}
                                            disabled={loadingData}
                                        >
                                            {loadingData ? "Loading..." : "Search"}
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-success"
                                            onClick={exportExcel}
                                        >
                                            Export
                                        </button>
                                        <button
                                            type="button"
                                            className="btn btn-secondary"
                                            onClick={() => window.print()}
                                        >
                                            Print
                                        </button>
                                    </Col>
                                </Row>

                                {/* Totals */}
                                <Row className="mb-3 border-top pt-3">
                                    <Col md="3">
                                        <div className="d-flex align-items-center">
                                            <h6 className="mb-0 me-2 text-muted">Total Receipt:</h6>
                                            <h5
                                                className="mb-0 fw-bold"
                                                style={{ color: "green" }}
                                            >
                                                {fmtNum(totalReceipt)}
                                            </h5>
                                        </div>
                                    </Col>
                                    <Col md="3">
                                        <div className="d-flex align-items-center">
                                            <h6 className="mb-0 me-2 text-muted">Total Expense:</h6>
                                            <h5
                                                className="mb-0 fw-bold"
                                                style={{ color: "firebrick" }}
                                            >
                                                {fmtNum(totalExpense)}
                                            </h5>
                                        </div>
                                    </Col>
                                    <Col md="3">
                                        <div className="d-flex align-items-center">
                                            <h6 className="mb-0 me-2 text-muted">Balance:</h6>
                                            <h5
                                                className="mb-0 fw-bold"
                                                style={{ color: "navy" }}
                                            >
                                                {fmtNum(totalReceipt - totalExpense)}
                                            </h5>
                                        </div>
                                    </Col>
                                    <Col md="3">
                                        <div className="d-flex align-items-center justify-content-end">
                                            <input
                                                type="search"
                                                placeholder="Search..."
                                                className="form-control"
                                                style={{ width: "200px" }}
                                                value={globalFilter}
                                                onChange={(e) => setGlobalFilter(e.target.value)}
                                            />
                                        </div>
                                    </Col>
                                </Row>

                                {/* DataTable */}
                                <div className="table-responsive mt-2">
                                    <DataTable
                                        ref={dtRef}
                                        value={pcData}
                                        paginator
                                        rows={20}
                                        loading={loadingData}
                                        globalFilter={globalFilter}
                                        style={{ fontSize: "13px" }}
                                        responsiveLayout="scroll"
                                        showGridlines
                                    >
                                        <Column
                                            field="ExpDate"
                                            header="Date"
                                            body={(row) => formatDate(row.ExpDate)}
                                            sortable
                                            headerStyle={{ whiteSpace: "nowrap" }}
                                        />
                                        <Column
                                            field="pc_number"
                                            header="PC Number"
                                            sortable
                                            headerStyle={{ whiteSpace: "nowrap" }}
                                        />
                                        <Column
                                            field="VoucherNo"
                                            header="Voucher No"
                                            sortable
                                            headerStyle={{ whiteSpace: "nowrap" }}
                                        />
                                        <Column
                                            field="receipt"
                                            header="Receipt"
                                            body={(r) => (
                                                <span style={{ color: "green" }}>
                                                    {r.receipt > 0 ? fmtNum(r.receipt) : ""}
                                                </span>
                                            )}
                                            className="text-end"
                                            sortable
                                        />
                                        <Column
                                            field="expense"
                                            header="Expense"
                                            body={(r) => (
                                                <span style={{ color: "firebrick" }}>
                                                    {r.expense > 0 ? fmtNum(r.expense) : ""}
                                                </span>
                                            )}
                                            className="text-end"
                                            sortable
                                        />
                                        <Column
                                            field="amount"
                                            header="Amount"
                                            body={(r) => fmtNum(r.amount)}
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
            </Container>
        </div>
    );
};

export default PCBookReport;