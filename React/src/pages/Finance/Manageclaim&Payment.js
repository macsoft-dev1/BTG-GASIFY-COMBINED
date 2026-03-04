import React, { useState, useEffect } from "react";
import { Card, Col, Container, Row, Label, Button, FormGroup, InputGroup, UncontrolledAlert, Input } from "reactstrap";
import { Button as PButton } from 'primereact/button';

import { useHistory } from "react-router-dom";
import { Modal, ModalHeader, ModalBody, ModalFooter, Table } from "reactstrap";
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import Select from "react-select";
import { Dropdown } from 'primereact/dropdown';
import { Calendar } from 'primereact/calendar';
import { Tag } from 'primereact/tag';
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "flatpickr/dist/themes/material_blue.css";
import Flatpickr from "react-flatpickr";
import { Tooltip } from "primereact/tooltip";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { ColumnGroup } from 'primereact/columngroup';
import { useRef } from "react";
import { use } from "react";
import { orderBy } from "lodash";
import ReactToPrint from "react-to-print";
import { InputText } from "primereact/inputtext";
import {
    GetAllClaimTypeList, Getclaimremarksdetails, GetAllClaimAndPayment, GetClaimCategoryData, DiscussClaimAndPayment,
    GetClaimDepartmentData, GetCurrency, GetCustomer, ClaimAndPaymentGetById, DownloadFileById, DeleteClaimAndPayment,
    GetPRNoBySupplierAndCurrency, GetByIdPurchaseOrder, GetByIdPurchaseRequisition
} from "common/data/mastersapi";
import { AutoComplete } from "primereact/autocomplete";
import Swal from 'sweetalert2';
import Breadcrumbs from "../../components/Common/Breadcrumb";
import PaymentVoucher from "./PaymentVoucher"; // Adjust path if needed
import useAccess from "../../common/access/useAccess";
import PaymentHistory from "../Procurement/Invoice-Receipt/procurements-irn-payment-history";
import DiscussionHistoryModal from "./DiscussionHistoryModal";

const getUserDetails = () => {
    if (localStorage.getItem("authUser")) {
        const obj = JSON.parse(localStorage.getItem("authUser"))
        return obj;
    }
}

const formatDatePR = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).replace(/ /g, "-"); // e.g. "29-Aug-2025"
};

const ManageClaimsPayment = () => {



    const { access, applyAccessUI } = useAccess("Claim", "Claim & Payment");
    const canViewDetails = !access.loading && access.canViewDetails;

    // --- DEBUG CODE REMOVED ---

    const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
    const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState(null);

    const togglePaymentHistoryModal = () => setShowPaymentHistoryModal(!showPaymentHistoryModal);

    const handleOpenPaymentHistory = () => {
        const sid = selectedDetail?.header?.supplierid ?? selectedDetail?.header?.SupplierId ?? selectedDetail?.header?.supplierId ?? 0;

        // Logic to find PO Number: Header first, then check Details
        let poNo = selectedDetail?.header?.PONo;
        if (!poNo || poNo === "N/A") {
            // Try finding in details if header is missing it
            const detailWithPO = selectedDetail?.details?.find(d => d.pono && d.pono !== "N/A");
            if (detailWithPO) {
                poNo = detailWithPO.pono;
            }
        }

        if (!sid || sid === 0) {
            Swal.fire("Info", "No supplier information available for payment history.", "info");
            return;
        }

        // Update header info locally for this modal instance if needed
        if (poNo && (!selectedDetail.header.PONo || selectedDetail.header.PONo === "N/A")) {
            selectedDetail.header.PONo = poNo;
        }

        setSelectedSupplierForHistory(sid);
        setShowPaymentHistoryModal(true);
    };

    useEffect(() => {
        if (!access.loading) {
            applyAccessUI();
        }
    }, [access, applyAccessUI]);


    const [detailVisible, setDetailVisible] = useState(false);
    const [selectedDetail, setSelectedDetail] = useState({});

    const [POdetailVisible, setPODetailVisible] = useState(false);
    const [selectedPODetail, setSelectedPODetail] = useState({});

    const [Gasdeliverydetails, setGasdeliverydetails] = useState([]);
    const history = useHistory();
    const printRef = useRef();
    const [salesOrder, setSalesOrder] = useState(null);
    const [filters, setFilters] = useState(null);
    const [isClearable, setIsClearable] = useState(true);
    const [isSearchable, setIsSearchable] = useState(true);
    const [isDisabled, setIsDisabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRtl, setIsRtl] = useState(false);
    const [loading, setLoading] = useState(false);
    const [globalFilterValue, setGlobalFilterValue] = useState('');
    const [errormsg, setErrormsg] = useState();
    const [selectedPRDetail, setSelectedPRDetail] = useState(null);
    const [statuses] = useState([
        { label: 'Saved', value: 'Saved' },
        { label: 'Posted', value: 'Posted' },
        // { label: 'New', value: 'new' },
        // { label: 'Negotiation', value: 'negotiation' },
        // { label: 'Renewal', value: 'renewal' },
        // { label: 'Proposal', value: 'proposal' }
    ]);
    const [prDetailVisible, setPrDetailVisible] = useState(false);
    const [isseacrch, setIsseacrch] = useState(false);
    const currentYear = new Date().getFullYear();
    const formatDate = (date) => date.toISOString().split('T')[0];
    const today = new Date();
    const sevenDaysAgo = new Date();
    const [SelectedFilter, setSelectedFilter] = useState(0);
    sevenDaysAgo.setDate(today.getDate() - 7);
    const [salesOrderFilter, setSalesorderFilter] = useState({
        FCustomerId: 0,
        FromDate: formatDate(sevenDaysAgo),
        ToDate: formatDate(new Date()),
        BranchId: 1,
        FilterType: 0,
        PO: ""
    });

    const formatpoDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        }).replace(/ /g, "-"); // e.g. "29-Aug-2025"
    };

    const [CustomerList, setCustomerList] = useState([]);
    const [printData, setPrintData] = useState(null);
    const [shownCancelledAlerts, setShownCancelledAlerts] = useState(new Set());

    const [selectedFilterType, setSelectedFilterType] = useState(null);
    const [selectedAutoItem, setSelectedAutoItem] = useState(null);
    const [autoSuggestions, setAutoSuggestions] = useState([]);


    const [autoSuggestionscate, setAutoSuggestionscate] = useState([]);
    const [autoSuggestionsdept, setAutoSuggestionsdept] = useState([]);
    const [autoSuggestionscurr, setAutoSuggestionscurr] = useState([]);
    const [autoSuggestionsclaimtype, setAutoSuggestionsclaimtype] = useState([]);
    const [branchId, setBranchId] = useState(1);
    const [orgId, setOrgId] = useState(1);

    const [previewUrl, setPreviewUrl] = useState("");
    const [fileName, setFileName] = useState("");


    const [showvoucherModal, setShowvoucherModal] = useState(false);
    const [selectedVoucherId, setSelectedVoucherId] = useState(null);
    const [UserData, setUserData] = useState();

    const [discussModalOpen, setDiscussModalOpen] = useState(false);
    const [discussText, setDiscussText] = useState("");
    const [currentClaimId, setCurrentClaimId] = useState(null);

    const handleVoucherClick = (voucherId) => {
        setSelectedVoucherId(voucherId);
        setShowvoucherModal(true);
    };

    const togglevoucherModal = () => setShowvoucherModal(!showvoucherModal);
    const [remarkModalOpen, setRemarkModalOpen] = useState(false);
    const [discussionHistoryModalOpen, setDiscussionHistoryModalOpen] = useState(false);
    const [currentDiscussionClaimId, setCurrentDiscussionClaimId] = useState(null);
    const [remarksData, setRemarksData] = useState([]);
    const [selectedClaim, setSelectedClaim] = useState(null);
    const [isPOOpenedFromDetail, setIsPOOpenedFromDetail] = useState(false);

    const toggleRemarkModal = () => {
        setRemarkModalOpen(!remarkModalOpen);
    };

    const handleViewRemarks = (data) => {
        setCurrentDiscussionClaimId(data?.Claim_ID || data?.id);
        setDiscussionHistoryModalOpen(true);
    };

    const loadData = async () => {
        const userData = getUserDetails();
        const res = await GetAllClaimAndPayment(0, 0, branchId, orgId, userData?.u_id || 0);

        // Handle both direct array format and {status: true, data: [...]} format
        const isValidResponse = Array.isArray(res) || (res && res.status && Array.isArray(res.data));

        if (isValidResponse) {
            const rawData = Array.isArray(res) ? res : res.data;

            // Add timestamp field for proper date sorting
            const dataWithTimestamp = rawData.map(item => {
                let currentStatus = item.Status;
                // Force "Saved" status if discussion limit reached
                if (item.is_delete_required === 1 || item.hod_discussed_count >= 3 || item.gm_discussed_count >= 3 || item.director_discussed_count >= 3) {
                    currentStatus = "Saved";
                }
                return {
                    ...item,
                    Status: currentStatus,
                    claimdateTimestamp: parseDateToTimestamp(item.claimdate)
                };
            });
            setSalesOrder(dataWithTimestamp);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Initial Load Failed',
                text: res.message || 'Unable to fetch default claim and payment data.',
            });
        }
    };

    useEffect(() => {
        if (salesOrder && salesOrder.length > 0) {
            // Debug: Check all claims for is_delete_required field
            console.log('Manageclaim&Payment - Total claims:', salesOrder.length);
            console.log('Sample claim data:', salesOrder[0]);

            const cancelledClaims = salesOrder.filter(claim => claim.is_delete_required === 1);
            console.log('Cancelled claims found:', cancelledClaims.length, cancelledClaims);

            if (cancelledClaims.length > 0) {
                const newCancelledIds = cancelledClaims
                    .map(c => c.Claim_ID)
                    .filter(id => !shownCancelledAlerts.has(id));

                console.log('New cancelled IDs to alert:', newCancelledIds);

                if (newCancelledIds.length > 0) {
                    const claimIds = cancelledClaims.map(c => c.Claim_ID).join(", ");
                    const claimNos = cancelledClaims.map(c => c.claimno).join(", ");
                    Swal.fire({
                        title: "Action Required",
                        text: `PLEASE CANCEL THE TRANSACTION FOR CLAIM ${claimNos}`,
                        icon: "warning",
                        confirmButtonText: "OK",
                        allowOutsideClick: false
                    });

                    // Mark these alerts as shown
                    setShownCancelledAlerts(prev => new Set([...prev, ...newCancelledIds]));
                }
            }
        }
    }, [salesOrder]);

    useEffect(() => {

        const userData = getUserDetails();
        setUserData(userData);
        console.log("Login data : ", userData);

        loaddropdown();
        loadData();
    }, []);

    const getSeverity = (Status) => {
        switch (Status) {
            case 'Approved':
                return 'btn-success';
            case 'Discussed':
                return 'btn-warning';
            case 'Posted':
                return 'success';
            case 'Saved':
                return 'danger';
            case 'new':
                return 'info';
            case 'NoAction':
                return 'btn-secondary';
            case 'renewal':
                return null;
        }
    };
    // const handlePrint = () => {

    //     const printContent = document.getElementById('printableArea');
    //     const originalContent = document.body.innerHTML;
    //     document.body.innerHTML = printContent.innerHTML;
    //     window.print();
    //     document.body.innerHTML = originalContent;
    //     window.location.reload();
    // };
    const FilterTypes = [
        { name: 'Category', value: 1 }, { name: 'Department', value: 2 }, { name: 'Currency', value: 3 }
        , { name: 'Claim Type', value: 4 }
    ];
    const [isModalOpen, setIsModalOpen] = useState(false);
    const toggleModal = () => {
        setIsModalOpen(prev => !prev);
    };

    // useEffect(() => {
    //     const loadCustomerList = async () => {
    //         const data = await GetCustomer(1, -1);
    //         setCustomerList(data);
    //     };
    //     setSelectedFilter(0);
    //     loadCustomerList();
    //     initFilters();
    // }, []);

    const clearFilter = () => {
        initFilters();
    };

    const onGlobalFilterChange = (e) => {
        const value = e.target.value;
        setGlobalFilterValue(value);
        setFilters((prevFilters) => ({
            ...prevFilters,
            global: { value, matchMode: FilterMatchMode.CONTAINS }
        }));
    };



    const handleBeforePrint = async (rowdata) => {
        setIsLoading(true);
        try {
            const response = await OrderGetbyid(rowdata.id);

            setPrintData(response.data);
        } catch (error) {
            console.error("Failed to fetch print data", error);
        } finally {
            setIsLoading(false);
        }
    };

    const initFilters = () => {
        setFilters({
            global: { value: null, matchMode: FilterMatchMode.CONTAINS },
            Claim_ID: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            claimno: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            claimdate: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            claimcategory: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            applicantname: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            departmentname: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            transactioncurrency: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
            Status: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
        });
        setGlobalFilterValue('');
    };

    const renderHeader = () => {
        return (
            <div className="row align-items-center g-3 clear-spa">
                <div className="col-12 col-lg-6">
                    <Button className="btn btn-danger btn-label" onClick={clearFilter} >
                        <i className="mdi mdi-filter-off label-icon" /> Clear
                    </Button>
                </div>
                <div className="col-12 col-lg-3 text-end">
                    <span className="me-4"><Tag value="S" severity={getSeverity("Saved")} /> Saved</span>
                    <span className="me-1"><Tag value="P" severity={getSeverity("Posted")} /> Posted</span>
                </div>
                <div className="col-12 col-lg-3">
                    <input className="form-control" type="text" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
                </div>
            </div>
        );
    };

    const statusBodyTemplate = (rowData) => {
        const isDeleteReq = rowData.is_delete_required === 1;
        const statusVal = isDeleteReq ? "Saved" : rowData.Status;
        const statusShort = statusVal === "Saved" ? "S" : statusVal === "Posted" ? "P" : statusVal;
        return <Tag value={statusShort} severity={getSeverity(statusVal)} />;
    };

    const CustomerBodyTemplate = (rowData) => {

        return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
            onClick={() => openSOGasHistory(rowData)}>{rowData.applicantname}</span>;
    };
    const openSOGasHistory = async rowData => {
        debugger;
        const data = await GetSOGasCodeDetails(rowData.SO_ID);
        setGasdeliverydetails(data);
        toggleModal();
    }
    const statusFilterTemplate = (options) => {
        return <Dropdown value={options.value} options={statuses} onChange={(e) => options.filterCallback(e.value, options.index)} itemTemplate={statusItemTemplate} placeholder="Select One" className="p-column-filter" showClear />;
    };

    const statusItemTemplate = (option) => {
        return <Tag value={option.label} severity={getSeverity(option.value)} />;
    };

    const actionclaimBodyTemplate = (rowData) => {
        const disabled = !canViewDetails;

        return (
            <span
                style={{
                    cursor: disabled ? "not-allowed" : "pointer",
                    color: disabled ? "gray" : "blue",
                    opacity: disabled ? 0.6 : 1
                }}
                className="btn-rounded btn btn-link"
                data-access="viewdetails"
                onClick={() => {
                    if (!disabled) {
                        handleShowDetails(rowData);
                    }
                }}
            >
                {rowData.claimno}
            </span>
        );
    };

    const actionpurposeBodyTemplate = (rowData) => {
        return (
            <div>
                <Tooltip target=".purpose-icon" />

                <i className="fas fa-eye purpose-icon"
                    data-pr-tooltip={rowData.purpose}
                    data-pr-position="right"
                    data-pr-at="right+5 top"
                    data-pr-my="left center-2"
                    style={{ fontSize: '1.5rem', cursor: 'pointer' }}>

                </i>
            </div>
        )


    };

    const actionpoBodyTemplate = (rowData) => {
        return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
            onClick={() => {
                setIsPOOpenedFromDetail(false);
                handleShowPODetails(rowData);
            }}>{rowData.pono}</span>;
    };


    const handleShowPODetails = async (row) => {
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

            setSelectedPODetail({
                ...res.data,
                Header: {
                    ...res.data.Header,
                    PRConcat: headerPRNumbers, // header field with PR numbers
                    PRIdsList: prIdsInOrder,
                },
                Details: requisition, // requisition rows are the detail lines
            });

            setPODetailVisible(true);

            // if you later add attachments for PO
            // setPreviewUrl(res.data.Header.filepath || "");
            // setFileName(res.data.Header.filename || "");
        } else {
            Swal.fire("Error", "Data is not available", "error");
        }
    };
    const handleShowPODetails1 = async (row) => {
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

            if (!headerPRNumbers) headerPRNumbers = "NA";


            const prIdsInOrder = requisition
                .map(r => r.prid)
                .filter(id => id > 0);

            setSelectedPODetail({
                ...res.data,
                Header: {
                    ...res.data.Header,
                    PRConcat: headerPRNumbers, // header field with PR numbers
                    PRIdsList: prIdsInOrder,
                },
                Details: requisition, // requisition rows are the detail lines
            });

            setPODetailVisible(true);

            // if you later add attachments for PO
            // setPreviewUrl(res.data.Header.filepath || "");
            // setFileName(res.data.Header.filename || "");
        } else {
            Swal.fire("Error", "Data is not available", "error");
        }
    };

    const actionAckBodyTemplate = (rowData) => {
        return (
            <span
            >{rowData.voucherno}</span>
            //    onClick={() => handleVoucherClick(rowData.voucherid)}


        );
    }; const handleDeleteConfirm = (row) => {
        Swal.fire({
            title: 'Are you sure?',
            text: 'Do you want to delete this claim?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
        }).then((result) => {
            if (result.isConfirmed) {
                deleteClaim(row);
            }
        });
    };

    const deleteClaim = async (row) => {
        try {
            const payload = {
                delete: {
                    inActiveBy: UserData?.u_id || 0,        // Replace with your actual user ID
                    inActiveIP: '127.0.0.1',        // Replace with actual IP if required
                    claimId: row.Claim_ID
                }
            };
            debugger;
            const response = await DeleteClaimAndPayment(payload); // Make sure this API is imported

            if (response?.status) {
                Swal.fire('Deleted!', 'Claim has been deleted.', 'success');
                searchData(); // Reload the table after delete
            } else {
                Swal.fire('Error', 'Failed to delete the claim.', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'An error occurred during deletion.', 'error');
        }
    };




    const actionBodyTemplate = (rowData) => {
        if (!access?.canEdit) {
            return null;
        }

        // If claim needs to be cancelled (3rd discussion reached), only enable delete button
        const isCancelled = rowData?.is_delete_required === 1 || rowData?.isDeleteRequired === 1;
        const canEdit = !isCancelled && rowData?.Status !== 'Posted';
        const canDelete = isCancelled || (rowData?.Status !== 'Posted' && (rowData?.IsReject === 1 || rowData?.isSubmitted == 0 || rowData?.candelete == 1));

        return (
            <div className="actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {/* Edit Button */}
                {
                    // Logic: If user is a Super Admin (or user 158) AND the record is not cancelled
                    !isCancelled && (UserData?.superAdmin || String(UserData?.u_id) === '158') ? (
                        <span
                            onClick={() => editRow(rowData)}
                            title="Edit"
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                            <i className="mdi mdi-square-edit-outline" style={{ fontSize: '1.5rem' }}></i>
                        </span>
                    ) :
                        // Logic: Regular user can only edit if status is NOT 'Posted'
                        !isCancelled && rowData.Status !== 'Posted' ? (
                            <span
                                onClick={() => editRow(rowData)}
                                title="Edit"
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <i className="mdi mdi-square-edit-outline" style={{ fontSize: '1.5rem' }}></i>
                            </span>
                        ) : (
                            // Logic: Disable edit icon for regular users on Posted claims
                            <span
                                style={{ color: "gray", display: 'flex', alignItems: 'center' }}
                                title="Edit"
                            >
                                <i className="mdi mdi-square-edit-outline" style={{ fontSize: '1.5rem' }}></i>
                            </span>
                        )
                }

                {/* Delete Button */}
                {canDelete ? (
                    <button onClick={() => handleDeleteConfirm(rowData)}
                        style={{ display: 'flex', alignItems: 'center' }}
                        title="Cancel"
                        data-access="delete"
                    >
                        <i className="mdi mdi-trash-can-outline" style={{ fontSize: '1.5rem' }}></i>
                    </button>
                ) : (
                    <span
                        style={{ color: "gray", display: 'flex', alignItems: 'center' }}
                        title="Cancel (Disabled)"
                    >
                        <i className="mdi mdi-trash-can-outline" style={{ fontSize: '1.5rem' }}></i>
                    </span>
                )}
            </div>
        );
    };


    const RemarksBodyTemplate = (rowData) => {
        const isCancelled = rowData.is_delete_required === 1;

        return (
            <div className="actions" style={{ alignItems: 'center', gap: '0.5rem' }}>
                {/* View Remarks/Discuss Button */}
                {!isCancelled ? (
                    <span onClick={() => handleViewRemarks(rowData)} title="View History" style={{ cursor: 'pointer' }}>
                        <i className="mdi mdi-comment-text-outline" style={{ fontSize: '1.5rem', color: '#17a2b8' }}></i>
                    </span>
                ) : (
                    <span title="Discuss (Disabled)" style={{ cursor: 'not-allowed' }}>
                        <i className="mdi mdi-comment-text-outline" style={{ fontSize: '1.5rem', color: '#cccccc' }}></i>
                    </span>
                )}
            </div>
        );
    };

    const CopyBodyTemplate = (rowData) => {
        return (
            <div className="actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

                <span

                    onClick={() => CopyClaim(rowData)}
                    title="Copy"
                    style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                >
                    <i className="mdi mdi-content-copy" style={{ fontSize: '1.5rem' }}></i>
                </span>

            </div>
        );
    };

    const dateFilterTemplate = options => {
        return (
            <Calendar
                value={options.value}
                onChange={e => options.filterCallback(e.value, options.index)}
                dateFormat="dd-MMM-yyyy"
                placeholder="Filter by Date"
                showIcon
            />
        );
    };



    const handleDownloadFile = async () => {
        const fileId = 0;
        const filePath = previewUrl;

        const fileUrl = await DownloadFileById(fileId, filePath);

        // if (fileUrl) {
        //     window.open(fileUrl, "_blank");
        //     setTimeout(() => URL.revokeObjectURL(fileUrl), 1000);
        // } else {
        //     Swal.fire({
        //         icon: 'error',
        //         title: 'Download Failed',
        //         text: 'Unable to download the file. Please try again later.',
        //     });
        // }
    };

    const header = renderHeader();
    const editRow = (rowData) => {
        // console.log('Edit row:', rowData);
        history.push(`/edit-claim&payment/${rowData.Claim_ID}`);
    };
    const CopyClaim = (rowData) => {
        // console.log('Edit row:', rowData);
        history.push(`/copy-claim&payment/${rowData.Claim_ID}`);
    };

    const dAddOrder = () => {
        history.push("/add-claim&payment");
    };
    const createdBodyTemplate = (rowData) => {
        return (
            <div className="actions row align-items-center g-3">
                <div className="col-12 col-lg-12">
                    {rowData.createdby && rowData.CreatedDate ? (
                        <>
                            <span>{rowData.createdby}</span> / <span>{rowData.CreatedDate}</span>
                        </>
                    ) : (
                        <span></span>
                    )}
                </div>
            </div>
        )
    };
    const modifiedBodyTemplate = (rowData) => {
        return (
            <div className="actions row align-items-center g-3">
                <div className="col-12 col-lg-12">
                    {rowData.Modifiedby && rowData.ModifiedDate ? (
                        <>
                            <span>{rowData.Modifiedby}</span> / <span>{rowData.ModifiedDate}</span>
                        </>
                    ) : (
                        <span></span>
                    )}
                </div>
            </div>
        );
    };

    // const searchData = async () => {
    //     // setErrormsg(""); // clear previous error

    //     // if (!salesOrderFilter.FromDate || !salesOrderFilter.ToDate) {
    //     //     setErrormsg("Please select both From and To dates.");
    //     //     return;
    //     // }

    //     // if (salesOrderFilter.FromDate > salesOrderFilter.ToDate) {
    //     //     setErrormsg("To date should not be earlier than From date.");
    //     //     return;
    //     // }

    //     setLoading(true);
    //     try {
    //         let podetails = "%";
    //         podetails = salesOrderFilter.PO;
    //         if (salesOrderFilter.FilterType == 1) {
    //             if (salesOrderFilter.FCustomerId == undefined || salesOrderFilter.FCustomerId == null || salesOrderFilter.FCustomerId == "") {
    //                 salesOrderFilter.FCustomerId = 0;
    //             }
    //             podetails = "%";
    //         }
    //         else if (salesOrderFilter.FilterType == 2) {
    //             if (salesOrderFilter.PO == undefined || salesOrderFilter.PO == null || salesOrderFilter.PO == "") {
    //                 podetails = "%";
    //             }
    //             salesOrderFilter.FCustomerId = 0;
    //         }
    //         else {
    //             podetails = "%";
    //             salesOrderFilter.FCustomerId = 0;
    //         }
    //         const response = await GetAllSO(
    //             salesOrderFilter.FCustomerId,
    //             salesOrderFilter.FromDate,
    //             salesOrderFilter.ToDate,
    //             salesOrderFilter.BranchId,
    //             salesOrderFilter.FilterType,
    //             podetails
    //         );
    //         setSalesOrder(response);
    //     } catch (error) {
    //         console.error("Error fetching orders:", error);
    //         setErrormsg("Failed to fetch data. Please try again.");
    //     } finally {
    //         setLoading(false);
    //     }
    // };

    // Helper function to parse date string to timestamp for sorting
    const parseDateToTimestamp = (dateStr) => {
        if (!dateStr) return 0;
        const parts = dateStr.split('-');
        if (parts.length !== 3) return 0;

        const day = parseInt(parts[0], 10);
        const monthMap = {
            'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
            'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
        };
        const month = monthMap[parts[1]];
        const year = parseInt(parts[2], 10);

        return new Date(year, month, day).getTime();
    };

    const fetchAllClaimAndPaymentData = async (filterType = 0, filterValue = 0) => {
        debugger;
        const userData = getUserDetails();
        const res = await GetAllClaimAndPayment(filterType, filterValue, branchId, orgId, userData?.u_id || 0);

        // Handle both direct array format and {status: true, data: [...]} format
        const isValidResponse = Array.isArray(res) || (res && res.status && Array.isArray(res.data));

        if (isValidResponse) {
            const rawData = Array.isArray(res) ? res : res.data;

            // Add timestamp field for proper date sorting
            const dataWithTimestamp = rawData.map(item => {
                let currentStatus = item.Status;
                // Force "Saved" status if discussion limit reached or if cancelled
                if (item.is_delete_required === 1 || item.hod_discussed_count >= 3 || item.gm_discussed_count >= 3 || item.director_discussed_count >= 3) {
                    currentStatus = "Saved";
                }
                return {
                    ...item,
                    Status: currentStatus,
                    claimdateTimestamp: parseDateToTimestamp(item.claimdate)
                };
            });
            setSalesOrder(dataWithTimestamp);
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Failed to Fetch Data',
                text: res.message || 'Something went wrong. Please try again.',
            });
        }
    };

    const searchData = async () => {
        const filterType = selectedFilterType?.value || 0;
        const filterValue = selectedAutoItem?.value || 0;
        await fetchAllClaimAndPaymentData(filterType, filterValue);
    };

    const cancelFilter = async () => {
        setSelectedFilterType(null);
        setSelectedAutoItem(null);
        await fetchAllClaimAndPaymentData(0, 0);
    };
    // useEffect(() => { searchData() }, [isseacrch]);

    const exportToExcel = () => {
        // const filteredQuotes = salesOrder.map(({ IsPosted, ...rest }) => rest);
        const exportData = salesOrder.map((item) => ({
            "Claim No.": item.claimno ?? '',
            "Claim Date": item.claimdate ?? '',
            "Purpose": item.purpose ?? '',
            "Category Type": item.claimcategory ?? '',

            "Applicant Name": item.applicantname ?? '',
            "Department": item.departmentname ?? '',
            "Transaction Currency": item.transactioncurrency ?? '',
            "Claim Amount in TC": item.claimamountintc ?? '',
            // "Claim Amount in IDR": item.totalamountinidr ?? '',
            "Status": item.Status ?? ''
        }));

        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Returns");

        const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
        const data = new Blob([excelBuffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });
        const now = new Date();
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const day = String(now.getDate()).padStart(2, "0");
        const month = months[now.getMonth()];
        const year = now.getFullYear();

        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const ampm = hours >= 12 ? "pm" : "am";
        hours = hours % 12 || 12;

        const timeStr = `${hours}:${minutes}${ampm}`;
        const fileName = `BTG-Claims&Payment-${day}${month}${year}-${timeStr}.xlsx`;

        saveAs(data, fileName);
    };

    const exportCSV = () => {
        if (dt.current) {
            dt.current.exportCSV({
                filename: 'Sales_Order_List',
            });
        }
    };
    const calldownload = async rowData => {
        setLoading(true);
        try {
            let podetails = "%";
            podetails = salesOrderFilter.PO;
            if (salesOrderFilter.FilterType == 1) {
                if (salesOrderFilter.FCustomerId == undefined || salesOrderFilter.FCustomerId == null || salesOrderFilter.FCustomerId == "") {
                    salesOrderFilter.FCustomerId = 0;
                }
                podetails = "%";
            }
            else if (salesOrderFilter.FilterType == 2) {
                if (salesOrderFilter.PO == undefined || salesOrderFilter.PO == null || salesOrderFilter.PO == "") {
                    podetails = "%";
                }
                salesOrderFilter.FCustomerId = 0;
            }
            else {
                podetails = "%";
                salesOrderFilter.FCustomerId = 0;
            }
            const response = await downloadExportExcel(salesOrderFilter.FCustomerId, salesOrderFilter.FromDate, salesOrderFilter.ToDate, salesOrderFilter.BranchId, salesOrderFilter.FilterType,
                podetails);
            if (response.status) {

            }
        } catch (err) {
            console.log("err > ", err);
        } finally {
            setLoading(false);
        }
    };

    const handleShowDetails = async (row) => {
        const res = await ClaimAndPaymentGetById(row.Claim_ID, 1, 1);
        if (res.status) {
            let details = res.data.details || [];

            // Extract unique PO IDs that are valid
            const uniquePOIds = [...new Set(details.map(d => d.poid).filter(id => id && id > 0))];

            if (uniquePOIds.length > 0) {
                // Create a map to store PO ID -> PR Info
                const poToPrMap = {};

                // Fetch PO details for each unique PO
                await Promise.all(uniquePOIds.map(async (poid) => {
                    try {
                        const poRes = await GetByIdPurchaseOrder(poid, orgId, branchId);

                        if (poRes?.status && poRes.data?.Requisition) {
                            // The Requisition array already contains the prnumber
                            const prNumbers = poRes.data.Requisition
                                .map(req => req.prnumber)
                                .filter(Boolean); // Filter out null/undefined/empty strings

                            // Join unique PR numbers
                            const prConcat = [...new Set(prNumbers)].join(", ");

                            // Store all unique PR IDs for individual clicking
                            const prIdsInOrder = poRes.data.Requisition
                                .map(r => r.prid)
                                .filter(id => id && id > 0);
                            const uniquePrIds = [...new Set(prIdsInOrder)];

                            poToPrMap[poid] = {
                                prnumber: prConcat || "NA",
                                prid: uniquePrIds[0],
                                prIdsList: uniquePrIds
                            };
                        }
                    } catch (err) {
                        console.error(`Failed to fetch details for PO ${poid}`, err);
                    }
                }));

                // Enrich details with PR info
                details = details.map(d => {
                    if (d.poid && poToPrMap[d.poid]) {
                        return {
                            ...d,
                            prnumber: poToPrMap[d.poid].prnumber,
                            prid: poToPrMap[d.poid].prid,
                            prIdsList: poToPrMap[d.poid].prIdsList || []
                        };
                    }
                    return { ...d, prnumber: "NA" };
                });
            }



            // Inject Payment Method from row data
            if (res.data && res.data.header) {
                res.data.header.paymentmethodname = row.paymentmethodname;
            }

            setSelectedDetail({
                ...res.data,
                details: details
            });
            setDetailVisible(true);

            setPreviewUrl(res.data?.header?.AttachmentPath || "");
            setFileName(res.data?.header?.AttachmentName || "");

        }
        else {
            Swal.fire("Error", "Data is not available", "error");

        }
    };

    const handlePrint = () => {
        if (!salesOrder || salesOrder.length === 0) {
            setErrormsg("No data available to print.");
            return;
        }

        const tableHeaders = `
            <tr>
                <th>Claim #</th>
                <th>Claim Date</th>
                <th>Purpose</th>
                <th>Category Type</th>
                <th>Applicant Name</th>
                <th>Department</th>
                <th>Transaction Currency</th>
                <th>Claim Amount in TC</th>
                
                <th>Status</th>
            </tr>`;
        //<th>Claim Amount in IDR</th>
        const tableRows = salesOrder.map(row => `
            <tr>
                <td>${row.claimno || ''}</td>
                <td>${row.claimdate || ''}</td>
                <td>${row.purpose || ''}</td>
                
                <td>${row.claimcategory || ''}</td>
                <td>${row.applicantname || ''}</td>
                <td>${row.departmentname || ''}</td>
                <td>${row.transactioncurrency || ''}</td>
                <td style="text-align:right;">${Number(row.claimamountintc || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                
                <td>${row.Status || ''}</td>
            </tr>
        `).join('');
        //<td style="text-align:right;">${Number(row.totalamountinidr || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        const printHtml = `
            <html>
                <head>
                    <title>Claim and Payment Report</title>
                    <style>
                        @media print {
                   
                            @page { size: landscape; margin: 20mm; }
                        }
                        body { font-family: Arial, sans-serif; padding: 20px; }
                        h3 { text-align: center; margin-bottom: 20px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #333; padding: 8px; text-align: left; font-size: 12px; }
                        th { background-color: #f2f2f2; }
                    </style>
                </head>
                <body>
                    <h3>Claim and Payment Report</h3>
                    <table>
                        <thead>${tableHeaders}</thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                </body>
            </html>
        `;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(printHtml);
        doc.close();

        iframe.onload = () => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        };
    };

    // const handlePrint = async () => {
    //    debugger
    //     const printWindow = window.open('', '_blank');

    //     if (!printWindow) {
    //         setErrormsg("Popup blocked. Please allow popups for this site.");
    //         return;
    //     }

    //     try {
    //         const blob = await printExportExcel(
    //             salesOrderFilter.FCustomerId,
    //             salesOrderFilter.FromDate,
    //             salesOrderFilter.ToDate,
    //             salesOrderFilter.BranchId
    //         );

    //         const arrayBuffer = await blob.arrayBuffer();
    //         const workbook = XLSX.read(arrayBuffer, { type: "array" });
    //         const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    //         const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    //         const tableRows = jsonData.map(row => `
    //         <tr>
    //             ${Object.values(row).map(value => `<td>${value}</td>`).join('')}
    //         </tr>
    //     `).join('');

    //         const tableHeaders = Object.keys(jsonData[0]).map(key => `<th>${key}</th>`).join('');

    //         printWindow.document.write(`
    //         <html>
    //             <head>
    //                 <title>Sales Order Print</title>
    //                 <style>
    //                     table { border-collapse: collapse; width: 100%; }
    //                     th, td { border: 1px solid #333; padding: 8px; text-align: left; }
    //                     th { background-color: #f2f2f2; }
    //                 </style>
    //             </head>
    //             <body>
    //                 <h3>Sales Order List</h3>
    //                 <table>
    //                     <thead><tr>${tableHeaders}</tr></thead>
    //                     <tbody>${tableRows}</tbody>
    //                 </table>
    //             </body>
    //         </html>
    //     `);
    //         printWindow.document.close();
    //         printWindow.focus();
    //         printWindow.print();
    //         printWindow.close();

    //     } catch (err) {
    //         console.error("Failed to print report:", err);
    //         setErrormsg("Failed to print sales order. Please try again.");
    //     }
    // };


    // useEffect(() => {
    //     debugger
    //     const fetchData = async () => {
    //         setLoading(true);
    //         try {
    //             const response = await GetAllSO(salesOrderFilter.FCustomerId, salesOrderFilter.FromDate, salesOrderFilter.ToDate, salesOrderFilter.BranchId, salesOrderFilter.FilterType,
    //                 salesOrderFilter.PO);
    //             setSalesOrder(response);
    //         } catch (error) {
    //             console.error("Error fetching orders:", error);
    //         } finally {
    //             setLoading(false);
    //         }
    //     };
    //     fetchData();
    // }, []);

    const handleCustomerChange = async (option) => {
        if (!option) {
            setSalesorderFilter(prevState => ({ ...prevState, ['FCustomerId']: 0 }));
        } else {
            setSalesorderFilter(prevState => ({ ...prevState, ['FCustomerId']: option.value }));
        }
    };

    const handleDateChange = (selectedDates, dateStr, instance) => {
        const fieldName = instance.element.getAttribute("id");

        if (selectedDates.length > 0) {
            const localDate = selectedDates[0];
            const yyyy = localDate.getFullYear();
            const mm = String(localDate.getMonth() + 1).padStart(2, "0");
            const dd = String(localDate.getDate()).padStart(2, "0");
            const formatted = `${yyyy}-${mm}-${dd}`;

            setSalesorderFilter(prevState => ({
                ...prevState,
                [fieldName]: formatted,
            }));
        }
    };

    const handleTypeChange = (e) => {
        debugger;
        const { name, value } = e.target;
        salesOrderFilter.FilterType = value;
        setSelectedFilter(value);
        salesOrderFilter.PO = "";
        salesOrderFilter.FCustomerId = 0;
    };

    // Handle input change
    const handleInputChange = (e) => {
        debugger;
        const { name, value } = e.target;
        setSalesorderFilter((prevState) => ({
            ...prevState,
            [name]: value, // Update the specific field in state
        }));
    };


    // Load AutoComplete Suggestions
    const loadSuggestions = async (e) => {
        const query = e.query?.trim() || "%";
        let result = [];

        if (selectedFilterType?.value === 1) {
            result = await GetClaimCategoryData(0, orgId, branchId, query);
        } else if (selectedFilterType?.value === 2) {
            result = await GetClaimDepartmentData(0, orgId, branchId, query);
        }

        console.log('result > ', result)

        setAutoSuggestions(Array.isArray(result) ? result : []);
    };

    const handlePRClick = async (prid) => {
        if (!prid || prid <= 0) {
            Swal.fire("Invalid", "No valid PR found", "warning");
            return;
        }

        try {
            const res = await GetByIdPurchaseRequisition(prid, orgId, branchId);

            if (res?.status && res.data) {
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
            Swal.fire("Error", "An error occurred while saving.", "error");
        }
    };

    const loaddropdown = async (e) => {
        debugger
        var catresult = await GetClaimCategoryData(0, orgId, branchId, "%");

        var deptresult = await GetClaimDepartmentData(0, orgId, branchId, "%");

        var curresult = await GetCurrency(1, 0);

        var claimtype = await GetAllClaimTypeList(0, branchId, orgId, 0, "%");
        debugger
        setAutoSuggestionscate(Array.isArray(catresult) ? catresult : []);
        setAutoSuggestionsdept(Array.isArray(deptresult) ? deptresult : []);
        setAutoSuggestionscurr(Array.isArray(curresult) ? curresult : []);
        setAutoSuggestionsclaimtype(Array.isArray(claimtype) ? claimtype : []);

    };
    // Get Label
    const getDynamicLabel = () => {
        if (selectedFilterType?.value === 1) return "Category";
        if (selectedFilterType?.value === 2) return "Department";
        if (selectedFilterType?.value === 3) return "Currency";
        if (selectedFilterType?.value === 4) return "Claim Type";
        return "";
    };
    const toggleDiscussModal = () => {
        setDiscussModalOpen(prev => !prev);
        if (!discussModalOpen) setDiscussText("");
    };



    const handleDetailsPrint = () => {
        const detail = selectedDetail;
        if (!detail) return;

        const now = new Date();
        const formattedDateTime = now.toLocaleString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });

        const printWindow = window.open('', '', 'width=1000,height=700');

        const printStyles = `
          <style>

           @media print {
                           .print-footer {
             position: fixed;
    top: 0;
    left: 0;
    right: 0;
    font-size: 10px;
    text-align: right;
    border-bottom: 0.5px dashed #999;
 
    height:10px;
    
  
          }
  .footer {
  position: running(pageFooter);  
  font-size: 10px;
  color: #444;
  text-align: right;
}
            @page {
              size: A4 landscape;
           margin: 5mm; 
           @bottom-center {
    content: element(pageFooter);
  }
            }
      
            body {
              font-family: Arial, sans-serif;
              font-size: 11px;
              padding: 10px;
              color: #000;
            }
      
            h2 {
              text-align: center;
              margin-bottom: 20px;
              font-size: 16px;
            }
      
            .section-title {
              font-weight: bold;
              margin: 12px 0 5px;
              padding-bottom: 2px;
            
              font-size: 12px;
            }
      
            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
      
            .info-table td {
              padding: 4px 6px;
              vertical-align: top;
            }
      
            .info-table td.label {
              font-weight: bold;
              width: 20%;
              white-space: nowrap;
            }
      
            .claim-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 15px;
            }
      
           .claim-table th,
.claim-table td {
  border: 1px solid #ccc;
  padding: 6px;
  text-align: center;
  word-wrap: break-word;
  word-break: break-word;
  white-space: normal;
  vertical-align: top;
}

 .claim-table td:nth-child(1) { width: 3%;text-align: center; }   /* # */
 .claim-table td:nth-child(2) { width: 15%;text-align: left; }  /* Claim Type */
 .claim-table td:nth-child(3) { width: 23%; text-align: left;}  /* Description */
 .claim-table td:nth-child(4) { width: 17%;text-align: right; }  /* Amount */
 .claim-table td:nth-child(5) { width: 13%; text-align: center;}  /* Expense Date */
 .claim-table td:nth-child(6) { width: 24%;text-align: left; }  /* Purpose */
      
            .status-table {
              width: 100%;
              border-collapse: collapse;
              text-align: center;
              margin-top: 15px;
            }
      
            .status-table th,
            .status-table td {
              border: 1px solid #ccc;
              padding: 6px;
               word-wrap: break-word;
    word-break: break-word;
    white-space: normal;
    vertical-align: top;
            }
      
            .status-header {
              background-color: #eee;
              font-weight: bold;
            }
      
            .btn-circle {
              display: inline-block;
              height: 12px;
              width: 12px;
              border-radius: 50%;
              margin: auto;
            }
      
            .btn-success { background-color: #28a745; }
            .btn-warning { background-color: #ffc107; }
            .btn-secondary { background-color: #6c757d; }
      
            .legend {
              margin-top: 10px;
              font-size: 10px;
            }
      
            .legend span {
              margin-right: 15px;

            }
      
            .remarks-box {
              border: 1px solid #ccc;
              padding: 8px;
              min-height: 30px;
              margin-top: 5px;
                white-space: pre-wrap; /* Preserve line breaks */
    word-wrap: break-word;
    word-break: break-word;
            }
          </style>
        `;

        const headerInfo = `
        <div style="padding:20px; display: flex; justify-content: space-between; align-items: flex-start;">
          <div style="flex: 1; text-align: center;">
            <h2 style="margin: 0; padding-left: 100px;">Claim Details</h2>
          </div>
          <div style="font-size: 10px; text-align: right;">
            ${detail.header?.ClaimCategoryId === 3 ? '<div style="font-weight: bold; color: #333; font-size: 12px; margin-bottom: 5px;">F-BTG-PUR-05 (Rev.03)</div>' : ''}
            <div>Printed on: ${formattedDateTime}</div>
          </div>
        </div>
    <table class="info-table">
        <tr>
            <td class="label">Category Type</td><td>${detail.header?.claimcategory || ''}</td>
            <td class="label">Application Date</td><td>${detail.header?.ApplicationDatevw || ''}</td>
        </tr>
        <tr>
            <td class="label">Application No</td><td>${detail.header?.ApplicationNo || ''}</td>
            <td class="label">Applicant</td><td>${detail.header?.applicantname || ''}</td>
        </tr>
        <tr>
            <td class="label">Department</td><td>${detail.header?.departmentname || ''}</td>
            <td class="label">Attachment</td><td>${detail.header?.AttachmentName || 'No Attachment'}</td>
        </tr>
        <tr>
            <td class="label">Currency</td><td>${detail.header?.transactioncurrency || ''}</td>
            <td class="label">Cost Center</td><td>${detail.header?.CostCenter || ''}</td>
        </tr>
        <tr>
            <td class="label">Payment Mode</td><td>${detail.header?.paymentmethodname || ''}</td>
            <td class="label">Claim Amt in TC</td><td>${detail.header?.ClaimAmountInTC?.toLocaleString('en-US', {
            style: 'decimal',
            minimumFractionDigits: 2
        }) || ''}</td>
        </tr>
        <tr>
            <td class="label">HOD</td><td>${detail.header?.HOD_Name || ''}</td>
            <td class="label">Supplier</td><td>${detail.header?.SupplierName || ''}</td>
        </tr>
    </table>
`;

        const detailRows = detail.details.map((row, index) => `
    <tr>
            <td>${index + 1}</td>
            <td>${row.claimtype || ''}</td>
            <td>${row.PaymentDescription || ''}</td>
            <td>${row.TotalAmount?.toLocaleString('en-US', { style: 'decimal', minimumFractionDigits: 2 }) || ''}</td>
            <td>${row.ExpenseDatevw || ''}</td>
            <td>${row.Purpose || ''}</td>
          </tr>
    `).join('');

        const claimTable = `
    <div style = "border-bottom: 1px solid #ccc;padding-top:5px;" ></div>
        <table class="claim-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Claim Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Expense Date</th>
                    <th>Purpose</th>
                </tr>
            </thead>
            <tbody>
                ${detailRows}
            </tbody>
        </table>
`;

        const remarksSection = `
    <div class="section-title" > Remarks</div>
        <div class="remarks-box">
            ${detail.header?.Remarks || ''}
        </div>
`;

        const statusIndicators = `

    <table class="status-table" >
          <thead>
           <tr class="status-header">
          <th colspan="3">Claim</th>
          <th colspan="3">PPP</th>
          <th colspan="2">Vouchers</th>
        </tr>
        <tr>
         <th>HOD</th> <th>GM</th><th>Director</th>
          <th>GM</th><th>Director</th><th>CEO</th>
          <th>Director</th><th>CEO</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          ${[
                detail.header?.ClmhodStatus,
                detail.header?.ClmgmStatus,
                detail.header?.ClmDrStatus,
                detail.header?.PPPgmStatus,
                detail.header?.PPPDrStatus,
                detail.header?.PPPCEOStatus,
                detail.header?.VouCmrStatus,
                detail.header?.VouDrStatus
            ].map((status) => {
                const symbol = getStatusSymbol(status);
                return `<td style="font-size: 16px;">${symbol}</td>`;
            }).join('')}
        </tr>
          </tbody>
        </table>

    <div class="legend" style="margin-top: 10px; font-size: 10px;">
        <span>✔ Approved</span>
        <span>✖ Discussed</span>
        <span>⏳ Yet to Act</span>
    </div>

`;


        printWindow.document.write(`
    <html>
            <head>
              <title>Claim Details</title>
              ${printStyles}
            </head>
            <body>
              ${headerInfo}
              ${claimTable}
              ${remarksSection}
              ${statusIndicators}
              
            </body>
          </html>
    `);


        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
    };

    const actionprBodyTemplate = (rowData) => {
        const prNo = rowData.prnumber || rowData.PR_NUMBER;
        if (!prNo || prNo === 'NA') return <span>{prNo || 'NA'}</span>;

        const prNumbers = prNo.split(',').map(p => p.trim()).filter(Boolean);
        const prIdsList = rowData.prIdsList || [];

        return (
            <span>
                {prNumbers.map((pr, index) => {
                    const prid = prIdsList[index];
                    const isLast = index === prNumbers.length - 1;
                    return (
                        <span key={index}>
                            {prid ? (
                                <span
                                    style={{ cursor: "pointer", color: "blue", fontWeight: "bold" }}
                                    onMouseEnter={(e) => e.target.style.textDecoration = "underline"}
                                    onMouseLeave={(e) => e.target.style.textDecoration = "none"}
                                    onClick={() => handlePRClick(prid)}
                                    title={`View ${pr}`}
                                >
                                    {pr}
                                </span>
                            ) : (
                                <span style={{ color: "#666" }}>{pr}</span>
                            )}
                            {!isLast && ", "}
                        </span>
                    );
                })}
            </span>
        );
    };

    const actionpoDetailsBodyTemplate = (rowData) => {
        return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
            onClick={() => {
                setIsPOOpenedFromDetail(true);
                handleShowPODetails(rowData);
            }}>{rowData.pono}</span>;
    };


    const getStatusSymbol = (status) => {
        switch (status) {
            case "Approved":
                return "✔"; // Green Tick
            case "Discussed":
                return "✖"; // Red Cross
            default:
                return "⏳"; // Pending Clock
        }
    };
    const DiscussBodyTemplate = (rowData) => {
        if (rowData.candiscuss == 1) {
            return (

                <PButton
                    icon="pi pi-comment"

                    className={`  btn-circle p-button-rounded ${rowData.isclaimant_discussed === 1 ? 'p-button-warning' : 'p-button-outlined'
                        } `}
                    style={{ padding: "4px" }}
                    onClick={() => {
                        setCurrentClaimId(rowData.Claim_ID);
                        toggleDiscussModal();
                    }}

                > </PButton>

            );
        } else {
            return (

                <PButton
                    icon="pi pi-comment"
                    disabled={true}
                    className={`  btn-circle p-button-rounded ${rowData.isclaimant_discussed === 1 ? 'p-button-warning' : 'p-button-outlined'
                        } `}
                    style={{ padding: "4px" }}

                > </PButton>

            );
        }
    };

    const saveDiscussion = async () => {

        if (selectedClaim?.Claim_ID == undefined || selectedClaim?.Claim_ID == null || selectedClaim?.Claim_ID == 0) {
            Swal.fire("Error", "No Claim has been selected.", "error");
            return;
        }
        if (!discussText.trim()) {
            Swal.fire("Error", "Discussion text is required.", "error");
            return;
        }

        try {
            const payload = {
                discuss: {
                    claimId: selectedClaim?.Claim_ID,
                    comment: "Reply > " + discussText,
                    discussedBy: UserData?.u_id || 0,
                }
            };

            // 👇 replace with your actual API
            const res = await DiscussClaimAndPayment(payload);

            if (res?.status) {
                Swal.fire("Saved", "Replied successfully.", "success");
                toggleRemarkModal();
                searchData(); // reload table
            } else {
                Swal.fire("Error", res?.message || "Failed to reply discussion.", "error");
            }
        } catch (err) {
            console.error("Error saving reply:", err);
            Swal.fire("Error", "An error occurred while saving.", "error");
        }
    };

    if (!access.loading && !access.canView) {
        return (
            <div style={{ background: "white", height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                <h3>You do not have permission to view this page.</h3>
            </div>
        );
    }

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Finance" breadcrumbItem=" Claim & Payment" />
                    <Row>
                        <Col lg="12">
                            <Card className="search-top">
                                <div className="row align-items-end g-1 quotation-mid">
                                    <div className="col-12 col-lg-3 mt-1">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="col-12 col-lg-4 col-md-4 col-sm-4 text-center">
                                                <label htmlFor="Search_Type" className="form-label mb-0">Search By</label></div>
                                            <div className="col-12 col-lg-8 col-md-8 col-sm-8">
                                                <Select
                                                    name="filtertype"
                                                    options={FilterTypes.map(f => ({ label: f.name, value: f.value }))}
                                                    placeholder="Select Filter Type"
                                                    classNamePrefix="select"
                                                    isClearable
                                                    value={selectedFilterType}
                                                    onChange={(selected) => {
                                                        setSelectedFilterType(selected);
                                                        setSelectedAutoItem(null);
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {selectedFilterType && (
                                        <div className="col-12 col-lg-4 mt-1">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="col-12 col-lg-4 col-md-4 col-sm-4 text-center">
                                                    <label className="form-label mb-0">{getDynamicLabel()}</label>
                                                </div>
                                                <div className="col-12 col-lg-8 col-md-8 col-sm-8">

                                                    {selectedFilterType?.value === 1 ? (
                                                        <Select
                                                            name="filtervalue"
                                                            options={autoSuggestionscate.map(f => ({ label: f.label, value: f.value }))}
                                                            placeholder={`Search ${getDynamicLabel()} `}
                                                            classNamePrefix="select"
                                                            isClearable
                                                            value={selectedAutoItem}
                                                            onChange={(selected) => setSelectedAutoItem(selected)}
                                                        />
                                                    ) : selectedFilterType?.value === 3 ? (
                                                        <Select
                                                            name="filtervalue"
                                                            options={autoSuggestionscurr.map(f => ({ label: f.Currency, value: f.currencyid }))}
                                                            placeholder={`Search ${getDynamicLabel()} `}
                                                            classNamePrefix="select"
                                                            isClearable
                                                            value={selectedAutoItem}
                                                            onChange={(selected) => setSelectedAutoItem(selected)}
                                                        />

                                                    ) : selectedFilterType?.value === 4 ? (
                                                        <Select
                                                            name="filtervalue"
                                                            options={autoSuggestionsclaimtype.map(f => ({ label: f.label, value: f.value }))}
                                                            placeholder={`Search ${getDynamicLabel()} `}
                                                            classNamePrefix="select"
                                                            isClearable
                                                            value={selectedAutoItem}
                                                            onChange={(selected) => setSelectedAutoItem(selected)}
                                                        />

                                                    )
                                                        : (
                                                            <Select
                                                                name="filtervalue"
                                                                options={autoSuggestionsdept.map(f => ({ label: f.label, value: f.value }))}
                                                                placeholder={`Search ${getDynamicLabel()} `}
                                                                classNamePrefix="select"
                                                                isClearable
                                                                value={selectedAutoItem}
                                                                onChange={(selected) => setSelectedAutoItem(selected)}
                                                            />
                                                        )}

                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* {SelectedFilter == 0 && (
                                    <div className="col-12 col-lg-4 mt-1">
                                    </div>
                                )}
                                {SelectedFilter == 2 && (

                                    <div className="col-12 col-lg-4 mt-1">
                                        <div className="d-flex align-items-center gap-2">



                                            <div className="col-12 col-lg-4 col-md-4 col-sm-4 text-center">
                                                <label htmlFor="PO_ID" className="form-label mb-0">PO</label></div>
                                            <div className="col-12 col-lg-8 col-md-8 col-sm-8">

                                                <Input type="text" name="PO" id="PO" value={salesOrderFilter.PO || ""} onChange={handleInputChange}  ></Input>

                                            </div>
                                        </div>
                                    </div>
                                )}
                                {SelectedFilter == 1 && (


                                    <div className="col-12 col-lg-4 mt-1">
                                        <div className="d-flex align-items-center gap-2">



                                            <div className="col-12 col-lg-4 col-md-4 col-sm-4 text-center">
                                                <label htmlFor="SO_ID" className="form-label mb-0">Customer</label></div>
                                            <div className="col-12 col-lg-8 col-md-8 col-sm-8">
                                                <Select
                                                    name="FCustomerId"
                                                    id="FCustomerId"
                                                    options={CustomerList}
                                                    value={CustomerList.find(option => option.value === salesOrderFilter.FCustomerId) || null}
                                                    onChange={option => handleCustomerChange(option)}
                                                    classNamePrefix="select"
                                                    isDisabled={isDisabled}
                                                    isLoading={isLoading}
                                                    isClearable={isClearable}
                                                    isRtl={isRtl}
                                                    isSearchable={isSearchable}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )} */}
                                    {/* <div className="col-12 col-lg-2 mt-1">
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="col-12 col-lg-3 col-md-4 col-sm-4 text-center">
                                            <label htmlFor="fromDate" className="form-label mb-0">From</label>
                                        </div>
                                        <div className="col-12 col-lg-9 col-md-8 col-sm-8">
                                            <FormGroup>
                                                <Label></Label>
                                                <InputGroup>
                                                    <Flatpickr
                                                        name="FromDate"
                                                        id="FromDate"
                                                        className="form-control d-block"
                                                        placeholder="dd-mm-yyyy"
                                                        options={{
                                                            altInput: true,
                                                            altFormat: "d-M-Y",
                                                            dateFormat: "Y-m-d",
                                                        }}
                                                        value={salesOrderFilter.FromDate}
                                                        onChange={handleDateChange}
                                                        style={{ cursor: "default" }}
                                                    />
                                                </InputGroup>
                                            </FormGroup>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-12 col-lg-2 mt-1">
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="col-12 col-lg-3 col-md-4 col-sm-4 text-center">
                                            <label htmlFor="toDate" className="form-label mb-0">To</label>
                                        </div>
                                        <div className="col-12 col-lg-9 col-md-8 col-sm-8">
                                            <FormGroup>
                                                <Label></Label>
                                                <InputGroup>
                                                    <Flatpickr
                                                        name="ToDate"
                                                        id="ToDate"
                                                        className="form-control d-block"
                                                        placeholder="dd-mm-yyyy"
                                                        options={{
                                                            altInput: true,
                                                            altFormat: "d-M-Y",
                                                            dateFormat: "Y-m-d",
                                                        }}
                                                        value={salesOrderFilter.ToDate}
                                                        onChange={handleDateChange}
                                                    />
                                                </InputGroup>
                                            </FormGroup>
                                        </div>
                                    </div>
                                </div> */}
                                    <div className={`col-12 ${selectedFilterType ? 'col-lg-5' : 'col-lg-9'} d-flex justify-content-end flex-wrap gap-2`} >
                                        <button type="button" className="btn btn-info" onClick={searchData}> <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search</button>
                                        <button type="button" className="btn btn-danger" onClick={cancelFilter}><i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Cancel</button>
                                        <button type="button" className="btn btn-secondary" onClick={exportToExcel}> <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Export</button>
                                        <button type="button" data-access="print" className="btn btn-primary" onClick={handlePrint}>
                                            <i className="bx bx-printer label-icon font-size-16 align-middle me-2"></i> Print
                                        </button>

                                        <button type="button" className="btn btn-success" onClick={dAddOrder}><i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i>New</button>
                                    </div>
                                </div>
                            </Card>
                        </Col>
                        <Col lg="12">
                            <Card >

                                <DataTable paginator rows={access.records || 10} rowClassName={(rowData) => {
                                    const isDelReq = rowData?.is_delete_required === 1 || rowData?.isDeleteRequired === 1;
                                    const isRejected = rowData?.IsReject === 1;
                                    return isDelReq ? "Grey-row" : isRejected ? "Discussed-row" : "";
                                }} value={salesOrder} showGridlines loading={loading} dataKey="Claim_ID"
                                    filters={filters} globalFilterFields={['purpose', 'claimdate', 'claimno', 'claimcategory', 'applicantname', 'departmentname', 'transactioncurrency', 'claimamountintc', 'Status', 'PaymentNo']} header={header}
                                    emptyMessage="No records found." onFilter={(e) => setFilters(e.filters)} className='blue-bg' sortField="ReqDate" sortOrder={-1} >
                                    <Column field="claimno" sortable body={actionclaimBodyTemplate} header="Claim #" filter className="text-left" filterPlaceholder="Search by Claim" />
                                    <Column field="claimdate" sortField="claimdateTimestamp" sortable header="Claim Date" filter className="text-left" filterPlaceholder="Search by Claim Date" />
                                    <Column field="purpose" body={actionpurposeBodyTemplate} header="Purpose" className="text-center" />

                                    <Column field="claimcategory" sortable header="Category Type" filter filterPlaceholder="Search by Category" style={{ width: '155px' }} className="text-left" />

                                    <Column field="applicantname" sortable header="Applicant Name" filter filterPlaceholder="Search by Applicant Name"
                                        className="text-left" />
                                    <Column field="departmentname" sortable header="Department" filter filterPlaceholder="Search by Department" bodyClassName="text-left" />
                                    <Column field="transactioncurrency" sortable header="Transaction Currency" filter filterPlaceholder="Search by Transaction Currency" className="text-left" />
                                    {access.canViewRate && (
                                        <Column field="claimamountintc" sortable header="Claim Amount in TC" className="text-end"
                                            body={(rowData) =>
                                                rowData.claimamountintc?.toLocaleString('en-US', {
                                                    style: 'decimal',
                                                    minimumFractionDigits: 2
                                                })
                                            }
                                        />
                                    )}
                                    {/* <Column field="totalamountinidr" header="Claim Amount in IDR" className="text-end"  
                                        body={(rowData) =>
                                            rowData.totalamountinidr?.toLocaleString('en-US', {
                                            style: 'decimal',
                                            minimumFractionDigits: 2
                                            })
                                        }
                                    /> */}
                                    <Column field="paymentmethodname" sortable header="Mode of Payment" filter filterPlaceholder="Search by Mode" className="text-left" />
                                    <Column field="Status" sortable header="Status" filterMenuStyle={{ width: '14rem' }} body={statusBodyTemplate} filter filterElement={statusFilterTemplate} className="text-center" />
                                    <Column header="PPP" sortable field="PaymentNo" className="text-center" />
                                    <Column header="PV" sortable field="voucherno" body={actionAckBodyTemplate} className="text-center" />
                                    <Column header="History" showFilterMatchModes={false} body={RemarksBodyTemplate} className="text-center" />

                                    <Column header="Action" showFilterMatchModes={false} body={actionBodyTemplate} className="text-center" />
                                    <Column header="Copy" showFilterMatchModes={false} body={CopyBodyTemplate} className="text-center" />
                                    {/* <Column header="Discuss" body={DiscussBodyTemplate} className="text-center" /> */}

                                </DataTable>
                                <div ref={printRef} style={{ display: 'none' }} id="printableArea">
                                    <h4>Sales Order List</h4>
                                    <table border="1" cellPadding="8" cellSpacing="0" width="100%">
                                        <thead>

                                            <tr>
                                                <th>System Seq. No.</th>
                                                <th>SO Date</th>
                                                <th>Customer Name</th>
                                                <th>Gas Code</th>
                                                <th>Gas Description</th>
                                                <th>Qty</th>
                                                <th>Delivery Address</th>
                                                <th>Delivery Instruction</th>
                                                <th>Delivery Req Date</th>
                                                <th>Ordered By</th>
                                                <th>PO No.</th>
                                                <th>SQ No.</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {salesOrder && salesOrder.map((order, idx) => (
                                                <tr key={idx}>
                                                    <td>{order.SO_Number}</td>
                                                    <td>{order.SO_Date}</td>
                                                    <td>{order.customername}</td>
                                                    <td>{order.GasCode}</td>
                                                    <td>{order.GasDescription}</td>
                                                    <td className="text-end">{order.qty}</td>
                                                    <td>{order.DeliveryAddress}</td>
                                                    <td>{order.DeliveryInstruction}</td>
                                                    <td>{order.DeliveryReqDate}</td>
                                                    <td>{order.OrderBy}</td>
                                                    <td>{order.POnumber}</td>
                                                    <td>{order.SQ_No}</td>
                                                    <td>{order.Status}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>

            <Modal isOpen={remarkModalOpen} toggle={toggleRemarkModal} size="lg">
                <ModalHeader toggle={toggleRemarkModal}>Discussion Point (DP) </ModalHeader>
                <ModalBody>
                    {remarksData?.length > 0 ? (
                        <Table className="table table-bordered">
                            <thead>
                                <tr className="table-primary">
                                    <th className="text-center">#</th>
                                    <th className="text-center">User</th>
                                    <th className="text-center">Comment</th>
                                    <th className="text-center">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {remarksData.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{item.username}</td>
                                        <td>{item.claim_comment}</td>
                                        <td>{item.logdate}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <p>No remarks available.</p>
                    )}

                    {selectedClaim?.candiscuss == 1 && (
                        <div>
                            <Input
                                type="textarea"
                                rows="4"
                                maxLength={200}
                                value={discussText}
                                onChange={(e) => setDiscussText(e.target.value)}
                                placeholder="Enter your discussion (max 200 characters)"
                            />
                            <small className="text-muted">{discussText.length}/200</small></div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={toggleRemarkModal}>Close</Button>
                    {selectedClaim?.candiscuss == 1 && (
                        <Button color="success" onClick={saveDiscussion}>Reply</Button>
                    )}
                </ModalFooter>
            </Modal>
            <Modal isOpen={discussModalOpen} toggle={toggleDiscussModal}>
                <ModalHeader toggle={toggleDiscussModal}>Add Discussion</ModalHeader>
                <ModalBody>
                    <Input
                        type="textarea"
                        rows="4"
                        maxLength={200}
                        value={discussText}
                        onChange={(e) => setDiscussText(e.target.value)}
                        placeholder="Enter your discussion (max 200 characters)"
                    />
                    <small className="text-muted">{discussText.length}/200</small>
                </ModalBody>
                <ModalFooter>
                    <Button color="success" onClick={saveDiscussion}>Discuss</Button>
                    <Button color="danger" onClick={toggleDiscussModal}>Close</Button>

                </ModalFooter>
            </Modal>

            <Modal isOpen={showvoucherModal} toggle={togglevoucherModal} size="xl">
                <ModalHeader toggle={togglevoucherModal}>Voucher</ModalHeader>
                <ModalBody>

                    {selectedVoucherId && (
                        <PaymentVoucher VoucherId={selectedVoucherId} />
                    )}
                </ModalBody>
            </Modal>

            <Modal
                isOpen={isModalOpen}
                role="dialog"
                autoFocus
                centered
                toggle={toggleModal}
                size="lg"
                className="exampleModal"
            >
                <div className="modal-content">
                    <ModalHeader toggle={toggleModal}>SO Delivery Details</ModalHeader>
                    <ModalBody>
                        <div className="table-responsive">
                            <Table className="table align-middle table-bordered">
                                <thead className="table-light">
                                    <tr>
                                        <th className="text-center">SO</th>
                                        <th className="text-center">Gas Code</th>
                                        <th className="text-center">Delivery Date</th>

                                    </tr>
                                </thead>
                                <tbody>
                                    {Gasdeliverydetails.length > 0 ? (
                                        Gasdeliverydetails.map((item, index) => (
                                            <tr key={index}>
                                                <td className="text-center">{item.SO_Number}</td>
                                                <td className="text-center"> {item.GasCode}</td>
                                                <td className="text-center">{item.ReqDeliveryDate}</td>

                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="3" className="text-center">
                                                No data available
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleModal}>
                            Close
                        </Button>
                    </ModalFooter>
                </div>
            </Modal>


            <Modal isOpen={detailVisible} toggle={() => setDetailVisible(false)} size="xl">
                <div style={{ position: 'relative' }}>
                    {selectedDetail?.header?.ClaimCategoryId === 3 && (
                        <span style={{ position: 'absolute', top: '15px', right: '50px', fontWeight: 'bold', color: '#333', fontSize: '12px', zIndex: 10 }}>F-BTG-PUR-05 (Rev.03)</span>
                    )}
                    <ModalHeader toggle={() => setDetailVisible(false)}>Claim Details</ModalHeader>
                </div>
                <ModalBody>


                    {/* {selectedDetail!=undefined && selectedDetail !=null && selectedDetail.header !=undefined && selectedDetail.header !=null && ( */}
                    {1 == 1 && (
                        <>
                            <Row form>
                                {[
                                    ["Category Type ", selectedDetail.header?.claimcategory],
                                    ["Application Date", selectedDetail.header?.ApplicationDatevw],
                                    ["Application No", selectedDetail.header?.ApplicationNo],
                                    ["Department ", selectedDetail.header?.departmentname],
                                    ["Applicant ", selectedDetail.header?.applicantname],
                                    // ["Job Title", selectedDetail.header?.JobTitle], // Removed as per request
                                    // ["HOD", selectedDetail.header?.HOD_Name], // Moved down

                                    // Attachment moved up
                                    ["Attachment ", selectedDetail.header?.AttachmentName ? (
                                        <button
                                            type="button"
                                            className="btn d-flex align-items-center justify-content-between"
                                            onClick={handleDownloadFile}
                                            key="attachment"
                                            style={{
                                                height: "10px",
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            <span
                                                style={{
                                                    flexGrow: 1,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                    color: "blue"
                                                }}
                                                title={fileName}
                                            >
                                                {fileName}
                                            </span>
                                            <i className="mdi mdi-cloud-download mdi-24px text-primary ms-2"></i>
                                        </button>
                                    ) : (
                                        "No Attachment"
                                    )
                                    ],

                                    ["Trans Currency ", selectedDetail.header?.transactioncurrency],

                                    ["HOD", selectedDetail.header?.HOD_Name], // Swapped with Attachment


                                    ["Supplier", selectedDetail.header?.SupplierName], // Swapped with Payment Mode

                                    ["Cost Center", selectedDetail.header?.CostCenter],
                                    // ["Claim Amt in TC", <span key="amtintc"> {selectedDetail.header?.ClaimAmountInTC?.toLocaleString('en-US', {
                                    //     style: 'decimal',
                                    //     minimumFractionDigits: 2
                                    // })}</span>],
                                    access?.canViewRate
                                        ? [
                                            "Claim Amt in TC",
                                            <span key="amtintc">
                                                {selectedDetail.header?.ClaimAmountInTC?.toLocaleString("en-US", {
                                                    style: "decimal",
                                                    minimumFractionDigits: 2,
                                                })}
                                            </span>,
                                        ]
                                        : null,
                                    ["Payment Mode", selectedDetail.header?.paymentmethodname],

                                ].filter(Boolean).map(([label, val], i) => (
                                    <Col md="4" key={i} className="form-group row ">
                                        <Label className="col-sm-4 col-form-label bold">{label}</Label>
                                        <Col sm="8" className="mt-2">: {val}</Col>
                                    </Col>
                                ))}
                            </Row>
                            <hr />
                            <DataTable value={selectedDetail.details} paginator rows={access.records || 10}>
                                <Column headerStyle={{ textAlign: 'center' }} header="#" body={(_, { rowIndex }) => rowIndex + 1} />

                                {(selectedDetail.header?.ClaimCategoryId === 3) && (

                                    <Column
                                        field="pono"
                                        header="PO No"

                                        className="text-left"
                                        style={{ width: "10%" }}
                                        body={actionpoDetailsBodyTemplate}
                                    />
                                )}
                                {(selectedDetail.header?.ClaimCategoryId === 3) && (
                                    <Column
                                        field="prnumber"
                                        header="PR No"
                                        className="text-left"
                                        style={{ width: "10%" }}
                                        body={actionprBodyTemplate}
                                    />
                                )}
                                <Column headerStyle={{ textAlign: 'center' }} field="claimtype" header="Claim Type" />
                                <Column headerStyle={{ textAlign: 'center' }} field="PaymentDescription" header="Claim & Payment Description" />
                                {access.canViewRate && (
                                    <Column style={{ textAlign: "right" }} field="TotalAmount" header="Amount"
                                        body={(rowData) =>
                                            rowData.TotalAmount?.toLocaleString('en-US', {
                                                style: 'decimal',
                                                minimumFractionDigits: 2
                                            })
                                        } />
                                )}
                                <Column headerStyle={{ textAlign: 'center' }} field="ExpenseDatevw" header="Expense Date" />
                                <Column headerStyle={{ textAlign: 'center' }} field="Purpose" header="Purpose" />


                            </DataTable>

                            <Row className="mt-3">
                                <Col>
                                    <Label>Remarks</Label>
                                    <Input type="textarea" rows="2" disabled value={selectedDetail.header?.Remarks} />
                                </Col>
                            </Row>







                            <Row className="mt-3">
                                <Col>


                                    <Table className="table mt-3" style={{ width: "76%" }}>
                                        <thead style={{ backgroundColor: "#3e90e2" }}>
                                            {/* <table className="table table-bordered text-center">
                                    <thead> */}
                                            <tr>
                                                <th style={{ padding: "0px", width: "18%", backgroundColor: "#B4DBE0" }} className="text-center" colSpan="3">Claim</th>
                                                <th style={{ padding: "0px", width: "18%", backgroundColor: "#E6E4BC" }} className="text-center" colSpan="3">PPP</th>
                                                <th style={{ padding: "0px", width: "10%", backgroundColor: "#FFE9F5" }} className="text-center" colSpan="2">Vouchers</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <th style={{ padding: "0px", backgroundColor: "#B4DBE0" }} className="text-center">HOD</th>
                                                <th style={{ padding: "0px", backgroundColor: "#B4DBE0" }} className="text-center">GM</th>
                                                <th style={{ padding: "0px", backgroundColor: "#B4DBE0" }} className="text-center">Director</th>
                                                <th style={{ padding: "0px", backgroundColor: "#E6E4BC" }} className="text-center">GM</th>
                                                <th style={{ padding: "0px", backgroundColor: "#E6E4BC" }} className="text-center">Director</th>
                                                <th style={{ padding: "0px", backgroundColor: "#E6E4BC" }} className="text-center">CEO</th>
                                                <th style={{ padding: "0px", backgroundColor: "#FFE9F5" }} className="text-center">Director</th>
                                                <th style={{ padding: "0px", backgroundColor: "#FFE9F5" }} className="text-center">CEO</th>

                                            </tr>
                                            <tr>
                                                <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.ClmhodStatus)} `} /></td>

                                                <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.ClmgmStatus)} `} /></td>
                                                <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.ClmDrStatus)} `} /></td>
                                                <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.PPPgmStatus)} `} /></td>
                                                <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.PPPDrStatus)} `} /></td>
                                                <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.PPPCEOStatus)} `} /></td>
                                                <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.VouCmrStatus)} `} /> </td>
                                                <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.VouDrStatus)} `} /> </td>
                                            </tr>
                                        </tbody>
                                    </Table>

                                    <br />
                                </Col>
                            </Row>

                            <Row className="mt-3">
                                <Col>

                                    <div className="col-12 col-lg-6 text-left" >
                                        <span className="me-3">
                                            <Button

                                                className={`btn-circle p-button-rounded btn btn-success`}

                                            /> Approved</span>
                                        <span className="me-3"><Button

                                            className={`btn-circle p-button-rounded  btn btn-warning`}
                                        /> Discussed</span>

                                        <span className="me-3"><Button className={`btn-circle p-button-rounded  btn btn-secondary`} /> Yet to Act </span>
                                    </div>
                                    <div className="col-12 col-lg-6 text-end"></div>
                                </Col>
                            </Row>
                        </>
                    )}


                </ModalBody>
                <ModalFooter>

                    {selectedDetail?.header?.ClaimCategoryId === 3 && (
                        <button
                            type="button"
                            className="btn btn-success"
                            onClick={handleOpenPaymentHistory}
                        >
                            <i className="mdi mdi-eye font-size-16 me-2"></i> Payment History

                        </button>
                    )}

                    <button
                        type="button"
                        data-access="print"
                        className="btn btn-primary"
                        onClick={() => handleDetailsPrint()}
                    >
                        <i className="mdi mdi-printer font-size-16 me-2"></i> Print
                    </button>
                    <button type="button" className="btn btn-danger" onClick={() => setDetailVisible(false)}> <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close</button>

                </ModalFooter>
            </Modal>

            <Modal isOpen={showPaymentHistoryModal} toggle={togglePaymentHistoryModal} size="xl">
                <ModalHeader toggle={togglePaymentHistoryModal}>Payment History</ModalHeader>
                <ModalBody>
                    {selectedSupplierForHistory ? (
                        <PaymentHistory
                            irnId={selectedSupplierForHistory}
                            poNo={selectedDetail?.header?.PONo}
                            supplierName={selectedDetail?.header?.SupplierName}
                        />
                    ) : (
                        <div>No supplier selected.</div>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="danger" onClick={togglePaymentHistoryModal}>Close</Button>
                </ModalFooter>
            </Modal>


            <Modal isOpen={POdetailVisible} toggle={() => setPODetailVisible(false)} size="xl">
                <ModalHeader toggle={() => setPODetailVisible(false)}>Purchase Order Details</ModalHeader>
                <ModalBody>
                    {selectedPODetail && (
                        <>
                            {/* PO Header Section */}
                            <Row form>
                                {[
                                    ["PO No.", selectedPODetail.Header?.pono],
                                    ["PO Date", formatpoDate(selectedPODetail.Header?.podate)],
                                    ["Supplier", selectedPODetail.Header?.suppliername],
                                    ["Currency", selectedPODetail.Header?.currencycode],
                                    ["PR No.", selectedPODetail.Header?.PRConcat], // concat of all PRs
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
                                                    const prConcat = selectedPODetail.Header?.PRConcat || "";
                                                    const prIdsList = selectedPODetail.Header?.PRIdsList || [];

                                                    if (!prConcat || prConcat === "NA" || prConcat.trim() === "") {
                                                        return "N/A";
                                                    }

                                                    const prNumbers = prConcat.split(","); // Safe now

                                                    return (
                                                        <span>
                                                            {prNumbers.map((prNumber, index) => {
                                                                const cleanPR = prNumber.trim();
                                                                if (!cleanPR) return null;

                                                                const prid = prIdsList[index];
                                                                const isLast = index === prNumbers.length - 1;

                                                                return (
                                                                    <span key={index}>
                                                                        {prid ? (
                                                                            <a
                                                                                href="#"
                                                                                style={{
                                                                                    color: isPOOpenedFromDetail ? "#666" : "#007bff",
                                                                                    textDecoration: isPOOpenedFromDetail ? "none" : "underline",
                                                                                    cursor: isPOOpenedFromDetail ? "default" : "pointer",
                                                                                }}
                                                                                onClick={(e) => {
                                                                                    e.preventDefault();
                                                                                    if (!isPOOpenedFromDetail) {
                                                                                        handlePRClick(prid); // Opens correct PR
                                                                                    }
                                                                                }}
                                                                                title={`View ${cleanPR} `}
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

                            <DataTable value={selectedPODetail.Requisition} paginator rows={access.records || 10}>
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

                                />
                                <Column field="uom" header="UOM" />
                                <Column
                                    field="unitprice"
                                    header="Unit Price"
                                    body={(rowData) =>
                                        rowData.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    bodyStyle={{ textAlign: "right" }}
                                    headerStyle={{ textAlign: "right" }}
                                    footer={selectedPODetail.Header?.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    footerStyle={{ textAlign: "right" }}
                                />

                                <Column
                                    field="discountvalue"
                                    header="Discount"
                                    body={(rowData) =>
                                        rowData.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    bodyStyle={{ textAlign: "right" }}
                                    headerStyle={{ textAlign: "right" }}
                                    footer={selectedPODetail.Header?.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    footerStyle={{ textAlign: "right" }}
                                />

                                <Column field="taxperc" header="Tax %" bodyStyle={{ textAlign: "right" }} headerStyle={{ textAlign: "right" }} />

                                <Column
                                    field="taxvalue"
                                    header="Tax Amt"
                                    body={(rowData) =>
                                        rowData.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    bodyStyle={{ textAlign: "right" }}
                                    headerStyle={{ textAlign: "right" }}
                                    footer={selectedPODetail.Header?.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    footerStyle={{ textAlign: "right" }}
                                />

                                <Column field="vatperc" header="VAT %" bodyStyle={{ textAlign: "right" }} headerStyle={{ textAlign: "right" }} />

                                <Column
                                    field="vatvalue"
                                    header="VAT Amt"
                                    body={(rowData) =>
                                        rowData.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                                    }
                                    bodyStyle={{ textAlign: "right" }}
                                    headerStyle={{ textAlign: "right" }}
                                    footer={selectedPODetail.Header?.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                                    footerStyle={{ textAlign: "right" }}
                                />

                                <Column
                                    field="nettotal"
                                    header="Total Amt"
                                    body={(rowData) =>
                                        <span style={{ color: "#ff5a00" }}>{rowData.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                                    }
                                    bodyStyle={{ color: "#ff5a00", textAlign: "right" }}
                                    headerStyle={{ textAlign: "right" }}
                                    footer={<b style={{ color: "#ff5a00" }}>{selectedPODetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>}
                                    footerStyle={{ color: "#ff5a00", textAlign: "right" }}
                                />
                            </DataTable>

                        </>
                    )}
                </ModalBody>

                <ModalFooter>
                    <button type="button" className="btn btn-danger" onClick={() => setPODetailVisible(false)}>
                        <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Close
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
                                    ["PR Date", formatDatePR(selectedPRDetail.Header?.PRDate)],
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
                                    <Col md="4" key={i} className="form-group row ">
                                        <Label className="col-sm-5 col-form-label bold">{label}</Label>
                                        <Col sm="7" className="mt-2">
                                            : {label === "Supplier" ? (
                                                <b>{val || "N/A"}</b>
                                            ) : label === "Currency" ? (
                                                <span style={{ color: "green", fontWeight: "bold" }}>{val || "N/A"}</span>
                                            ) : (
                                                val || "N/A"
                                            )}
                                        </Col>
                                    </Col>
                                ))}
                            </Row>

                            <hr />

                            <DataTable value={selectedPRDetail.Details} paginator rows={access.records || 10} footerColumnGroup={
                                <ColumnGroup>
                                    <Row>
                                        <Column footer="GRAND TOTAL" colSpan={6} footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footer={<b>{selectedPRDetail.Header?.HeaderDiscountValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                                        <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footer={<b>{selectedPRDetail.Header?.HeaderTaxValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                                        <Column footerStyle={{ textAlign: 'right', fontWeight: 'bold' }} />
                                        <Column footer={<b>{selectedPRDetail.Header?.HeaderVatValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
                                        <Column footer={<b style={{ color: "#ff5a00" }}>{selectedPRDetail.Header?.HeaderNetValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} footerStyle={{ color: "#ff5a00" }} />
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
                                <Column field="NetTotal" header="Total Amount" body={(row) => <span style={{ color: "#ff5a00" }}>{row.NetTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>} bodyStyle={{ color: "#ff5a00" }} />
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
                                    <DataTable tableStyle={{ width: "60%" }} value={selectedPRDetail.Attachment} paginator rows={access.records || 10}>
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
            <DiscussionHistoryModal
                isOpen={discussionHistoryModalOpen}
                toggle={() => setDiscussionHistoryModalOpen(false)}
                claimId={currentDiscussionClaimId}
                currentUser={UserData}
                mode="APPLICANT"
                onSuccess={() => {
                    loadData();
                }}
            />
        </React.Fragment>
    )
}
export default ManageClaimsPayment
