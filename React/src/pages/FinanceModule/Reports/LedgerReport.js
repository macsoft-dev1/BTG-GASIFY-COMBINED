import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { Container, Row, Col, Card, CardBody, Button } from "reactstrap";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import { InputText } from "primereact/inputtext";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import axios from "axios";
import { PYTHON_API_URL } from "common/pyapiconfig";

// Simple breadcrumb header
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

const numFormat = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2 });
const fmtDate = iso => {
  if (!iso) return "";
  return new Date(iso)
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
};

const categoryOptions = [
  { value: null, label: "All Categories" },
  { value: "Sales Invoice", label: "Sales Invoice" },
  { value: "Customer Payment", label: "Customer Payment" },
  { value: "Credit Note", label: "Credit Note" },
  { value: "Debit Note", label: "Debit Note" },
  { value: "Journal Entry", label: "Journal Entry" },
];

export default function LedgerReport() {
  const tableRef = useRef(null);

  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState(null);
  const [partySearch, setPartySearch] = useState("");
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({ debit: 0, credit: 0 });

  // Fetch data from API
  const fetchData = useCallback(async () => {
    if (!fromDate || !toDate) return;

    const from = fromDate instanceof Date ? fromDate.toISOString().split("T")[0] : fromDate;
    const to = toDate instanceof Date ? toDate.toISOString().split("T")[0] : toDate;

    setLoading(true);
    try {
      let url = `${PYTHON_API_URL}/ledger/report?from_date=${from}&to_date=${to}`;
      if (categoryFilter?.value) {
        url += `&category=${encodeURIComponent(categoryFilter.value)}`;
      }
      if (partySearch.trim()) {
        url += `&party=${encodeURIComponent(partySearch.trim())}`;
      }

      const res = await axios.get(url);
      if (res.data && res.data.status === "success") {
        setTransactions(res.data.data || []);
        setTotals({
          debit: res.data.total_debit || 0,
          credit: res.data.total_credit || 0
        });
      } else {
        setTransactions([]);
        setTotals({ debit: 0, credit: 0 });
      }
    } catch (err) {
      console.error("Ledger fetch error:", err);
      setTransactions([]);
      setTotals({ debit: 0, credit: 0 });
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, categoryFilter, partySearch]);

  // Auto-fetch when filters change
  useEffect(() => {
    if (fromDate && toDate) {
      fetchData();
    }
  }, [fetchData]);

  // Client-side text search filter
  const filtered = useMemo(() => {
    if (!search) return transactions;
    const lc = search.toLowerCase();
    return transactions.filter(t =>
      `${t.party || ""} ${t.reference_no || ""} ${t.description || ""} ${t.narration || ""} ${t.category || ""}`
        .toLowerCase()
        .includes(lc)
    );
  }, [transactions, search]);

  // Running balance calculation
  const withBalance = useMemo(() => {
    let bal = 0;
    return filtered.map(r => {
      bal += (r.debit || 0) - (r.credit || 0);
      return { ...r, balance: bal };
    });
  }, [filtered]);

  const clearFilters = () => {
    setCategoryFilter(null);
    setPartySearch("");
    setSearch("");
    setFromDate(null);
    setToDate(null);
    setTransactions([]);
    setTotals({ debit: 0, credit: 0 });
  };

  // -------- Export / Print --------
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(withBalance.map(r => ({
      Date: fmtDate(r.transaction_date),
      Category: r.category,
      Reference: r.reference_no,
      Description: r.description,
      Party: r.party,
      Debit: r.debit,
      Credit: r.credit,
      "Running Balance": r.balance,
      Narration: r.narration
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger");
    XLSX.writeFile(wb, "ledger_report.xlsx");
  };

  const printTable = () => {
    const content = document.getElementById("ledger-print").innerHTML;
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>Ledger Report</title>
      <style>
        table { width:100%; border-collapse:collapse; font-size:12px; }
        th, td { border:1px solid #ccc; padding:4px 8px; }
        th { background:#f5f5f5; }
        .text-end { text-align:right; }
      </style>
    </head><body>${content}</body></html>`);
    w.document.close();
    w.print();
  };

  // Category badge colors
  const categoryBadge = (cat) => {
    const colors = {
      "Sales Invoice": "primary",
      "Customer Payment": "success",
      "Credit Note": "warning",
      "Debit Note": "info",
      "Journal Entry": "secondary"
    };
    return <span className={`badge bg-${colors[cat] || "dark"}`}>{cat}</span>;
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Finance" breadcrumbItem="Ledger Report" />

        {/* Filter & Action Bar */}
        <Row className="pt-3 pb-2">
          <Col>
            <div className="d-flex flex-wrap gap-3 align-items-center">
              <Flatpickr
                className="form-control"
                style={{ width: 140 }}
                options={{ dateFormat: "d-M-Y" }}
                value={fromDate}
                onChange={date => setFromDate(date[0])}
                placeholder="From Date"
              />
              <Flatpickr
                className="form-control"
                style={{ width: 140 }}
                options={{ dateFormat: "d-M-Y" }}
                value={toDate}
                onChange={date => setToDate(date[0])}
                placeholder="To Date"
              />
              <Select
                value={categoryFilter}
                onChange={setCategoryFilter}
                options={categoryOptions}
                placeholder="Category"
                isClearable
                styles={{ container: base => ({ ...base, minWidth: 200 }) }}
              />
              <InputText
                value={partySearch}
                onChange={e => setPartySearch(e.target.value)}
                placeholder="Party Name"
                style={{ minWidth: 180 }}
                onKeyDown={e => { if (e.key === "Enter") fetchData(); }}
              />
              <InputText
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search All..."
                style={{ minWidth: 180 }}
              />
              <Button color="primary" onClick={fetchData} disabled={!fromDate || !toDate}>
                <i className="bx bx-search me-1"></i>Search
              </Button>
              <Button color="secondary" onClick={clearFilters}>Clear</Button>
              <Button color="success" onClick={exportExcel} disabled={withBalance.length === 0}>
                <i className="bx bx-download me-1"></i>Excel
              </Button>
              <Button color="info" onClick={printTable} disabled={withBalance.length === 0}>
                <i className="bx bx-printer me-1"></i>Print
              </Button>
            </div>
          </Col>
        </Row>

        {/* Summary Cards */}
        <Row className="mb-3">
          <Col md={3}>
            <Card className="mini-stats-wid">
              <CardBody>
                <div className="d-flex">
                  <div className="flex-grow-1">
                    <p className="text-muted fw-medium mb-1">Total Debit</p>
                    <h5 className="mb-0 text-danger">{numFormat.format(totals.debit)}</h5>
                  </div>
                  <div className="mini-stat-icon avatar-sm rounded-circle bg-danger align-self-center">
                    <span className="avatar-title bg-danger"><i className="bx bx-trending-up font-size-24"></i></span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="mini-stats-wid">
              <CardBody>
                <div className="d-flex">
                  <div className="flex-grow-1">
                    <p className="text-muted fw-medium mb-1">Total Credit</p>
                    <h5 className="mb-0 text-success">{numFormat.format(totals.credit)}</h5>
                  </div>
                  <div className="mini-stat-icon avatar-sm rounded-circle bg-success align-self-center">
                    <span className="avatar-title bg-success"><i className="bx bx-trending-down font-size-24"></i></span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="mini-stats-wid">
              <CardBody>
                <div className="d-flex">
                  <div className="flex-grow-1">
                    <p className="text-muted fw-medium mb-1">Net Balance</p>
                    <h5 className={`mb-0 ${totals.debit - totals.credit >= 0 ? "text-danger" : "text-success"}`}>
                      {numFormat.format(Math.abs(totals.debit - totals.credit))}
                      {totals.debit - totals.credit >= 0 ? " Dr" : " Cr"}
                    </h5>
                  </div>
                  <div className="mini-stat-icon avatar-sm rounded-circle bg-primary align-self-center">
                    <span className="avatar-title bg-primary"><i className="bx bx-wallet font-size-24"></i></span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="mini-stats-wid">
              <CardBody>
                <div className="d-flex">
                  <div className="flex-grow-1">
                    <p className="text-muted fw-medium mb-1">Total Entries</p>
                    <h5 className="mb-0">{withBalance.length}</h5>
                  </div>
                  <div className="mini-stat-icon avatar-sm rounded-circle bg-warning align-self-center">
                    <span className="avatar-title bg-warning"><i className="bx bx-list-ul font-size-24"></i></span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* Ledger Table */}
        <Card>
          <CardBody id="ledger-print">
            <DataTable
              ref={tableRef}
              value={withBalance}
              paginator rows={20}
              rowsPerPageOptions={[10, 20, 50, 100]}
              showGridlines
              responsiveLayout="scroll"
              emptyMessage={loading ? "Loading..." : "Select a date range and click Search."}
              loading={loading}
              sortField="transaction_date"
              sortOrder={1}
            >
              <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} style={{ width: "3rem" }} />
              <Column
                field="transaction_date"
                header="Date"
                body={r => fmtDate(r.transaction_date)}
                sortable
                style={{ minWidth: 110 }}
              />
              <Column
                field="category"
                header="Category"
                body={r => categoryBadge(r.category)}
                sortable
                style={{ minWidth: 140 }}
              />
              <Column field="reference_no" header="Reference" sortable style={{ minWidth: 130 }} />
              <Column field="description" header="Description" style={{ minWidth: 180 }} />
              <Column field="party" header="Party" sortable style={{ minWidth: 180 }} />
              <Column
                field="debit"
                header="Debit"
                body={r => r.debit > 0 ? numFormat.format(r.debit) : "-"}
                style={{ textAlign: "right", minWidth: 120 }}
                sortable
              />
              <Column
                field="credit"
                header="Credit"
                body={r => r.credit > 0 ? numFormat.format(r.credit) : "-"}
                style={{ textAlign: "right", minWidth: 120 }}
                sortable
              />
              <Column
                field="balance"
                header="Running Balance"
                body={r => {
                  const abs = Math.abs(r.balance);
                  const suffix = r.balance >= 0 ? " Dr" : " Cr";
                  return <span style={{ fontWeight: 600 }}>{numFormat.format(abs)}{suffix}</span>;
                }}
                style={{ textAlign: "right", minWidth: 150 }}
                sortable
              />
              <Column field="narration" header="Narration" style={{ minWidth: 180 }} />
            </DataTable>

            {withBalance.length > 0 && (
              <div className="mt-3 d-flex justify-content-between">
                <div>
                  <strong>Total Debit: </strong>
                  <span className="text-danger">{numFormat.format(totals.debit)}</span>
                  &nbsp;&nbsp;|&nbsp;&nbsp;
                  <strong>Total Credit: </strong>
                  <span className="text-success">{numFormat.format(totals.credit)}</span>
                </div>
                <div>
                  <strong>Closing Balance: </strong>
                  {numFormat.format(Math.abs(withBalance.at(-1)?.balance ?? 0))}
                  {(withBalance.at(-1)?.balance ?? 0) >= 0 ? " Dr" : " Cr"}
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      </Container>
    </div>
  );
}