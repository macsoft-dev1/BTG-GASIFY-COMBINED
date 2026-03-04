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
    GetByIdPurchaseRequisition
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

    // --- Modal States ---
    const [modal, setModal] = useState(false);
    const [modalType, setModalType] = useState("");
    const [modalData, setModalData] = useState(null);
    const [modalLoading, setModalLoading] = useState(false);

    const [nestedModal, setNestedModal] = useState(false);
    const [nestedPOData, setNestedPOData] = useState(null);
    const [nestedPOLoading, setNestedPOLoading] = useState(false);

    // PR Modal States
    const [prModal, setPrModal] = useState(false);
    const [prData, setPrData] = useState(null);
    const [prLoading, setPrLoading] = useState(false);

    // --- Styles ---
    const gridHeaderStyle = {
        backgroundColor: "#2c5096",
        color: "#ffffff",
        fontWeight: "600",
        verticalAlign: "middle",
        borderBottom: "none",
        whiteSpace: "nowrap" // Single line column names
    };

    const filterIconStyle = {
        float: "right",
        cursor: "pointer",
        opacity: 0.8,
        fontSize: "14px",
        marginTop: "2px",
        marginLeft: "5px"
    };

    const blueLinkStyle = {
        color: "#2c5096",
        fontWeight: "bold",
        textDecoration: "underline",
        cursor: "pointer"
    };

    // Style for Modal Headers - Labels bold, Values normal
    const modalLabelStyle = {
        fontWeight: "bold",
        display: "inline-block",
        color: "#333"
    };

    const modalValueStyle = {
        fontWeight: "normal",
        display: "inline-block",
        color: "#333"
    };

    // PR No specific style - bold + brick red
    const prNoStyle = {
        fontWeight: "bold",
        color: "#b22222",
        display: "inline-block",
        cursor: "pointer"
    };

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
                    setCurrencyList(curRes.data.map(c => ({ value: c.CurrencyId, label: c.CurrencyCode })));
                }

                const poUrl = `https://btg.sogfusion.com/dnapi/api/PurchaseOrder/GetALL?BranchId=${branchId}&SupplierId=0&OrgId=${orgId}&UserId=${userId}`;
                const poRes = await axios.get(poUrl);
                if (poRes?.data?.data) {
                    const lookup = {};
                    poRes.data.data.forEach(po => {
                        if (po.poid) lookup[po.poid] = { pono: po.pono, podate: po.podate };
                    });
                    setPoLookup(lookup);
                }
            } catch (error) {
                console.error("Error loading initial data", error);
            }
        };
        loadInitialData();
    }, [orgId, branchId, userId]);

    const formatDate = (date) => {
        if (!date) return "-";
        const d = new Date(date);
        return isNaN(d.getTime()) ? "-" : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
    };

    // --- 2. Fetch Grid Data ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const formatForApi = (date) => {
                if (!date) return "";
                const d = new Date(date);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            const fromDateStr = formatForApi(filter.fromDate);
            const toDateStr = formatForApi(filter.toDate);
            const supplierId = filter.supplier ? filter.supplier.value : 0;

            if (activeTab === "1") {
                // Fetch GRN list and IRN list in parallel to get amounts
                const [grnResponse, irnResponse] = await Promise.all([
                    GetAllGRNList(supplierId, 0, orgId, branchId, userId),
                    GetAllIRNList(branchId, orgId, supplierId, 0, fromDateStr, toDateStr, userId)
                ]);

                if (grnResponse?.data && Array.isArray(grnResponse.data)) {
                    // Build a lookup: grnId -> { amount, poid } from IRN data
                    const grnLookup = {};
                    if (irnResponse?.data && Array.isArray(irnResponse.data)) {
                        irnResponse.data.forEach(irn => {
                            const grnId = irn.grn_id || irn.grnid;
                            if (grnId) {
                                if (!grnLookup[grnId]) {
                                    grnLookup[grnId] = { amount: 0, poid: irn.poid || 0 };
                                }
                                grnLookup[grnId].amount += (irn.totalamount || 0);
                            }
                        });
                    }

                    let mappedData = grnResponse.data
                        .filter(item => !grnLookup[item.grnid]) // Exclude GRNs already converted to IRN
                        .map(item => {
                            return {
                                Id: item.grnid,
                                Date: item.grndate,
                                DateObj: item.grndate ? new Date(item.grndate) : new Date(0),
                                Reference: item.grnno,
                                POId: 0,
                                Amount: 0,
                            };
                        });

                    // Client-side date filtering since backend AP doesn't support date params for GRN
                    if (filter.fromDate && filter.toDate) {
                        const fromTime = new Date(filter.fromDate).setHours(0, 0, 0, 0);
                        const toTime = new Date(filter.toDate).setHours(23, 59, 59, 999);
                        mappedData = mappedData.filter(item => {
                            const dateToUse = item.Date;
                            if (!dateToUse) return true;
                            const itemTime = new Date(dateToUse).getTime();
                            return itemTime >= fromTime && itemTime <= toTime;
                        });
                    }

                    // Recalculate cumulative amounts after filtering
                    let cumulativeGRNTotal = 0;
                    mappedData = mappedData.map(item => {
                        cumulativeGRNTotal += item.Amount;
                        return { ...item, CumulativeAmount: cumulativeGRNTotal };
                    });

                    setAccruedData(mappedData);
                } else {
                    setAccruedData([]);
                }
            } else {
                // Fetch IRN with backend docdate filtering
                const response = await GetAllIRNList(branchId, orgId, supplierId, 0, fromDateStr, toDateStr, userId);
                if (response?.data && Array.isArray(response.data)) {
                    let cumulativeTotal = 0;
                    const mappedData = response.data.map(item => {
                        cumulativeTotal += (item.totalamount || 0);
                        return {
                            Id: item.receiptnote_hdr_id,
                            IRNId: item.receiptnote_hdr_id,
                            Reference: item.receipt_no,
                            POId: item.poid,
                            IRNDate: item.receipt_Date || "-",
                            IRNDateObj: item.receipt_Date ? new Date(item.receipt_Date) : new Date(0),
                            DueDate: item.due_dt || "-",
                            DueDateObj: item.due_dt ? new Date(item.due_dt) : new Date(0),
                            SupplierName: item.suppliername,
                            OriginalAmount: item.totalamount || 0,
                            CumulativeAmount: cumulativeTotal,
                            // Additional fields needed for GenerateSPC payload
                            grnid: item.grn_id || item.grnid || "0",
                            supplierid: item.supplierid || item.supplier_id || 0,
                            modeOfPaymentId: item.ModeOfPaymentId || item.modeOfPaymentId || 0,
                            invoiceno: item.receiptno || item.receipt_no || "",
                            invoicedate: item.receiptdate || "",
                            duedate: item.due_dt || item.duedate || "",
                            po_amount: item.po_amount || 0,
                            adv_payment: item.adv_payment || 0,
                            balance_payment: item.balance_payment || 0,
                            alreadyrecivedamount: item.alreadyrecivedamount || 0,
                            balancepaymentamount: item.balancepaymentamount || 0
                        };
                    });
                    setPayableData(mappedData);
                } else {
                    setPayableData([]);
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Failed to load data");
        } finally {
            setLoading(false);
        }
    }, [activeTab, filter.fromDate, filter.toDate, filter.supplier, orgId, branchId, userId, poLookup]);

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
    };

    const handleCheckboxChange = (id) => {
        setSelectedPayables((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
    };

    const totalPayableValue = useMemo(() => {
        if (payableData.length === 0) return 0;
        return payableData[payableData.length - 1].CumulativeAmount || 0;
    }, [payableData]);

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
                setModalData(res.data);
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

    const handleIRNClick = async (poId) => {
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
                setModalData(res.data);
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
            <Container fluid>
                <Breadcrumbs title="Finance" breadcrumbItem="Accounts Payable (AP)" />

                {/* Filters */}
                <Card>
                    <CardBody>
                        <Row>
                            <Col md={3}>
                                <div className="mb-3">
                                    <Label>Supplier</Label>
                                    <Select options={supplierList} value={filter.supplier} onChange={(opt) => handleFilterChange("supplier", opt)} isClearable placeholder="Select Supplier" />
                                    {activeTab === "2" && (
                                        <div className="mt-3 text-start" style={{ fontSize: "16px" }}>
                                            <span className="fw-bold me-2">Total AP:</span>
                                            <span style={{ color: "firebrick", fontWeight: "bold" }}>
                                                {totalPayableValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </Col>
                            <Col md={3}>
                                <div className="mb-3">
                                    <Label>Currency</Label>
                                    <Select options={currencyList} value={filter.currency} onChange={(opt) => handleFilterChange("currency", opt)} isClearable placeholder="Select Currency" />
                                </div>
                            </Col>
                            <Col md={3}>
                                <div className="mb-3">
                                    <Label>From Date</Label>
                                    <Flatpickr className="form-control" value={filter.fromDate} onChange={(date) => handleFilterChange("fromDate", date[0])} options={{ dateFormat: "d-m-Y" }} />
                                </div>
                            </Col>
                            <Col md={3}>
                                <div className="mb-3">
                                    <Label>To Date</Label>
                                    <Flatpickr className="form-control" value={filter.toDate} onChange={(date) => handleFilterChange("toDate", date[0])} options={{ dateFormat: "d-m-Y" }} />
                                </div>
                            </Col>
                            <Col md={12} className="d-flex justify-content-end align-items-center gap-2">
                                <Button color="primary" onClick={fetchData} disabled={loading}>
                                    {loading ? <i className="bx bx-loader bx-spin me-1"></i> : <i className="bx bx-search-alt-2 me-1"></i>} Search
                                </Button>
                                <Button color="danger" onClick={handleClearFilter} disabled={loading}>
                                    <i className="bx bx-x me-1"></i> Cancel
                                </Button>
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
                                    <NavLink className={classnames({ active: activeTab === "1" })} onClick={() => toggleTab("1")} style={{ cursor: "pointer" }}>
                                        <span className="d-none d-sm-block">Accrued Purchases (GRN)</span>
                                    </NavLink>
                                </NavItem>
                                <NavItem>
                                    <NavLink className={classnames({ active: activeTab === "2" })} onClick={() => toggleTab("2")} style={{ cursor: "pointer" }}>
                                        <span className="d-none d-sm-block">Accounts Payable (IRN)</span>
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
                                    style={{ fontSize: '13px' }}
                                    header={
                                        <div className="d-flex justify-content-end">
                                            <InputText type="search" placeholder="Global Search" className="form-control" style={{ width: "250px" }} value={globalFilterAccrued} onChange={(e) => setGlobalFilterAccrued(e.target.value)} />
                                        </div>
                                    }
                                    responsiveLayout="scroll"
                                    emptyMessage="No Data Found"
                                    className="p-datatable-sm p-datatable-gridlines"
                                >
                                    <Column field="Reference" header="GRN No" body={(item) => (
                                        <span style={blueLinkStyle} onClick={() => handleGRNClick(item.Id)}>
                                            {item.Reference}
                                        </span>
                                    )} sortable headerStyle={{ whiteSpace: 'nowrap' }} />
                                    <Column field="DateObj" header="GRN Date" body={(item) => formatDate(item.Date)} sortable headerStyle={{ whiteSpace: 'nowrap' }} />
                                    <Column field="POId" header="PO Number" body={(item) => (
                                        poLookup[item.POId] ? (
                                            <span style={blueLinkStyle} onClick={() => handlePOClick(item.POId)}>
                                                {poLookup[item.POId].pono}
                                            </span>
                                        ) : "-"
                                    )} sortable />
                                    <Column field="Amount" header="Amount" body={(item) => new Intl.NumberFormat().format(item.Amount)} className="text-end" sortable />
                                    <Column field="CumulativeAmount" header="Cumulative Amount" body={(item) => new Intl.NumberFormat().format(item.CumulativeAmount)} className="text-end" sortable />
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
                                    style={{ fontSize: '13px' }}
                                    header={
                                        <div className="d-flex justify-content-end">
                                            <InputText type="search" placeholder="Global Search" className="form-control" style={{ width: "250px" }} value={globalFilterPayable} onChange={(e) => setGlobalFilterPayable(e.target.value)} />
                                        </div>
                                    }
                                    responsiveLayout="scroll"
                                    emptyMessage="No Data Found"
                                    className="p-datatable-sm p-datatable-gridlines"
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
                                        <span style={blueLinkStyle} onClick={() => handleIRNClick(item.POId)}>
                                            {item.Reference}
                                        </span>
                                    )} sortable headerStyle={{ whiteSpace: 'nowrap' }} />
                                    <Column field="IRNDateObj" header="IRN Date" body={(item) => item.IRNDate} sortable headerStyle={{ whiteSpace: 'nowrap' }} />
                                    <Column field="POId" header="PO Number" body={(item) => (
                                        poLookup[item.POId] ? (
                                            <span style={blueLinkStyle} onClick={() => handlePOClick(item.POId)}>
                                                {poLookup[item.POId].pono}
                                            </span>
                                        ) : "-"
                                    )} sortable />
                                    <Column field="DueDateObj" header="Due Date" body={(item) => formatDate(item.DueDate)} sortable headerStyle={{ whiteSpace: 'nowrap' }} />

                                    <Column field="OriginalAmount" header="Amount" body={(item) => new Intl.NumberFormat().format(item.OriginalAmount)} className="text-end" sortable />
                                    <Column field="CumulativeAmount" header="Cumulative Amount" body={(item) => new Intl.NumberFormat().format(item.CumulativeAmount)} className="text-end" sortable />
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
                                {/* HEADER INFO SECTION - Structured with Proper Colon Alignment */}
                                <div className="mb-4">
                                    <Row className="mb-2">
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>
                                                {modalType === "PO" ? "PO No." : "Number"}
                                            </span>
                                            <span style={modalValueStyle}>
                                                : {modalType === "GRN" ? modalData.Header?.grnno : modalData.Header?.pono}
                                            </span>
                                        </Col>
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>
                                                {modalType === "PO" ? "PO Date" : "Date"}
                                            </span>
                                            <span style={modalValueStyle}>
                                                : {formatDate(modalType === "GRN" ? modalData.Header?.grndate : modalData.Header?.podate)}
                                            </span>
                                        </Col>
                                    </Row>

                                    <Row className="mb-2">
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>Supplier</span>
                                            <span style={modalValueStyle}>: {modalData.Header?.suppliername}</span>
                                        </Col>

                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>
                                                {modalType === "PO" ? "PR No." : "Total Amount"}
                                            </span>
                                            {modalType === "PO" ? (
                                                <span style={prNoStyle}>
                                                    : {modalData.Requisition?.[0]?.prnumber || "-"}
                                                </span>
                                            ) : (
                                                <span style={modalValueStyle}>
                                                    : {new Intl.NumberFormat().format(modalData.Header?.nettotal || 0)}
                                                </span>
                                            )}
                                        </Col>
                                    </Row>

                                    <Row className="mb-2">
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>Currency</span>
                                            <span style={modalValueStyle}>: {modalData.Header?.currencycode || "SGD"}</span>
                                        </Col>
                                    </Row>
                                </div>

                                {/* DETAILS TABLE */}
                                <div className="table-responsive border">
                                    <Table className="table mb-0">
                                        <thead>
                                            <tr style={gridHeaderStyle}>
                                                <th>#</th>
                                                {(modalType === "PO" || modalType === "IRN") && <th>PR No.</th>}
                                                {(modalType === "PO" || modalType === "IRN") && <th>Item Group</th>}
                                                <th>{modalType === "GRN" ? "Item Description" : "Item Name"}</th>
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
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    {(modalType === "PO" || modalType === "IRN") && <td><span style={prNoStyle} onClick={() => handlePRClick(row.prid)}>{row.prnumber}</span></td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td>{row.groupname}</td>}
                                                    <td>{row.itemDescription || row.itemname || "-"}</td>
                                                    <td>{row.poqty || row.qty}</td>
                                                    <td>{row.UOM || row.uom}</td>
                                                    {modalType === "GRN" && <td>{row.alreadyrecqty || 0}</td>}
                                                    {modalType === "GRN" && <td>{row.balanceqty || 0}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{new Intl.NumberFormat().format(row.unitprice || 0)}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{new Intl.NumberFormat().format(row.discountvalue || 0)}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{row.taxperc}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{new Intl.NumberFormat().format(row.taxvalue || 0)}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{row.vatperc}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end">{new Intl.NumberFormat().format(row.vatvalue || 0)}</td>}
                                                    {(modalType === "PO" || modalType === "IRN") && <td className="text-end"><strong>{new Intl.NumberFormat().format(row.totalvalue || 0)}</strong></td>}
                                                </tr>
                                            ))}
                                            {(modalType === "PO" || modalType === "IRN") && (
                                                <tr className="fw-bold bg-light">
                                                    <td colSpan={12} className="text-end">Total:</td>
                                                    <td className="text-end">{new Intl.NumberFormat().format(modalData.Header?.nettotal || 0)}</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            </>
                        ) : <p className="text-center">No details available.</p>}
                    </ModalBody>
                    <ModalFooter>
                        <Button color="danger" style={{ backgroundColor: "#d9534f", borderColor: "#d43f3a" }} onClick={toggleModal}>Close</Button>
                    </ModalFooter>
                </Modal>

                {/* Nested PO Modal (Also Styled in Firebrick) */}
                <Modal isOpen={nestedModal} toggle={toggleNestedModal} size="xl" centered backdrop="static">
                    <ModalHeader toggle={toggleNestedModal}>Purchase Order Details (Linked)</ModalHeader>
                    <ModalBody>
                        {nestedPOLoading ? <div className="text-center p-5"><i className="bx bx-loader bx-spin font-size-24"></i></div> : nestedPOData ? (
                            <>
                                <div className="mb-4">
                                    <Row className="mb-2">
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>PO No.</span>
                                            <span style={modalValueStyle}>: {nestedPOData.Header?.pono}</span>
                                        </Col>
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>PO Date</span>
                                            <span style={modalValueStyle}>: {formatDate(nestedPOData.Header?.podate)}</span>
                                        </Col>
                                    </Row>
                                    <Row className="mb-2">
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>Supplier</span>
                                            <span style={modalValueStyle}>: {nestedPOData.Header?.suppliername}</span>
                                        </Col>
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>Status</span>
                                            <span style={modalValueStyle}>: {nestedPOData.Header?.isactive ? "Active" : "Inactive"}</span>
                                        </Col>
                                    </Row>
                                </div>
                                <div className="table-responsive border">
                                    <Table className="table mb-0">
                                        <thead>
                                            <tr style={gridHeaderStyle}>
                                                <th>#</th>
                                                <th>Item Name</th>
                                                <th>Qty</th>
                                                <th>UOM</th>
                                                <th className="text-end">Unit Price</th>
                                                <th className="text-end">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {nestedPOData.Requisition?.map((row, i) => (
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    <td>{row.itemname}</td>
                                                    <td>{row.qty}</td>
                                                    <td>{row.uom}</td>
                                                    <td className="text-end">{new Intl.NumberFormat().format(row.unitprice || 0)}</td>
                                                    <td className="text-end">{new Intl.NumberFormat().format(row.totalvalue || 0)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>
                            </>
                        ) : <p className="text-center">No data found.</p>}
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleNestedModal}>Close</Button>
                    </ModalFooter>
                </Modal>

                {/* PR Details Modal */}
                <Modal isOpen={prModal} toggle={togglePrModal} size="xl" centered backdrop="static">
                    <ModalHeader toggle={togglePrModal}>Purchase Requisition Details</ModalHeader>
                    <ModalBody>
                        {prLoading ? <div className="text-center p-5"><i className="bx bx-loader bx-spin font-size-24"></i></div> : prData ? (
                            <>
                                <div className="mb-4">
                                    <Row className="mb-2">
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>PR No.</span>
                                            <span style={prNoStyle}>: {prData.Header?.PR_Number}</span>
                                        </Col>
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>PR Date</span>
                                            <span style={modalValueStyle}>: {prData.Header?.PRDate}</span>
                                        </Col>
                                    </Row>
                                    <Row className="mb-2">
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>Supplier</span>
                                            <span style={modalValueStyle}>: {prData.Header?.SupplierName}</span>
                                        </Col>
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>Currency</span>
                                            <span style={modalValueStyle}>: {prData.Header?.currencycode || "SGD"}</span>
                                        </Col>
                                    </Row>
                                    <Row className="mb-2">
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>PR Type</span>
                                            <span style={modalValueStyle}>: {prData.Header?.prTypeName}</span>
                                        </Col>
                                        <Col md={6} className="d-flex">
                                            <span style={{ minWidth: "120px", ...modalLabelStyle }}>Payment Term</span>
                                            <span style={modalValueStyle}>: {prData.Header?.PaymentTermName}</span>
                                        </Col>
                                    </Row>
                                </div>
                                <div className="table-responsive border">
                                    <Table className="table mb-0">
                                        <thead>
                                            <tr style={gridHeaderStyle}>
                                                <th>#</th>
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
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    <td>{row.groupname}</td>
                                                    <td>{row.ItemName || "-"}</td>
                                                    <td>{row.Qty}</td>
                                                    <td>{row.UOMName}</td>
                                                    <td className="text-end">{new Intl.NumberFormat().format(row.UnitPrice || 0)}</td>
                                                    <td className="text-end">{new Intl.NumberFormat().format(row.DiscountValue || 0)}</td>
                                                    <td className="text-end">{row.TaxPerc}</td>
                                                    <td className="text-end">{new Intl.NumberFormat().format(row.TaxValue || 0)}</td>
                                                    <td className="text-end">{row.vatPerc}</td>
                                                    <td className="text-end">{new Intl.NumberFormat().format(row.vatValue || 0)}</td>
                                                    <td className="text-end"><strong>{new Intl.NumberFormat().format(row.NetTotal || 0)}</strong></td>
                                                </tr>
                                            ))}
                                            <tr className="fw-bold bg-light">
                                                <td colSpan={11} className="text-end">Total:</td>
                                                <td className="text-end">{new Intl.NumberFormat().format(prData.Header?.HeaderNetValue || 0)}</td>
                                            </tr>
                                        </tbody>
                                    </Table>
                                </div>
                            </>
                        ) : <p className="text-center">No data found.</p>}
                    </ModalBody>
                    <ModalFooter>
                        <Button color="danger" style={{ backgroundColor: "#d9534f", borderColor: "#d43f3a" }} onClick={togglePrModal}>Close</Button>
                    </ModalFooter>
                </Modal>
            </Container>
        </div>
    );
};

export default AP;