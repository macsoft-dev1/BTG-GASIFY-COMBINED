import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
    Container,
    Row,
    Col,
    Card,
    CardBody,
    Button,
    Label,
    Input,
    Nav,
    NavItem,
    NavLink,
    TabContent,
    TabPane,
    Table,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter
} from "reactstrap";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import classnames from "classnames";
import { toast } from "react-toastify";
import axios from "axios";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext";

// --- API IMPORTS ---
import {
    GetAllGRNList,
    GetAllIRNList,
    GetAllSuppliers,
    GetAllCurrencies,
    GenerateSPC,
    GetGRNById,
    GetByIdPurchaseOrder,
    GetByIdPurchaseRequisition,
    GetAllPurchaseOrderList,
    GetPaymentHistory,
    GetAllClaimAndPayment,
    ClaimAndPaymentGetById,
    FetchAPLedger
} from "../../common/data/mastersapi";

const AP = () => {
    // --- Auth Context ---
    const authUser = JSON.parse(localStorage.getItem("authUser"));
    const orgId = authUser?.orgId || 1;
    const branchId = authUser?.branchId || 1;
    const userId = authUser?.u_id || 1;

    // --- States ---
    const [activeTab, setActiveTab] = useState("1");
    const [filter, setFilter] = useState({
        supplier: null,
        currency: null,
        fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        toDate: new Date(),
    });

    const [supplierList, setSupplierList] = useState([]);
    const [currencyList, setCurrencyList] = useState([]);
    const [poLookup, setPoLookup] = useState({});

    const [accruedData, setAccruedData] = useState([]);
    const [payableData, setPayableData] = useState([]);
    const [selectedPayables, setSelectedPayables] = useState([]);
    const [loading, setLoading] = useState(false);

    // --- Search States ---
    const [globalFilterAccrued, setGlobalFilterAccrued] = useState("");
    const [globalFilterPayable, setGlobalFilterPayable] = useState("");
    const [globalFilterLedger, setGlobalFilterLedger] = useState("");

    const [ledgerData, setLedgerData] = useState([]);

    // --- Modal States ---
    const [modal, setModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [modalData, setModalData] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    const [selectedIRNDetail, setSelectedIRNDetail] = useState(null);
    const [irnDetailVisible, setIrnDetailVisible] = useState(false);
    const [selectedClaimDetail, setSelectedClaimDetail] = useState(null);
    const [claimDetailVisible, setClaimDetailVisible] = useState(false);

    // --- New States for CLM Link Details ---
    const [showClaimDetailModal, setShowClaimDetailModal] = useState(false);
    const [claimDetailData, setClaimDetailData] = useState(null);
    const [loadingClaimDetail, setLoadingClaimDetail] = useState(false);

    const [nestedModal, setNestedModal] = useState(false);
    const [nestedPOData, setNestedPOData] = useState(null);
    const [nestedPOLoading, setNestedPOLoading] = useState(false);

    // PR Modal States
    const [prModal, setPrModal] = useState(false);
    const [prData, setPrData] = useState(null);
    const [prLoading, setPrLoading] = useState(false);

    // --- Styles ---
    const modalStyle = `
        .blue-table-header th {
            background-color: #3e6e9e !important;
            color: white !important;
            font-weight: bold !important;
            text-align: left;
        }
        .btn-close-custom {
            background-color: #c06361 !important;
            border-color: #c06361 !important;
            color: white !important;
        }
        .bold-label {
            font-weight: bold;
            min-width: 120px;
            color: #333;
        }
        .p-datatable .p-datatable-tbody > tr > td {
            padding: 12px 16px !important;
        }
        .p-datatable .p-datatable-thead > tr > th {
            padding: 12px 16px !important;
        }
    `;

    // --- 1. Load Dropdowns & PO List ---


    // --- 1. Load Dropdowns & PO List ---
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const supRes = await GetAllSuppliers(orgId, branchId);
                if (supRes?.data) {
                    setSupplierList(supRes.data.map(s => ({ value: s.SupplierId, label: s.SupplierName })));
                }
                const curRes = await GetAllCurrencies({});
                if (curRes?.data) {
                    const allowedCurrencies = ["IDR", "USD", "MYR", "SGD", "CNY"];
                    const mappedCur = curRes.data
                        .filter(c => allowedCurrencies.includes(c.CurrencyCode))
                        .map(c => ({ value: c.CurrencyId, label: c.CurrencyCode }));
                    setCurrencyList(mappedCur);
                }

                const poRes = await GetAllPurchaseOrderList(0, branchId, 0, orgId, userId);
                const poDataList = poRes?.data || (Array.isArray(poRes) ? poRes : []);

                if (poDataList && Array.isArray(poDataList)) {
                    const lookup = {};
                    poDataList.forEach(po => {
                        const pid = po.poid || po.POId || po.po_id || po.purchase_id;
                        if (pid) {
                            lookup[pid] = {
                                pono: po.pono || po.PONo || po.PO_Number || po.ponumber || po.po_no || po.PONumber,
                                podate: po.podate || po.PODate || po.po_date || po.docdate,
                                currencyid: po.currencyid || po.CurrencyId || po.currency_id || po.TransactionCurrencyId,
                                currencycode: po.currencycode || po.CurrencyCode || po.currency_code || po.transactioncurrency || po.TransactionCurrency
                            };
                        }
                    });
                    setPoLookup(lookup);
                }
            } catch (error) {
                console.error("Error loading initial data", error);
            }
        };
        loadInitialData();
    }, [orgId, branchId, userId]);

    const statusBodyTemplate = (rowData) => {
        const isSubmitted = rowData.IsSubmitted || rowData.issubmitted;
        return (
            <div className="d-flex justify-content-center align-items-center">
                <span
                    className={classnames("badge rounded-circle d-flex align-items-center justify-content-center", {
                        "bg-success": isSubmitted,
                        "bg-danger": !isSubmitted
                    })}
                    style={{ width: "22px", height: "22px", fontSize: "12px", fontWeight: "bold", color: "#fff" }}
                    title={isSubmitted ? "Posted" : "Saved"}
                >
                    {isSubmitted ? "P" : "S"}
                </span>
            </div>
        );
    };

    const formatDate = (date) => {
        if (!date) return "-";
        const d = new Date(date);
        if (isNaN(d.getTime())) return "-";
        const day = String(d.getDate()).padStart(2, '0');
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        return <span style={{ whiteSpace: 'nowrap' }}>{`${day}-${month}-${year}`}</span>;
    };

    // --- 2. Fetch Grid Data ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const formatForApi = (date) => {
                if (!date) return "";
                if (date instanceof Date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                }
                if (typeof date === "string") {
                    // Handle DD-MM-YYYY or DD/MM/YYYY
                    const parts = date.split(/[-/]/);
                    if (parts.length === 3) {
                        if (parts[0].length === 4) return date; // Already YYYY-MM-DD
                        return `${parts[2]}-${parts[1]}-${parts[0]}`;
                    }
                    const d = new Date(date);
                    if (!isNaN(d.getTime())) {
                        const year = d.getFullYear();
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }
                }
                return "";
            };
            const fromDateStr = formatForApi(filter.fromDate);
            const toDateStr = formatForApi(filter.toDate);
            const supplierId = filter.supplier ? filter.supplier.value : 0;
            const currencyId = (activeTab === "1" || !filter.currency) ? 0 : filter.currency.value;

            // Refresh PO Lookup locally for this fetch to ensure accuracy
            const poRes = await GetAllPurchaseOrderList(0, branchId, supplierId, orgId, userId);
            const poDataList = poRes?.data || (Array.isArray(poRes) ? poRes : []);
            // Build currentPoLookup fresh from the API response (not from stale React state)
            // so that po_amount and other fields are available within this render cycle
            const currentPoLookup = {};
            if (Array.isArray(poDataList)) {
                poDataList.forEach(po => {
                    const pid = po.poid || po.POId || po.po_id || po.purchase_id;
                    if (pid) {
                        currentPoLookup[pid] = {
                            pono: po.pono || po.PONo || po.PO_Number || po.ponumber || po.po_no || po.PONumber,
                            podate: po.podate || po.PODate || po.po_date || po.docdate,
                            currencyid: po.currencyid || po.CurrencyId || po.currency_id || po.TransactionCurrencyId,
                            currencycode: po.currencycode || po.CurrencyCode || po.currency_code || po.transactioncurrency || po.TransactionCurrency,
                            po_amount: po.nettotal || po.totalamount || po.po_amount || po.po_total || 0
                        };
                    }
                });
                // Also sync to React state for other uses
                setPoLookup(prev => ({ ...prev, ...currentPoLookup }));
            }

            if (activeTab === "1") {
                // Fetch GRN list and IRN list in parallel
                const [grnResponse, irnResponse] = await Promise.all([
                    GetAllGRNList(supplierId, 0, orgId, branchId, userId, currencyId),
                    GetAllIRNList(branchId, orgId, supplierId, 0, fromDateStr, toDateStr, userId, currencyId)
                ]);

                if (grnResponse?.data && Array.isArray(grnResponse.data)) {
                    const grnLookup = {};
                    if (irnResponse?.data && Array.isArray(irnResponse.data)) {
                        irnResponse.data.forEach(irn => {
                            let grnId = irn.grn_id || irn.grnid || irn.GRN_ID || irn.GRNID;
                            if (grnId) {
                                grnId = String(grnId).trim(); // Ensure string comparison
                                if (!grnLookup[grnId]) {
                                    grnLookup[grnId] = { amount: 0, poid: irn.poid || 0 };
                                }
                                grnLookup[grnId].amount += (irn.totalamount || 0);
                            }
                        });
                    }

                    let mappedData = grnResponse.data
                        .filter(item => !grnLookup[item.grnid])
                        .map(item => {
                            const poId = item.poid || item.POId || item.purchase_id || item.po_id || 0;
                            const directPoNo = item.pono || item.po_number || item.ponumber || item.PONo || item.po_no || "";
                            const curId = item.currencyid || item.CurrencyId || item.currency_id || item.TransactionCurrencyId || (currentPoLookup[poId] ? (currentPoLookup[poId].currencyid || currentPoLookup[poId].CurrencyId) : 0);
                            const curCode = item.currencycode || item.CurrencyCode || item.transactioncurrency || item.TransactionCurrency || (currentPoLookup[poId] ? (currentPoLookup[poId].currencycode || currentPoLookup[poId].CurrencyCode) : "");

                            return {
                                Id: item.grnid || item.Id || item.grn_id,
                                Date: item.grndate || item.Date || item.grn_date,
                                Reference: item.grnno || item.Reference || item.grn_no,
                                POId: poId,
                                PONumber: directPoNo || (currentPoLookup[poId] ? currentPoLookup[poId].pono : ""),
                                Amount: Number(item.grnvalue || item.amount || item.Amount || item.total_amount || 0),
                                currencyid: Number(curId),
                                currencycode: curCode,
                                SupplierName: item.suppliername || item.SupplierName || "",
                                CreatedDate: item.CreatedDate || item.createddate || item.logdate || item.grndate || "",
                                CreatedBy: item.createdbyName || item.UserName || item.username || item.createdbyname || item.CreatedBy || "System",
                                IsSubmitted: item.issubmitted || item.IsSubmitted || false,
                                grnid: String(item.grnid || item.grn_id || "").trim() // For matching
                            };
                        });

                    const selectedCurrencyId = Number(currencyId);
                    if (selectedCurrencyId > 0) {
                        mappedData = mappedData.filter(item => Number(item.currencyid) === selectedCurrencyId);
                    }

                    // FINAL FILTER: Check grnLookup again with trimmed IDs
                    mappedData = mappedData.filter(item => {
                        const gid = String(item.Id || item.grnid || "").trim();
                        return !grnLookup[gid];
                    });

                    if (filter.fromDate && filter.toDate) {
                        const fromTime = new Date(filter.fromDate).setHours(0, 0, 0, 0);
                        const toTime = new Date(filter.toDate).setHours(23, 59, 59, 999);
                        mappedData = mappedData.filter(item => {
                            const itemTime = item.Date ? new Date(item.Date).getTime() : 0;
                            return itemTime >= fromTime && itemTime <= toTime;
                        });
                    }

                    let cumulativeGRNTotal = 0;
                    mappedData = mappedData.map(item => {
                        cumulativeGRNTotal += item.Amount;
                        return { ...item, CumulativeAmount: cumulativeGRNTotal };
                    });

                    setAccruedData(mappedData);
                } else {
                    setAccruedData([]);
                }
            } else if (activeTab === "2") {
                const response = await GetAllIRNList(branchId, orgId, supplierId, 0, fromDateStr, toDateStr, userId, currencyId);
                if (response?.data && Array.isArray(response.data)) {
                    let cumulativeTotal = 0;
                    let mappedData = response.data.map(item => {
                        const poId = item.poid || item.POId || item.purchase_id || item.po_id || 0;
                        return {
                            Id: item.receiptnote_hdr_id || item.receipt_hdr_id || item.IRNId || item.id,
                            IRNId: item.receiptnote_hdr_id || item.receipt_hdr_id || item.IRNId || item.id,
                            Reference: item.receipt_no || item.Reference || item.receiptno || item.docno,
                            IRNDate: formatDate(item.receipt_date || item.receipt_Date || item.IRNDate || item.docdate),
                            POId: poId,
                            PONumber: item.pono || item.po_number || item.ponumber || item.PONo || item.po_no || (currentPoLookup[poId] ? currentPoLookup[poId].pono : ""),
                            OriginalAmount: Number(item.totalamount || item.amount || item.total_amount || 0),
                            currencyid: Number(item.currencyid || item.CurrencyId || item.currency_id || item.TransactionCurrencyId || (currentPoLookup[poId] ? (currentPoLookup[poId].currencyid || currentPoLookup[poId].CurrencyId) : 0)),
                            currencycode: item.currencycode || item.CurrencyCode || item.transactioncurrency || item.TransactionCurrency || (currentPoLookup[poId] ? (currentPoLookup[poId].currencycode || currentPoLookup[poId].CurrencyCode) : ""),
                            DueDate: item.due_dt || item.dueDate || item.DueDate || item.duedate || "",
                            grnid: item.grn_id || item.grnid || "0",
                            supplierid: item.supplierid || item.supplier_id || 0,
                            modeOfPaymentId: item.ModeOfPaymentId || item.modeOfPaymentId || 0,
                            invoiceno: item.invoice_no || item.invoiceno || item.receipt_no || "",
                            invoicedate: item.invoice_dt || item.invoicedate || item.receipt_Date || "",
                            duedate: item.due_dt || item.duedate || item.due_Date || "",
                            invoice_no: item.invoice_no || "",
                            invoice_dt: item.invoice_dt || "",
                            due_dt: item.due_dt || "",
                            po_amount: item.po_amount || 0,
                            adv_payment: item.adv_payment || 0,
                            balance_payment: item.balance_payment || 0,
                            alreadyrecivedamount: item.alreadyrecivedamount || 0,
                            balancepaymentamount: item.balancepaymentamount || 0
                        };
                    });



                    // Client-side filtering by currencyId
                    const selectedCurrencyId = Number(currencyId);
                    if (selectedCurrencyId > 0) {
                        mappedData = mappedData.filter(item => Number(item.currencyid) === selectedCurrencyId);
                    }

                    // Calculate cumulative total after filtering
                    cumulativeTotal = 0; // Reset cumulative total for filtered results
                    const processedData = mappedData.map(item => {
                        cumulativeTotal += item.OriginalAmount;
                        return { ...item, CumulativeAmount: cumulativeTotal };
                    });

                    setPayableData(processedData);
                } else {
                    setPayableData([]);
                }
            } else if (activeTab === "3") {
                // 🟢 NEW: Use the high-performance Stored Procedure for the Ledger tab
                // This ensures PO No and PO Amt are correctly linked even for standalone GRNs.
                const apLedgerResponse = await FetchAPLedger(supplierId, currencyId, fromDateStr, toDateStr);

                let mergedList = [];
                if (apLedgerResponse?.status && Array.isArray(apLedgerResponse.data)) {
                    apLedgerResponse.data
                        .filter(item => {
                            // If it's a claim row, it must be director approved
                            const isClaim = (item.claim_no && item.claim_no !== "N/A") || item.claim_id;
                            if (isClaim) {
                                return item.ppp_pv_director_approved === 1 || item.PPP_PV_Director_approve === 1;
                            }
                            return true; // IRNs/GRNs etc are always shown
                        })
                        .forEach(item => {
                            mergedList.push({
                                Date: item.grn_date || item.po_date || item.claim_date || item.irn_date,
                                Reference: item.claim_no || item.irn_no || item.po_no,
                                claim_no: item.claim_no,
                                claim_date: item.claim_date,
                                ClaimId: item.claim_id,
                                irn_no: item.irn_no,
                                irn_date: item.irn_date,
                                IRNAmount: Number(item.irn_amount || 0),
                                ClaimAmount: Number(item.claim_amount || 0),
                                grn_no: item.grn_no,
                                grn_date: item.grn_date,
                                grn_id: item.grnid,
                                po_no: item.po_no,
                                po_date: item.po_date,
                                po_amount: Number(item.po_amount || 0),
                                currencyid: Number(currencyId),
                                PONumber: item.po_no,
                                POId: item.poid,
                                IRNId: item.irn_id,
                                ppp_pv_director_approved: item.ppp_pv_director_approved,
                                ppp_pv_commissioner_approved: item.ppp_pv_commissioner_approved
                            });
                        });
                }

                console.log("AP Ledger Merged List Sample:", mergedList.slice(0, 5));

                // fallback: Process additional unlinked payments/claims that might not be in the GRN chain
                // (Optional: Keep original logic if there are non-GRN claims, but users usually want matched data here)

                mergedList.sort((a, b) => new Date(a.Date) - new Date(b.Date));

                let cumulative = 0;
                mergedList = mergedList.map(item => {
                    cumulative += item.IRNAmount;
                    if (Math.abs(cumulative) < 0.001) cumulative = 0;
                    return { ...item, CumulativeAmount: cumulative };
                });

                setLedgerData(mergedList);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [activeTab, filter.fromDate, filter.toDate, filter.supplier, filter.currency, orgId, branchId, userId]);

    const displayPONumber = (item) => {
        const poNo = item.PONumber || item.pono || item.po_no || (poLookup[item.POId] ? poLookup[item.POId].pono : null);
        const poDate = item.po_date || item.podate || (poLookup[item.POId] ? poLookup[item.POId].podate : null);

        if (poNo && poNo !== "-") {
            return (
                <div className="d-flex flex-column">
                    <span
                        className="fw-bold cursor-pointer text-primary"
                        style={{ textDecoration: 'underline' }}
                        onClick={() => handlePOClick(item.POId)}
                        title="View PO Details"
                    >
                        {poNo}
                    </span>
                    {poDate && (
                        <small className="text-muted mt-1">
                            {formatDate(poDate)}
                        </small>
                    )}
                </div>
            );
        }
        return "-";
    };

    const displayGRNNumber = (item) => {
        if (item.grn_no && item.grn_no !== "") {
            return (
                <div className="d-flex flex-column">
                    <span
                        className="fw-bold cursor-pointer text-primary"
                        style={{ textDecoration: 'underline' }}
                        onClick={() => handleGRNClick(item.grn_id)}
                        title="View GRN Details"
                    >
                        {item.grn_no}
                    </span>
                    {item.grn_date && (
                        <small className="text-muted mt-1">
                            {formatDate(item.grn_date)}
                        </small>
                    )}
                </div>
            );
        }
        return "-";
    };

    const displayClaimNumber = (item) => {
        if (item.claim_no && item.claim_no !== "") {
            return (
                <div className="d-flex flex-column">
                    <span
                        className="fw-bold cursor-pointer text-primary"
                        style={{ textDecoration: 'underline' }}
                        onClick={() => handleClaimClick(item)}
                        title="View Claim Details"
                    >
                        {item.claim_no}
                    </span>
                    {item.claim_date && (
                        <small className="text-muted mt-1">
                            {formatDate(item.claim_date)}
                        </small>
                    )}
                </div>
            );
        }
        return "-";
    };

    const displayIRNNumber = (item) => {
        if (item.irn_no && item.irn_no !== "") {
            return (
                <div className="d-flex flex-column">
                    <span
                        className="fw-bold cursor-pointer text-primary"
                        style={{ textDecoration: 'underline' }}
                        onClick={() => handleIRNClick(item.POId || item.poid, item)}
                        title="View IRN Details"
                    >
                        {item.irn_no}
                    </span>
                    {item.irn_date && (
                        <small className="text-muted mt-1">
                            {formatDate(item.irn_date)}
                        </small>
                    )}
                </div>
            );
        }
        return "-";
    };

    const renderHeader = (tabType) => {
        let filterValue = "";
        let setFilterValue = () => { };

        if (tabType === "GRN") {
            filterValue = globalFilterAccrued;
            setFilterValue = setGlobalFilterAccrued;
        } else if (tabType === "IRN") {
            filterValue = globalFilterPayable;
            setFilterValue = setGlobalFilterPayable;
        } else if (tabType === "Ledger") {
            filterValue = globalFilterLedger;
            setFilterValue = setGlobalFilterLedger;
        }

        return (
            <div className="row align-items-center g-3">
                <div className="col-12 col-lg-6">
                    <Button
                        className="btn btn-danger btn-label"
                        onClick={handleClearFilter}
                    >
                        <i className="mdi mdi-filter-off label-icon" /> Clear
                    </Button>
                </div>
                <div className="col-12 col-lg-3 text-end">
                </div>
                <div className="col-12 col-lg-3">
                    <InputText
                        type="search"
                        placeholder="Keyword Search"
                        className="form-control"
                        value={filterValue}
                        onChange={(e) => setFilterValue(e.target.value)}
                    />
                </div>
            </div>
        );
    };

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const toggleTab = (tab) => {
        if (activeTab !== tab) {
            setActiveTab(tab);
            setSelectedPayables([]);
        }
    };

    const handleFilterChange = (key, value) => setFilter((prev) => ({ ...prev, [key]: value }));

    const handleClearFilter = () => {
        setFilter({
            supplier: null,
            currency: null,
            fromDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            toDate: new Date(),
        });
        setGlobalFilterAccrued("");
        setGlobalFilterPayable("");
        setGlobalFilterLedger("");
    };

    const handleCheckboxChange = (id) => {
        setSelectedPayables((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
    };

    const totalPayableValue = useMemo(() => {
        if (activeTab === "3") {
            if (ledgerData.length === 0) return 0;
            return ledgerData[ledgerData.length - 1].CumulativeAmount || 0;
        }
        if (payableData.length === 0) return 0;
        return payableData[payableData.length - 1].CumulativeAmount || 0;
    }, [payableData, ledgerData, activeTab]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedPayables(payableData.map((item) => item.IRNId || item.Id));
        } else {
            setSelectedPayables([]);
        }
    };

    const toggleModal = () => {
        setModal(!modal);
        if (modal) setModalData(null);
    };

    const toggleNestedModal = () => {
        setNestedModal(!nestedModal);
        if (nestedModal) setNestedPOData(null);
    };

    const handleGRNClick = async (grnId) => {
        setModalType("GRN");
        setModal(true);
        setModalLoading(true);
        try {
            const res = await GetGRNById(grnId, branchId, orgId);
            if (res.status && res.data) {
                const details = res.data.Details || [];
                // Extract unique PO numbers from line items to display in header
                const poList = [...new Set(details.map(d => d.pono || d.PO_Number || d.po_no || d.PONumber).filter(Boolean))];
                const poConcat = poList.length > 0 ? poList.join(", ") : "N/A";

                const enrichedData = {
                    ...res.data,
                    Header: {
                        ...(res.data.Header || {}),
                        POConcat: poConcat
                    }
                };
                setModalData(enrichedData);
            } else {
                toast.error("Failed to fetch GRN details");
                setModal(false);
            }
        } catch (err) {
            console.error(err);
            setModal(false);
        } finally {
            setModalLoading(false);
        }
    };

    const handleIRNClick = async (poId, row = {}) => {
        if (!poId) {
            toast.warning("No linked PO found.");
            return;
        }
        setModalType("IRN");
        setModal(true);
        setModalLoading(true);
        try {
            const res = await GetByIdPurchaseOrder(poId, orgId, branchId);
            if (res.status && res.data) {
                // Incorporate IRN data for the modal display
                const enrichedData = {
                    ...res.data,
                    IRN_Header: {
                        irn_no: row.Reference || row.receipt_no || row.receiptno || "-",
                        irn_date: row.IRNDate || row.ReferenceDate || row.receipt_date || row.receipt_Date || "-",
                        inv_no: row.invoice_no || row.invoiceno || "-",
                        inv_date: row.invoice_dt || row.invoicedate || "-",
                        due_date: row.due_dt || row.DueDate || row.duedate || "-"
                    }
                };
                setModalData(enrichedData);
            } else {
                toast.error("Failed to fetch details");
                setModal(false);
            }
        } catch (err) {
            console.error(err);
            toast.error("Error loading details");
            setModal(false);
        } finally {
            setModalLoading(false);
        }
    };

    const handlePOClick = async (poId) => {
        if (!poId) {
            toast.warning("No PO linked");
            return;
        }
        setModalType("PO");
        setModal(true);
        setModalLoading(true);
        try {
            const res = await GetByIdPurchaseOrder(poId, orgId, branchId);
            if (res.status && res.data) {
                setModalData(res.data);
            } else {
                toast.error("Failed to fetch PO details");
                setModal(false);
            }
        } catch (err) {
            console.error(err);
            setModal(false);
        } finally {
            setModalLoading(false);
        }
    };

    const handleClaimClick = async (rowData) => {
        if (!rowData || !rowData.Reference) return;

        console.log("👉 handleClaimClick for row:", rowData);
        const reference = rowData.Reference;
        const pureClaimNo = reference ? reference.split(" - ")[0].trim() : "";
        let claimId = rowData.ClaimId || rowData.ClaimID || rowData.id;

        setShowClaimDetailModal(true);
        setLoadingClaimDetail(true);
        setClaimDetailData(null);

        try {
            // Find matching application number or claim number ONLY IF id is missing
            if (!claimId) {
                console.log("⚠️ ClaimId missing in row, performing search...");
                const listRes = await GetAllClaimAndPayment(0, 0, branchId, orgId, userId);

                if (listRes?.status && listRes.data) {
                    const searchNoStr = pureClaimNo.replace("CLM", "").trim();
                    const searchNoNum = parseInt(searchNoStr, 10);

                    const match = listRes.data.find(c => {
                        const cNo = (c.claimno || c.claim_no || c.ApplicationNo || c.Reference || "").trim();
                        const cNoPureStr = cNo.replace("CLM", "").trim();
                        const cNoPureNum = parseInt(cNoPureStr, 10);

                        return cNo === pureClaimNo ||
                            (cNoPureStr === searchNoStr && searchNoStr !== "") ||
                            (!isNaN(searchNoNum) && searchNoNum === cNoPureNum);
                    });

                    if (match) {
                        claimId = match.ClaimID || match.Claim_ID || match.claimid || match.Id || match.id;
                    }
                }

                // Final fallback
                if (!claimId) {
                    const numericOnly = pureClaimNo.replace(/\D/g, '');
                    if (numericOnly) claimId = parseInt(numericOnly, 10);
                }
            }

            if (!claimId || isNaN(claimId)) {
                toast.error("Invalid claim reference format.");
                setShowClaimDetailModal(false);
                return;
            }

            console.log("📡 Fetching claim details for ID:", claimId);
            const res = await ClaimAndPaymentGetById(claimId, orgId, branchId);
            console.log("📥 API Response:", res);

            const dataObj = res?.data || res || {};
            const header = dataObj.header || dataObj.Header;
            const details = dataObj.details || dataObj.Details || [];

            if (header) {
                setClaimDetailData({
                    IsClaim: true,
                    ...header,
                    Details: details,
                    // Ensure core fields are mapped for the UI template even if keys vary
                    ClaimPaymentId: header.ClaimId || header.ClaimID,
                    FormNo: header.ApplicationNo || header.ClaimNo || header.claimno || pureClaimNo,
                    Date: header.ApplicationDate || header.ClaimDate,
                    CategoryType: header.claimcategory || header.ClaimCategoryName || "-",
                    Department: header.departmentname || header.DeptName || "-",
                    Applicant: header.applicantname || header.Applicant_Name || "-",
                    TransCurrency: header.transactioncurrency || header.curr || "-",
                    HOD: header.HOD_Name || "-",
                    Supplier: header.SupplierName || header.suppliername || "-",
                    CostCenter: header.CostCenter || "-",
                    ClaimAmtInTC: header.ClaimAmountInTC || header.claimamountintc || 0,
                    Attachment: header.AttachmentName || "No Attachment",
                    PaymentMode: header.paymentmethodname || header.modeOfPayment || header.ModeOfPayment || (header.ModeOfPaymentId === 1 ? "Cash" : header.ModeOfPaymentId === 2 ? "Bank Transfer" : "-")
                });
            } else {
                console.error("❌ No header found in claim response");
                setClaimDetailData({ error: "No claim details found." });
            }
        } catch (error) {
            console.error("Error fetching claim details:", error);
            setClaimDetailData({ error: "Failed to fetch claim details." });
        } finally {
            setLoadingClaimDetail(false);
        }
    };

    const handleNestedPOClick = async (poId) => {
        if (!poId) return;
        setNestedModal(true);
        setNestedPOLoading(true);
        try {
            const res = await GetByIdPurchaseOrder(poId, orgId, branchId);
            if (res.status && res.data) {
                setNestedPOData(res.data);
            } else {
                toast.error("Failed to fetch PO details");
                setNestedModal(false);
            }
        } catch (err) {
            console.error(err);
            setNestedModal(false);
        } finally {
            setNestedPOLoading(false);
        }
    };

    const togglePrModal = () => {
        setPrModal(!prModal);
        if (prModal) setPrData(null);
    };

    const handlePRClick = async (prId) => {
        if (!prId) {
            toast.warning("No PR linked.");
            return;
        }
        setPrModal(true);
        setPrLoading(true);
        try {
            const res = await GetByIdPurchaseRequisition(prId, branchId, orgId);
            if (res?.status && res?.data) {
                setPrData(res.data);
            } else {
                toast.error("Failed to fetch PR details");
                setPrModal(false);
            }
        } catch (err) {
            console.error(err);
            toast.error("Error loading PR details");
            setPrModal(false);
        } finally {
            setPrLoading(false);
        }
    };

    const handleCreatePaymentClaim = async () => {
        if (selectedPayables.length === 0) {
            toast.warning("Select items to claim.");
            return;
        }
        try {
            // Build payload matching IRN page format: { item: [InvoiceReceiptEntry] }
            const selectedRows = payableData.filter(row =>
                selectedPayables.includes(row.IRNId || row.Id)
            );

            const payload = {
                item: selectedRows.map(row => ({
                    receiptnote_hdr_id: row.IRNId || row.Id || 0,
                    grnid: String(row.grnid || "0"),
                    poid: row.POId || 0,
                    ModeOfPaymentId: row.modeOfPaymentId || 0,
                    supplierid: row.supplierid || 0,
                    invoiceno: row.invoiceno || row.Reference || "",
                    invoicedate: row.invoicedate || "",
                    duedate: row.duedate || "",
                    paymenttermid: "0",
                    filepath: "",
                    filename: "",
                    spc: true,
                    isactive: true,
                    createdby: userId,
                    createdip: "",
                    modifiedip: "",
                    branchid: branchId,
                    orgid: orgId,
                    po_amount: parseFloat(row.po_amount) || 0,
                    adv_payment: parseFloat(row.adv_payment) || 0,
                    balance_payment: parseFloat(row.balance_payment) || 0,
                    alreadyrecivedamount: parseFloat(row.alreadyrecivedamount) || 0,
                    balancepaymentamount: parseFloat(row.balancepaymentamount) || 0
                }))
            };

            console.log("SPC Payload:", payload);
            const response = await GenerateSPC(payload);
            if (response && response.status) {
                toast.success("SPC generated successfully!");
                // Remove generated rows from the local state to make them vanish immediately
                setPayableData(prev => prev.filter(row => !selectedPayables.includes(row.IRNId || row.Id)));
                setSelectedPayables([]);
            } else {
                toast.error(response?.message || "Failed.");
            }
        } catch (error) {
            console.error("SPC Error:", error);
            toast.error("An error occurred.");
        }
    };

    return (
        <div className="page-content">
            <style>{modalStyle}</style>
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="Accounts Payable (AP)" />

                {/* Filters */}
                <Card>
                    <CardBody>
                        <Row>
                            <Col md={3}>
                                <div className="mb-3">
                                    <Label className="fw-bold">Supplier</Label>
                                    <Select options={supplierList} value={filter.supplier} onChange={(opt) => handleFilterChange("supplier", opt)} isClearable placeholder="Select Supplier" />
                                    {activeTab === "3" && (
                                        <div className="mt-3 text-start" style={{ fontSize: "20px" }}>
                                            <span className="fw-bold me-2">Total AP:</span>
                                            <span className="fw-bold" style={{ color: "#B22222" }}>
                                                {totalPayableValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Col>
                            <Col md={3}>
                                <div className="mb-3">
                                    <Label className="fw-bold">Currency</Label>
                                    <Select
                                        options={currencyList}
                                        value={activeTab === "1" ? null : filter.currency}
                                        onChange={(opt) => handleFilterChange("currency", opt)}
                                        isClearable
                                        placeholder="Select Currency"
                                        isDisabled={activeTab === "1"}
                                    />
                                </div>
                            </Col>
                            <Col md={3}>
                                <div className="mb-3">
                                    <Label className="fw-bold">IRN From Date</Label>
                                    <Flatpickr className="form-control" value={filter.fromDate} onChange={(date) => handleFilterChange("fromDate", date[0])} options={{ dateFormat: "d-m-Y" }} />
                                </div>
                            </Col>
                            <Col md={3}>
                                <div className="mb-3">
                                    <Label className="fw-bold">IRN To Date</Label>
                                    <Flatpickr className="form-control" value={filter.toDate} onChange={(date) => handleFilterChange("toDate", date[0])} options={{ dateFormat: "d-m-Y" }} />
                                </div>
                            </Col>
                            <Col md={12} className="d-flex justify-content-end align-items-center gap-2">
                                <button type="button" className="btn btn-info btn-label" onClick={fetchData} disabled={loading}>
                                    <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search
                                </button>
                                <button type="button" className="btn btn-danger btn-label" onClick={handleClearFilter} disabled={loading}>
                                    <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Cancel
                                </button>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>

                {/* Grid */}
                <Card>
                    <CardBody>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <Nav tabs className="nav-tabs-custom mb-0 flex-grow-1 border-0">
                                <NavItem>
                                    <NavLink className={classnames({ active: activeTab === "1" })} onClick={() => toggleTab("1")} style={{ cursor: "pointer", fontSize: "16px" }}>
                                        <span className="d-none d-sm-block">GRN</span>
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink className={classnames({ active: activeTab === "2" })} onClick={() => toggleTab("2")} style={{ cursor: "pointer", fontSize: "16px" }}>
                                        <span className="d-none d-sm-block">IRN</span>
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink className={classnames({ active: activeTab === "3" })} onClick={() => toggleTab("3")} style={{ cursor: "pointer", fontSize: "16px" }}>
                                        <span className="d-none d-sm-block">Accounts payable</span>
                                    </NavLink>
                                </NavItem>
                            </Nav>

                            {activeTab === "2" && (
                                <div>
                                    <Button color="success" disabled={selectedPayables.length === 0} onClick={handleCreatePaymentClaim}>
                                        <i className="bx bx-check-double me-1"></i> Create Payment Claim
                                    </Button>
                                </div>
                            )}
                        </div>

                        <TabContent activeTab={activeTab} className="p-3 text-muted">
                            {/* GRN Tab */}
                            <TabPane tabId="1">
                                <DataTable
                                    value={accruedData}
                                    paginator
                                    rows={20}
                                    loading={loading}
                                    globalFilter={globalFilterAccrued}
                                    globalFilterFields={["Reference", "SupplierName", "CreatedBy"]}
                                    header={renderHeader("GRN")}
                                    responsiveLayout="scroll"
                                    emptyMessage="No Data Found"
                                    className="blue-bg"
                                    showGridlines
                                    size="small"
                                >
                                    <Column field="Reference" header="GRN No" body={(item) => (
                                        <span className="fw-bold cursor-pointer text-primary" style={{ textDecoration: 'underline' }} onClick={() => handleGRNClick(item.Id)}>
                                            {item.Reference}
                                        </span>
                                    )} sortable headerStyle={{ whiteSpace: 'nowrap' }} />
                                    <Column field="Date" header="GRN Date" body={(item) => formatDate(item.Date)} sortable headerStyle={{ whiteSpace: 'nowrap' }} />
                                    <Column field="SupplierName" header="Supplier" sortable />
                                    <Column field="CreatedDate" header="Created Date" body={(item) => formatDate(item.CreatedDate)} sortable headerStyle={{ whiteSpace: 'nowrap' }} />
                                    <Column field="CreatedBy" header="Created By" sortable />
                                </DataTable>
                            </TabPane>

                            {/* IRN Tab */}
                            <TabPane tabId="2">
                                <DataTable
                                    value={payableData}
                                    paginator
                                    rows={20}
                                    loading={loading}
                                    globalFilter={globalFilterPayable}
                                    globalFilterFields={["Reference", "SupplierName", "currencycode", "OriginalAmount", "PONumber"]}
                                    header={renderHeader("IRN")}
                                    responsiveLayout="scroll"
                                    emptyMessage="No Data Found"
                                    className="blue-bg"
                                    showGridlines
                                    size="small"
                                >
                                    <Column
                                        header={<Input type="checkbox" onChange={handleSelectAll} checked={payableData.length > 0 && selectedPayables.length === payableData.length} />}
                                        body={(item) => (
                                            <Input type="checkbox" checked={selectedPayables.includes(item.Id)} onChange={() => handleCheckboxChange(item.Id)} />
                                        )}
                                        headerStyle={{ width: "3%", minWidth: "3rem", textAlign: "center" }}
                                        bodyStyle={{ textAlign: "center" }}
                                    />
                                    <Column field="Reference" header="Reference (IRN)" body={(item) => (
                                        <span className="fw-bold cursor-pointer text-primary" style={{ textDecoration: 'underline' }} onClick={() => handleIRNClick(item.POId, item)}>
                                            {item.Reference}
                                        </span>
                                    )} sortable headerStyle={{ whiteSpace: 'nowrap' }} />
                                    <Column field="IRNDateObj" header="IRN Date" body={(item) => item.IRNDate} sortable headerStyle={{ whiteSpace: 'nowrap' }} />
                                    <Column field="POId" header="PO Number" body={displayPONumber} sortable />
                                    <Column field="currencycode" header="Currency" sortable />
                                    <Column field="DueDateObj" header="Due Date" body={(item) => formatDate(item.DueDate)} sortable headerStyle={{ whiteSpace: 'nowrap' }} />

                                    <Column field="OriginalAmount" header="Amount" body={(item) => {
                                        let val = item.OriginalAmount || 0;
                                        if (Math.abs(val) < 0.001) val = 0;
                                        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    }} className="text-end" sortable />
                                    <Column field="CumulativeAmount" header="Cumulative Amount" body={(item) => {
                                        let val = item.CumulativeAmount || 0;
                                        if (Math.abs(val) < 0.001) val = 0;
                                        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    }} className="text-end" sortable />
                                </DataTable>
                            </TabPane>

                            {/* Accounts payable Tab (Ledger) */}
                            <TabPane tabId="3">
                                <DataTable
                                    value={ledgerData}
                                    loading={loading}
                                    rows={10}
                                    paginator
                                    globalFilter={globalFilterLedger}
                                    globalFilterFields={["claim_no", "irn_no", "po_no", "grn_no"]}
                                    header={renderHeader("Ledger")}
                                    responsiveLayout="scroll"
                                    emptyMessage="No Data Found"
                                    className="blue-bg"
                                    showGridlines
                                >
                                    <Column field="po_no" header="PO No / DATE" body={displayPONumber} sortable />
                                    <Column field="po_amount" header="PO Amt" body={(item) => {
                                        let val = item.po_amount || 0;
                                        if (Math.abs(val) < 0.001) val = 0;
                                        return val !== 0 ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-";
                                    }} className="text-end" sortable />
                                    <Column field="grn_no" header="GRN No. / DATE" body={displayGRNNumber} sortable />
                                    <Column field="irn_no" header="IRN No. / DATE" body={displayIRNNumber} sortable />
                                    <Column field="IRNAmount" header="IRN Amount" body={(item) => {
                                        let val = item.IRNAmount || 0;
                                        if (Math.abs(val) < 0.001) val = 0;
                                        return val !== 0 ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-";
                                    }} className="text-end" sortable />
                                    <Column field="claim_no" header="Claim No. / DATE" body={displayClaimNumber} sortable />
                                    <Column field="ClaimAmount" header="Claim Amt" body={(item) => {
                                        let val = item.ClaimAmount || 0;
                                        if (Math.abs(val) < 0.001) val = 0;
                                        return val !== 0 ? val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-";
                                    }} className="text-end" sortable />
                                    <Column field="CumulativeAmount" header="Cumulative" body={(item) => {
                                        let val = item.CumulativeAmount || 0;
                                        if (Math.abs(val) < 0.001) val = 0;
                                        return val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                    }} className="text-end" sortable />
                                </DataTable>
                            </TabPane>
                        </TabContent>
                    </CardBody>
                </Card>

                {/* --- DETAILS POPUP MODAL (Main) --- */}
                <Modal isOpen={modal} toggle={toggleModal} size="xl" centered>
                    <ModalHeader toggle={toggleModal}>
                        {modalType === "GRN" ? "GRN Details" : modalType === "IRN" ? "Invoice (IRN) Details" : "Purchase Order Details"}
                    </ModalHeader>
                    <ModalBody>
                        {modalLoading ? <div className="text-center p-5"><i className="bx bx-loader bx-spin font-size-24"></i></div> : modalData ? (
                            <>
                                {/* HEADER INFO SECTION */}
                                <div className="mb-4">
                                    {modalType === "GRN" ? (
                                        <Row>
                                            <Col md={4}>
                                                <div className="d-flex mb-2">
                                                    <span className="bold-label" style={{ minWidth: "120px" }}>GRN No.</span>
                                                    <span>: {modalData.Header?.grnno}</span>
                                                </div>
                                                <div className="d-flex mb-2">
                                                    <span className="bold-label" style={{ minWidth: "120px" }}>PO No.</span>
                                                    <span>: {modalData.Header?.POConcat || "N/A"}</span>
                                                </div>
                                            </Col>
                                            <Col md={4}>
                                                <div className="d-flex mb-2">
                                                    <span className="bold-label" style={{ minWidth: "120px" }}>GRN Date</span>
                                                    <span>: {formatDate(modalData.Header?.grndate)}</span>
                                                </div>
                                            </Col>
                                            <Col md={4}>
                                                <div className="d-flex mb-2">
                                                    <span className="bold-label" style={{ minWidth: "120px" }}>Supplier</span>
                                                    <span className="text-uppercase">: {modalData.Header?.suppliername}</span>
                                                </div>
                                            </Col>
                                        </Row>
                                    ) : (
                                        <>
                                            {modalType === "IRN" && modalData.IRN_Header && (
                                                <>
                                                    <Row className="mb-2">
                                                        <Col md={4}>
                                                            <div className="d-flex mb-2">
                                                                <span className="bold-label" style={{ minWidth: "120px" }}>IRN No.</span>
                                                                <span className="fw-bold">: {modalData.IRN_Header.irn_no}</span>
                                                            </div>
                                                            <div className="d-flex mb-2">
                                                                <span className="bold-label" style={{ minWidth: "120px" }}>IRN Date</span>
                                                                <span>: {modalData.IRN_Header.irn_date}</span>
                                                            </div>
                                                        </Col>
                                                        <Col md={4}>
                                                            <div className="d-flex mb-2">
                                                                <span className="bold-label" style={{ minWidth: "120px" }}>Inv No.</span>
                                                                <span>: {modalData.IRN_Header.inv_no}</span>
                                                            </div>
                                                            <div className="d-flex mb-2">
                                                                <span className="bold-label" style={{ minWidth: "120px" }}>Inv Date</span>
                                                                <span>: {modalData.IRN_Header.inv_date}</span>
                                                            </div>
                                                        </Col>
                                                        <Col md={4}>
                                                            <div className="d-flex mb-2">
                                                                <span className="bold-label" style={{ minWidth: "120px" }}>Due Date</span>
                                                                <span>: {modalData.IRN_Header.due_date}</span>
                                                            </div>
                                                        </Col>
                                                    </Row>
                                                    <hr className="my-2" />
                                                </>
                                            )}
                                            <Row>
                                                <Col md={4}>
                                                    <div className="d-flex mb-2">
                                                        <span className="bold-label" style={{ minWidth: "120px" }}>PO No.</span>
                                                        <span>: {modalData.Header?.pono}</span>
                                                    </div>
                                                    <div className="d-flex mb-2">
                                                        <span className="bold-label" style={{ minWidth: "120px" }}>Currency</span>
                                                        <span>: {modalData.Header?.currencycode || "N/A"}</span>
                                                    </div>
                                                </Col>
                                                <Col md={4}>
                                                    <div className="d-flex mb-2">
                                                        <span className="bold-label" style={{ minWidth: "120px" }}>PO Date</span>
                                                        <span>: {formatDate(modalData.Header?.podate)}</span>
                                                    </div>
                                                    <div className="d-flex mb-2">
                                                        <span className="bold-label" style={{ minWidth: "120px" }}>PR No.</span>
                                                        <span className="text-danger fw-bold">: {modalData.Requisition?.[0]?.prnumber || "-"}</span>
                                                    </div>
                                                </Col>
                                                <Col md={4}>
                                                    <div className="d-flex mb-2">
                                                        <span className="bold-label" style={{ minWidth: "120px" }}>Supplier</span>
                                                        <span className="text-uppercase">: {modalData.Header?.suppliername}</span>
                                                    </div>
                                                </Col>
                                            </Row>
                                        </>
                                    )}
                                </div>
                                <hr />

                                {/* DETAILS TABLE */}
                                <div className="table-responsive border">
                                    <Table className="table table-bordered mb-0">
                                        <thead className="blue-table-header">
                                            <tr>
                                                <th>#</th>
                                                {(modalType === "PO" || modalType === "IRN") && <th>PR No.</th>}
                                                {(modalType === "PO" || modalType === "IRN") && <th>Item Group</th>}
                                                <th style={{ whiteSpace: 'nowrap' }}>{modalType === "GRN" ? "Item Description" : "Item Name"}</th>
                                                <th>Qty</th>
                                                <th>UOM</th>
                                                {modalType === "GRN" && <th>Recd Qty</th>}
                                                {modalType === "GRN" && <th>Bal Qty</th>}
                                                {(modalType === "PO" || modalType === "IRN") && <th className="text-end">Unit Price</th>}
                                                {(modalType === "PO" || modalType === "IRN") && <th className="text-end">Discount</th>}
                                                {(modalType === "PO" || modalType === "IRN") && <th className="text-end">Tax %</th>}
                                                {(modalType === "PO" || modalType === "IRN") && <th className="text-end">Tax Amt</th>}
                                                {(modalType === "PO" || modalType === "IRN") && <th className="text-end">VAT %</th>}
                                                {(modalType === "PO" || modalType === "IRN") && <th className="text-end">VAT Amt</th>}
                                                {(modalType === "PO" || modalType === "IRN") && <th className="text-end">Total Amt</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {((modalType === "GRN") ? modalData.Details : modalData.Requisition)?.map((row, i) => (
                                                <tr key={i} className="align-middle">
                                                    <td>{i + 1}</td>
                                                    {(modalType === "PO" || modalType === "IRN") && <td><span className="fw-bold text-danger cursor-pointer" onClick={() => handlePRClick(row.prid)}>{row.prnumber || row.pr_number || "-"}</span></td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td>{row.groupname || "-"}</td>}
                                                    <td style={{ minWidth: '200px' }}>{row.itemname || row.itemDescription || "-"}</td>
                                                    <td>{row.qty || row.poqty || 0}</td>
                                                    <td>{row.uom || row.UOM || "-"}</td>
                                                    {modalType === "GRN" && <td>{row.alreadyrecqty || 0}</td>}
                                                    {modalType === "GRN" && <td>{row.balanceqty || 0}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{Number(row.unitprice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{Number(row.discountvalue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{row.taxperc || 0}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{Number(row.taxvalue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{row.vatperc || 0}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{Number(row.vatvalue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end"><strong>{Number(row.totalvalue || row.nettotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>}
                                                </tr>
                                            ))}
                                            {(modalType === "PO" || modalType === "IRN") && (
                                                <tr className="fw-bold bg-light">
                                                    <td colSpan={12} className="text-end">Total:</td>
                                                    <td className="text-end">{Number(modalData.Header?.nettotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </>
                        ) : <p className="text-center">No details available.</p>}
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="btn btn-close-custom" onClick={toggleModal}>
                            <i className="bx bx-window-close label-icon font-size-16 align-middle me-2"></i> Close
                        </button>
                    </ModalFooter>
                </Modal>

                {/* Nested PO Modal (Standardized Styling) */}
                <Modal isOpen={nestedModal} toggle={toggleNestedModal} size="xl" centered backdrop="static">
                    <ModalHeader toggle={toggleNestedModal}>Purchase Order Details (Linked)</ModalHeader>
                    <ModalBody>
                        {nestedPOLoading ? <div className="text-center p-5"><i className="bx bx-loader bx-spin font-size-24"></i></div> : nestedPOData ? (
                            <>
                                <div className="mb-4">
                                    <Row>
                                        <Col md={4}>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label">PO No.</span>
                                                <span>: {nestedPOData.Header?.pono}</span>
                                            </div>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label">PO Date</span>
                                                <span>: {formatDate(nestedPOData.Header?.podate)}</span>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label">Supplier</span>
                                                <span className="text-uppercase">: {nestedPOData.Header?.suppliername}</span>
                                            </div>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label">Currency</span>
                                                <span>: {nestedPOData.Header?.currencycode || "N/A"}</span>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label">Status</span>
                                                <span>: {nestedPOData.Header?.isactive ? "Active" : "Inactive"}</span>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                                <div className="table-responsive border">
                                    <Table className="table table-bordered mb-0">
                                        <thead className="blue-table-header">
                                            <tr>
                                                <th style={{ width: '50px' }}>#</th>
                                                <th>Item Name</th>
                                                <th>Qty</th>
                                                <th>UOM</th>
                                                <th className="text-end">Unit Price</th>
                                                <th className="text-end">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {nestedPOData.Requisition?.map((row, i) => (
                                                <tr key={i} className="align-middle">
                                                    <td>{i + 1}</td>
                                                    <td>{row.itemname}</td>
                                                    <td>{row.qty}</td>
                                                    <td>{row.uom}</td>
                                                    <td className="text-end">{Number(row.unitprice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="text-end"><strong>{Number(row.totalvalue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </>
                        ) : <p className="text-center">No data found.</p>}
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="btn btn-close-custom" onClick={toggleNestedModal}>
                            <i className="bx bx-window-close label-icon font-size-16 align-middle me-2"></i> Close
                        </button>
                    </ModalFooter>
                </Modal>

                {/* PR Details Modal (Standardized Styling) */}
                <Modal isOpen={prModal} toggle={togglePrModal} size="xl" centered backdrop="static">
                    <ModalHeader toggle={togglePrModal}>Purchase Requisition Details</ModalHeader>
                    <ModalBody>
                        {prLoading ? <div className="text-center p-5"><i className="bx bx-loader bx-spin font-size-24"></i></div> : prData ? (
                            <>
                                <div className="mb-4">
                                    <Row>
                                        <Col md={4}>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: "120px" }}>PR No.</span>
                                                <span className="fw-bold text-danger cursor-pointer">: {prData.Header?.PR_Number}</span>
                                            </div>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: "120px" }}>PR Date</span>
                                                <span>: {prData.Header?.PRDate}</span>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: "120px" }}>Supplier</span>
                                                <span className="text-uppercase">: {prData.Header?.SupplierName}</span>
                                            </div>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: "120px" }}>Currency</span>
                                                <span>: {prData.Header?.currencycode || "SGD"}</span>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: "120px" }}>PR Type</span>
                                                <span>: {prData.Header?.prTypeName}</span>
                                            </div>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: "120px" }}>Payment Term</span>
                                                <span>: {prData.Header?.PaymentTermName}</span>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>
                                <div className="table-responsive border">
                                    <Table className="table table-bordered mb-0">
                                        <thead className="blue-table-header">
                                            <tr>
                                                <th style={{ width: '50px' }}>#</th>
                                                <th>Item Group</th>
                                                <th>Item Name</th>
                                                <th>Qty</th>
                                                <th>UOM</th>
                                                <th className="text-end">Unit Price</th>
                                                <th className="text-end">Discount</th>
                                                <th className="text-end">Tax %</th>
                                                <th className="text-end">Tax Amt</th>
                                                <th className="text-end">VAT %</th>
                                                <th className="text-end">VAT Amt</th>
                                                <th className="text-end">Total Amt</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {prData.Details?.map((row, i) => (
                                                <tr key={i} className="align-middle">
                                                    <td>{i + 1}</td>
                                                    <td>{row.groupname}</td>
                                                    <td>{row.ItemName || "-"}</td>
                                                    <td>{row.Qty}</td>
                                                    <td>{row.UOMName}</td>
                                                    <td className="text-end">{Number(row.unitprice || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="text-end">{Number(row.discountamount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="text-end">{row.taxperc || 0}</td>
                                                    <td className="text-end">{Number(row.taxamount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="text-end">{row.vatpercent || 0}</td>
                                                    <td className="text-end">{Number(row.vatamount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                                    <td className="text-end"><strong>{Number(row.NetValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                                                </tr>
                                            ))}
                                            <tr className="fw-bold bg-light">
                                                <td colSpan={11} className="text-end">Total:</td>
                                                <td className="text-end">{Number(prData.Header?.HeaderNetValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </div>
                            </>
                        ) : <p className="text-center">No data found.</p>}
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="btn btn-close-custom" onClick={togglePrModal}>
                            <i className="bx bx-window-close label-icon font-size-16 align-middle me-2"></i> Close
                        </button>
                    </ModalFooter>
                </Modal>

                {/* Claim Link Detail Modal */}
                <Modal
                    isOpen={showClaimDetailModal}
                    toggle={() => setShowClaimDetailModal(false)}
                    size="xl"
                    centered
                    backdrop="static"
                >
                    <ModalHeader toggle={() => setShowClaimDetailModal(false)}>
                        Claim Details: {claimDetailData?.FormNo || claimDetailData?.Reference || "-"}
                    </ModalHeader>
                    <ModalBody>
                        {loadingClaimDetail ? (
                            <div className="text-center p-5"><i className="bx bx-loader bx-spin font-size-24"></i></div>
                        ) : claimDetailData?.error ? (
                            <div className="text-center p-5 text-danger">{claimDetailData.error}</div>
                        ) : claimDetailData ? (
                            <>
                                <div className="mb-4">
                                    <Row>
                                        <Col md={4}>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: '140px' }}>Category Type</span>
                                                <span>: {claimDetailData.CategoryType}</span>
                                            </div>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: '140px' }}>Application Date</span>
                                                <span>: {formatDate(claimDetailData.Date)}</span>
                                            </div>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: '140px' }}>Claim Number</span>
                                                <span className="fw-bold">: {claimDetailData.FormNo}</span>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: '140px' }}>Department</span>
                                                <span>: {claimDetailData.Department}</span>
                                            </div>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: '140px' }}>Applicant</span>
                                                <span>: {claimDetailData.Applicant}</span>
                                            </div>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: '140px' }}>Trans Currency</span>
                                                <span>: {claimDetailData.TransCurrency}</span>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: '140px' }}>HOD</span>
                                                <span>: {claimDetailData.HOD}</span>
                                            </div>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: '140px' }}>Supplier</span>
                                                <span className="text-uppercase">: {claimDetailData.Supplier}</span>
                                            </div>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: '140px' }}>Cost Center</span>
                                                <span>: {claimDetailData.CostCenter}</span>
                                            </div>
                                        </Col>
                                    </Row>
                                    <Row className="mt-2">
                                        <Col md={4}>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: '140px' }}>Claim Amt in TC</span>
                                                <span className="fw-bold text-primary">: {claimDetailData.ClaimAmtInTC?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </Col>
                                        <Col md={4}>
                                            <div className="d-flex mb-2">
                                                <span className="bold-label" style={{ minWidth: '140px' }}>Payment Mode</span>
                                                <span>: {claimDetailData.PaymentMode}</span>
                                            </div>
                                        </Col>
                                    </Row>
                                </div>

                                <DataTable value={claimDetailData.Details || []} className="p-datatable-sm" showGridlines responsiveLayout="scroll">
                                    <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center", width: '3rem' }} />
                                    <Column field="claimtype" header="Claim Type" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} />
                                    <Column field="Purpose" header="Claim & Payment Description" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} body={(r) => r.Purpose || r.ClaimAndPaymentDesc || "-"} />
                                    <Column field="Amount" header="Amount" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} className="text-end" body={(r) => r.Amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                    <Column field="ExpenseDate" header="Expense Date" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} body={(r) => r.ExpenseDate ? formatDate(r.ExpenseDate) : "-"} />
                                    <Column field="Purpose" header="Purpose" headerStyle={{ backgroundColor: "#3e6e9e", color: "white", fontWeight: "bold", textAlign: "center" }} />
                                </DataTable>
                            </>
                        ) : null}
                    </ModalBody>
                    <ModalFooter>
                        <button type="button" className="btn btn-close-custom text-white" onClick={() => setShowClaimDetailModal(false)}>
                            <i className="bx bx-window-close label-icon font-size-16 align-middle me-2"></i> Close
                        </button>
                    </ModalFooter>
                </Modal>
            </Container>
        </div>
    );
};

export default AP;