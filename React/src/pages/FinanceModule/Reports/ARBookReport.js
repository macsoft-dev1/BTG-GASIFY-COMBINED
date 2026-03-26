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
import { format } from "date-fns";
import { toast } from "react-toastify";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// --- API IMPORTS ---
import { getARBook, GetCustomerFilter, getCustomerAddress } from "../service/financeapi";
import { GetInvoiceDetails, GetSalesDetails, GetItemFilter } from "../../../common/data/invoiceapi";
import { getDebitNoteById, getCreditNoteById, GetAllCurrencies, getOutstandingInvoices, GetBankList } from "../../../common/data/mastersapi";
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
  const [currencyRates, setCurrencyRates] = useState({});
  const [currencyOptions, setCurrencyOptions] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [fromDate, setFromDate] = useState(firstDay);
  const [toDate, setToDate] = useState(today);
  const [globalFilter, setGlobalFilter] = useState("");
  const [customerSummary, setCustomerSummary] = useState(false);
  const dtRef = useRef(null);

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

  // --- RECEIPT ALLOCATIONS ---
  const [receiptAllocations, setReceiptAllocations] = useState([]);
  const [loadingAllocations, setLoadingAllocations] = useState(false);

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
        setBankList(banks.map(b => ({ value: b.BankId || b.value || b.Id, label: b.BankName })));

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
  }, [selectedCustomer, customerSummary, selectedCurrency, selectedItem]);

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
              customerid: customerId,
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
          let invAmt = parseFloat(row.invoice_amount || row.TotalAmount || row.total_amount || row.grand_total) || 0;
          const rate = currency === 'IDR' ? 1 : (currencyRates[currency] || 1);

          // FIX: If it's a receipt/note row that has the invoice amount in IDR but not in original currency field
          if (invAmt === 0 && (parseFloat(row.receipt_amount) > 0 || parseFloat(row.credit_note_amount) > 0 || parseFloat(row.debit_note_amount) > 0) && parseFloat(row.invoice_amount_idr) > 0) {
            invAmt = parseFloat(row.invoice_amount_idr) / rate;
          }

          return {
            ...row,
            currencyCode: currency,
            _hasExplicitCurrency: !!rawCurrency,
            invoiceAmount: invAmt,
            receiptAmount: parseFloat(row.receipt_amount) || 0,
            debitNote: parseFloat(row.debit_note_amount) || 0,
            creditNote: parseFloat(row.credit_note_amount) || 0,
            invoiceBalance: parseFloat(row.balance) || 0,
            totalReceiptAmount: parseFloat(row.total_receipt_amount) || 0,
          };
        });

        const groupedMap = new Map();
        const receiptsMap = new Map();
        const invoiceAmountsMap = new Map();
        
        // --- NEW: Global Maps for Combined Group Totals & IDs ---
        const groupReceiptIdsMap = new Map();
        const groupTotalAmountMap = new Map();

        convertedData.forEach(row => {
          if (row.invoice_no && row.invoiceAmount > 0) {
            invoiceAmountsMap.set(String(row.invoice_no).trim(), row.invoiceAmount);
          }
          
          if (row.combine_group_id && row.receiptAmount > 0) {
            const gId = row.combine_group_id;
            // Collect all unique receipt IDs for this group
            if (!groupReceiptIdsMap.has(gId)) groupReceiptIdsMap.set(gId, new Set());
            groupReceiptIdsMap.get(gId).add(row.transaction_id || row.id || row.receipt_id);
            
            // Sum up the total_receipt_amount for the head (only once per unique receipt ID)
            // But actually, we just need the total of the whole combination.
            // Use totalReceiptAmount which is the full receipt total from DB.
          }
        });

        // Second pass to strictly calculate group totals (distinct by receipt_id)
        const uniqueReceiptsInGroups = new Set();
        convertedData.forEach(row => {
            if (row.combine_group_id && !uniqueReceiptsInGroups.has(row.transaction_id || row.id || row.receipt_id)) {
                uniqueReceiptsInGroups.add(row.transaction_id || row.id || row.receipt_id);
                const gId = row.combine_group_id;
                const amt = parseFloat(row.totalReceiptAmount || row.total_receipt_amount || 0);
                groupTotalAmountMap.set(gId, (groupTotalAmountMap.get(gId) || 0) + amt);
            }
        });

        const finalRows = [];

        convertedData.forEach(row => {


          const refNo = row.invoice_no ? String(row.invoice_no).trim() : "";
          const isReceipt = row.receiptAmount > 0;
          const shouldGroup = refNo && !refNo.startsWith("DO") && !refNo.startsWith("27");

          if (shouldGroup) {
            const key = `${refNo}_${row.currencyCode}`;
            if (isReceipt) {
              if (!receiptsMap.has(key)) receiptsMap.set(key, []);
              const currentList = receiptsMap.get(key);

              // If it's a combined receipt, look for an existing entry in this list with the same group ID
              if (row.combine_group_id) {
                const globalIds = Array.from(groupReceiptIdsMap.get(row.combine_group_id) || []);
                const globalTotal = groupTotalAmountMap.get(row.combine_group_id) || 0;

                const existingCombined = currentList.find(r => r.combine_group_id === row.combine_group_id);
                if (existingCombined) {
                    existingCombined.receiptAmount += row.receiptAmount;
                    // Always ensure it has the full global context
                    existingCombined._grouped_receipt_ids = globalIds;
                    existingCombined.mergedTotalAmount = globalTotal;
                    return;
                } else {
                    const mergedRec = { ...row };
                    mergedRec._grouped_receipt_ids = globalIds;
                    mergedRec.mergedTotalAmount = globalTotal;
                    currentList.push(mergedRec);
                    return;
                }
              }

              const existingRec = currentList.find(r => r.transaction_id === row.transaction_id);
              if (existingRec) {
                existingRec.receiptAmount += row.receiptAmount;
              } else {
                currentList.push(row);
              }
            } else {
              if (groupedMap.has(key)) {
                const existing = groupedMap.get(key);
                existing.invoiceAmount = Math.max(parseFloat(existing.invoiceAmount) || 0, parseFloat(row.invoiceAmount) || 0);
                existing.debitNote += row.debitNote;
                existing.creditNote += row.creditNote;
                existing.invoice_amount = Math.max(parseFloat(existing.invoice_amount) || 0, parseFloat(row.invoice_amount) || 0);
              } else {
                groupedMap.set(key, { ...row });
              }
            }
          } else {
            finalRows.push(row);
          }
        });

        // Combine receipts into their corresponding grouped invoices
        receiptsMap.forEach((receiptsList, key) => {
          const [invNo] = key.split("_");
          if (groupedMap.has(key)) {
            const existing = groupedMap.get(key);
            existing.receiptsList = receiptsList;
            existing.receiptAmount = receiptsList.reduce((sum, r) => sum + r.receiptAmount, 0);
          } else {
            // Receipt without an invoice row in current range: try to use cached invoice amount
            const firstReceipt = { ...receiptsList[0] };
            firstReceipt.receiptsList = receiptsList;
            firstReceipt.receiptAmount = receiptsList.reduce((sum, r) => sum + r.receiptAmount, 0);
            if (!firstReceipt.invoiceAmount) {
              firstReceipt.invoiceAmount = invoiceAmountsMap.get(invNo) || 0;
            }
            groupedMap.set(key, firstReceipt);
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

  const handleReceiptClick = async (rowData) => {
    setSelectedReceipt(rowData);
    setShowReceiptDialog(true);
    setReceiptAllocations([]);

    const rId = rowData.receipt_id || rowData.id;
    const cId = rowData.customer_id || (selectedCustomer ? selectedCustomer.value : 0);

    if (rId && cId) {
      setLoadingAllocations(true);
      try {
        if ((rowData.is_combined || rowData.combine_group_id) && rowData._grouped_receipt_ids) {
            let allAllocations = [];
            // Fetch allocations for all merged original receipts
            await Promise.all(rowData._grouped_receipt_ids.map(async (id) => {
                const response = await getOutstandingInvoices(cId, id, null, null, true);
                const data = response?.data || response;
                if (Array.isArray(data)) {
                    allAllocations = [...allAllocations, ...data];
                }
            }));
            setReceiptAllocations(allAllocations);
        } else {
            const response = await getOutstandingInvoices(cId, rId, null, null, true);
            const data = response?.data || response;
            if (Array.isArray(data)) {
              setReceiptAllocations(data);
            }
        }
      } catch (err) {
        console.error("Error fetching allocations:", err);
      } finally {
        setLoadingAllocations(false);
      }
    }
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
    return filtered.map((row, index) => {
      const rowKey = (row.transaction_id || row.invoice_no) + "_" + index;
      const rowBalance = (row.invoiceAmount || 0) + (row.debitNote || 0) - (row.creditNote || 0) - (row.receiptAmount || 0);

      // FIX: If NO currency is specifically selected (mixed viewing), convert foreign balance into IDR 
      // before adding it to the cumulative balance to prevent incorrect aggregate math.
      let balanceToAdd = rowBalance;
      if (!selectedCurrency && row.currencyCode && row.currencyCode !== 'IDR') {
        const rate = currencyRates[row.currencyCode] || 1;
        balanceToAdd = rowBalance * rate;
      }

      runningBalance += balanceToAdd;

      return {
        ...row,
        rowKey,
        cumulativeBalance: runningBalance
      };
    });
  }, [arBook, selectedCurrency, currencyRates]);

  // --- CUSTOMER SUMMARY GROUPING ---
  const summaryData = useMemo(() => {
    if (!customerSummary) return [];
    const grouped = {};

    finalProcessedData.forEach(row => {
      const name = row.customer_name || 'Unknown';
      const cur = row.currencyCode || 'IDR';

      if (!grouped[name]) {
        grouped[name] = {
          customerName: name,
          customerId: row.customer_id || 0,
          arBalance: 0, // Total in IDR
          currencyBalances: {} // Individual currencies
        };
      }

      const amt = (row.invoiceAmount || 0) + (row.debitNote || 0) - (row.creditNote || 0) - (row.receiptAmount || 0);

      if (!grouped[name].currencyBalances[cur]) grouped[name].currencyBalances[cur] = 0;
      grouped[name].currencyBalances[cur] += amt;

      // Also track converted total (IDR)
      const rate = cur === 'IDR' ? 1 : (currencyRates[cur] || 1);
      grouped[name].arBalance += (amt * rate);
    });

    const rows = Object.values(grouped).map(g => ({
      ...g,
      ...g.currencyBalances
    }));

    rows.sort((a, b) => a.customerName.localeCompare(b.customerName));
    return rows;
  }, [finalProcessedData, customerSummary, currencyRates]);

  const summaryCurrencies = useMemo(() => {
    const list = new Set();
    finalProcessedData.forEach(r => {
      if (r.currencyCode && r.currencyCode !== 'IDR') list.add(r.currencyCode);
    });
    return Array.from(list).sort();
  }, [finalProcessedData]);

  const summaryTotals = useMemo(() => {
    if (!customerSummary || summaryData.length === 0) return {};
    const totals = { arBalance: 0, converted: {} };
    summaryData.forEach(row => {
      totals.arBalance += row.arBalance;
      if (row.currencyBalances) {
        Object.keys(row.currencyBalances).forEach(cur => {
          if (!totals[cur]) totals[cur] = 0;
          totals[cur] += row.currencyBalances[cur];
        });
      }
    });

    // Calculate converted equivalents for each currency column (for footer)
    summaryCurrencies.forEach(cur => {
      const rate = currencyRates[cur] || 1;
      totals.converted[cur] = (totals[cur] || 0) * rate;
    });
    totals.converted['IDR'] = totals['IDR'] || 0;

    return totals;
  }, [summaryData, customerSummary, summaryCurrencies, currencyRates]);

  const summaryTotal = summaryTotals.arBalance || 0;

  const [first, setFirst] = useState(0);
  const [rows, setRows] = useState(20);

  const totalARValue = useMemo(() => {
    if (customerSummary) return summaryTotal;
    if (finalProcessedData.length === 0) return 0;
    return finalProcessedData[finalProcessedData.length - 1].cumulativeBalance;
  }, [finalProcessedData, customerSummary, summaryTotal]);

  const hasForeignCurrency = useMemo(() => {
    return finalProcessedData.some(row => row.currencyCode && row.currencyCode !== 'IDR');
  }, [finalProcessedData]);

  const referenceBodyTemplate = (row) => {
    // 1. Credit Note (Yellow/Warning) take priority even if invoice_no is present
    if (parseFloat(row.creditNote || 0) > 0 && !row.invoiceAmount && !row.debitNote) {
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

    // 2. Debit Note (Red/Danger)
    if (parseFloat(row.debitNote || 0) > 0 && !row.invoiceAmount && !row.creditNote) {
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

    // 3. Valid Invoice (Blue/Primary) - No link as it's in Column (A)
    if (row.invoice_no && !row.invoice_no.startsWith("DO") && !row.invoice_no.startsWith("27")) {
      return (
        <span className="text-primary fw-bold">
          {row.invoice_no}
        </span>
      );
    }

    // 4. Receipt (Green/Success) - No link as it's in Column (C)
    if (row.receiptAmount > 0 && !row.invoiceAmount && !row.debitNote && !row.creditNote) {
      return (
        <span className="text-success fw-bold">
          {row.invoice_no || row.receipt_no || "-"}
        </span>
      );
    }

    return <span className="text-muted">{row.invoice_no || row.receipt_no || "-"}</span>;
  };

  const otherCurrencyBodyTemplate = (rowData) => {
    if (rowData.currencyCode && rowData.currencyCode !== 'IDR') {
      const originalAmt = parseFloat(rowData.invoice_amount || rowData.credit_note_amount || rowData.debit_note_amount || rowData.receipt_amount);
      if (!originalAmt || originalAmt === 0) return "";

      return (
        <span
          className="text-muted"
          style={{ fontSize: '12px', cursor: 'pointer' }}
          title={`Ex. Rate: ${rowData.exchangeRate?.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        >
          {originalAmt.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      );
    }
    return "";
  };

  // --- SOA PRINT HANDLER ---
  const handleSOAPrint = async (summaryRow, isHeaderPrint = false) => {
    try {
      if (!summaryRow.customerId) {
        toast.warning("Customer ID not found for SOA print.");
        return;
      }

      // Fetch outstanding invoices.
      const fDateStr = fromDate ? format(fromDate, 'yyyy-MM-dd') : null;
      const tDateStr = toDate ? format(toDate, 'yyyy-MM-dd') : null;

      const response = await getOutstandingInvoices(summaryRow.customerId, null, null, null);
      const data = response?.data || response;

      if (!Array.isArray(data) || data.length === 0) {
        toast.warning("No outstanding invoices found for this customer.");
        return;
      }

      // Determine currency from the returned data (assuming same currency for all outstanding)
      const parseSOADate = (ds) => {
        if (!ds) return new Date(0);
        const parsed = new Date(ds);
        if (!isNaN(parsed.getTime())) return parsed;
        const parts = String(ds).split("-");
        if (parts.length === 3) {
          return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
        }
        return new Date(0);
      };

      // 1. Group by Currency
      const currencyGroups = {};
      data.forEach(inv => {
        const rowDate = inv.invoice_date || inv.TransactionDate || inv.date;
        const parsedDate = parseSOADate(rowDate);



        const openBalance = parseFloat(inv.balance_due) || 0;
        if (openBalance <= 0.01) return;

        const curCode = (inv.currencycode || inv.CurrencyCode || 'IDR').toUpperCase();
        if (!currencyGroups[curCode]) {
          currencyGroups[curCode] = {
            rows: [],
            totals: { m1: 0, m2: 0, m3: 0, m4: 0, mOver: 0, total: 0 }
          };
        }

        const totalAmount = parseFloat(inv.TotalAmount || inv.total_amount || inv.invoice_amount) || 0;
        currencyGroups[curCode].rows.push({
          rawDate: rowDate,
          parsedDate: parsedDate,
          invoiceNo: inv.invoice_no || inv.InvoiceNo || '-',
          poNo: inv.po_no || inv.PONumber || '-',
          debit: totalAmount,
          credit: totalAmount - openBalance,
          openBalance: openBalance
        });
      });

      // 2. Sort and Calculate Running Balances & Aging per group
      const now = new Date();
      Object.keys(currencyGroups).forEach(cur => {
        const group = currencyGroups[cur];
        group.rows.sort((a, b) => a.parsedDate - b.parsedDate);

        let runningBalance = 0;
        group.rows.forEach(r => {
          // Calculate Running Balance
          runningBalance += (r.debit - r.credit);
          r.balance = runningBalance;

          // Aging calculation
          const diffDays = Math.floor((now - r.parsedDate) / (1000 * 60 * 60 * 24));
          if (diffDays <= 30) group.totals.m1 += r.openBalance;
          else if (diffDays <= 60) group.totals.m2 += r.openBalance;
          else if (diffDays <= 90) group.totals.m3 += r.openBalance;
          else if (diffDays <= 120) group.totals.m4 += r.openBalance;
          else group.totals.mOver += r.openBalance;

          group.totals.total += r.openBalance;
        });
      });

      const currencyList = Object.keys(currencyGroups);
      if (currencyList.length === 0) {
        toast.warning("No non-zero outstanding invoices found in this range.");
        return;
      }

      const fmt = (v) => v.toLocaleString('en-US', { minimumFractionDigits: 2 });
      // Helper to cleanly format the date for display
      const fmtDisplayDate = (dObj) => {
        if (isNaN(dObj.getTime())) return "Invalid Date";
        return dObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
      };
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
            @page { margin: 0; size: A4; }
            * { box-sizing: border-box; }
            html, body { height: 100vh; margin: 0; }
            body { font-family: Arial, Helvetica, sans-serif; font-size: 10px; color: #000; padding: 15mm 20mm; }
            .soa-page { height: 100%; display: flex; flex-direction: column; page-break-after: always; }
            .soa-page:last-child { page-break-after: auto; }
            .content-wrapper { flex: 1 1 auto; }
            .footer-wrapper { flex: 0 0 auto; }
            .top-branding { margin-bottom: 25px; text-align: left; }
            .top-branding img { width: 110px; margin-bottom: 5px; }
            .top-branding h3 { color: #5a5f9c; margin: 0; font-size: 10px; font-weight: bold; letter-spacing: 0.5px; }
            .page-title { text-align: center; margin: 0 0 15px 0; font-size: 14px; font-weight: bold; text-decoration: underline; font-family: Arial, sans-serif; }
            .info-section { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 9px; }
            .info-left { width: 60%; }
            .info-left .cust-name { font-weight: bold; font-size: 10px; margin-bottom: 8px; text-transform: uppercase; }
            .info-left .cust-addr { font-size: 9px; line-height: 1.4; text-transform: uppercase; }
            .info-right { width: 35%; display: flex; justify-content: flex-end; }
            .info-right table { margin: 0; border-collapse: collapse; }
            .info-right td { padding: 2px 4px; font-size: 9px; vertical-align: top; }
            .info-right td.lbl { width: 60px; }
            table.main { width: 100%; border-collapse: collapse; margin-bottom: 0px; border: 1px solid #000; }
            table.main th, table.main td { padding: 5px 6px; font-size: 8px; border-right: 1px solid #000; }
            table.main th { border-bottom: 1px solid #000; border-top: 1px solid #000; font-weight: bold; text-align: center; text-transform: uppercase; }
            table.main td { border-bottom: none; border-top: none; }
            table.main tr:last-child td { border-bottom: 1px solid #000; }
            table.main th:nth-child(1), table.main td:nth-child(1) { width: 12%; text-align: center; } 
            table.main th:nth-child(2), table.main td:nth-child(2) { width: 18%; text-align: center; } 
            table.main th:nth-child(3), table.main td:nth-child(3) { width: 22%; text-align: center; } 
            table.main th:nth-child(4), table.main td:nth-child(4) { width: 16%; text-align: right; }  
            table.main th:nth-child(5), table.main td:nth-child(5) { width: 16%; text-align: right; }  
            table.main th:nth-child(6), table.main td:nth-child(6) { width: 16%; text-align: right; }  
            .outstanding-block { display: flex; align-items: stretch; margin-top: 10px; font-size: 9px; margin-bottom: 10px; }
            .outstanding-label { font-weight: bold; display: flex; align-items: center; margin-right: 10px; }
            .outstanding-amount { border: 1px solid #000; padding: 4px 15px; font-weight: bold; display: flex; align-items: center; justify-content: flex-end; min-width: 100px; }
            .due-label { font-weight: bold; display: flex; align-items: center; margin-left: 10px; }
            .aging-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; border: 1px solid #000; }
            .aging-table th, .aging-table td { border: 1px solid #000; padding: 4px 5px; text-align: center; font-size: 8px; width: 20%; }
            .aging-table th { font-weight: bold; text-transform: uppercase; }
            .aging-table td { font-weight: bold; text-align: right; }
            .footer-notes { font-size: 8px; font-weight: bold; margin-bottom: 15px; }
            .footer-notes p { margin: 2px 0; }
            .company-footer { display: flex; justify-content: space-between; align-items: flex-end; font-size: 8px; color: #5a5f9c; }
            .company-details p { margin: 1px 0; }
            .company-details a { color: #5a5f9c; text-decoration: none; font-weight: bold; }
            .company-details span.black-text { color: #000; font-weight: normal; }
          </style>
        </head>
        <body>
          ${currencyList.map((cur, curIdx) => {
        const group = currencyGroups[cur];
        const { m1, m2, m3, m4, mOver, total } = group.totals;

        return `
            <div class="soa-page">
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
                      <tr><td class="lbl">Page</td><td>:</td><td>${curIdx + 1}/${currencyList.length}</td></tr>
                      <tr><td class="lbl">Currency</td><td>:</td><td>${cur}</td></tr>
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
                    ${group.rows.map(r => `
                      <tr>
                        <td>${fmtDisplayDate(r.parsedDate)}</td>
                        <td>${r.poNo}</td>
                        <td>${r.invoiceNo}</td>
                        <td style="text-align:right">${r.debit > 0 ? fmt(r.debit) : ''}</td>
                        <td style="text-align:right">${r.credit > 0 ? fmt(r.credit) : ''}</td>
                        <td style="text-align:right">${fmt(r.balance)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div> 
              <div class="footer-wrapper">
                <div class="outstanding-block">
                  <div class="outstanding-label">YOUR OUTSTANDING BALANCE</div>
                  <div class="outstanding-amount">${fmt(total)}</div>
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
                </div>
              </div>
            </div>`;
      }).join('')}
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

  const exportSummaryToExcel = () => {
    if (!summaryData || summaryData.length === 0) return;

    const exportData = summaryData.map((row) => {
      const exportRow = {
        "Customer Name": row.customerName,
        "IDR Balance": row.IDR || 0,
      };

      summaryCurrencies.forEach(cur => {
        exportRow[`${cur} Balance`] = row[cur] || 0;
      });

      return exportRow;
    });

    // Add Total Row
    const totalRow = {
      "Customer Name": "GRAND TOTAL (Converted to IDR)",
      "IDR Balance": summaryTotal,
    };
    exportData.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "AR Summary");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    saveAs(data, `AR-Customer-Summary-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
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
                      {customerSummary ? (
                        <button
                          type="button"
                          className="btn btn-secondary d-inline-flex align-items-center"
                          style={{
                            backgroundColor: "#6c757d",
                            border: "none",
                            padding: "8px 20px",
                            borderRadius: "8px",
                            fontWeight: "600",
                            fontSize: "14px"
                          }}
                          onClick={exportSummaryToExcel}
                        >
                          <i className="bx bx-export me-2" style={{ fontSize: "18px" }}></i>
                          Export
                        </button>
                      ) : (
                        <>
                          <button type="button" className="btn btn-primary me-2" onClick={fetchARBook} disabled={loadingData}>
                            {loadingData ? "Loading..." : "Search"}
                          </button>
                          <button type="button" className="btn btn-secondary" onClick={() => handleSOAPrint({ customerName: selectedCustomer?.label, customerId: selectedCustomer?.value }, true)}>Print</button>
                        </>
                      )}
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
                      rows={rows}
                      first={first}
                      onPage={(e) => {
                        setFirst(e.first);
                        setRows(e.rows);
                      }}
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
                        (first + rows >= summaryData.length) ? (
                          <ColumnGroup>
                            {/* Row 1: Original Currency Totals */}
                            <PrimeRow>
                              <Column footer="Total (Original):" colSpan={1} footerStyle={{ textAlign: 'right', fontWeight: 'bold', padding: '15px 10px' }} />
                              <Column footer={(summaryTotals['IDR'] || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} footerStyle={{ textAlign: 'right', fontWeight: 'bold', padding: '15px 10px' }} />
                              {summaryCurrencies.map(cur => (
                                <Column key={cur} footer={(summaryTotals[cur] || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} footerStyle={{ textAlign: 'right', fontWeight: 'bold', padding: '15px 10px' }} />
                              ))}
                              <Column footer="" />
                            </PrimeRow>
                            {/* Row 2: Converted Individual Totals + Grand Total */}
                            <PrimeRow>
                              <Column footer="Total Converted (IDR):" colSpan={1} footerStyle={{ textAlign: 'right', fontWeight: 'bold', padding: '15px 10px', backgroundColor: '#f9f9f9' }} />
                              <Column footer={(summaryTotals.converted?.['IDR'] || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} footerStyle={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: '#666', padding: '15px 10px', backgroundColor: '#f9f9f9' }} />
                              {summaryCurrencies.map(cur => (
                                <Column key={cur} footer={(summaryTotals.converted?.[cur] || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} footerStyle={{ textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: '#666', padding: '15px 10px', backgroundColor: '#f9f9f9' }} />
                              ))}
                              <Column
                                footer={summaryTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                footerStyle={{ textAlign: 'right', fontWeight: 'bold', fontSize: '16px', color: 'firebrick', borderTop: '2px solid firebrick', padding: '15px 10px', backgroundColor: '#f9f9f9' }}
                              />
                            </PrimeRow>
                          </ColumnGroup>
                        ) : null
                      }
                    >
                      <Column field="customerName" header="Customer Name" sortable filter filterPlaceholder="Search Customer" />
                      <Column field="IDR" header="IDR Balance" body={(r) => r.IDR ? <b>{r.IDR.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b> : ""} className="text-end" sortable />
                      {summaryCurrencies.map(cur => (
                        <Column key={cur} field={cur} header={`${cur} Balance`} body={(r) => r[cur] ? <b>{r[cur].toLocaleString('en-US', { minimumFractionDigits: 2 })}</b> : ""} className="text-end" sortable />
                      ))}
                      <Column header="SOA" body={(r) => (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handleSOAPrint(r, true)}
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
                      <Column field="invoiceAmount" header="Invoice Amount (A)" body={(r) => r.invoiceAmount > 0 ? <span className="text-primary fw-bold" style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={() => handleInvoiceClick(r)} title="View Invoice Details">{r.invoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> : ""} className="text-end" />
                      <Column field="receiptAmount" header="Receipt (C)" body={(r) => {
                        const renderLink = (rec, idx) => (
                          <div key={idx}>
                            <span
                              className="text-success fw-bold"
                              style={{ cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => handleReceiptClick(rec)}
                              title="View Receipt Details"
                            >
                              {parseFloat(rec.receiptAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        );

                        if (r.receiptsList && r.receiptsList.length > 0) {
                          return <div>{r.receiptsList.map((rec, i) => renderLink(rec, i))}</div>;
                        } else if (r.receiptAmount > 0) {
                          return renderLink(r, 0);
                        }
                        return "";
                      }} className="text-end" />
                      <Column field="invoiceBalance" header="Balance(Invoice)" body={(r) => r.invoiceBalance !== 0 ? r.invoiceBalance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : ""} className="text-end" />
                      <Column field="debitNote" header="Debit Note (B)" body={(r) => r.debitNote > 0 ? <span className="text-danger fw-bold">{r.debitNote.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> : ""} className="text-end" />
                      <Column field="creditNote" header="Credit Note (D)" body={(r) => r.creditNote > 0 ? <span className="text-warning fw-bold">{r.creditNote.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span> : ""} className="text-end" />
                      <Column field="cumulativeBalance" header="Balance((A+B)-(C+D))" body={(r) => <span className="fw-bold" style={{ color: 'firebrick' }}>{r.cumulativeBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>} className="text-end" />
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
              </div>
              <DataTable
                value={invoiceDetails.Items || []}
                className="p-datatable-sm p-datatable-gridlines"
                responsiveLayout="scroll"
              >
                <Column field="GasName" header="Description" body={(r) => r.GasName || r.ItemName || "Item"} />
                <Column field="PickedQty" header="Qty" className="text-end" />
                <Column field="UnitPrice" header="Unit Price" className="text-end" body={(r) => r.UnitPrice?.toLocaleString()} />
                <Column field="TotalPrice" header="Total" className="text-end" body={(r) => r.TotalPrice?.toLocaleString()} />
                <Column
                  field="Note"
                  header="Note"
                  body={(r) => (
                    <span>
                      {r.Note || "-"}
                    </span>
                  )}
                />
              </DataTable>

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

        {/* --- RECEIPT VIEW POPUP --- */}
        <Dialog
          header={`Receipt: ${selectedReceipt?.is_combined ? selectedReceipt?.custom_voucher_no : (selectedReceipt?.receipt_id || selectedReceipt?.receipt_no || '')}`}
          visible={showReceiptDialog}
          style={{ width: '60vw' }}
          onHide={() => setShowReceiptDialog(false)}
          draggable={false}
          resizable={false}
        >
          {selectedReceipt ? (
            <div>
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
                    <span>: {parseFloat(selectedReceipt.mergedTotalAmount || selectedReceipt.totalReceiptAmount || selectedReceipt.receipt_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </Col>
                  <Col md={6} className="d-flex">
                    <span style={popupLabelStyle}>Bank Name</span>
                    <span>: {getBankName(selectedReceipt) || "-"}</span>
                  </Col>
                </Row>

                <Row className="mb-2">
                  <Col md={12} className="d-flex align-items-baseline">
                    <span style={popupLabelStyle}>Payment Method</span>
                    <span className="me-1">:</span>
                    <div style={{
                      borderBottom: '1px solid #ced4da',
                      flexGrow: 1,
                      paddingLeft: '5px',
                      fontSize: '14.5px',
                      color: '#495057',
                      fontWeight: 'normal'
                    }}>
                      {selectedReceipt.payment_mode === "Bank" ? "Bank Transfer" : (selectedReceipt.payment_mode || "Bank Transfer")}
                    </div>
                  </Col>
                </Row>
              </div>

              {/* --- ALLOCATED INVOICES SECTION --- */}
              {loadingAllocations ? (
                <div className="text-center p-3">
                  <i className="bx bx-loader bx-spin font-size-18 align-middle me-2"></i>
                  Loading Allocations...
                </div>
              ) : receiptAllocations.length > 0 ? (
                <div className="mt-4">
                  <h6 className="fw-bold mb-3" style={{ color: '#5a5f9c' }}>Allocated Invoices</h6>
                  <DataTable
                    value={receiptAllocations}
                    className="p-datatable-sm p-datatable-gridlines shadow-sm"
                    responsiveLayout="scroll"
                  >
                    <Column field="invoice_no" header="Invoice No" style={{ width: '25%' }} />
                    <Column field="invoice_date" header="Invoice Date" style={{ width: '15%', textAlign: 'center' }} />
                    <Column field="po_no" header="PO No" style={{ width: '15%' }} />
                    <Column
                      field="total_amount"
                      header="Invoice Amount"
                      body={(rowData) => (
                        <span className="text-primary">
                          {parseFloat(rowData.total_amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      style={{ width: '20%', textAlign: 'right' }}
                    />
                    <Column
                      field="allocated_here"
                      header="Allocated Amount"
                      body={(rowData) => (
                        <span className="fw-bold text-success">
                          {parseFloat(rowData.allocated_here || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      style={{ width: '25%', textAlign: 'right' }}
                    />
                  </DataTable>
                </div>
              ) : (
                <div className="text-center p-3 text-muted border rounded bg-light mt-3" style={{ fontSize: '13px' }}>
                  No formal invoice allocations found for this receipt.
                </div>
              )}

              <div className="text-end mt-4">
                <button className="btn btn-secondary btn-sm px-4" onClick={() => setShowReceiptDialog(false)}>Close</button>
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