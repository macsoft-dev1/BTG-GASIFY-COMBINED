import React, { useState, useEffect, useRef, useMemo } from "react";
import { Container, Row, Col, Card, CardBody, Label } from "reactstrap";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_green.css";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { Row as PrimeRow } from "primereact/row";
import { InputText } from "primereact/inputtext";
import { Dialog } from "primereact/dialog";
import Select from "react-select";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { toast } from "react-toastify";

// --- API IMPORTS ---
import { getARBook, GetCustomerFilter, getCustomerAddress } from "../service/financeapi";
import { GetInvoiceDetails, GetSalesDetails, GetItemFilter } from "../../../common/data/invoiceapi";
import { getDebitNoteById, getCreditNoteById, GetAllCurrencies } from "../../../common/data/mastersapi";
import logoImg from "../../../assets/images/logo.png";

// --- HELPER: Date Formatter (dd-mm-yyyy) ---
const formatDate = (dateInput) => {
  if (!dateInput || dateInput === "N/A") return "";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}-${month}-${year}`;
};

const ARBookReport = () => {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth() - 2, 1);

  // --- DATA STATES ---
  const [arBook, setArBook] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [bankList, setBankList] = useState([]);

  // --- FILTER STATES ---
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [globalFilter, setGlobalFilter] = useState("");
  const [customerSummary, setCustomerSummary] = useState(false);
  const dtRef = useRef(null);

  const [currencyRates, setCurrencyRates] = useState({});
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);

  // --- INVOICE MODAL STATE ---
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // --- RECEIPT MODAL STATE ---
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // --- NOTE MODAL STATE ---
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteDetails, setNoteDetails] = useState(null);
  const [loadingNote, setLoadingNote] = useState(false);

  const [loadingData, setLoadingData] = useState(false);

  // --- STYLES ---
  const popupLabelStyle = {
    minWidth: "120px",
    fontWeight: "bold",
    color: "#495057"
  };

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const custRes = await GetCustomerFilter(1, "%");
        setCustomers(custRes);
        if (custRes && custRes.length > 0) {
          setSelectedCustomer(custRes[0]);
        }

        const itemRes = await GetItemFilter();
        if (Array.isArray(itemRes)) {
          setItems(itemRes);
        } else if (itemRes.data) {
          setItems(itemRes.data);
        }

        const currRes = await GetAllCurrencies({ currencyCode: "", currencyName: "" });
        const currencyData = currRes.data || currRes;
        if (Array.isArray(currencyData)) {
          const rates = {};
          currencyData.forEach(c => {
            rates[c.CurrencyCode] = c.ExchangeRate || c.Rate || c.SellingRate || 1;
          });
          setCurrencyRates(rates);
        }

        // Load Banks for Receipt Preview
        const banks = await GetBankList(1, 1);
        setBankList(banks.map(b => ({ value: b.value, label: b.BankName })));

      } catch (error) {
        console.error("Error loading masters:", error);
      }
    };
    loadMasters();
  }, []);

  useEffect(() => {
    if (customerSummary || selectedCustomer) {
      fetchARBook();
    }
  }, [selectedCustomer, customerSummary]);

  const parseDate = (dateStr) => {
    if (!dateStr) return new Date(0);
    return new Date(dateStr);
  };

  const fetchARBook = async () => {
    setLoadingData(true);
    try {
      const customerId = customerSummary ? 0 : (selectedCustomer ? selectedCustomer.value : 0);
      const data = await getARBook(
        customerId,
        1, // OrgID
        1, // BranchID
        fromDate ? format(fromDate, "yyyy-MM-dd") : null,
        toDate ? format(toDate, "yyyy-MM-dd") : null
      );

      if (data.status && data.data?.length > 0) {
        let rawData = data.data;

        if (selectedItem) {
          rawData.sort((a, b) => parseDate(b.ledger_date) - parseDate(a.ledger_date));
        } else {
          rawData.sort((a, b) => parseDate(a.ledger_date) - parseDate(b.ledger_date));
        }

        if (selectedItem) {
          try {
            const salesPayload = {
              customerid: selectedCustomer ? selectedCustomer.value : 0,
              FromDate: fromDate ? format(fromDate, "yyyy-MM-dd") : "",
              ToDate: toDate ? format(toDate, "yyyy-MM-dd") : "",
              ItemId: selectedItem.value,
              BranchId: 1,
              IsAR: 1
            };

            const salesRes = await GetSalesDetails(salesPayload);
            const salesData = salesRes.data || salesRes;
            const validInvoiceNos = new Set(salesData.map(x => x.InvoiceNo));
            rawData = rawData.filter(row => validInvoiceNos.has(row.invoice_no));

          } catch (err) {
            console.error("Error filtering by item:", err);
            toast.warning("Could not filter by item. Showing all records.");
          }
        }

        const uniqueCurrencies = [...new Set(rawData.map(item => item.currencycode || item.CurrencyCode))];
        const newCurrencyOptions = uniqueCurrencies.filter(c => c).map(c => ({ label: c, value: c }));
        setCurrencyOptions(newCurrencyOptions);

        const convertedData = rawData.map(row => {
          const rawCurrency = row.currencycode || row.CurrencyCode || "";
          const currency = rawCurrency || "IDR";

          // LOGIC CHANGE: If a specific currency (other than IDR) is selected, DO NOT CONVERT.
          // Use Rate = 1 so the columns show the original values.
          let rate = (currency === "IDR") ? 1 : (currencyRates[currency] || 1);

          if (selectedCurrency && selectedCurrency.value !== "IDR") {
            if (currency === selectedCurrency.value) {
              rate = 1; // No conversion
            }
          }

          return {
            ...row,
            currencyCode: currency,
            _hasExplicitCurrency: !!rawCurrency,
            exchangeRate: rate,
            convertedInvoiceAmount: (parseFloat(row.invoice_amount) || 0) * rate,
            convertedReceiptAmount: (parseFloat(row.receipt_amount) || 0) * rate,
            convertedDebitNote: (parseFloat(row.debit_note_amount) || 0) * rate,
            convertedCreditNote: (parseFloat(row.credit_note_amount) || 0) * rate,
          };
        });

        const groupedMap = new Map();
        const finalRows = [];

        convertedData.forEach(row => {
          const refNo = row.invoice_no ? String(row.invoice_no).trim() : "";
          const shouldGroup = refNo && !refNo.startsWith("DO") && !refNo.startsWith("27") && row.convertedReceiptAmount === 0;

          if (shouldGroup) {
            const key = `${refNo}_${row.currencyCode}`;

            if (groupedMap.has(key)) {
              const existing = groupedMap.get(key);
              existing.convertedInvoiceAmount += row.convertedInvoiceAmount;
              existing.convertedDebitNote += row.convertedDebitNote;
              existing.convertedCreditNote += row.convertedCreditNote;
              existing.invoice_amount = (parseFloat(existing.invoice_amount) || 0) + (parseFloat(row.invoice_amount) || 0);
            } else {
              groupedMap.set(key, { ...row });
            }
          } else {
            finalRows.push(row);
          }
        });

        groupedMap.forEach(value => finalRows.push(value));
        finalRows.sort((a, b) => parseDate(a.ledger_date) - parseDate(b.ledger_date));

        setArBook(finalRows);
      } else {
        setArBook([]);
      }
    } catch (err) {
      toast.error("Failed to load AR data");
      setArBook([]);
    } finally {
      setLoadingData(false);
    }
  };

  const handleInvoiceClick = async (rowData) => {
    const invoiceIdentifier = rowData.invoice_no;

    if (!invoiceIdentifier) {
      toast.warning("No Invoice Number available.");
      return;
    }

    setLoadingDetails(true);
    setShowInvoiceDialog(true);
    setInvoiceDetails(null);

    try {
      const response = await GetInvoiceDetails(invoiceIdentifier);
      const data = response.data || response;

      if (data) {
        setInvoiceDetails(data);
      } else {
        toast.warning("No details returned for this invoice.");
      }
    } catch (err) {
      console.error("API Fetch Error:", err);
      toast.error("Failed to fetch invoice details.");
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleReceiptClick = (rowData) => {
    setSelectedReceipt(rowData);
    setShowReceiptDialog(true);
  };

  const handleNoteClick = async (rowData, type) => {
    const noteId = rowData.transaction_id || rowData.id || rowData.real_invoice_id;
    if (!noteId) {
      toast.warning("No ID available for this Note.");
      return;
    }

    setLoadingNote(true);
    setShowNoteDialog(true);
    setNoteDetails(null);

    try {
      let response;
      if (type === 'DN') {
        response = await getDebitNoteById(noteId);
      } else {
        response = await getCreditNoteById(noteId);
      }

      const data = response?.data;
      if (data) {
        setNoteDetails({ ...data, type });
      } else {
        toast.warning(`No details returned for this ${type === 'DN' ? 'Debit' : 'Credit'} Note.`);
        setShowNoteDialog(false);
      }
    } catch (err) {
      console.error("API Fetch Error:", err);
      toast.error(`Failed to fetch ${type} details.`);
    } finally {
      setLoadingNote(false);
    }
  };

  const getBankName = (record) => {
    if (!record) return "";
    const bId = record.deposit_bank_id || record.bank_id;
    return record.bank_name || (bankList.find(b => b.value == bId)?.label) || "";
  };

  const finalProcessedData = useMemo(() => {
    let filtered = selectedCurrency
      ? arBook.filter((x) => x._hasExplicitCurrency && x.currencyCode === selectedCurrency.value)
      : arBook;

    filtered = filtered.filter(item => {
      const ref = item.invoice_no ? String(item.invoice_no).trim().toUpperCase() : "";
      return !ref.startsWith("DO") && !ref.startsWith("27");
    });

    let runningBalance = 0;
    return filtered.map(row => {
      const rowBalance = (row.convertedInvoiceAmount || 0) + (row.convertedDebitNote || 0)
        - (row.convertedCreditNote || 0) - (row.convertedReceiptAmount || 0);
      runningBalance += rowBalance;

      return {
        ...row,
        balanceDue: rowBalance,
        cumulativeBalance: runningBalance
      };
    });
  }, [arBook, selectedCurrency]);

  // --- CUSTOMER SUMMARY GROUPING ---
  const summaryData = useMemo(() => {
    if (!customerSummary) return [];
    const grouped = {};
    finalProcessedData.forEach(row => {
      const name = row.customer_name || 'Unknown';
      if (!grouped[name]) {
        grouped[name] = { customerName: name, customerId: row.customer_id || 0, invoiceTotal: 0, receiptTotal: 0, debitNoteTotal: 0, creditNoteTotal: 0 };
      }
      grouped[name].invoiceTotal += (row.convertedInvoiceAmount || 0);
      grouped[name].receiptTotal += (row.convertedReceiptAmount || 0);
      grouped[name].debitNoteTotal += (row.convertedDebitNote || 0);
      grouped[name].creditNoteTotal += (row.convertedCreditNote || 0);
    });
    const rows = Object.values(grouped).map(g => ({
      ...g,
      arBalance: g.invoiceTotal + g.debitNoteTotal - g.receiptTotal - g.creditNoteTotal
    }));
    rows.sort((a, b) => a.customerName.localeCompare(b.customerName));
    return rows;
  }, [finalProcessedData, customerSummary]);

  const summaryTotal = useMemo(() => {
    return summaryData.reduce((sum, row) => sum + row.arBalance, 0);
  }, [summaryData]);

  const totalARValue = useMemo(() => {
    if (customerSummary) return summaryTotal;
    if (finalProcessedData.length === 0) return 0;
    return finalProcessedData[finalProcessedData.length - 1].cumulativeBalance;
  }, [finalProcessedData, customerSummary, summaryTotal]);

  const hasForeignCurrency = useMemo(() => {
    return finalProcessedData.some(row => row.currencyCode && row.currencyCode !== 'IDR');
  }, [finalProcessedData]);


  const exportExcel = () => {
    const exportData = finalProcessedData.map(item => ({
      Date: format(new Date(item.ledger_date), "dd-MMM-yyyy"),
      "Reference No.": item.convertedReceiptAmount > 0 ? "" : item.invoice_no,
      "Other Currency": item.currencyCode !== 'IDR' ? item.invoice_amount?.toLocaleString() : "",
      "Invoice Amount (A)": item.convertedInvoiceAmount,
      "Balance Due": item.balanceDue,
      "Debit Note (B)": item.convertedDebitNote,
      "Receipt (C)": item.convertedReceiptAmount,
      "Credit Note (D)": item.convertedCreditNote,
      "Balance ((A+B)-(C+D))": item.cumulativeBalance
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "AR Book");
    XLSX.writeFile(wb, "AR_Book.xlsx");
  };

  const referenceBodyTemplate = (row) => {
    // Check if it is a Receipt (Amount in Receipt Column > 0)
    if (row.convertedReceiptAmount > 0) {
      return (
        <span className="text-success fw-bold">
          {row.receipt_no || row.invoice_no || "-"}
        </span>
      );
    }

    // Check if Debit Note (Amount > 0)
    if (row.convertedDebitNote > 0 && !row.convertedInvoiceAmount && !row.convertedCreditNote) {
      return (
        <span
          className="text-danger fw-bold"
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => handleNoteClick(row, 'DN')}
          title="View Debit Note Details"
        >
          {row.invoice_no || row.ar_no || "DN"}
        </span>
      );
    }

    // Check if Credit Note (Amount > 0)
    if (row.convertedCreditNote > 0 && !row.convertedInvoiceAmount && !row.convertedDebitNote) {
      return (
        <span
          className="text-warning fw-bold"
          style={{ cursor: "pointer", textDecoration: "underline" }}
          onClick={() => handleNoteClick(row, 'CN')}
          title="View Credit Note Details"
        >
          {row.invoice_no || row.ar_no || "CN"}
        </span>
      );
    }

    // Else it is likely an Invoice
    return (
      <span
        className="text-primary fw-bold"
        style={{ cursor: "pointer", textDecoration: "underline" }}
        onClick={() => handleInvoiceClick(row)}
        title="View Invoice Details"
      >
        {row.invoice_no}
      </span>
    );
  };

  const otherCurrencyBodyTemplate = (rowData) => {
    if (rowData.currencyCode && rowData.currencyCode !== 'IDR') {
      const originalAmt = rowData.convertedReceiptAmount > 0
        ? rowData.receipt_amount
        : (rowData.invoice_amount || rowData.credit_note_amount || rowData.debit_note_amount);

      return (
        <span
          className="text-muted"
          style={{ fontSize: '12px', cursor: 'pointer' }}
          title={`Ex. Rate: ${rowData.exchangeRate?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        >
          {parseFloat(originalAmt).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      );
    }
    return "";
  };

  // --- SOA PRINT HANDLER ---
  const handleSOAPrint = async (summaryRow) => {
    try {
      // Get this customer's transactions from already loaded data
      const custRows = finalProcessedData.filter(r => r.customer_name === summaryRow.customerName);
      if (custRows.length === 0) {
        toast.warning("No transactions found for this customer.");
        return;
      }

      // Sort by date
      custRows.sort((a, b) => new Date(a.ledger_date) - new Date(b.ledger_date));

      // We need to re-aggregate ledger data into specific open invoices (Pending Receivables).
      // A single invoice might have multiple receipts against it over time.
      const invoiceMap = {};

      custRows.forEach(r => {
        // Group by the originating invoice ID.
        // real_invoice_id usually holds the ID of the invoice being paid in receipt rows.
        // transaction_id holds the invoice ID in invoice rows.
        const invId = r.real_invoice_id || r.transaction_id;
        if (!invId) return;

        if (!invoiceMap[invId]) {
          invoiceMap[invId] = {
            date: r.ledger_date,
            invoiceNo: r.invoice_no || '-',
            poNo: r.po_no || '-',
            totalDebit: 0,
            totalCredit: 0,
          };
        }

        const debit = (r.convertedInvoiceAmount || 0) + (r.convertedDebitNote || 0);
        const credit = (r.convertedReceiptAmount || 0) + (r.convertedCreditNote || 0);

        invoiceMap[invId].totalDebit += debit;
        invoiceMap[invId].totalCredit += credit;
      });

      // Filter to ONLY show invoices that have an open balance 
      // (Total Debit > Total Credit).
      const outstandingRows = [];
      let totalOutstandingBalance = 0;

      Object.values(invoiceMap).forEach(inv => {
        const openBalance = inv.totalDebit - inv.totalCredit;

        // Due to floating point imprecision, we check if balance is meaningfully > 0
        if (openBalance > 0.01) {
          outstandingRows.push({
            date: inv.date,
            invoiceNo: inv.invoiceNo,
            poNo: inv.poNo,
            debit: inv.totalDebit,
            credit: inv.totalCredit,
            balance: openBalance
          });
          totalOutstandingBalance += openBalance;
        }
      });

      // Sort the remaining pending receivables by date
      outstandingRows.sort((a, b) => new Date(a.date) - new Date(b.date));

      const outstandingBalance = totalOutstandingBalance;

      // Calculate aging buckets purely based on the open balances of these unpaid invoices
      const now = new Date();
      let m1 = 0, m2 = 0, m3 = 0, m4 = 0, mOver = 0;
      outstandingRows.forEach(inv => {
        const d = new Date(inv.date);
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) m1 += inv.balance;
        else if (diffDays <= 60) m2 += inv.balance;
        else if (diffDays <= 90) m3 += inv.balance;
        else if (diffDays <= 120) m4 += inv.balance;
        else mOver += inv.balance;
      });

      const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2 });
      const fmtDate = (d) => { const dt = new Date(d); return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' }); };
      const printDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const printTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Fetch customer address
      let addrHtml = '';
      if (summaryRow.customerId) {
        const custAddr = await getCustomerAddress(summaryRow.customerId);
        const addrLines = [custAddr.address, custAddr.city, custAddr.country].filter(Boolean);
        addrHtml = addrLines.map(l => `<div>${l}</div>`).join('');
      }

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
        <head>
          <title>SOA - ${summaryRow.customerName}</title>
          <style>
            /* Reset margins to remove browser default print headers (Title, URL, Date, Page) */
            @page { margin: 0; size: A4; }
            * { box-sizing: border-box; }
            html, body { 
              height: 100vh;
              margin: 0;
            }
            body { 
              font-family: Arial, Helvetica, sans-serif; 
              font-size: 10px; 
              color: #000; 
              /* Safe print margin inside the body rather than @page */
              padding: 15mm 20mm; 
              display: flex;
              flex-direction: column;
            }
            
            /* --- WRAPPERS FOR FLEX LAYOUT --- */
            .content-wrapper {
              flex: 1 1 auto;
            }
            .footer-wrapper {
              flex: 0 0 auto;
            }

            /* --- TOP BRANDING (LEFT ALIGNED) --- */
            .top-branding { margin-bottom: 25px; text-align: left; }
            .top-branding img { width: 110px; margin-bottom: 5px; }
            .top-branding h3 { color: #5a5f9c; margin: 0; font-size: 10px; font-weight: bold; letter-spacing: 0.5px; }
            
            /* --- PAGE TITLE (CENTER ALIGNED) --- */
            .page-title { text-align: center; margin: 0 0 15px 0; font-size: 14px; font-weight: bold; text-decoration: underline; font-family: Arial, sans-serif; }
            
            /* --- INFO SECTION --- */
            .info-section { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 9px; }
            .info-left { width: 60%; }
            .info-left .cust-name { font-weight: bold; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; }
            .info-left .cust-addr { font-size: 9px; line-height: 1.4; text-transform: uppercase; }
            
            .info-right { width: 35%; display: flex; justify-content: flex-end; }
            .info-right table { margin: 0; border-collapse: collapse; }
            .info-right td { padding: 2px 4px; font-size: 9px; vertical-align: top; }
            .info-right td.lbl { width: 60px; }
            
            /* --- MAIN TABLE --- */
            table.main { width: 100%; border-collapse: collapse; margin-bottom: 0px; border: 1px solid #000; }
            table.main th, table.main td { padding: 5px 6px; font-size: 8px; border-right: 1px solid #000; }
            table.main th { border-bottom: 1px solid #000; border-top: 1px solid #000; font-weight: bold; text-align: center; text-transform: uppercase; }
            table.main td { border-bottom: none; border-top: none; }
            table.main tr:last-child td { border-bottom: 1px solid #000; }
            
            /* Column alignments */
            table.main th:nth-child(1), table.main td:nth-child(1) { width: 12%; text-align: center; } /* DATE */
            table.main th:nth-child(2), table.main td:nth-child(2) { width: 18%; text-align: center; } /* PO NO. */
            table.main th:nth-child(3), table.main td:nth-child(3) { width: 22%; text-align: center; } /* DESCRIPTION */
            table.main th:nth-child(4), table.main td:nth-child(4) { width: 16%; text-align: right; }  /* DEBIT */
            table.main th:nth-child(5), table.main td:nth-child(5) { width: 16%; text-align: right; }  /* CREDIT */
            table.main th:nth-child(6), table.main td:nth-child(6) { width: 16%; text-align: right; }  /* BALANCE */
            
            /* --- OUTSTANDING SECTION --- */
            .outstanding-block { display: flex; align-items: stretch; margin-top: 10px; font-size: 9px; margin-bottom: 10px; }
            .outstanding-label { 
              font-weight: bold; 
              display: flex; 
              align-items: center; 
              margin-right: 10px;
            }
            .outstanding-amount {
              border: 1px solid #000;
              padding: 4px 15px;
              font-weight: bold;
              display: flex;
              align-items: center;
              justify-content: flex-end;
              min-width: 100px;
            }
            .due-label {
              font-weight: bold;
              display: flex;
              align-items: center;
              margin-left: 10px;
            }

            .aging-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000; }
            .aging-table th, .aging-table td { border: 1px solid #000; padding: 4px 5px; text-align: center; font-size: 8px; width: 20%; }
            .aging-table th { font-weight: bold; text-transform: uppercase; }
            .aging-table td { font-weight: bold; text-align: right; }
            
            /* --- FOOTER NOTES --- */
            .footer-notes { font-size: 8px; font-weight: bold; margin-bottom: 15px; }
            .footer-notes p { margin: 2px 0; }
            
            /* --- COMPANY FOOTER --- */
            .company-footer { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-end; 
              font-size: 8px; 
              color: #5a5f9c;
            }
            .company-details p { margin: 1px 0; }
            .company-details a { color: #5a5f9c; text-decoration: none; font-weight: bold; }
            .company-details span.black-text { color: #000; font-weight: normal; }
            
            .cert-logos { display: flex; align-items: center; gap: 8px; }
          </style>
        </head>
        <body>
          <div class="content-wrapper">
            <div class="top-branding">
            <img src="${logoImg}" alt="BTG Logo" />
            <h3>PT. BATAM TEKNOLOGI GAS</h3>
          </div>

          <h2 class="page-title">STATEMENT OF ACCOUNT</h2>

          <div class="info-section">
            <div class="info-left">
              <div class="cust-name">${summaryRow.customerName}</div>
              <div class="cust-addr">
                JL. BINTANG NO. 07,<br/>
                SAMPNG KAWASAN BINTANG INDUSTRI<br/>
                TANJUNG UNCANG - BATAM INDONESIA
              </div>
            </div>
            <div class="info-right">
              <table>
                <tr><td class="lbl">Date</td><td>:</td><td>${printDate}</td></tr>
                <tr><td class="lbl">Page</td><td>:</td><td>1/1</td></tr>
                <tr><td class="lbl">Currency</td><td>:</td><td>IDR</td></tr>
              </table>
            </div>
          </div>

          <table class="main">
            <thead>
              <tr>
                <th>DATE</th>
                <th>PO NO.</th>
                <th>DESCRIPTION</th>
                <th>DEBIT</th>
                <th>CREDIT</th>
                <th>BALANCE</th>
              </tr>
            </thead>
            <tbody>
              ${outstandingRows.map(r => `
                <tr>
                  <td>${fmtDate(r.date)}</td>
                  <td>${r.poNo}</td>
                  <td>${r.invoiceNo}</td>
                  <td style="text-align:right">${r.debit > 0 ? fmt(r.debit) : ''}</td>
                  <td style="text-align:right">${r.credit > 0 ? fmt(r.credit) : ''}</td>
                  <td style="text-align:right">${fmt(r.balance)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          </div> <!-- End content wrapper -->

          <div class="footer-wrapper">
            <div class="outstanding-block">
            <div class="outstanding-label">YOUR OUTSTANDING BALANCE</div>
            <div class="outstanding-amount">${fmt(outstandingBalance)}</div>
            <div class="due-label">DUE AS FOLLOWS</div>
          </div>

          <table class="aging-table">
            <thead>
              <tr>
                <th>1 MONTH</th>
                <th>2 MONTHS</th>
                <th>3 MONTHS</th>
                <th>4 MONTHS</th>
                <th>OVER 4 MONTHS</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${fmt(m1)}</td>
                <td>${fmt(m2)}</td>
                <td>${fmt(m3)}</td>
                <td>${fmt(m4)}</td>
                <td>${fmt(mOver)}</td>
              </tr>
            </tbody>
          </table>

          <div class="footer-notes">
            <p>We Shall be grateful if you let us have payment as soon as possible.</p>
            <p>Any discrepancy in this Statement, please inform us in writing within 10 days.</p>
            <p style="margin-top: 5px;">This document is computer generated.</p>
            <p>No signature is required</p>
          </div>

          <div class="company-footer">
            <div class="company-details">
              <p><span class="black-text">Printed By siska at ${printDate} | ${printTime}</span></p>
              <p>Jalan Brigjen Katamso KM. 3 - Tanjung Uncang, Batam - Indonesia</p>
              <p>Phone : (+62).778.462959 - 391918</p>
              <p>Fax &nbsp; &nbsp; : (+62).778.462944 - 391919</p>
              <p>E-mail &nbsp;: ptbcg@ptbtg.com</p>
              <p style="margin-top: 8px;"><a href="http://www.ptbtg.com">www.ptbtg.com</a></p>
            </div>
            <div class="cert-logos">
              <svg width="52" height="62" viewBox="0 0 52 62" xmlns="http://www.w3.org/2000/svg">
                <rect width="52" height="62" fill="#b30000" rx="2"/>
                <text x="26" y="11" text-anchor="middle" fill="white" font-size="5.5" font-family="Arial" font-weight="bold" letter-spacing="0.5">Certified System</text>
                <polygon points="26,17 8,50 44,50" fill="none" stroke="white" stroke-width="1.5"/>
                <polygon points="26,22 12,47 40,47" fill="none" stroke="white" stroke-width="1"/>
                <polygon points="26,27 16,44 36,44" fill="none" stroke="white" stroke-width="0.8"/>
                <text x="26" y="41" text-anchor="middle" fill="white" font-size="8" font-family="Arial" font-weight="bold">ISO</text>
                <text x="26" y="52" text-anchor="middle" fill="white" font-size="7" font-family="Arial" font-weight="bold">9001</text>
                <text x="26" y="60" text-anchor="middle" fill="white" font-size="4.5" font-family="Arial">&#9632; SAI GLOBAL</text>
              </svg>
              <svg width="58" height="62" viewBox="0 0 58 62" xmlns="http://www.w3.org/2000/svg">
                <rect width="58" height="62" fill="white" stroke="#003399" stroke-width="1.5" rx="2"/>
                <text x="29" y="11" text-anchor="middle" fill="#003399" font-size="8" font-family="Arial" font-weight="bold">JAS-ANZ</text>
                <circle cx="29" cy="36" r="18" fill="none" stroke="#003399" stroke-width="2" stroke-dasharray="4 3"/>
                <circle cx="29" cy="36" r="12" fill="none" stroke="#003399" stroke-width="1.5"/>
                <line x1="8" y1="36" x2="50" y2="36" stroke="#cc0000" stroke-width="2.5"/>
                <line x1="29" y1="15" x2="29" y2="57" stroke="#003399" stroke-width="1.5"/>
                <text x="29" y="58" text-anchor="middle" fill="#003399" font-size="3.5" font-family="Arial">WWW.JAS-ANZ.ORG/REGISTER</text>
              </svg>
              <svg width="68" height="62" viewBox="0 0 68 62" xmlns="http://www.w3.org/2000/svg">
                <rect width="68" height="62" fill="white"/>
                <polyline points="6,22 14,12 20,24" fill="none" stroke="#cc0000" stroke-width="2.5" stroke-linejoin="round"/>
                <line x1="14" y1="12" x2="18" y2="28" stroke="#cc0000" stroke-width="2"/>
                <text x="38" y="22" text-anchor="middle" fill="#003399" font-size="20" font-family="Arial" font-weight="bold">KAN</text>
                <text x="34" y="34" text-anchor="middle" fill="#333" font-size="5" font-family="Arial" font-weight="bold">Komite Akreditasi Nasional</text>
                <text x="34" y="42" text-anchor="middle" fill="#333" font-size="4" font-family="Arial">Certification Body for Quality System</text>
                <text x="34" y="50" text-anchor="middle" fill="#333" font-size="4" font-family="Arial">LSSM - 009 - IDN</text>
              </svg>
            </div>
            </div> <!-- End footer wrapper -->
          </div>
        </body>
        </html>
      `);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
    } catch (err) {
      console.error('SOA Print Error:', err);
      toast.error('Failed to generate SOA');
    }
  };

  const soaPrintTemplate = (rowData) => {
    // Only allow printing from the main specific customer grid,
    // so we can use finalProcessedData for that customer.
    // Or we can just use the selectedCustomer's full view rows.
    return (
      <button
        className="btn btn-success btn-sm"
        onClick={() => handleSOAPrint({ customerName: rowData.customer_name, customerId: selectedCustomer?.value })}
        title="Print Statement of Account"
      >
        <i className="bx bx-printer text-white" style={{ color: 'white' }}></i>
      </button>
    );
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Reports" breadcrumbItem="AR Book" />
        <Row>
          <Col lg="12">
            <Card>
              <CardBody>
                {/* --- Row 0: Customer Summary Checkbox --- */}
                <Row className="mb-2">
                  <Col md="4" className="d-flex align-items-center">
                    <div className="d-flex align-items-center">
                      <input
                        type="checkbox"
                        id="customerSummaryCheck"
                        checked={customerSummary}
                        onChange={(e) => setCustomerSummary(e.target.checked)}
                        style={{ marginRight: "8px", cursor: "pointer", width: "16px", height: "16px" }}
                      />
                      <label
                        className="fw-bold mb-0"
                        htmlFor="customerSummaryCheck"
                        style={{ color: "#b22222", cursor: "pointer", fontSize: "14px" }}
                      >
                        Customer Summary
                      </label>
                    </div>
                  </Col>
                </Row>

                {/* --- Row 1: Selection Filters --- */}
                {!customerSummary && (
                  <Row className="mb-3">
                    <Col md="4" className="d-flex align-items-center mb-2">
                      <Label className="me-2 mb-0" style={{ minWidth: "80px" }}>Customer:</Label>
                      <Select options={customers} onChange={setSelectedCustomer} value={selectedCustomer} isClearable className="flex-grow-1" />
                    </Col>

                    <Col md="4" className="d-flex align-items-center mb-2">
                      <Label className="me-2 mb-0" style={{ minWidth: "60px" }}>Item:</Label>
                      <Select
                        options={items}
                        onChange={setSelectedItem}
                        value={selectedItem}
                        isClearable
                        placeholder="Select Item..."
                        className="flex-grow-1"
                      />
                    </Col>

                    <Col md="4" className="d-flex align-items-center mb-2">
                      <Label className="me-2 mb-0" style={{ minWidth: "80px" }}>Currency:</Label>
                      <Select options={currencyOptions} value={selectedCurrency} onChange={setSelectedCurrency} isClearable className="flex-grow-1" />
                    </Col>
                  </Row>
                )}

                {/* --- Row 2: Date Filters --- */}
                {!customerSummary && (
                  <Row className="mb-3">
                    <Col md="4" className="d-flex align-items-center mb-2">
                      <Label className="me-2 mb-0" style={{ minWidth: "80px" }}>From:</Label>
                      <Flatpickr className="form-control" value={fromDate} onChange={(date) => setFromDate(date[0])} options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }} />
                    </Col>

                    <Col md="4" className="d-flex align-items-center mb-2">
                      <Label className="me-2 mb-0" style={{ minWidth: "60px" }}>To:</Label>
                      <Flatpickr className="form-control" value={toDate} onChange={(date) => setToDate(date[0])} options={{ altInput: true, altFormat: "d-M-Y", dateFormat: "Y-m-d" }} />
                    </Col>
                  </Row>
                )}

                {/* --- Row 3: Totals & Actions --- */}
                <Row>
                  <Col md="12" className="d-flex justify-content-between align-items-center mt-2 border-top pt-3">
                    <div className="d-flex align-items-center">
                      <h5 className="mb-0 me-2">Total AR Value:</h5>
                      <h4 className="mb-0 fw-bold" style={{ color: "firebrick" }}>
                        {totalARValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </h4>
                    </div>

                    <div className="text-end">
                      <button type="button" className="btn btn-primary me-2" onClick={fetchARBook} disabled={loadingData}>
                        {loadingData ? "Loading..." : "Search"}
                      </button>
                      <button type="button" className="btn btn-success me-2" onClick={exportExcel}>Export</button>
                      <button type="button" className="btn btn-secondary" onClick={() => handleSOAPrint({ customerName: selectedCustomer?.label, customerId: selectedCustomer?.value })}>Print</button>
                    </div>
                  </Col>
                </Row>

                <div className="table-responsive mt-3">
                  {customerSummary ? (
                    /* ===== CUSTOMER SUMMARY VIEW ===== */
                    <DataTable
                      ref={dtRef}
                      value={summaryData}
                      paginator
                      rows={20}
                      loading={loadingData}
                      globalFilter={globalFilter}
                      style={{ fontSize: '13px' }}
                      header={
                        <div className="d-flex justify-content-end">
                          <InputText type="search" placeholder="Global Search" className="form-control" style={{ width: "250px" }} value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
                        </div>
                      }
                      responsiveLayout="scroll"
                      globalFilterFields={['customerName']}
                      footerColumnGroup={
                        <ColumnGroup>
                          <PrimeRow>
                            <Column footer="Total AR Balance:" colSpan={1} footerStyle={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13px' }} />
                            <Column footer={summaryTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} footerStyle={{ textAlign: 'right', fontWeight: 'bold', fontSize: '14px', color: 'firebrick' }} />
                            <Column footer="" />
                          </PrimeRow>
                        </ColumnGroup>
                      }
                    >
                      <Column field="customerName" header="Customer Name" sortable filter filterPlaceholder="Search Customer" />
                      <Column field="arBalance" header="AR Balance" body={(r) => <span className="fw-bold">{r.arBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>} className="text-end" sortable />
                      <Column header="SOA" body={(r) => (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleSOAPrint(r)}
                          title="Print Statement of Account"
                        >
                          <i className="bx bx-printer text-white" style={{ color: 'white' }}></i>
                        </button>
                      )} style={{ width: '60px', textAlign: 'center' }} />
                    </DataTable>
                  ) : (
                    /* ===== NORMAL DETAIL VIEW ===== */
                    <DataTable
                      ref={dtRef}
                      value={finalProcessedData}
                      paginator
                      rows={20}
                      loading={loadingData}
                      globalFilter={globalFilter}
                      style={{ fontSize: '13px' }}
                      header={
                        <div className="d-flex justify-content-end">
                          <InputText type="search" placeholder="Global Search" className="form-control" style={{ width: "250px" }} value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} />
                        </div>
                      }
                      responsiveLayout="scroll"
                    >
                      <Column field="ledger_date" header="Date" body={(row) => format(new Date(row.ledger_date), "dd-MMM-yyyy")} headerStyle={{ whiteSpace: 'nowrap' }} />
                      <Column field="invoice_no" header="Reference No." body={referenceBodyTemplate} headerStyle={{ whiteSpace: 'nowrap' }} />
                      {hasForeignCurrency && (!selectedCurrency || selectedCurrency.value === 'IDR') && (
                        <Column
                          header="Other Currency"
                          body={otherCurrencyBodyTemplate}
                          className="text-end"
                        />
                      )}
                      <Column field="convertedInvoiceAmount" header="Invoice Amount (A)" body={(r) => r.convertedInvoiceAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} className="text-end" />
                      <Column field="convertedReceiptAmount" header="Receipt (C)" body={(r) => r.convertedReceiptAmount > 0 ? <span style={{ color: 'red', cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleReceiptClick(r)} title="View Receipt Voucher">{r.convertedReceiptAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> : <span style={{ color: 'red' }}>{r.convertedReceiptAmount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>} className="text-end" />
                      <Column field="convertedDebitNote" header="Debit Note (B)" body={(r) => r.convertedDebitNote?.toLocaleString('en-US', { minimumFractionDigits: 2 })} className="text-end" />
                      <Column field="convertedCreditNote" header="Credit Note (D)" body={(r) => <span style={{ color: 'red' }}>{r.convertedCreditNote?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>} className="text-end" />
                      <Column field="cumulativeBalance" header="Balance((A+B)-(C+D))" body={(r) => <span className="fw-bold">{r.cumulativeBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>} className="text-end" />
                    </DataTable>
                  )}
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        {/* --- INVOICE VIEW POPUP --- */}
        <Dialog
          header={`Invoice View: ${invoiceDetails?.InvoiceNbr || ''}`}
          visible={showInvoiceDialog}
          style={{ width: '60vw' }}
          onHide={() => setShowInvoiceDialog(false)}
          draggable={false}
          resizable={false}
        >
          {loadingDetails ? (
            <div className="d-flex justify-content-center p-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : invoiceDetails ? (
            <div>
              <div className="mb-4">
                <Row className="mb-2">
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Customer</span>
                    <span>: {invoiceDetails.CustomerName}</span>
                  </Col>
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Invoice Date</span>
                    <span>: {invoiceDetails.Salesinvoicesdate ? format(new Date(invoiceDetails.Salesinvoicesdate), "dd-MMM-yyyy") : ''}</span>
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Total Amount</span>
                    <span>: {invoiceDetails.TotalAmount?.toLocaleString()}</span>
                  </Col>
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>PO No</span>
                    <span>: {invoiceDetails.PONumber || '-'}</span>
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Status</span>
                    <span>: <span className="badge bg-info">{invoiceDetails.Status}</span></span>
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
                <Column field="UnitPrice" header="Unit Price" className="text-end" body={(r) => r.UnitPrice?.toLocaleString()} />
                <Column field="TotalPrice" header="Total" className="text-end" body={(r) => r.TotalPrice?.toLocaleString()} />
              </DataTable>

              {invoiceDetails.Items?.some(item => (item.Note || '').trim()) && (
                <div className="mt-3 p-2 bg-light rounded text-muted">
                  <span className="fw-bold d-block mb-1" style={{ color: "#495057", fontSize: '13px' }}>Notes:</span>
                  {invoiceDetails.Items.filter(item => (item.Note || '').trim()).map((item, idx) => (
                    <div key={idx} className="mb-1" style={{ fontSize: '13px' }}>
                      {invoiceDetails.Items.length > 1 && <strong>{item.GasName || item.ItemName || "Item"}: </strong>}
                      {item.Note}
                    </div>
                  ))}
                </div>
              )}
              <div className="text-end mt-3">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowInvoiceDialog(false)}>Close</button>
              </div>
            </div>
          ) : (
            <div className="text-center p-3 text-muted">
              No details found for this invoice.
            </div>
          )}
        </Dialog>

        {/* --- RECEIPT VIEW POPUP (Styled like Invoice View) --- */}
        <Dialog
          header={`Receipt View: ${selectedReceipt?.receipt_no || selectedReceipt?.invoice_no || ''}`}
          visible={showReceiptDialog}
          style={{ width: '60vw' }}
          onHide={() => setShowReceiptDialog(false)}
          draggable={false}
          resizable={false}
        >
          {selectedReceipt ? (
            <div>
              {/* HEADER INFO SECTION - Matching Invoice View Format */}
              <div className="mb-4">
                <Row className="mb-2">
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Customer</span>
                    <span>: {selectedReceipt.customer_name || selectedCustomer?.label}</span>
                  </Col>
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Receipt Date</span>
                    <span>: {formatDate(selectedReceipt.ledger_date)}</span>
                  </Col>
                </Row>

                <Row className="mb-2">
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Total Amount</span>
                    <span>: {parseFloat(selectedReceipt.receipt_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </Col>
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Status</span>
                    <span>: <span className="badge bg-success">Posted</span></span>
                  </Col>
                </Row>

                {/* PAYMENT METHOD SECTION - Custom Underline Style */}
                <Row className="mb-2">
                  <Col md={12} className="d-flex align-items-baseline">
                    <span style={popupLabelStyle}>Payment Method</span>
                    <span className="me-1">:</span>
                    <div style={{
                      borderBottom: '1px solid #ced4da',
                      flexGrow: 1,
                      paddingLeft: '5px',
                      fontSize: '14.5px', // Matching standard font size
                      color: '#495057',
                      fontWeight: 'normal' // Ensuring 'Transfer' and Bank are NOT bold
                    }}>
                      Bank Transfer {getBankName(selectedReceipt)}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* ALLOCATIONS TABLE - COMMENTED OUT */}
              {/* <Label className="fw-bold text-muted mb-2" style={{ fontSize: '12px', textTransform: 'uppercase' }}>
                Invoices Paid by this Receipt
              </Label>
              <DataTable
                value={selectedReceipt.allocations || []} 
                className="p-datatable-sm p-datatable-gridlines"
                responsiveLayout="scroll"
                emptyMessage="No direct allocations found for this receipt."
              >
                <Column field="invoice_no" header="Invoice No." />
                <Column 
                  field="amount_allocated" 
                  header="Amount Paid" 
                  className="text-end" 
                  body={(r) => parseFloat(r.amount_allocated || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} 
                />
              </DataTable> */}

              <div className="text-end mt-3">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowReceiptDialog(false)}>Close</button>
              </div>
            </div>
          ) : (
            <div className="text-center p-3 text-muted">No details found for this receipt.</div>
          )}
        </Dialog>

        {/* --- NOTE (DN/CN) VIEW POPUP --- */}
        <Dialog
          header={`${noteDetails?.type === 'DN' ? 'Debit Note' : 'Credit Note'} View: ${noteDetails?.DebitNoteNumber || noteDetails?.DebitNoteNo || noteDetails?.CreditNoteNumber || noteDetails?.CreditNoteNo || ''}`}
          visible={showNoteDialog}
          style={{ width: '50vw' }}
          onHide={() => setShowNoteDialog(false)}
          draggable={false}
          resizable={false}
        >
          {loadingNote ? (
            <div className="d-flex justify-content-center p-4">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : noteDetails ? (
            <div>
              <div className="mb-4">
                <Row className="mb-2">
                  <Col md={12} className="d-flex">
                    <span style={popupLabelStyle}>Customer</span>
                    <span>: {selectedCustomer?.label || noteDetails.CustomerId}</span>
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col md={12} className="d-flex">
                    <span style={popupLabelStyle}>Date</span>
                    <span>: {noteDetails.TransactionDate || noteDetails.Date ? format(new Date(noteDetails.TransactionDate || noteDetails.Date), "dd-MMM-yyyy") : ''}</span>
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col md={12} className="d-flex">
                    <span style={popupLabelStyle}>Amount</span>
                    <span>: <span className="fw-bold fs-6">{(noteDetails.Amount || noteDetails.DebitAmount || noteDetails.CreditAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> {noteDetails.CurrencyCode || 'IDR'}</span>
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col md={12} className="d-flex">
                    <span style={popupLabelStyle}>Linked Invoice ID</span>
                    <span>: {noteDetails.InvoiceId || noteDetails.InvoiceNo || '-'}</span>
                  </Col>
                </Row>
                <Row className="mb-2">
                  <Col md={12} className="d-flex align-items-baseline">
                    <span style={popupLabelStyle}>Description</span>
                    <span className="me-1">:</span>
                    <div className="flex-grow-1 text-muted">
                      {noteDetails.Description || '-'}
                    </div>
                  </Col>
                </Row>
              </div>
              <div className="text-end mt-3 border-top pt-3">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowNoteDialog(false)}>Close</button>
              </div>
            </div>
          ) : (
            <div className="text-center p-3 text-muted">
              No details found for this Note.
            </div>
          )}
        </Dialog>

      </Container>
    </div>
  );
};

export default ARBookReport;