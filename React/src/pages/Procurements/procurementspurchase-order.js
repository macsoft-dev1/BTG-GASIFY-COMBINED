import React, { useState, useEffect, useRef } from "react";
import {
    Card, CardBody, Col, Container, Row, Label, FormGroup, Modal,
    ModalBody, ModalHeader, Table, Input,
    ModalFooter
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { ColumnGroup } from 'primereact/columngroup';
import Select from "react-select";
import AsyncSelect from "react-select/async";
import "primereact/resources/themes/lara-light-blue/theme.css";
import { useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { Tag } from "primereact/tag";
import { Dropdown } from "primereact/dropdown";
import Swal from 'sweetalert2';
import { AutoComplete } from "primereact/autocomplete";
import { MultiSelect } from "primereact/multiselect";
import SQPrintColumn from "../Order-Management/Quotation/SQPrintColumn";
import {
    GetClaimAndPaymentTransactionCurrency, GetCommonProcurementDeliveryTerms, GetCommonProcurementDepartmentDetails,
    GetCommonProcurementItemDetails, GetCommonProcurementPaymentTerms, GetCommonProcurementPRType, GetPurchaseMemoList,
    GetCommonProcurementPurchaseRequisitionSeqNo, GetCommonProcurementSupplierDetails, GetCommonProcurementUomDetails,
    GetPurchaseRequisitionUserDetails, SaveProcurementRequisition, UpdateProcurementRequisition, GetSupplierCurrency, GetByIdPurchaseRequisition,
    GetAllPurchaseOrderList,
    GetPOSupplierAutoComplete,
    GetPONOAutoComplete,
    GetByIdPurchaseOrder,
    GetCommonProcurementPRNoList,
    GetPRNoBySupplierAndCurrency,
    GetPurchaseOrderPrint, GetAllPO, GetAllItems
} from "common/data/mastersapi";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
const initFilters = () => ({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    pono: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
    podate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.DATE_IS }] },
    requestorname: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    suppliername: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    CreatedDate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    createdbyName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    CurrencyCode: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    totalamount: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
});

const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).replace(/ /g, "-"); // e.g. "29-Aug-2025"
};

const getUserDetails = () => {
    if (localStorage.getItem("authUser")) {
        const obj = JSON.parse(localStorage.getItem("authUser"))
        return obj;
    }
}
const ProcurementsManagePurchaseOrder = () => {
    const history = useHistory();

    // State
    const [gas, setGas] = useState([]); // Purchase orders
    const [pallet, setPallet] = useState([]);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState(initFilters());
    const [switchStates, setSwitchStates] = useState({});
    const [selectedRow, setSelectedRow] = useState(null);
    const [txtStatus, setTxtStatus] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isModalOpen2, setIsModalOpen2] = useState(false);
    const [cylinderTableData, setCylinderTableData] = useState([]);
    const [purchaseOrders, setPurchaseOrders] = useState([]);

    // Select props for react-select
    const [isClearable] = useState(true);
    const [isSearchable] = useState(true);
    const [isDisabled] = useState(false);
    const [isLoading] = useState(false);
    const [isRtl] = useState(false);

    // New Filter States
    const [selectedFilterType, setSelectedFilterType] = useState([]);
    const [filterPoNo, setFilterPoNo] = useState(null);
    const [filterSupplier, setFilterSupplier] = useState(null);
    const [filterCurrency, setFilterCurrency] = useState(null);
    const [filterPoDateFrom, setFilterPoDateFrom] = useState("");
    const [filterPoDateTo, setFilterPoDateTo] = useState("");
    const [filterAmountFrom, setFilterAmountFrom] = useState("");
    const [filterAmountTo, setFilterAmountTo] = useState("");
    const [filterCreatedDateFrom, setFilterCreatedDateFrom] = useState("");
    const [filterCreatedDateTo, setFilterCreatedDateTo] = useState("");
    const [filterCreatedBy, setFilterCreatedBy] = useState(null);
    const [filterItemName, setFilterItemName] = useState(null);
    const [allItemsForFilter, setAllItemsForFilter] = useState([]);
    const [allPurchaseOrders, setAllPurchaseOrders] = useState([]); // Store all for local filtering

    // NEW STATES FOR ADVANCED SEARCH
    const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);
    const [advancedData, setAdvancedData] = useState([]);
    const [isAdvancedLoading, setIsAdvancedLoading] = useState(false);
    const [advancedExpandedRows, setAdvancedExpandedRows] = useState({});

    const columns = [
        { field: 'pono', header: 'PO No' },
        { field: 'podate', header: 'PO Date' },
        { field: 'suppliername', header: 'Supplier' },
        { field: 'CurrencyCode', header: 'Currency' },
        { field: 'totalamount', header: 'Total Amount' },
        { field: 'CreatedDate', header: 'Created Date' },
        { field: 'createdbyName', header: 'Created By' }
    ];
    const [visibleColumns, setVisibleColumns] = useState(columns);

    const [branchId, setBranchId] = useState(1);
    const [orgId, setOrgId] = useState(1);
    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState({});
    const [poModalVisible, setPoModalVisible] = useState(false);
    const [poData, setPoData] = useState(null);
    const printRef = useRef();
    const [UserData, setUserData] = useState(null);
    const [prDetailVisible, setPrDetailVisible] = useState(false);
    const [selectedPRDetail, setSelectedPRDetail] = useState(null);
    const [poOptions, setPoOptions] = useState([]);
    const [poDetailVisible, setPoDetailVisible] = useState(false);
    const [selectedPODetail, setSelectedPODetail] = useState(null);

    useEffect(() => {
        const fetchItemsFromPOs = async () => {
            if (!allPurchaseOrders || allPurchaseOrders.length === 0) {
                setAllItemsForFilter([]);
                return;
            }

            try {
                // Fetch details for the POs in the table to populate the Item filter natively.
                const posToFetch = allPurchaseOrders;
                const uniqueItemMap = new Map();

                const chunkSize = 20;
                for (let i = 0; i < posToFetch.length; i += chunkSize) {
                    const chunk = posToFetch.slice(i, i + chunkSize);
                    await Promise.all(chunk.map(async (po) => {
                        try {
                            const res = await GetByIdPurchaseOrder(po.poid, orgId, branchId);
                            if (res?.status && res.data?.Requisition) {
                                res.data.Requisition.forEach(item => {
                                    const name = item.itemname || item.itemdescription;
                                    if (name) {
                                        uniqueItemMap.set(name.trim(), true);
                                    }
                                });
                            }
                        } catch (err) {
                            // ignore individual fail
                        }
                    }));
                }

                const uniqueItems = Array.from(uniqueItemMap.keys()).map(name => ({ label: name, value: name }));
                setAllItemsForFilter(uniqueItems);
            } catch (error) {
                console.error("Error fetching PO items:", error);
            }
        };

        fetchItemsFromPOs();
    }, [allPurchaseOrders, orgId, branchId]);

    const getSeverity = (Status) => {
        switch (Status) {
            case 'Posted': return 'success';
            case 'Saved': return 'danger';
            case 'New': return 'info';
        };
    };

    const FilterTypes = [
        { name: "PO No", value: "pono" },
        { name: "Supplier", value: "suppliername" },
        { name: "Currency", value: "CurrencyCode" },
        { name: "PO Date", value: "podate" },
        { name: "Total Amount", value: "totalamount" },
        { name: "Created Date", value: "CreatedDate" },
        { name: "Created By", value: "createdbyName" },
        { name: "Item Name", value: "itemname" }
    ];
    // const cancelFilter = async () => {
    //     try {
    //         const requestorid = '';
    //         const branchid = 1;
    //         const supplierid = 1;
    //         const orgid = 1;

    //         const result = await GetAllPurchaseOrderList(requestorid, branchid, supplierid, orgid);
    //         setPurchaseOrders(Array.isArray(result.data) ? result.data : []);
    //         setSelectedFilterType(null);
    //         setSelectedAutoItem(null);
    //     } catch (error) {
    //         console.error("Error resetting data:", error);
    //     }
    // };

    // Assuming this runs after fetching PR or PO data
    const setPOOptionsFromResponse = (response) => {
        if (response?.status && response?.data?.Header) {
            const header = response.data.Header;
            const newOption = {
                value: header.pono,   // string PO number
                label: header.pono,
                poid: header.poid      // numeric ID
            };

            setPoOptions(prev => {
                const exists = prev.find(p => p.poid === newOption.poid);
                if (exists) return prev;
                return [...prev, newOption];
            });
        }
    };

    const handlePRClick = async (prid) => {
        if (!prid || prid <= 0) {
            Swal.fire("Invalid", "No valid PR found", "warning");
            return;
        }

        try {
            const res = await GetByIdPurchaseRequisition(prid, orgId, branchId);

            if (res?.status && res.data) {
                setPOOptionsFromResponse(res);
                let details = res.data.Details || [];
                details = details.map((d) => ({
                    ...d,
                    memo_number: d.PM_Number || "NA",
                    MemoDisplay: d.PM_Number || "NA",
                }));

                const headerMemoNumbers = [...new Set(details.map(d => d.PM_Number).filter(Boolean))].join(", ") || "NA";

                setSelectedPRDetail({
                    ...res.data,
                    Header: {
                        ...res.data.Header,
                        MemoConcat: headerMemoNumbers,
                        ProjectName: 'N/A',
                    },
                    Details: details,
                });
                setPrDetailVisible(true);
            } else {
                Swal.fire("Not Found", `PR details not available (ID: ${prid})`, "warning");
            }
        } catch (err) {
            console.error("Error loading PR:", err);
            Swal.fire("Error", "Failed to load PR details", "error");
        }
    };

    // Dynamic options parsed from table data
    const getDropdownOptions = (field) => {
        const uniqueValues = [...new Set(allPurchaseOrders.map(item => item[field]).filter(Boolean))];
        return uniqueValues.map(val => ({ label: val, value: val }));
    };

    // Static data for Gas Codes and Container Types
    const [GasCodeList] = useState([
        { label: "AIR47L", value: "1", code: "1", description: "AIR 47L" },
        { label: "AMMONIA", value: "2", code: "2", description: "AMMONIA GAS" },
        { label: "AR 99.999%", value: "3", code: "3", description: "Pure Ar Grade 99.999%" },
        { label: "BLNGAS", value: "4", code: "4", description: "Balloon Gas General" },
        { label: "CGARHE", value: "5", code: "5", description: "Comp Gas Argon 25% Helium SG " },
    ]);

    const [ContainerList] = useState([
        { label: "G-PLTCYL40-16", value: "1", description: "G PLTCYL40 16" },
        { label: "G-PLTCYL47-12", value: "2", description: "G PLTCYL4 12" },
        { label: "G-PLTCYL47-15", value: "3", description: "G PLTCYL47 15" },
        { label: "G-PLTCYL47-16", value: "4", description: "G PLTCYL47 16" },
        { label: "G-PLTCYL47-17", value: "5", description: "G PLTCYL47 17" },
    ]);
    const editRow = (rowData) => {
        debugger
        console.log('Edit row:', rowData);
        history.push({
            pathname: "/procurementsadd-purchaseorder", state: { PurchaseOrderDetails: rowData }
        });
    };

    // useEffect(() => {
    //     const loadAllPOs = async () => {
    //         try {
    //             const res = await GetAllPO(branchId, orgId);
    //             if (res?.status && Array.isArray(res.data)) {
    //                 const options = res.data.map(po => ({
    //                     value: po.pono,
    //                     label: po.pono,
    //                     poid: po.poid
    //                 }));
    //                 setPoOptions(options);
    //             }
    //         } catch (err) {
    //             console.error("Failed to load POs for PONO link", err);
    //         }
    //     };
    //     loadAllPOs();
    // }, [branchId, orgId]);

    // On component mount - load purchase orders and pallets
    useEffect(() => {
        const fetchData = async () => {
            const userData = getUserDetails();

            // Don't proceed if user data is not available yet
            if (!userData || !userData.u_id) {
                console.warn("User data not available yet, skipping PO fetch");
                return;
            }

            const requestorid = 0;
            const branchid = 1;
            const supplierid = 0;
            const orgid = 1;

            try {
                const result = await GetAllPurchaseOrderList(requestorid, branchid, supplierid, orgid, userData.u_id);
                setPurchaseOrders(Array.isArray(result.data) ? result.data : []);
                setAllPurchaseOrders(Array.isArray(result.data) ? result.data : []); // Save unfiltered data

                const palletsData = getPallet();
                setPallet(palletsData);

                const initialSwitchStates = {};
                palletsData.forEach(item => {
                    initialSwitchStates[item.Code] = item.Active === 1;
                });
                setSwitchStates(initialSwitchStates);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        const userData1 = getUserDetails();
        setUserData(userData1);

        fetchData();
    }, []);

    // Pallet static data function
    const getPallet = () => {
        return [
            { Code: "00001", Palletname: "New Pallet", ContainerType: "G-PLTCYL40-16", GasCode: "AIR47L, BLNGAS, AMMONIA, CGARHE", Active: 1 },
            { Code: "00002", Palletname: "New Pallet 2", ContainerType: "G-PLTCYL40-16", GasCode: "BLNGAS, PAR 7.2M3, AR 99.999%", Active: 0 },
            { Code: "00003", Palletname: "New Pallet 3", ContainerType: "PLTCYL65-4", GasCode: "PAR 7.2M3, AMMONIA, CGARHE", Active: 1 },
            { Code: "00004", Palletname: "New Pallet 4", ContainerType: "G-PLTCYL50-4", GasCode: "CO2-GAS-25KG, AIR47L, BLNGAS, AMMONIA", Active: 0 },
        ];
    };
    // const searchData = () => {
    //     debugger
    //     const filterType = selectedFilterType?.value;

    //     // Support both object and string input
    //     const filterValue =
    //         typeof selectedAutoItem === "string"
    //             ? selectedAutoItem.toLowerCase()
    //             : selectedAutoItem?.label?.toLowerCase() || '';

    //     if (!filterType || !filterValue) return;

    //     const filteredData = purchaseOrders.filter(order => {
    //         if (filterType === 1) { // Supplier
    //             return order.suppliername?.toLowerCase().includes(filterValue);
    //         } else if (filterType === 2) { // PO No
    //             return order.pono?.toLowerCase().includes(filterValue);
    //         }
    //         return false;
    //     });

    //     setPurchaseOrders(filteredData);
    // };

    const getFilteredPurchaseOrders = async () => {
        let result = { data: [] };
        if (allPurchaseOrders.length === 0) {
            result = await GetAllPurchaseOrderList(0, branchId, 0, orgId, UserData?.u_id);
            setAllPurchaseOrders(Array.isArray(result?.data) ? result.data : []);
        }

        let filteredData = allPurchaseOrders.length > 0 ? [...allPurchaseOrders] : Array.isArray(result?.data) ? result.data : [];

        // Apply Local Filters
        if (filterSupplier) {
            filteredData = filteredData.filter(item =>
                item.suppliername?.toLowerCase().includes(filterSupplier.label?.toLowerCase() || filterSupplier.value?.toString().toLowerCase())
            );
        }
        if (filterPoNo) {
            filteredData = filteredData.filter(item =>
                item.pono?.toLowerCase().includes(filterPoNo.value?.toLowerCase() || filterPoNo.label?.toLowerCase())
            );
        }
        if (filterCurrency) {
            filteredData = filteredData.filter(item =>
                item.CurrencyCode?.toLowerCase() === (filterCurrency.value?.toLowerCase() || filterCurrency.label?.toLowerCase())
            );
        }
        if (filterPoDateFrom) {
            const fromDate = new Date(filterPoDateFrom);
            filteredData = filteredData.filter(item => {
                const itemDate = new Date(item.podate);
                return itemDate >= fromDate;
            });
        }
        if (filterPoDateTo) {
            const toDate = new Date(filterPoDateTo);
            toDate.setHours(23, 59, 59, 999);
            filteredData = filteredData.filter(item => {
                const itemDate = new Date(item.podate);
                return itemDate <= toDate;
            });
        }
        if (filterAmountFrom) {
            filteredData = filteredData.filter(item => item.totalamount >= parseFloat(filterAmountFrom));
        }
        if (filterAmountTo) {
            filteredData = filteredData.filter(item => item.totalamount <= parseFloat(filterAmountTo));
        }
        if (filterCreatedDateFrom) {
            const fromDate = new Date(filterCreatedDateFrom);
            filteredData = filteredData.filter(item => {
                const itemDate = new Date(item.CreatedDate);
                return itemDate >= fromDate;
            });
        }
        if (filterCreatedDateTo) {
            const toDate = new Date(filterCreatedDateTo);
            toDate.setHours(23, 59, 59, 999);
            filteredData = filteredData.filter(item => {
                const itemDate = new Date(item.CreatedDate);
                return itemDate <= toDate;
            });
        }
        if (filterCreatedBy) {
            filteredData = filteredData.filter(item =>
                item.createdbyName?.toLowerCase() === (filterCreatedBy.label?.toLowerCase() || filterCreatedBy.value?.toString().toLowerCase())
            );
        }
        return filteredData;
    };

    const searchData = async () => {
        setIsAdvancedSearch(false);
        try {
            const filteredData = await getFilteredPurchaseOrders();
            setPurchaseOrders(filteredData);
        } catch (error) {
            console.error("Error while fetching Purchase Orders:", error);
        }
    };

    const fetchAdvancedData = async () => {
        setIsAdvancedLoading(true);
        try {
            const filteredData = await getFilteredPurchaseOrders();

            if (!filteredData || filteredData.length === 0) {
                setPurchaseOrders([]);
                Swal.fire("Info", "No data to show for advanced search with proper filters", "info");
                setIsAdvancedLoading(false);
                return;
            }

            // Verify against all filtered data
            const posToFetch = filteredData;

            let detailedPOs = await Promise.all(
                posToFetch.map(async (po) => {
                    try {
                        const res = await GetByIdPurchaseOrder(po.poid, orgId, branchId);
                        if (res?.status && res.data) {
                            return {
                                header: { ...po, PaymentTerm: res.data.Header?.paymentterm || res.data.Header?.PaymentTermName || res.data.Header?.PaymentTerm || po.PaymentTerm },
                                details: res.data.Requisition || [],
                            };
                        }
                    } catch (err) {
                        console.error("Failed to fetch detail for PO", po.poid);
                    }
                    return { header: po, details: [] };
                })
            );

            if (filterItemName) {
                const searchLower = (filterItemName.value || filterItemName.label || '').toLowerCase();
                detailedPOs = detailedPOs.filter(po =>
                    po.details.some(item =>
                        (item.itemname && item.itemname.toLowerCase().includes(searchLower)) ||
                        (item.itemdescription && item.itemdescription.toLowerCase().includes(searchLower))
                    )
                );
                // Also update the main table with this filtered list based on line items
                const matchingPOIds = new Set(detailedPOs.map(po => po.header.poid));
                setPurchaseOrders(filteredData.filter(po => matchingPOIds.has(po.poid)));
            } else {
                setPurchaseOrders(filteredData);
            }

            setAdvancedData(detailedPOs);
            const initialExpanded = {};
            detailedPOs.forEach((_, idx) => {
                initialExpanded[idx] = true;
            });
            setAdvancedExpandedRows(initialExpanded);
            setIsAdvancedSearch(true);
        } catch (error) {
            console.error("Error fetching advanced detailed POs:", error);
            Swal.fire("Error", "Failed to load advanced search data", "error");
        } finally {
            setIsAdvancedLoading(false);
        }
    };

    const cancelFilter = async () => {
        setIsAdvancedSearch(false);
        setSelectedFilterType([]);
        setFilterPoNo(null);
        setFilterSupplier(null);
        setFilterCurrency(null);
        setFilterPoDateFrom("");
        setFilterPoDateTo("");
        setFilterAmountFrom("");
        setFilterAmountTo("");
        setFilterCreatedDateFrom("");
        setFilterCreatedDateTo("");
        setFilterCreatedBy(null);
        setFilterItemName(null);

        const res = await GetAllPurchaseOrderList(0, branchId, 0, orgId, UserData?.u_id);
        if (res.status) {
            const data = Array.isArray(res.data) ? res.data : [];
            setPurchaseOrders(data);
            setAllPurchaseOrders(data);
        }
    };

    // Clear filters
    const clearFilter = () => {
        setSelectedFilterType(null);
        setFilters(initFilters());
        setGlobalFilterValue('');
    };

    // Global filter change handler
    const onGlobalFilterChange = (e) => {
        const value = e.target.value;
        setFilters(prev => ({
            ...prev,
            global: { ...prev.global, value },
        }));
        setGlobalFilterValue(value);
    };

    // Render header above table (search input + clear + tag legend)
    const renderHeader = () => (
        <div className="row align-items-center g-3 clear-spa">
            <div className="col-12 col-lg-6">
                <Button className="btn btn-danger btn-label" onClick={clearFilter}>
                    <i className="mdi mdi-filter-off label-icon" /> Clear
                </Button>
            </div>
            <div className="col-12 col-lg-3 text-end">
                {/* <span className="me-4">
                    <Tag value="S" severity="danger" /> Saved
                </span> */}
                <span className="me-1">
                    <Tag value="P" severity="success" /> Posted
                </span>
            </div>
            <div className="col-12 col-lg-3">
                <input
                    className="form-control"
                    type="text"
                    value={globalFilterValue}
                    onChange={onGlobalFilterChange}
                    placeholder="Keyword Search"
                />
            </div>
        </div>
    );

    const header = renderHeader();

    // Navigate to Add Purchase Order page
    const linkAddPurchaseOrder = () => {
        history.push("/procurementsadd-purchaseorder");
    };
    // Handle toggle switch change confirmation
    const onSwitchChange = () => {
        if (!selectedRow) return;

        const newStatus = !switchStates[selectedRow.Code];
        setSwitchStates(prevStates => ({
            ...prevStates,
            [selectedRow.Code]: newStatus,
        }));

        // Update pallet Active status locally
        setPallet(prevPallet =>
            prevPallet.map(p =>
                p.Code === selectedRow.Code ? { ...p, Active: newStatus ? 1 : 0 } : p
            )
        );

        console.log(`Pallet ${selectedRow.Code} Active Status:`, newStatus ? 1 : 0);
        setIsModalOpen2(false);
    };

    // Open confirmation modal for toggling Active status
    const openModal2 = (rowData) => {
        const value = rowData.Active === 1 ? "deactivate" : "activate";
        setTxtStatus(value);
        setSelectedRow(rowData);
        setIsModalOpen2(true);
    };

    // Switch toggle in the table row
    const actionBodyTemplate2 = (rowData) => (
        <input
            type="checkbox"
            className="form-check-input"
            checked={switchStates[rowData.Code] || false}
            onChange={() => openModal2(rowData)}
        />
    );

    // Modal toggle for new pallet
    const toggleModal = () => {
        setIsModalOpen(!isModalOpen);
    };

    // Validation Schema for formik
    const validationSchema = Yup.object({
        palletname: Yup.string().required("Pallet Name is required"),
        containerType: Yup.string().required("Container Type is required"),
        gasCode: Yup.string().required("Gas Code is required"),
    });

    // Submit handler for new pallet form
    const handleSubmit = (values, { resetForm }) => {
        console.log("Submitted pallet:", values);
        // Optionally add pallet to state or call API here
        resetForm();
        toggleModal();
    };

    // Handle container type change (if any side effect needed)
    const handleContainerTypeChange = (option) => {
        // Your logic here if needed
    };
    const actionBodyTemplate = (rowData) => {
        debugger
        return (
            <div className="d-flex align-items-center justify-content-center gap-3">
                {rowData.Status === "Saved" ? (
                    <span onClick={() => editRow(rowData)}
                        title='Edit' style={{ cursor: 'pointer' }}>
                        <i className="mdi mdi-square-edit-outline" style={{ fontSize: '1.5rem' }}></i>
                    </span>) : (
                    <span title="">
                        <i className="mdi mdi-square-edit-outline"
                            style={{ fontSize: '1.5rem', color: 'gray', opacity: 0.5 }}>
                        </i>
                    </span>
                )}

            </div>
        );
    };

    const statuses = [
        { label: "Saved", value: "Saved" },
        { label: "Posted", value: "Posted" }
    ];

    const statusBodyTemplate = (rowData) => {
        const statusShort = "P";
        return <Tag value={statusShort} severity={getSeverity("Posted")} />;
    };

    const statusFilterTemplate = (options) => {
        const defaultValue = "Posted";
        return <Dropdown value={defaultValue} options={statuses} onChange={(e) => options.filterCallback(e.value, options.index)}
            itemTemplate={statusItemTemplate} placeholder="Select One" className="p-column-filter" showClear />;
    };

    const statusItemTemplate = (option) => {
        return <Tag value={option.label} severity={getSeverity(option.value)} />;
    };

    // const searchData = () => {
    //     const filterType = selectedFilterType?.value || 0;
    //     const filterValue = selectedAutoItem?.value || 0;
    // };

    const handleShowDetails = async (row) => {
        const res = await GetByIdPurchaseOrder(row.poid, orgId, branchId);
        const supplier_id = res?.data?.Header?.supplierid;
        const currency_id = res?.data?.Header?.currencyid;
        // const prList = await GetCommonProcurementPRNoList(supplier_id,orgId,branchId);
        const prList = await GetPRNoBySupplierAndCurrency(supplier_id, currency_id, orgId, branchId);
        if (res.status) {
            let requisition = res.data.Requisition || [];

            if (prList?.data?.length > 0) {
                requisition = requisition.map((r) => {
                    const pr = prList?.data?.find((p) => p.prid === r.prid);
                    return {
                        ...r,
                        PR_NUMBER: pr ? pr.pr_number : "NA",
                        PRDisplay: pr ? pr.pr_number : "NA",
                    };
                });
            } else {
                requisition = requisition.map((r) => ({
                    ...r,
                    PR_NUMBER: "NA",
                    PRDisplay: "NA",
                }));
            }

            // Collect unique PR numbers for header concat
            let headerPRNumbers = [
                ...new Set(requisition.map((r) => r.prnumber).filter(Boolean)),
            ].join(", ");

            // Extract PR IDs in same order (for clicking)
            const prIdsInOrder = requisition
                .map(r => r.prid)
                .filter(id => id > 0);

            if (!headerPRNumbers) headerPRNumbers = "NA";

            setSelectedDetail({
                ...res.data,
                Header: {
                    ...res.data.Header,
                    PRConcat: headerPRNumbers, // header field with PR numbers
                    PRIdsList: prIdsInOrder,
                },
                Details: requisition, // requisition rows are the detail lines
            });

            setDetailVisible(true);

            // if you later add attachments for PO
            // setPreviewUrl(res.data.Header.filepath || "");
            // setFileName(res.data.Header.filename || "");
        } else {
            Swal.fire("Error", "Data is not available", "error");
        }
    };

    const actionclaimBodyTemplate = (rowData) => {
        return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
            onClick={() => handleShowDetails(rowData)}>{rowData.pono}</span>;
    };

    const fetchPOPrint = async (poid) => {
        const response = await GetPurchaseOrderPrint(poid, 1, 1);
        if (response && response.status !== false) {
            // Fetch Linked PR details to get Payment Term
            // Fetch Linked PR details to get Payment Term
            try {
                // Get PO Details to find linked PR
                const poRes = await GetByIdPurchaseOrder(poid, 1, 1);
                if (poRes?.status && poRes?.data?.Requisition?.length > 0) {
                    const firstPrId = poRes.data.Requisition[0].prid;
                    if (firstPrId) {
                        // Get PR Details
                        const prRes = await GetByIdPurchaseRequisition(firstPrId, 1, 1);
                        if (prRes?.status && prRes?.data?.Header) {
                            // Use PaymentTermName as seen in PR Details modal, fallback to others
                            const prPaymentTerm = prRes.data.Header.PaymentTermName || prRes.data.Header.paymentterm || prRes.data.Header.PaymentTerm;
                            if (prPaymentTerm) {
                                // Inject into poData header for display
                                response.data.header[0].PaymentTerm = prPaymentTerm;
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch PR Payment Term for Print", err);
            }

            setPoData(response.data); // store API response
            setPoModalVisible(true);  // open modal
        } else {
            console.error("Failed to fetch PO Print");
        }
    };

    //    const actionPOPrintBodyTemplate = (rowData) => {
    //         return (
    //             <span
    //             style={{ cursor: "pointer", color: "blue" }}
    //             className="btn-rounded btn btn-link"
    //             onClick={() => fetchPOPrint(rowData.poid)}
    //             >
    //             {rowData.pono}
    //             </span>
    //         );
    //     };

    const actionPOPrintBodyTemplate = (rowData) => {
        return (
            <button
                className="btn btn-success"
                style={{ cursor: "pointer", color: "white" }}
                onClick={() => fetchPOPrint(rowData.poid)}
            >
                <i className="bx bx-printer" style={{ color: "white" }}></i>
            </button>
        );
    };

    // Cancel PO handler - only for user 135
    // This will cancel the PO and reset PR approval status
    const handleDeletePO = async (rowData) => {
        Swal.fire({
            title: "Are you sure?",
            text: `This will cancel PO: ${rowData.pono} and reset the PR approval status. The PR will need to be approved again.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#d33",
            cancelButtonColor: "#3085d6",
            confirmButtonText: "Yes, cancel it!"
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // Call cancel PO API - this will cancel PO and reset PR approval
                    const response = await axios.post(
                        `${process.env.REACT_APP_API_DNAP_URL}/api/PurchaseOrder/CancelPO`,
                        {
                            poid: rowData.poid,
                            userId: UserData?.u_id,
                            branchId: branchId,
                            orgId: orgId
                        }
                    );
                    if (response.data.status || response.status === 200) {
                        Swal.fire("Cancelled!", "Purchase Order has been cancelled and PR approval has been reset.", "success");
                        // Refresh the list
                        const result = await GetAllPurchaseOrderList(0, branchId, 0, orgId, UserData?.u_id);
                        setPurchaseOrders(Array.isArray(result.data) ? result.data : []);
                    } else {
                        Swal.fire("Error", response.data.message || "Failed to cancel PO.", "error");
                    }
                } catch (error) {
                    console.error("Error cancelling PO:", error);
                    Swal.fire("Error", "Failed to cancel Purchase Order.", "error");
                }
            }
        });
    };

    // Delete button template - only visible to user 135
    // Enabled when PO is created, disabled if GRN is raised
    const actionDeleteBodyTemplate = (rowData) => {
        // Only show for user ID 135
        if (UserData?.u_id !== 135) {
            return null;
        }

        // Debug: Log the rowData to see available fields
        console.log("PO Row Data for delete check:", rowData);

        // Check if GRN is raised for this PO - check multiple possible field names
        // isgrnraised = 1 means GRN created, 0 means no GRN
        const isGrnRaised =
            rowData.isgrnraised === 1 ||
            rowData.IsGrnRaised === 1 ||
            rowData.IsGRNRaised === 1 ||
            rowData.isGrnRaised === 1 ||
            rowData.ISGRNRAISED === 1 ||
            rowData.grnraised === 1 ||
            rowData.GrnRaised === 1;

        return (
            <button
                className={`btn ${isGrnRaised ? 'btn-secondary' : 'btn-danger'}`}
                style={{ cursor: isGrnRaised ? "not-allowed" : "pointer", color: "white" }}
                onClick={() => !isGrnRaised && handleDeletePO(rowData)}
                disabled={isGrnRaised}
                title={isGrnRaised ? "Cannot delete - GRN already created" : "Delete PO"}
            >
                <i className="bx bx-trash" style={{ color: "white" }}></i>
            </button>
        );
    };

    // const handlePrint = () => {
    //     if (printRef.current) {
    //         const printContents = printRef.current.innerHTML;
    //         const newWin = window.open("", "Print-Window");
    //         newWin.document.open();
    //         newWin.document.write(`
    //             <html>
    //             <head>
    //                 <title>Purchase Order</title>
    //                 <style>
    //                     body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #000; }
    //                     .po-title { text-align: center; font-size: 20px; font-weight: bold; margin: 10px 0; text-decoration: underline; }
    //                     table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 13px; }
    //                     th, td { border: 1px solid #000; padding: 6px; text-align: left; }
    //                     th { background: #f2f2f2; }
    //                     .signatures-totals { width: 100%; margin-top: 20px; display: flex; justify-content: space-between; }
    //                     .signatures { width: 50%; text-align: center; }
    //                     .totals { width: 45%; }
    //                     .totals div { display: flex; justify-content: space-between; margin: 2px 0; }
    //                     .totals div strong { font-weight: bold; }
    //                 </style>
    //             </head>
    //             <body onload="window.print(); setTimeout(() => window.close(), 100);">
    //                 ${printContents}
    //             </body>
    //             </html>
    //         `);
    //         newWin.document.close();
    //     }
    // };

    const handlePrint = async () => {
        if (!printRef.current) return;

        const scale = 2;
        const canvas = await html2canvas(printRef.current, {
            scale,
            useCORS: true,
            scrollY: -window.scrollY,
        });

        const pdf = new jsPDF("l", "mm", "a4");
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();

        const marginTop = 10;
        const marginBottom = 10;
        const marginLeft = 10;
        const marginRight = 10;

        const usableWidth = pageWidth - marginLeft - marginRight;
        const usableHeight = pageHeight - marginTop - marginBottom;

        const pxPerMM = canvas.width / pageWidth;
        const usableHeightPx = usableHeight * pxPerMM;

        // Get dynamic row height
        let rowHeightPx = 24; // fallback
        const table = printRef.current.querySelector("table");
        if (table) {
            const firstRow = table.querySelector("tr");
            if (firstRow) {
                rowHeightPx = firstRow.getBoundingClientRect().height * scale;
            }
        }

        // Measure height of header (logo + title + info block)
        let headerHeightPx = 0;
        const headerDiv = printRef.current.querySelector("div");
        if (headerDiv) {
            const rect = headerDiv.getBoundingClientRect();
            headerHeightPx = rect.height * scale;
        }

        // Determine first page content height to avoid cutting first row
        const firstPageHeightPx = usableHeightPx - (usableHeightPx % rowHeightPx);

        let position = 0;
        let pageCount = 0;

        while (position < canvas.height) {
            let sliceHeight;

            // On first page, slice from top to fit header + as many full rows as possible
            if (pageCount === 0) {
                const adjustedHeight = usableHeightPx - (headerHeightPx % rowHeightPx);
                sliceHeight = Math.min(adjustedHeight, canvas.height - position);
            } else {
                sliceHeight = Math.min(usableHeightPx - (usableHeightPx % rowHeightPx), canvas.height - position);
            }

            const pageCanvas = document.createElement("canvas");
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeight;

            const ctx = pageCanvas.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

            ctx.drawImage(
                canvas,
                0,
                position,
                canvas.width,
                sliceHeight,
                0,
                0,
                canvas.width,
                sliceHeight
            );

            const imgData = pageCanvas.toDataURL("image/png");
            if (pageCount > 0) pdf.addPage();
            const imgWidth = usableWidth;
            const imgHeight = (sliceHeight * imgWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", marginLeft, marginTop, imgWidth, imgHeight);

            position += sliceHeight;
            pageCount++;
        }

        const blobUrl = pdf.output("bloburl");
        const iframe = document.createElement("iframe");
        iframe.style.position = "fixed";
        iframe.style.width = "0";
        iframe.style.height = "0";
        iframe.style.border = "0";
        iframe.src = blobUrl;
        document.body.appendChild(iframe);

        iframe.onload = () => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
        };
    };



    const calculateTotals = (items) => {
        let subtotal = 0,
            discount = 0,
            tax = 0,
            vat = 0,
            total = 0,
            totalamount = 0;

        items.forEach((item) => {
            subtotal += item.subtotal || 0;
            discount += item.discountvalue || 0;
            tax += item.taxvalue || 0;
            vat += item.vatvalue || 0;
            total += item.nettotal || 0;
            totalamount += item.totalamount || 0;
        });

        return { subtotal, discount, tax, vat, total, totalamount };
    };

    const currency =
        poData?.items.length > 0 && poData?.items[0].currencycode
            ? poData?.items[0].currencycode
            : "";


    const handlePonoClick = async (pono) => {
        if (!pono || pono === "NA" || !String(pono).trim()) {
            Swal.fire("Info", "No PO Reference available", "info");
            return;
        }

        const cleanPono = String(pono).trim();

        // Find poid from poOptions (already loaded)
        const poOption = poOptions.find(opt =>
            String(opt.value).trim() === cleanPono
        );

        if (!poOption?.poid) {
            Swal.fire({
                icon: "warning",
                title: "PO Not Found",
                text: `Cannot open PO "${cleanPono}". It may not be loaded yet or doesn't exist.`,
                footer: "Try refreshing the page."
            });
            return;
        }

        try {
            // DO NOT close PR modal → just open PO modal on top
            const res = await GetByIdPurchaseOrder(poOption.poid, orgId, branchId);

            if (res?.status) {
                const supplier_id = res.data?.Header?.supplierid;
                const currency_id = res.data?.Header?.currencyid;
                const prList = await GetPRNoBySupplierAndCurrency(supplier_id, currency_id, orgId, branchId);

                let requisition = res.data.Requisition || [];
                if (prList?.data?.length > 0) {
                    requisition = requisition.map(r => {
                        const pr = prList.data.find(p => p.prid === r.prid);
                        return { ...r, prnumber: pr ? pr.pr_number : "NA" };
                    });
                }

                const headerPRNumbers = [...new Set(requisition.map(r => r.prnumber).filter(Boolean))].join(", ") || "NA";

                setSelectedPODetail({
                    ...res.data,
                    Header: {
                        ...res.data.Header,
                        PRConcat: headerPRNumbers
                    },
                    Requisition: requisition
                });

                setPoDetailVisible(true); // Only open PO modal
            } else {
                Swal.fire("Error", "PO details not available", "error");
            }
        } catch (err) {
            console.error("Failed to load PO:", err);
            Swal.fire("Error", "Could not load Purchase Order", "error");
        }
    };

    // And cancelFilter includes:
    // setSelectedFilterType([]);

    return (
        <>
            <style>
                {`
                    .custom-column-multiselect .p-checkbox {
                        width: 16px;
                        height: 16px;
                    }
                    .custom-column-multiselect .p-checkbox .p-checkbox-box {
                        width: 16px;
                        height: 16px;
                    }
                    .custom-column-multiselect .p-checkbox .p-checkbox-icon {
                        font-size: 10px;
                    }
                    .custom-column-multiselect .p-multiselect-header .p-multiselect-select-all {
                        display: flex;
                        align-items: center;
                        width: auto !important;
                    }
                    .custom-column-multiselect .p-multiselect-header .p-multiselect-select-all::after {
                        content: "Select All";
                        margin-left: 8px;
                        font-size: 13px;
                        color: #495057;
                    }
                `}
            </style>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Procurement" breadcrumbItem="Purchase Order" />

                    <Row>
                        <Card className="search-top">
                            {/* Updated Header box for new filters to comfortably span */}
                            <div className="p-3">
                                <Row className="align-items-end g-3 mb-3">
                                    <Col lg={3} md={6} sm={12}>
                                        <Label htmlFor="Search_Type" className="form-label mb-1">Search By</Label>
                                        <Select
                                            name="filtertype"
                                            isMulti
                                            options={FilterTypes.map(f => ({ label: f.name, value: f.value }))}
                                            placeholder="Select Filter Types"
                                            classNamePrefix="select"
                                            isClearable
                                            value={selectedFilterType}
                                            onChange={(selected) => setSelectedFilterType(selected || [])}
                                        />
                                    </Col>

                                    {/* Selectively render inputs based on 'Search By' selection */}
                                    {selectedFilterType?.some(f => f.value === "pono") && (
                                        <Col lg={3} md={6} sm={12}>
                                            <Label className="form-label mb-1">PO No</Label>
                                            <Select
                                                name="filterPoNo"
                                                options={getDropdownOptions('pono')}
                                                placeholder="Search PO No"
                                                classNamePrefix="select"
                                                isClearable
                                                isSearchable
                                                value={filterPoNo}
                                                onChange={(selected) => setFilterPoNo(selected)}
                                            />
                                        </Col>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "suppliername") && (
                                        <Col lg={3} md={6} sm={12}>
                                            <Label className="form-label mb-1">Supplier</Label>
                                            <Select
                                                name="filterSupplier"
                                                options={getDropdownOptions('suppliername')}
                                                placeholder="Search Supplier"
                                                classNamePrefix="select"
                                                isClearable
                                                isSearchable
                                                value={filterSupplier}
                                                onChange={(selected) => setFilterSupplier(selected)}
                                            />
                                        </Col>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "CurrencyCode") && (
                                        <Col lg={3} md={6} sm={12}>
                                            <Label className="form-label mb-1">Currency</Label>
                                            <Select
                                                name="filterCurrency"
                                                options={getDropdownOptions('CurrencyCode')}
                                                placeholder="Search Currency"
                                                classNamePrefix="select"
                                                isClearable
                                                isSearchable
                                                value={filterCurrency}
                                                onChange={(selected) => setFilterCurrency(selected)}
                                            />
                                        </Col>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "podate") && (
                                        <>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">PO Date From</Label>
                                                <Input
                                                    type="date"
                                                    value={filterPoDateFrom}
                                                    onChange={(e) => setFilterPoDateFrom(e.target.value)}
                                                />
                                            </Col>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">PO Date To</Label>
                                                <Input
                                                    type="date"
                                                    value={filterPoDateTo}
                                                    onChange={(e) => setFilterPoDateTo(e.target.value)}
                                                    min={filterPoDateFrom}
                                                />
                                            </Col>
                                        </>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "totalamount") && (
                                        <>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">Total Amount Start</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Min Amount"
                                                    value={filterAmountFrom}
                                                    onChange={(e) => setFilterAmountFrom(e.target.value)}
                                                />
                                            </Col>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">Total Amount End</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Max Amount"
                                                    value={filterAmountTo}
                                                    onChange={(e) => setFilterAmountTo(e.target.value)}
                                                />
                                            </Col>
                                        </>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "CreatedDate") && (
                                        <>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">Created Date From</Label>
                                                <Input
                                                    type="date"
                                                    value={filterCreatedDateFrom}
                                                    onChange={(e) => setFilterCreatedDateFrom(e.target.value)}
                                                />
                                            </Col>
                                            <Col lg={3} md={6} sm={12}>
                                                <Label className="form-label mb-1">Created Date To</Label>
                                                <Input
                                                    type="date"
                                                    value={filterCreatedDateTo}
                                                    onChange={(e) => setFilterCreatedDateTo(e.target.value)}
                                                    min={filterCreatedDateFrom}
                                                />
                                            </Col>
                                        </>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "createdbyName") && (
                                        <Col lg={3} md={6} sm={12}>
                                            <Label className="form-label mb-1">Created By</Label>
                                            <Select
                                                name="filterCreatedBy"
                                                options={getDropdownOptions('createdbyName')}
                                                placeholder="Search Creator"
                                                classNamePrefix="select"
                                                isClearable
                                                isSearchable
                                                value={filterCreatedBy}
                                                onChange={(selected) => setFilterCreatedBy(selected)}
                                            />
                                        </Col>
                                    )}

                                    {selectedFilterType?.some(f => f.value === "itemname") && (
                                        <Col lg={3} md={6} sm={12}>
                                            <Label className="form-label mb-1">Item Name</Label>
                                            <Select
                                                name="filterItemName"
                                                options={allItemsForFilter}
                                                placeholder="Search Item Name"
                                                classNamePrefix="select"
                                                isClearable
                                                isSearchable
                                                value={filterItemName}
                                                onChange={(selected) => setFilterItemName(selected)}
                                            />
                                        </Col>
                                    )}
                                </Row>
                                <Row className="align-items-end g-3">
                                    <Col lg={3} md={6} sm={12}>
                                        <Label htmlFor="Column_Toggle" className="form-label mb-1">Column</Label>
                                        <MultiSelect
                                            value={visibleColumns}
                                            options={columns}
                                            optionLabel="header"
                                            onChange={(e) => setVisibleColumns(e.value)}
                                            className="w-100"
                                            panelClassName="custom-column-multiselect"
                                            maxSelectedLabels={0}
                                            selectedItemsLabel="{0} items selected"
                                            style={{ height: '36px', minHeight: '36px', display: 'flex', alignItems: 'center', fontSize: '13px', padding: '0px 2px', lineHeight: '1' }}
                                        />
                                    </Col>

                                    <Col lg={9} md={6} sm={12} className="d-flex justify-content-end flex-wrap gap-2">
                                        <button type="button" className="btn btn-warning w-xs" onClick={fetchAdvancedData} disabled={isAdvancedLoading} style={{ width: "auto" }}>
                                            {isAdvancedLoading ? <i className="bx bx-loader bx-spin font-size-16 align-middle me-2"></i> : <i className="bx bx-list-ul label-icon font-size-16 align-middle me-2"></i>} ADVANCED SEARCH
                                        </button>
                                        <button type="button" className="btn btn-info w-xs" onClick={searchData}>
                                            <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search
                                        </button>
                                        <button type="button" className="btn btn-danger w-xs" onClick={cancelFilter}>
                                            <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Cancel
                                        </button>
                                        <button type="button" className="btn btn-success w-xs" onClick={linkAddPurchaseOrder}>
                                            <i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i>New
                                        </button>
                                    </Col>
                                </Row>
                            </div>
                        </Card>
                    </Row>

                    <Row>
                        <Col lg="12">
                            {isAdvancedSearch ? (
                                <Card>
                                    <div className="p-4" style={{ overflowX: "auto" }}>
                                        <table className="table table-bordered table-sm m-0" style={{ fontSize: "12px", borderColor: "#dee2e6", minWidth: "1200px", verticalAlign: "middle" }}>
                                            <thead style={{ backgroundColor: "#0069aa", color: "white" }}>
                                                <tr>
                                                    <th className="fw-bold align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>No.</th>
                                                    <th className="fw-bold" style={{ backgroundColor: "#0069aa", color: "white" }}>PO Date<br /><span className="fw-normal" style={{ color: "#d9e9fa" }}>Required Date</span></th>
                                                    <th className="fw-bold align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>PO No</th>
                                                    <th className="fw-bold" style={{ backgroundColor: "#0069aa", color: "white", width: "25%" }}>Supplier<br /><span className="fw-normal" style={{ color: "#d9e9fa" }}>Part Description</span></th>
                                                    <th className="fw-bold" style={{ backgroundColor: "#0069aa", color: "white", minWidth: "100px" }}>Payment Term<br /><span className="fw-normal" style={{ color: "#d9e9fa" }}>Unit</span></th>
                                                    <th className="fw-bold text-center align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>Qty</th>
                                                    <th className="fw-bold text-center align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>Ordered</th>
                                                    <th className="fw-bold text-center align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>Received</th>
                                                    <th className="fw-bold text-end align-middle" style={{ backgroundColor: "#0069aa", color: "white" }}>Unit Price</th>
                                                    <th className="fw-bold text-end" style={{ backgroundColor: "#0069aa", color: "white", minWidth: "100px" }}>Sub Total<br /><span className="fw-normal" style={{ color: "#d9e9fa" }}>Amount</span></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {advancedData.map((poData, idx) => {
                                                    const isExpanded = advancedExpandedRows[idx];
                                                    return (
                                                        <React.Fragment key={idx}>
                                                            {/* Main PO Row */}
                                                            <tr>
                                                                <td className="align-middle">
                                                                    {idx + 1}.
                                                                    <i
                                                                        className={`bx ${isExpanded ? 'bx-minus' : 'bx-plus'} ms-2 text-primary`}
                                                                        style={{ cursor: 'pointer', border: '1px solid #556ee6', borderRadius: '2px', padding: '1px' }}
                                                                        onClick={() => setAdvancedExpandedRows(prev => ({ ...prev, [idx]: !prev[idx] }))}
                                                                        title={isExpanded ? "Collapse" : "Expand"}
                                                                    ></i>
                                                                </td>
                                                                <td className="align-middle">{formatDate(poData.header.podate)}</td>
                                                                <td className="align-middle">{poData.header.pono}</td>
                                                                <td className="align-middle fw-bold">{poData.header.suppliername}</td>
                                                                <td className="align-middle">{(poData.header.PaymentTerm || poData.header.paymentterm || "90 Days").split('-').pop().trim()}</td>
                                                                <td></td>
                                                                <td></td>
                                                                <td></td>
                                                                <td></td>
                                                                <td className="text-end fw-bold align-middle">{poData.header.totalamount?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                            </tr>

                                                            {/* Details Rows */}
                                                            {isExpanded && poData.details.map((item, idetail) => {
                                                                const itemTotal = item.nettotal || item.totalvalue || (item.qty * item.unitprice) || 0;
                                                                return (
                                                                    <tr key={idetail}>
                                                                        <td></td>
                                                                        <td className="align-middle">{formatDate(poData.header.podate)}</td>
                                                                        <td></td>
                                                                        <td className="align-middle">{item.itemdescription || item.itemname}</td>
                                                                        <td className="align-middle">{item.UOM || item.uom || item.UOMName || "CYL"}</td>
                                                                        <td className="align-middle text-center">{item.qty}</td>
                                                                        <td className="align-middle text-center">{item.qty}</td>
                                                                        <td className="align-middle text-center">{item.qty}</td>
                                                                        <td className="align-middle text-end">{item.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                                        <td className="align-middle text-end">{itemTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                                                    </tr>
                                                                )
                                                            })}
                                                        </React.Fragment>
                                                    )
                                                })}
                                                {/* Grand Total Row */}
                                                <tr className="bg-light">
                                                    <td colSpan={8}></td>
                                                    <td className="text-end fw-bold">Grand Total</td>
                                                    <td className="text-end fw-bold">
                                                        {advancedData.reduce((sum, po) => sum + (po.header.totalamount || 0), 0)?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            ) : (
                                <Card>
                                    <DataTable
                                        value={purchaseOrders}
                                        paginator
                                        showGridlines
                                        rows={20}
                                        loading={isLoading}
                                        dataKey="poid"
                                        filters={filters}
                                        globalFilterFields={['pono', 'podate', 'requestorname', 'suppliername', 'CreatedDate', 'createdbyName', 'CurrencyCode', 'totalamount', 'Status']}
                                        emptyMessage="No suppliers found."
                                        header={header}
                                        onFilter={(e) => setFilters(e.filters)}
                                        className="blue-bg"
                                    >
                                        {visibleColumns.find(col => col.field === 'pono') && <Column
                                            field="pono"
                                            header="PO No"
                                            filter
                                            filterPlaceholder="Search by PO NO"
                                            className="text-left"
                                            style={{ width: "10%" }}
                                            body={actionclaimBodyTemplate}
                                        />}
                                        {visibleColumns.find(col => col.field === 'podate') && <Column
                                            field="podate"
                                            header="PO Date"
                                            filter
                                            filterPlaceholder="Search by PO Date"
                                            className="text-center"
                                            style={{ width: "10%" }}
                                        />}
                                        {/* <Column
                                        field="requestorname"
                                        header="Requestor"
                                        filter
                                        filterPlaceholder="Search by Requestor"
                                        className="text-left"
                                    /> */}
                                        {visibleColumns.find(col => col.field === 'suppliername') && <Column
                                            field="suppliername"
                                            header="Supplier"
                                            filter
                                            filterPlaceholder="Search by Supplier"
                                            className="text-left"
                                        />}
                                        {visibleColumns.find(col => col.field === 'CurrencyCode') && <Column
                                            field="CurrencyCode"
                                            header="Currency"
                                            filter
                                            filterPlaceholder="Search by Currency"
                                            className="text-left"
                                        />}

                                        {visibleColumns.find(col => col.field === 'totalamount') && <Column style={{ textAlign: "right" }} field="totalamount" header="Total Amount"
                                            body={(rowData) =>
                                                rowData.totalamount?.toLocaleString('en-US', {
                                                    style: 'decimal',
                                                    minimumFractionDigits: 2
                                                })
                                            } />}

                                        {visibleColumns.find(col => col.field === 'CreatedDate') && <Column
                                            field="CreatedDate"
                                            header="Created Date"
                                            filter
                                            filterPlaceholder="Search by created date"
                                            className="text-left"
                                        />}
                                        {visibleColumns.find(col => col.field === 'createdbyName') && <Column
                                            field="createdbyName"
                                            header="Created By"
                                            filter
                                            filterPlaceholder="Search by created by"
                                            className="text-left"
                                        />}

                                        {/* <Column
                                        field="totalamount"
                                        header="Total Amount"

                                        // filter
                                        className="text-lg-end"
                                        // filterPlaceholder="Search by TotalAmt"
                                        style={{ width: "15%" }}
                                    /> */}
                                        <Column
                                            field="Status"
                                            header="Status"
                                            filterMenuStyle={{ width: '14rem' }}
                                            body={statusBodyTemplate}
                                            // filter
                                            // filterElement={statusFilterTemplate}
                                            className="text-center"
                                            style={{ width: "10%" }}
                                        />
                                        {/* <Column
                                        header="Action"
                                        showFilterMatchModes={false}
                                        body={actionBodyTemplate}
                                        className="text-center"
                                        style={{ width: "8%" }}
                                    /> */}
                                        <Column field="id" header="Print" showFilterMatchModes={false}
                                            // body={(rowData) => <SQPrintColumn sqid={rowData.id} />}
                                            body={actionPOPrintBodyTemplate}
                                            // body={(rowData) => <POPrintColumn poid={rowData.poid} />}
                                            className="text-center"
                                            style={{ width: "5%" }}
                                        />
                                        {/* Delete column - only visible to user 135 */}
                                        {UserData?.u_id === 135 && (
                                            <Column
                                                field="delete"
                                                header="Delete"
                                                showFilterMatchModes={false}
                                                body={actionDeleteBodyTemplate}
                                                className="text-center"
                                                style={{ width: "5%" }}
                                            />
                                        )}
                                    </DataTable>
                                </Card>
                            )}
                        </Col>
                    </Row>

                </Container>
            </div>

            {/* Confirmation Modal */}
            <Modal isOpen={isModalOpen2} toggle={() => setIsModalOpen2(false)} centered tabIndex="1">
                <ModalBody className="py-3 px-5">
                    <Row>
                        <Col lg={12}>
                            <div className="text-center">
                                <i className="mdi mdi-alert-circle-outline" style={{ fontSize: "9em", color: "orange" }} />
                                <h4>Do you want to {txtStatus} this item?</h4>
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <div className="text-center mt-3 button-items">
                                <Button className="btn btn-info" color="success" size="lg" onClick={onSwitchChange}>
                                    Yes
                                </Button>
                                <Button color="danger" size="lg" className="btn btn-danger" onClick={() => setIsModalOpen2(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </ModalBody>
            </Modal>

            {/* New Pallet Modal */}
            <Modal isOpen={isModalOpen} role="dialog" autoFocus centered className="exampleModal" tabIndex="-1" toggle={toggleModal} size="xl">
                <div className="modal-content">
                    <ModalHeader toggle={toggleModal} className="bg-model-hd">New Pallet</ModalHeader>
                    <ModalBody>
                        <Row>
                            <Col lg="12">
                                <Card>
                                    <CardBody>
                                        <Formik
                                            initialValues={{ gasCode: "", containerType: "", palletname: "" }}
                                            validationSchema={validationSchema}
                                            onSubmit={handleSubmit}
                                        >
                                            {({ errors, touched, setFieldValue, setFieldTouched, values }) => (
                                                <Form>
                                                    <Row>
                                                        <Col md="4">
                                                            <FormGroup>
                                                                <Label htmlFor="palletname" className="required-label">Pallet Name</Label>
                                                                <Field
                                                                    name="palletname"
                                                                    className={`form-control ${errors.palletname && touched.palletname ? "is-invalid" : ""}`}
                                                                />
                                                                <ErrorMessage name="palletname" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md="4">
                                                            <FormGroup>
                                                                <Label htmlFor="containerType" className="required-label">Container Type</Label>
                                                                <Select
                                                                    name="containerType"
                                                                    options={ContainerList}
                                                                    value={ContainerList.find(option => option.value === values.containerType)}
                                                                    onChange={option => {
                                                                        setFieldValue("containerType", option ? option.value : "");
                                                                        setFieldTouched("containerType", true);
                                                                        handleContainerTypeChange(option);
                                                                    }}
                                                                    onBlur={() => setFieldTouched("containerType", true)}
                                                                    className={errors.containerType && touched.containerType ? "select-invalid" : ""}
                                                                    classNamePrefix="select"
                                                                    isDisabled={isDisabled}
                                                                    isLoading={isLoading}
                                                                    isClearable={isClearable}
                                                                    isRtl={isRtl}
                                                                    isSearchable={isSearchable}
                                                                />
                                                                <ErrorMessage name="containerType" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md="4">
                                                            <FormGroup>
                                                                <Label htmlFor="gasCode" className="required-label">Gas Code</Label>
                                                                <Select
                                                                    name="gasCode"
                                                                    options={GasCodeList}
                                                                    value={GasCodeList.find(option => option.value === values.gasCode)}
                                                                    onChange={option => {
                                                                        setFieldValue("gasCode", option ? option.value : "");
                                                                        setFieldTouched("gasCode", true);
                                                                    }}
                                                                    onBlur={() => setFieldTouched("gasCode", true)}
                                                                    className={errors.gasCode && touched.gasCode ? "select-invalid" : ""}
                                                                    classNamePrefix="select"
                                                                    isDisabled={isDisabled}
                                                                    isLoading={isLoading}
                                                                    isClearable={isClearable}
                                                                    isRtl={isRtl}
                                                                    isSearchable={isSearchable}
                                                                />
                                                                <ErrorMessage name="gasCode" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md="12">
                                                            <Table className="table-nowrap mb-0">
                                                                <thead style={{ backgroundColor: "#3e90e2" }}>
                                                                    <tr>
                                                                        <th>S.No</th>
                                                                        <th>Cylinder Name</th>
                                                                        <th>Ownership</th>
                                                                        <th>Bar code</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {cylinderTableData.length > 0 ? (
                                                                        cylinderTableData.map((row, index) => (
                                                                            <tr key={index}>
                                                                                <td>{row.id}</td>
                                                                                <td>
                                                                                    <Field name={`cylinders[${index}].category`} as="select" className="form-control">
                                                                                        <option>Paid</option>
                                                                                        <option>Chargeback</option>
                                                                                        <option>Refund</option>
                                                                                    </Field>
                                                                                </td>
                                                                                <td>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="form-control"
                                                                                        value={row.ownership}
                                                                                        readOnly
                                                                                    />
                                                                                </td>
                                                                                <td>
                                                                                    <input
                                                                                        type="text"
                                                                                        className="form-control"
                                                                                        value={row.barCode}
                                                                                        readOnly
                                                                                    />
                                                                                </td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        <tr>
                                                                            <td colSpan="4" className="text-center">No data available</td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </Table>
                                                        </Col>
                                                    </Row>

                                                    <div className="row align-items-center g-3 justify-content-end">
                                                        <div className="col-md-12 text-end button-items">
                                                            <Button type="submit" className="btn btn-info">
                                                                <i className="bx bxs-save label-icon font-size-16 align-middle me-2"></i> Save
                                                            </Button>
                                                            <Button type="button" className="btn btn-danger" onClick={toggleModal}>
                                                                <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Form>
                                            )}
                                        </Formik>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    </ModalBody>
                </div>
            </Modal>

            <Modal isOpen={detailVisible} toggle={() => setDetailVisible(false)} size="xl">
                <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', top: '15px', right: '50px', fontWeight: 'bold', color: '#333', fontSize: '12px', zIndex: 10 }}>F-BTG-PUR-06 (Rev.01)</span>
                    <ModalHeader toggle={() => setDetailVisible(false)}>Purchase Order Details</ModalHeader>
                </div>
                <ModalBody>
                    {selectedDetail && (
                        <>
                            {/* PO Header Section */}
                            <Row form>
                                {[
                                    ["PO No.", selectedDetail.Header?.pono],
                                    ["PO Date", formatDate(selectedDetail.Header?.podate)],
                                    ["Supplier", selectedDetail.Header?.suppliername],
                                    ["Currency", selectedDetail.Header?.currencycode],
                                    ["PR No.", selectedDetail.Header?.PRConcat], // concat of all PRs
                                ].map(([label, val], i) => (
                                    // <Col md="4" key={i} className="form-group row ">
                                    //     <Label className="col-sm-5 col-form-label bold">{label}</Label>
                                    //     <Col sm="7" className="mt-2">: {val}</Col>
                                    // </Col>
                                    <Col md="4" key={i} className="form-group row">
                                        <Label className="col-sm-5 col-form-label bold">{label}</Label>
                                        <Col sm="7" className="mt-2">
                                            :{" "}
                                            {label === "Supplier" ? (
                                                <b>{val || "N/A"}</b>
                                            ) : label === "Currency" ? (
                                                <span style={{ color: "green", fontWeight: "bold" }}>{val || "N/A"}</span>
                                            ) : label === "PR No." ? (
                                                (() => {
                                                    // Safely get the values
                                                    const prConcat = selectedDetail.Header?.PRConcat || "";

                                                    // Build a mapping of PR number -> PR ID from Requisition data
                                                    const prIdMap = {};
                                                    if (selectedDetail.Requisition && Array.isArray(selectedDetail.Requisition)) {
                                                        selectedDetail.Requisition.forEach(req => {
                                                            if (req.prnumber && req.prid) {
                                                                prIdMap[req.prnumber.trim()] = req.prid;
                                                            }
                                                        });
                                                    }
                                                    console.log("DEBUG: PR ID Map:", prIdMap);

                                                    if (!prConcat || prConcat === "NA" || prConcat.trim() === "") {
                                                        return "N/A";
                                                    }

                                                    const prNumbers = prConcat.split(","); // Safe now

                                                    return (
                                                        <span>
                                                            {prNumbers.map((prNumber, index) => {
                                                                const cleanPR = prNumber.trim();
                                                                if (!cleanPR) return null;

                                                                // Look up the PR ID from our mapping
                                                                const prid = prIdMap[cleanPR];
                                                                const isLast = index === prNumbers.length - 1;

                                                                return (
                                                                    <span key={index}>
                                                                        {prid ? (
                                                                            <a
                                                                                href="#"
                                                                                style={{
                                                                                    color: "#007bff",
                                                                                    textDecoration: "underline",
                                                                                    cursor: "pointer",
                                                                                }}
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    console.log("DEBUG: Clicking PR:", cleanPR, "with ID:", prid);
                                                                                    handlePRClick(prid); // Opens correct PR
                                                                                }}
                                                                                title={`View ${cleanPR}`}
                                                                            >
                                                                                {cleanPR}
                                                                            </a>
                                                                        ) : (
                                                                            <span style={{ color: "#666" }}>{cleanPR}</span>
                                                                        )}
                                                                        {!isLast && ", "}
                                                                    </span>
                                                                );
                                                            })}
                                                        </span>
                                                    );
                                                })()
                                            ) : (
                                                val || "N/A"
                                            )}
                                        </Col>
                                    </Col>
                                ))}
                            </Row>

                            <hr />

                            <DataTable value={selectedDetail.Requisition}>
                                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                                <Column field="prnumber" header="PR No." />
                                <Column field="groupname" header="Item Group" />
                                <Column field="itemname" header="Item Name" />


                                <Column
                                    field="qty"
                                    header="Qty"
                                    body={(rowData) =>
                                        rowData.qty?.toLocaleString("en-US", { minimumFractionDigits: 3 })
                                    }
                                // footer={selectedDetail.Header?.subtotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />
                                <Column field="uom" header="UOM" />
                                <Column
                                    field="unitprice"
                                    header="Unit Price"
                                    body={(rowData) =>
                                        rowData.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedDetail.Header?.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column
                                    field="discountvalue"
                                    header="Discount"
                                    body={(rowData) =>
                                        rowData.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedDetail.Header?.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column field="taxperc" header="Tax %" />

                                <Column
                                    field="taxvalue"
                                    header="Tax Amt"
                                    body={(rowData) =>
                                        rowData.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedDetail.Header?.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column field="vatperc" header="VAT %" />

                                <Column
                                    field="vatvalue"
                                    header="VAT Amt"
                                    body={(rowData) =>
                                        rowData.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    footer={selectedDetail.Header?.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                />

                                <Column
                                    field="nettotal"
                                    header="Total Amt"
                                    body={(rowData) =>
                                        <span style={{ color: "#ff5a00" }}>{rowData.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                    }
                                    bodyStyle={{ color: "#ff5a00" }}
                                    footer={<b style={{ color: "#ff5a00" }}>{selectedDetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>}
                                    footerStyle={{ color: "#ff5a00" }}
                                />
                            </DataTable>

                        </>
                    )}
                </ModalBody>

                <ModalFooter>
                    <button type="button" className="btn btn-danger" onClick={() => setDetailVisible(false)}>
                        <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close
                    </button>
                </ModalFooter>
            </Modal>

            <Modal
                isOpen={poModalVisible}
                toggle={() => setPoModalVisible(false)}
                size="xl"
            >
                <ModalHeader toggle={() => setPoModalVisible(false)}>
                    Purchase Order Print Preview
                </ModalHeader>
                <ModalBody>
                    {poData ? (
                        <div
                            ref={printRef}
                            style={{
                                padding: 20,
                                fontFamily: "Arial, sans-serif",
                                color: "#000",
                            }}
                        >
                            {/* Header Top: Logo + Company */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div style={{ display: "flex", alignItems: "flex-start" }}>
                                    <img
                                        src="/logo.png"
                                        alt="Logo"
                                        style={{ height: 60, marginRight: 15 }}
                                    />
                                    <div>
                                        <p style={{ fontWeight: "bold", marginBottom: 2 }}>
                                            {poData?.header[0].CompanyName}
                                        </p>
                                        <p style={{ marginBottom: 1 }}>
                                            {poData?.header[0].Address1}, {poData?.header[0].Address2},{" "}
                                            {poData?.header[0].Address3}
                                        </p>
                                        <p style={{ marginBottom: 1 }}>
                                            {poData?.header[0].WebSite}  {poData?.header[0].Email}
                                        </p>
                                        <p style={{ marginBottom: 1 }}>
                                            {poData?.header[0].TelePhone}
                                        </p>
                                    </div>
                                </div>
                                <div style={{ fontWeight: "bold", color: "#333", fontSize: "12px", marginTop: "10px" }}>
                                    F-BTG-PUR-06 (Rev.01)
                                </div>
                            </div>

                            {/* Title */}
                            <div
                                style={{
                                    textAlign: "center",
                                    fontSize: 20,
                                    fontWeight: "bold",
                                    marginTop: 10,
                                    marginBottom: 10,
                                }}
                            >
                                {poData?.header[0].header || "PURCHASE ORDER"}
                            </div>

                            {/* Supplier Info + PO Info */}
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    marginBottom: 10,
                                }}
                            >
                                {/* Supplier Info */}
                                <div style={{ width: "60%" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start" }}>
                                        {/* To : Label */}
                                        <span style={{ width: "20px" }}>To</span>
                                        <span style={{ width: "20px", textAlign: "center" }}>:</span>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: "bold" }}>{poData?.supplier.suppliername}</div>
                                            <div>{poData?.supplier.Address}</div>
                                            <div>Tel&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {poData?.supplier.PhoneNo}</div>
                                            <div>Email&nbsp;&nbsp;&nbsp;: {poData?.supplier.Email}</div>
                                        </div>
                                    </div>
                                </div>


                                {/* PO Info */}
                                <div style={{ width: "40%" }}>
                                    {[
                                        { label: "Request No.", value: poData?.header[0].PR_Numbers },
                                        { label: "P.O. No.", value: poData?.header[0].pono },
                                        { label: "Date", value: poData?.header[0].podate },
                                        { label: "Payment Term", value: poData?.header[0].PaymentTerm || poData?.supplier?.PaymentTerm || "-" },
                                    ].map((item, idx) => (
                                        <div
                                            key={idx}
                                            style={{ display: "flex", alignItems: "center", marginBottom: "2px" }}
                                        >
                                            <span style={{ width: "100px", whiteSpace: "nowrap" }}>{item.label}</span>
                                            <span style={{ width: "20px", textAlign: "center" }}>:</span>
                                            <span style={{ flex: 1 }}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>

                            </div>

                            {/* Items Table */}
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: 13,
                                    marginBottom: 10,
                                    border: '1px solid #e4e4e4'
                                }}
                            >
                                <thead>
                                    <tr>
                                        <th  >No.</th>
                                        <th >Description</th>
                                        <th >Quantity</th>
                                        <th >Unit Price</th>
                                        <th >Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {poData?.items.map((item, idx) => {
                                        const formatDecimal = (val) =>
                                            val !== undefined && val !== null && !isNaN(val)
                                                ? Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 3 })
                                                : "";

                                        return (
                                            <tr key={idx}>
                                                <td style={{ textAlign: "center" }}>{idx + 1}</td>
                                                <td style={{ wordBreak: 'break-all' }}>{item.itemdescription}</td>
                                                <td style={{ textAlign: "center" }}>
                                                    {parseFloat(item.qty || 0).toLocaleString("en-US")} {item.UOM}
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    {formatDecimal(item.unitprice)}
                                                </td>
                                                <td style={{ textAlign: "right" }}>
                                                    {formatDecimal(item.totalvalue)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {Array.from({ length: Math.max(0, 6 - poData?.items.length) }).map((_, idx) => (
                                        <tr key={`empty-${idx}`}>
                                            <td style={{ border: "0px" }} colSpan={5}>&nbsp;</td>

                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Note */}
                            <p style={{ fontSize: 11, marginTop: 5 }}>
                                <strong>Note :</strong> All activities carried out in the
                                production area of PT. BTG must comply with occupational safety and
                                health regulations. During loading and unloading materials, the
                                supplier’s operator shall wear PPE. If any accident and injury
                                caused by negligence on the part of supplier, will not be the
                                responsibility of PT. BTG.
                            </p>

                            {/* Signatures + Totals */}
                            <table style={{ width: "100%", marginTop: "20px" }}>
                                <tbody>
                                    <tr className="no-border">
                                        {/* Left side signatures */}
                                        <td
                                            style={{
                                                width: "40%",
                                                verticalAlign: "top",
                                                padding: "10px",
                                                border: "none",
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    justifyContent: "space-between",
                                                    width: "80%",
                                                }}
                                            >
                                                <div>
                                                    <div>Best Regards,</div>
                                                    <div
                                                        style={{ marginTop: "40px", fontWeight: "bold" }}
                                                    >
                                                        {poData?.header[0].Regards}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div>Approval Authority,</div>
                                                    <div
                                                        style={{ marginTop: "40px", fontWeight: "bold" }}
                                                    >
                                                        {poData?.header[0].ApprovalAuthority}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Right side totals */}
                                        <td
                                            style={{
                                                width: "40%",
                                                verticalAlign: "top",
                                                padding: "10px",
                                                border: "none",
                                            }}
                                        >
                                            {(() => {
                                                const { subtotal, discount, tax, vat, total, totalamount } = calculateTotals(poData?.items);

                                                const formatDecimal = (val) =>
                                                    val !== undefined && val !== null && !isNaN(val)
                                                        ? Number(val).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                                        : "";

                                                return (
                                                    <div style={{ width: "100%", marginLeft: "auto" }}>
                                                        <div style={{ display: "flex", width: "100%" }}>
                                                            <div style={{ width: "40%", textAlign: "right" }}>Subtotal</div>
                                                            <div style={{ width: "10%", textAlign: "center" }}>{currency || ""}</div>
                                                            <div style={{ width: "50%", textAlign: "right" }}>
                                                                {formatDecimal(totalamount)}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: "flex", width: "100%" }}>
                                                            <div style={{ width: "40%", textAlign: "right" }}>Discount</div>
                                                            <div style={{ width: "10%", textAlign: "center" }}>{currency || ""}</div>
                                                            <div style={{ width: "50%", textAlign: "right" }}>
                                                                {formatDecimal(discount)}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: "flex", width: "100%" }}>
                                                            <div style={{ width: "40%", textAlign: "right" }}>Tax</div>
                                                            <div style={{ width: "10%", textAlign: "center" }}>{currency || ""}</div>
                                                            <div style={{ width: "50%", textAlign: "right" }}>
                                                                {formatDecimal(tax)}
                                                            </div>
                                                        </div>

                                                        <div style={{ display: "flex", width: "100%" }}>
                                                            <div style={{ width: "40%", textAlign: "right" }}>VAT</div>
                                                            <div style={{ width: "10%", textAlign: "center" }}>{currency || ""}</div>
                                                            <div style={{ width: "50%", textAlign: "right" }}>
                                                                {formatDecimal(vat)}
                                                            </div>
                                                        </div>

                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                width: "100%",
                                                                fontWeight: "bold",
                                                                marginTop: "5px",
                                                            }}
                                                        >
                                                            <div style={{ width: "40%", textAlign: "right" }}>TOTAL NETTO</div>
                                                            <div style={{ width: "10%", textAlign: "center" }}>{currency || ""}</div>
                                                            <div style={{ width: "50%", textAlign: "right" }}>
                                                                {formatDecimal(total)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Footer */}

                            <div
                                style={{
                                    marginTop: 30,
                                    fontSize: 11,
                                    display: "flex",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span>
                                    {(() => {
                                        const rawDate = poData?.header[0].printdatetime || new Date();
                                        const user = poData?.header[0].printuser || "HUGO";

                                        // Convert to Date object if string
                                        const dateObj = new Date(rawDate);

                                        // Format like 22-Jul-2025 14:05:50
                                        const options = { day: "2-digit", month: "short", year: "numeric" };
                                        const datePart = dateObj.toLocaleDateString("en-GB", options).replace(/ /g, "-");
                                        const timePart = dateObj.toLocaleTimeString("en-GB", { hour12: false });

                                        return `Printed On ${datePart} ${timePart}, by ${user}`;
                                    })()}
                                </span>
                                <span>Page 1 of 1</span>
                            </div>

                            <div
                                style={{
                                    marginTop: 30,
                                    fontSize: 11,
                                    display: "flex",
                                    justifyContent: "space-between",
                                }}
                            >
                                <span style={{ fontWeight: "bold", fontSize: "15px" }}>
                                    As this is an autogenerated print from the computer, no signature need</span>
                            </div>
                        </div>

                    ) : (
                        <div>Loading...</div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <button className="btn btn-danger" onClick={() => setPoModalVisible(false)}>
                        Close
                    </button>
                    <button className="btn btn-primary" onClick={handlePrint}>
                        Print
                    </button>
                </ModalFooter>
            </Modal>

            {/* PR Details Modal - Reusable */}
            <Modal isOpen={prDetailVisible} toggle={() => setPrDetailVisible(false)} size="xl">
                <ModalHeader toggle={() => setPrDetailVisible(false)}>PR Details</ModalHeader>
                <ModalBody>
                    {selectedPRDetail && (
                        <>
                            {/* Header Section */}
                            <Row form>
                                {[
                                    ["PR No.", selectedPRDetail.Header?.PR_Number],
                                    ["PR Type", selectedPRDetail.Header?.prTypeName],
                                    ["PR Date", formatDate(selectedPRDetail.Header?.PRDate)],
                                    ["PM No.", selectedPRDetail.Header?.MemoConcat],
                                    ["Supplier", selectedPRDetail.Header?.SupplierName],
                                    ["Currency", selectedPRDetail.Header?.currencycode],
                                    ["Payment Term", selectedPRDetail.Header?.PaymentTermName],
                                    ["Sup. Address", selectedPRDetail.Header?.SupplierAddress],
                                    ["Delivery Term", selectedPRDetail.Header?.DeliveryTerm],
                                    ["Requestor", selectedPRDetail.Header?.UserName],
                                    ["BTG Delivery Address", selectedPRDetail.Header?.BTGDeliveryAddress],
                                    ["Sup. Contact", selectedPRDetail.Header?.contact],
                                    ["Sup. Email", selectedPRDetail.Header?.Email],
                                    ["Projects", selectedPRDetail.Header?.ProjectName],
                                    ["PO Reference", selectedPRDetail.Header?.poreference],
                                ].map(([label, val], i) => (
                                    // <Col md="4" key={i} className="form-group row ">
                                    //     <Label className="col-sm-5 col-form-label bold">{label}</Label>
                                    //     <Col sm="7" className="mt-2">: {val || "N/A"}</Col>
                                    // </Col>
                                    <Col md="4" key={i} className="form-group row">
                                        <Label className="col-sm-5 col-form-label bold">{label}</Label>

                                        <Col sm="7" className="mt-2" style={{ wordWrap: "break-word" }}>
                                            :{" "}

                                            {/* Make PONO clickable */}
                                            {label === "PO Reference" ? (
                                                <a
                                                    onClick={() => handlePonoClick(val)}
                                                    style={{ color: "#007bff", textDecoration: "underline", cursor: "pointer" }}
                                                >
                                                    {val || "N/A"}
                                                </a>
                                            ) : (label === "Supplier") ? (
                                                <b>{val}</b>
                                            ) : (label === "Currency") ? (
                                                <b style={{ color: "green" }}>{val}</b>
                                            )

                                                : (
                                                    val
                                                )}
                                        </Col>
                                    </Col>
                                ))}
                            </Row>

                            <hr />

                            <DataTable value={selectedPRDetail.Details} footerColumnGroup={
                                <ColumnGroup>
                                    <Row>
                                        <Column footer="GRAND TOTAL" colSpan={6} footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footer={<b>{selectedPRDetail.Header?.HeaderDiscountValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                                        <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footer={<b>{selectedPRDetail.Header?.HeaderTaxValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                                        <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footer={<b>{selectedPRDetail.Header?.HeaderVatValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                                        <Column footerStyle={{ color: "#ff5a00" }} footer={<b>{selectedPRDetail.Header?.HeaderNetValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                                    </Row>
                                </ColumnGroup>
                            }>
                                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                                <Column field="memo_number" header="PM No." />
                                <Column field="ItemName" header="Item Name" />
                                <Column field="Qty" header="Qty" body={(row) => row.Qty?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                <Column field="UOMName" header="UOM" />
                                <Column field="UnitPrice" header="Unit Price" body={(row) => row.UnitPrice?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                <Column field="DiscountValue" header="Discount" body={(row) => row.DiscountValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                <Column field="taxname" header="Tax" />
                                <Column field="TaxPerc" header="Tax %" />
                                <Column field="TaxValue" header="Tax Amount" body={(row) => row.TaxValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                <Column field="vatPerc" header="VAT %" />
                                <Column field="vatValue" header="VAT Amount" body={(row) => row.vatValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                                <Column field="NetTotal" bodyStyle={{ color: "#ff5a00" }} header="Total Amount" body={(row) => row.NetTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
                            </DataTable>

                            <Row className="mt-3">
                                <Col>
                                    <Label>PM Remarks</Label>
                                    <Card className="p-2 bg-light border">
                                        <div style={{ whiteSpace: "pre-wrap" }}>
                                            {selectedPRDetail.Header?.Memoremarks || "No pm remarks"}
                                        </div>
                                    </Card>
                                </Col>
                            </Row>

                            <Row className="mt-3">
                                <Col>
                                    <Label>Remarks</Label>
                                    <Card className="p-2 bg-light border">
                                        <div style={{ whiteSpace: "pre-wrap" }}>
                                            {selectedPRDetail.Header?.Remarks || "No remarks"}
                                        </div>
                                    </Card>
                                </Col>
                            </Row>

                            {/* Attachments table if exists */}
                            {selectedPRDetail.Attachment && selectedPRDetail.Attachment.length > 0 && (
                                <Row className="mt-3">
                                    <DataTable tableStyle={{ width: "60%" }} value={selectedPRDetail.Attachment}>
                                        <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                                        <Column field="AttachmentName" header="Attachment" />
                                    </DataTable>
                                </Row>
                            )}
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <button type="button" className="btn btn-danger" onClick={() => setPrDetailVisible(false)}>
                        Close
                    </button>
                </ModalFooter>
            </Modal>

            {/* PO Details Modal */}
            <Modal isOpen={poDetailVisible} toggle={() => setPoDetailVisible(false)} size="xl">
                <ModalHeader toggle={() => setPoDetailVisible(false)}>
                    Purchase Order Details
                </ModalHeader>
                <ModalBody>
                    {selectedPODetail && (
                        <>
                            <Row form>
                                {[
                                    ["PO No.", selectedPODetail.Header?.pono],
                                    ["PO Date", formatDate(selectedPODetail.Header?.podate)],
                                    ["Supplier", selectedPODetail.Header?.suppliername],
                                    ["Currency", selectedPODetail.Header?.currencycode],
                                    ["PR No.", selectedPODetail.Header?.PRConcat || "NA"],
                                ].map(([label, val], i) => (
                                    <Col md="4" key={i} className="form-group row">
                                        <Label className="col-sm-5 col-form-label bold">{label}</Label>
                                        <Col sm="7" className="mt-2">: {val || "N/A"}</Col>
                                    </Col>
                                ))}
                            </Row>

                            <hr />

                            <DataTable value={selectedPODetail.Requisition || []}>
                                <Column header="#" body={(_, { rowIndex }) => rowIndex + 1} />
                                <Column field="prnumber" header="PR No." />
                                <Column field="groupname" header="Item Group" />
                                <Column field="itemname" header="Item Name" />
                                <Column field="qty" header="Qty" body={(r) => r.qty?.toLocaleString("en-US", { minimumFractionDigits: 3 })} />
                                <Column field="uom" header="UOM" />
                                <Column field="unitprice" header="Unit Price" body={(r) => r.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })} />
                                <Column field="discountvalue" header="Discount" body={(r) => r.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })} />
                                <Column field="taxperc" header="Tax %" />
                                <Column field="taxvalue" header="Tax Amt" body={(r) => r.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })} />
                                <Column field="vatperc" header="VAT %" />
                                <Column field="vatvalue" header="VAT Amt" body={(r) => r.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })} />
                                <Column
                                    field="nettotal"
                                    header="Total Amt"
                                    body={(r) => r.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    footer={<b>{selectedPODetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>}
                                />
                            </DataTable>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <button type="button" className="btn btn-danger" onClick={() => setPoDetailVisible(false)}>
                        Close
                    </button>
                </ModalFooter>
            </Modal>

        </>
    );
};

export default ProcurementsManagePurchaseOrder;