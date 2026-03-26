import {
  Col,
  Row,
  Label, Input, InputGroup, Table
} from "reactstrap";
import PaymentVoucher from "./PaymentVoucher";
import Breadcrumbs from "../../components/Common/Breadcrumb"
import { Dialog } from 'primereact/dialog';
import { Calendar } from 'primereact/calendar';
import { Tag } from "primereact/tag";
import { RadioButton } from 'primereact/radiobutton';
import { Checkbox } from 'primereact/checkbox';
import React, { useState, useEffect, useRef } from "react";
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { FilterOperator } from 'primereact/api';
import "primereact/resources/themes/bootstrap4-light-blue/theme.css";
import "flatpickr/dist/themes/material_blue.css";
import Flatpickr from "react-flatpickr";
import { Container, Card } from "reactstrap";
import { Accordion, AccordionTab } from "primereact/accordion"; // Accordion tabs :contentReference[oaicite:4]{index=4}
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { ColumnGroup } from "primereact/columngroup";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Tooltip } from "primereact/tooltip";
import { Button } from "primereact/button";
import { FilterMatchMode } from "primereact/api";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { Badge } from 'primereact/badge';
import PaymentSummaryTable from './PaymentSummaryTable';
import DiscussionHistoryModal from "./DiscussionHistoryModal"; // ✅ No curly braces
import useAccess from "../../common/access/useAccess";

import {
  DownloadFileById, ClaimAndPaymentGetById, Getclaimapprovaldetails,
  Getclaimhistorydetails, SaveClaimApprove, GetApprovalSettings, ClaimReject, getClaimDetailsById
  , GetPRNoBySupplierAndCurrency, GetByIdPurchaseOrder, GetByIdPurchaseRequisition, AutoApprove, GetPVHistoryDetails
} from "common/data/mastersapi";

import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { object } from "prop-types";


const getUserDetails = () => {
  if (localStorage.getItem("authUser")) {
    const obj = JSON.parse(localStorage.getItem("authUser"))
    return obj;
  }
}

const ManageApproval = ({ selectedType, setSelectedType }) => {
  const [previewUrl, setPreviewUrl] = useState("");

  const { access, applyAccessUI } = useAccess("Claim", "Approval");

  useEffect(() => {
    if (!access.loading) {
      applyAccessUI();
    }
  }, [access, applyAccessUI]);



  const [fileName, setFileName] = useState("");
  const types = [
    "Claim Approval",
    "Payment Plan",
    "PPP",
    "PPP Approval"
  ];
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimModalData, setClaimModalData] = useState([]);

  const [gmCommentMap, setGmCommentMap] = useState({});
  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  const defaultFrom = new Date();


  const [historyRange, setHistoryRange] = useState({ from: new Date(), to: new Date() });
  const [historyForType, setHistoryForType] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState({});
  const [showGmModal, setGmShowModal] = useState(false);
  const [claims, setclaims] = useState([]);
  const [claimsPPP, setclaimsPPP] = useState([]);

  useEffect(() => {
    if (claims && claims.length > 0) {
      const hasLimitReached = claims.some(item =>
        item.hod_discussed_count === 3 ||
        item.gm_discussed_count === 3 ||
        item.director_discussed_count === 3
      );

      if (hasLimitReached) {
        Swal.fire("Attention", "It's already the 3 rd discussion point,delete icon is enabled,you can delete the claim", "warning");
      }
    }
  }, [claims]);
  const [roledetails, setroledetails] = useState([]);
  const [historyArray, sethistoryArray] = useState([]);
  const [selectedPPPRows, setSelectedPPPRows] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyClaimId, setHistoryClaimId] = useState(null);

  const [historyMode, setHistoryMode] = useState("HOD");
  const [senderRole, setSenderRole] = useState("");

  // PPP PV History state
  const [pvHistoryModalOpen, setPvHistoryModalOpen] = useState(false);
  const [pvHistoryData, setPvHistoryData] = useState([]);

  const handleHodDiscuss = (rowData) => {
    setHistoryClaimId(rowData.id);
    setHistoryMode("HOD");
    setHistoryModalOpen(true);
  };

  const handleHodGmDiscuss = (rowData, role) => {
    setHistoryClaimId(rowData.id);
    setHistoryMode("HOD_GM");
    setSenderRole(role);
    setHistoryModalOpen(true);
  };

  const handleGmDirectorDiscuss = (rowData, role) => {
    setHistoryClaimId(rowData.id);
    setHistoryMode("GM_DIRECTOR");
    setSenderRole(role);
    setHistoryModalOpen(true);
  };

  const [showModalPPP, setShowModalPPP] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [action1, setAction1] = useState({});
  const [action2, setAction2] = useState({});
  const [action3, setAction3] = useState({});
  const [selectedapprover, setselectedapprover] = useState({});
  const [pppAction1, setPPPAction1] = useState({});
  const [pppAction2, setPPPAction2] = useState({});
  const [pppAction3, setPPPAction3] = useState({});

  const [PPPPVAction1, setPPPPVAction1] = useState({});
  const [PPPPVAction2, setPPPPVAction2] = useState({});
  const [UserData, setUserData] = useState(null);
  const [globalFilter, setGlobalFilter] = useState("");

  const exportToExcel = () => {
    // Flatten all claims grouped by type
    const allClaims = Object.entries(grouped)
      .flatMap(([type, items]) => items.map(item => ({
        Type: type,
        "Claim #": item.claimno,
        "Claim Date": item.date,
        "Applicant Name": item.name,
        "Applicant Department": item.dept,
        "Claim Amount in TC": item.amount,
        "Currency": item.curr,
        "GM Status": item.approvedone === 1 ? 'Approved' : item.discussedone === 1 ? 'Discussed' : 'Pending',
        "Director Status": item.approvedtwo === 1 ? 'Approved' : item.discussedtwo === 1 ? 'Discussed' : 'Pending',
        "Remarks": item.comment || ''
      })));

    const worksheet = XLSX.utils.json_to_sheet(allClaims);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Claim Approval");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    });

    const blob = new Blob([excelBuffer], {
      type: "application/octet-stream"
    });

    saveAs(blob, "Claim_Approval.xlsx");
  };


  const [showvoucherModal, setShowvoucherModal] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState(null);



  const [cashInHand, setCashInHand] = useState("");
  const [cashFromSales, setCashFromSales] = useState("");
  const [selectedSumary, setselectedSumary] = useState(null);
  const [Seqno, setSeqno] = useState("");
  const [convertFromDate, setConvertFromDate] = useState(null);
  const [convertToDate, setConvertToDate] = useState(null);
  const [convertModalVisible, setConvertModalVisible] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectedsummaryRows, setselectedsummaryRows] = useState([]);
  const [showDiscussModal, setShowDiscussModal] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [selectedSummaryId, setSelectedSummaryId] = useState({});
  const [POdetailVisible, setPODetailVisible] = useState(false);
  const [selectedPODetail, setSelectedPODetail] = useState({});

  const [prDetailVisible, setPrDetailVisible] = useState(false);
  const [selectedPRDetail, setSelectedPRDetail] = useState(null);
  const formatDatePR = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(/ /g, "-"); // e.g. "29-Aug-2025"
  };

  const formatpoDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).replace(/ /g, "-"); // e.g. "29-Aug-2025"
  };


  // PPP PV History handler
  const handleViewPVHistory = async (summaryId) => {
    try {
      const res = await GetPVHistoryDetails(summaryId, UserData?.branchid || 1, UserData?.orgid || 1);
      console.log("PV History raw response:", JSON.stringify(res));

      // Handle different response structures from .NET API
      let historyItems = [];
      if (res?.data && Array.isArray(res.data)) {
        historyItems = res.data;
      } else if (res?.Data && Array.isArray(res.Data)) {
        historyItems = res.Data;
      } else if (Array.isArray(res)) {
        historyItems = res;
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        historyItems = res.data.data;
      }

      console.log("PV History parsed items:", historyItems);

      // Always open the modal so user can see the history
      setPvHistoryData(historyItems);
      setPvHistoryModalOpen(true);
    } catch (err) {
      console.error("Failed to load PV history:", err);
      Swal.fire("Error", "Failed to fetch PV history.", "error");
    }
  };


  const handleViewRemarks = (claimId) => {
    setHistoryClaimId(claimId);
    setHistoryMode("APPLICANT");
    setHistoryModalOpen(true);
  };



  const handleVoucherClick = (voucherId) => {

    setSelectedVoucherId(voucherId);
    setShowvoucherModal(true);
  };

  const handleSaveCommentGm = () => {
    if (selectedClaim?.id) {
      const updatedClaims = claims.map(claim =>
        claim.id === selectedClaim.id
          ? { ...claim, comment: selectedClaim.comment }
          : claim
      );
      setclaims(updatedClaims);

      setAction1(prev => ({
        ...prev,
        [selectedClaim.id]: 'approve',
      }));

      setGmCommentMap(prev => ({
        ...prev,
        [selectedClaim.id]: true,
      }));

      setShowModal(false);
      setGmShowModal(false);
    }
  };
  const togglevoucherModal = () => setShowvoucherModal(!showvoucherModal);

  // const handleSave = async () => {
  //   if (!UserData) {
  //     Swal.fire("Error", "User data not available", "error");
  //     return;
  //   }

  //   // Filter only the claims where either action1 or action2 has a value (approve or discuss)
  //   const modifiedClaims = claims.filter((claim) =>
  //     action1[claim.id] || action2[claim.id]
  //   );

  //   if (modifiedClaims.length === 0) {
  //     Swal.fire("Warning", "No actions selected to save", "warning");
  //     return;
  //   }

  //   // Build the payload
  //   const payload = {
  //     approve: {
  //       approve: modifiedClaims.map((claim) => ({
  //         claimid: claim.id,
  //         isapprovedone: action1[claim.id] === "approve",
  //         isdiscussedone: action1[claim.id] === "discuss",
  //         isapprovedtwo: action2[claim.id] === "approve",
  //         isdiscussedtwo: action2[claim.id] === "discuss",
  //         remarks: claim.comment || ""
  //       })),
  //       userId: 1,
  //       orgid: 1,
  //       branchid: 1
  //     }
  //   };

  //   try {
  //     const res = await SaveClaimApprove(payload);
  //     if (res.status) {
  //       Swal.fire("Success", "Claim approvals saved successfully", "success");
  //       // Optionally reset selections:
  //       load();
  //       setAction1({});
  //       setAction2({});
  //     } else {
  //       Swal.fire("Error", res.message || "Something went wrong", "error");
  //     }
  //   } catch (error) {
  //     console.error("Save error:", error);
  //     Swal.fire("Error", "Failed to save approval data", "error");
  //   }
  // };

  const handlePVSave = async (summaryid, type, operation) => {
    const payload = {
      approve: {
        approve: [],
        userId: UserData?.u_id,
        orgid: UserData.orgid,
        branchid: UserData.branchid,
        type: type,
        summaryid: summaryid,
        isppp_pv: 1,
        operation: operation,
        remarks: remarks

      },
    };


    try {
      const res = await SaveClaimApprove(payload);
      if (res.status) {
        Swal.fire("Success", "PPP PV approvals saved successfully", "success");
        // Reset actions and reload data
        load();
        setAction1({});
        setAction2({});
        setAction3({});
        setPPPAction1({});
        setPPPAction2({});
        setPPPAction3({});
        setPPPPVAction1({});
        setPPPPVAction2({});
      } else {
        Swal.fire("Error", res.message || "Something went wrong", "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      Swal.fire("Error", "Failed to save approval data", "error");
    }
  }
  const handleSave = async () => {
    if (!UserData) {
      Swal.fire("Error", "User data not available", "error");
      return;
    }
    const pppClaims = claims.filter(c => c.type === "PPP" && c.ppp_IsRejected == 0);
    const groupedPPP = {};
    const invalidPPPPlans = new Set();

    // group by plan
    pppClaims.forEach(claim => {
      const claimId = claim.id;

      const gm = pppAction1[claimId] || null;
      const director = pppAction2[claimId] || null;
      const ceo = pppAction3[claimId] || null;

      if (!groupedPPP[claim.SummaryId]) groupedPPP[claim.SummaryId] = [];
      groupedPPP[claim.SummaryId].push({ claimId, gm, director, ceo, PaymentNo: claim.PaymentNo });
    });

    for (const planId in groupedPPP) {
      const rows = groupedPPP[planId];

      const gmStatuses = rows.map(r => r.gm).filter(Boolean);
      const directorStatuses = rows.map(r => r.director).filter(Boolean);
      const ceoStatuses = rows.map(r => r.ceo).filter(Boolean);
      let isInvalid = false;


      // ❌ Each role must be consistent (no mixing Approve/Discuss)
      if (new Set(gmStatuses).size > 1) {
        // Swal.fire("Validation Error", `Plan ${rows[0].PaymentNo}: GM cannot mix Approve/Discuss`, "warning");
        isInvalid = true;

      }
      if (new Set(directorStatuses).size > 1) {
        // Swal.fire("Validation Error", `Plan ${rows[0].PaymentNo}: Director cannot mix Approve/Discuss`, "warning");
        isInvalid = true;

      }
      if (new Set(ceoStatuses).size > 1) {
        // Swal.fire("Validation Error", `Plan ${rows[0].PaymentNo}: CEO cannot mix Approve/Discuss`, "warning");
        isInvalid = true;

      }

      // ❌ Each role must act on ALL rows if they start
      if (gmStatuses.length > 0 && gmStatuses.length !== rows.length) {
        //  Swal.fire("Validation Error", `Plan ${rows[0].PaymentNo}: GM must act on all rows`, "warning");
        isInvalid = true;

      }
      if (directorStatuses.length > 0 && directorStatuses.length !== rows.length) {
        // Swal.fire("Validation Error", `Plan ${rows[0].PaymentNo}: Director must act on all rows`, "warning");
        isInvalid = true;

      }
      if (ceoStatuses.length > 0 && ceoStatuses.length !== rows.length) {
        // Swal.fire("Validation Error", `Plan ${rows[0].PaymentNo}: CEO must act on all rows`, "warning");
        isInvalid = true;

      }

      if (isInvalid) {
        invalidPPPPlans.add(Number(planId));
      }

      // ✅ Get actions (one per role, if set)
      const gmAction = gmStatuses[0] || null;
      const directorAction = directorStatuses[0] || null;
      const ceoAction = ceoStatuses[0] || null;




    }
    // Filter claims where any approval action (normal or PPP) is set
    const modifiedClaims = claims.filter(
      (claim) => {

        const isPPPClaim = claim.type === "PPP";

        // Exclude invalid PPP plans
        if (isPPPClaim && invalidPPPPlans.has(claim.SummaryId)) {
          return false;
        }
        return (
          action3[claim.id] ||
          action1[claim.id] ||
          action2[claim.id] ||
          pppAction1[claim.id] ||
          pppAction2[claim.id] ||
          pppAction3[claim.id] ||
          PPPPVAction1[claim.id] || PPPPVAction2[claim.id])
      }
    );

    if (modifiedClaims.length === 0) {
      Swal.fire("Warning", "No actions selected to save", "warning");
      return;
    }
    debugger
    // Build payload including PPP approvals
    const payload = {
      approve: {
        approve: modifiedClaims.map((claim) => ({
          claimid: claim.id,

          // Normal approvals
          isapprovedeight: action3[claim.id] === "approve",
          isdiscussedeight: action3[claim.id] === "discuss",
          isapprovedone: action1[claim.id] === "approve",
          isdiscussedone: action1[claim.id] === "discuss",
          isapprovedtwo: action2[claim.id] === "approve",
          isdiscussedtwo: action2[claim.id] === "discuss",

          // PPP approvals
          ppp_gm_approvalone: pppAction1[claim.id] === "approve",
          ppp_director_approvalone: pppAction2[claim.id] === "approve",
          ppp_gm_discussed: pppAction1[claim.id] === "discuss",
          ppp_director_discussed: pppAction2[claim.id] === "discuss",

          ppp_commissioner_approvalone: pppAction3[claim.id] === "approve",
          ppp_commissioner_discussed: pppAction3[claim.id] === "discuss",

          // PV Commissioner
          PPP_PV_Commissioner_approveone: PPPPVAction2[claim.id] === "approve",
          ppp_pv_Commissioner_discussedone: PPPPVAction2[claim.id] === "discuss",

          PPP_PV_Director_approve: PPPPVAction1[claim.id] === "approve",
          ppp_pv_Director_discussed: PPPPVAction1[claim.id] === "discuss",

          remarks: claim.comment || "",
          GmComment: gmCommentMap[claim.id] === true
        })),
        userId: UserData?.u_id,
        orgid: UserData.orgid,
        branchid: UserData.branchid,
        type: 0,
        summaryid: 0,
        isppp_pv: 0,
        operation: 0,
        remarks: ""
      },
    };


    try {
      const res = await SaveClaimApprove(payload);
      if (res.status) {
        Swal.fire("Success", "Claim approvals saved successfully", "success");
        // Reset actions and reload data
        load();
        setAction1({});
        setAction2({});
        setAction3({});
        setPPPAction1({});
        setPPPAction2({});
        setPPPAction3({});
        setPPPPVAction1({});
        setPPPPVAction2({});
      } else {
        Swal.fire("Error", res.message || "Something went wrong", "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      Swal.fire("Error", "Failed to save approval data", "error");
    }
  };

  const GetAccessRights = async () => {
    const res = await GetApprovalSettings(1, 1, 1, 25);
    if (res.status) {
      setroledetails(res.data);
    } else {
      Swal.fire({
        icon: 'error',
        text: res.message || 'No access rights for this page.',
      });
    }
  }


  const load = async () => {
    const res = await Getclaimapprovaldetails(1, 1, 1, UserData?.u_id);
    if (res.status) {
      // res.data.push(
      //   { isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "PPV", id: 5, claimno: "CLM0000122", date: "25‑Jun‑25", name: "Shafiq", dept: "HR", amount: "376.80", curr: "MYR", transactions: "Txn E" },
      //   { isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "PPV", id: 6, claimno: "CLM0000132", date: "26‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "433.00", curr: "IDR", transactions: "Txn F" },
      //   { isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "PPV PV", id: 5, claimno: "CLM0000122", date: "25‑Jun‑25", name: "Shafiq", dept: "HR", amount: "376.80", curr: "MYR", transactions: "Txn E" },
      //   { isSelected: false, approvedone: 1, discussedone: 0, approvedtwo: 1, discussedtwo: 0, comment: "", type: "PPV PV", id: 6, claimno: "CLM0000132", date: "26‑Jun‑25", name: "Sandy", dept: "Sales & Marketing", amount: "433.00", curr: "IDR", transactions: "Txn F" });

      setclaims(res.data);
      const initialAction1 = {};
      const initialAction2 = {};
      const initialAction3 = {};
      const initialPPPAction1 = {};
      const initialPPPAction2 = {};
      const initialPPPAction3 = {};

      const initialPPPPVAction1 = {};
      const initialPPPPVAction2 = {};

      res.data.forEach((claim) => {
        // For normal claim approvals (GM)
        if (claim.approvedone) initialAction1[claim.id] = 'approve';
        else if (claim.discussedone) initialAction1[claim.id] = 'discuss';

        // For normal claim approvals (Director)
        if (claim.approvedtwo) initialAction2[claim.id] = 'approve';
        else if (claim.discussedtwo) initialAction2[claim.id] = 'discuss';

        // For normal claim approvals (Director)
        if (claim.approvedeight) initialAction3[claim.id] = 'approve';
        else if (claim.discussedeight) initialAction3[claim.id] = 'discuss';

        // For PPP approvals (GM)
        if (claim.ppp_gm_approvalone) initialPPPAction1[claim.id] = 'approve';
        else if (claim.ppp_gm_discussed) initialPPPAction1[claim.id] = 'discuss'; // if you have a discussed flag for PPP GM

        // For PPP approvals (Director)
        if (claim.ppp_director_approvalone) initialPPPAction2[claim.id] = 'approve';
        else if (claim.ppp_director_discussed) initialPPPAction2[claim.id] = 'discuss'; // if exists

        // For PPP approvals (Commissioner)
        if (claim.ppp_commissioner_approvalone) initialPPPAction3[claim.id] = 'approve';
        else if (claim.ppp_commissioner_discussed) initialPPPAction3[claim.id] = 'discuss'; // if exists

        // For PPP PV approvals (Commissioner)
        if (claim.PPP_PV_Commissioner_approveone) {
          initialPPPPVAction2[claim.id] = 'approve';
        } else if (claim.ppp_pv_Commissioner_discussedone) {
          initialPPPPVAction2[claim.id] = 'discuss';
        }


        if (claim.PPP_PV_Director_approve) {
          initialPPPPVAction1[claim.id] = 'approve';
        } else if (claim.ppp_pv_Director_discussed) {
          initialPPPPVAction1[claim.id] = 'discuss';
        }


      });
      debugger
      // Set the states accordingly
      setAction1(initialAction1);
      setAction2(initialAction2);
      setAction3(initialAction3);
      setPPPAction1(initialPPPAction1);
      setPPPAction2(initialPPPAction2);
      setPPPAction3(initialPPPAction3);


      setPPPPVAction1(initialPPPPVAction1);
      setPPPPVAction2(initialPPPPVAction2);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Initial Load Failed',
        text: res.message || 'Unable to fetch claim approve data.',
      });
    }
  };

  // const handlePPPClick1 = (action, id, data) => {
  //   debugger
  //   data?.forEach((claim) => {
  //     if (claim.ppp_IsRejected != 1) {
  //       setPPPAction1(prev => ({ ...prev, [claim.id]: action }));
  //     }
  //   });
  // };

  // const handlePPPClick2 = (action, id, data) => {
  //   debugger
  //   data?.forEach((claim) => {
  //     if (claim.ppp_IsRejected != 1) {
  //       setPPPAction2(prev => ({ ...prev, [claim.id]: action }));
  //     }
  //   });


  // };
  // const handlePPPClick3 = (action, id, data) => {


  //   data?.forEach((claim) => {
  //     if (claim.ppp_IsRejected != 1) {
  //       setPPPAction3(prev => ({ ...prev, [claim.id]: action }));
  //     }
  //   });

  // };


  const handlePPPClick1 = async (action, id, data) => {

    if (data.ppp_IsRejected != 1) {
      const payload = {
        approve: {
          userId: UserData?.u_id,
          claimid: id,
          isapproved: action == "approve" ? true : false,
          isdiscussed: action == "discuss" ? true : false,
          gmComment: action == "discuss" ? "" : "",
          level: 1

        },
      };
      try {
        const res = await AutoApprove(payload);
        if (res.status) {
          setPPPAction1(prev => ({ ...prev, [id]: action }));
        } else {
          Swal.fire("Error", res.message || "Something went wrong", "error");
        }
      } catch (error) {
        console.error("Save error:", error);
        Swal.fire("Error", "Failed to save approval data", "error");
      }
    }
  };

  const handlePPPClick2 = async (action, id, data) => {


    if (data.ppp_IsRejected != 1) {
      const payload = {
        approve: {
          userId: UserData?.u_id,
          claimid: id,
          isapproved: action == "approve" ? true : false,
          isdiscussed: action == "discuss" ? true : false,
          gmComment: action == "discuss" ? "" : "",
          level: 2

        },
      };
      try {
        const res = await AutoApprove(payload);
        if (res.status) {
          setPPPAction2(prev => ({ ...prev, [id]: action }));
        } else {
          Swal.fire("Error", res.message || "Something went wrong", "error");
        }
      } catch (error) {
        console.error("Save error:", error);
        Swal.fire("Error", "Failed to save approval data", "error");
      }
    }

    // if (data.ppp_IsRejected != 1) {
    //   setPPPAction2(prev => ({ ...prev, [id]: action }));
    // }



  };
  const handlePPPClick3 = async (action, id, data) => {



    if (data.ppp_IsRejected != 1) {
      const payload = {
        approve: {
          userId: UserData?.u_id,
          claimid: id,
          isapproved: action == "approve" ? true : false,
          isdiscussed: action == "discuss" ? true : false,
          gmComment: action == "discuss" ? "" : "",
          level: 3

        },
      };
      try {
        const res = await AutoApprove(payload);
        if (res.status) {
          setPPPAction3(prev => ({ ...prev, [id]: action }));
        } else {
          Swal.fire("Error", res.message || "Something went wrong", "error");
        }
      } catch (error) {
        console.error("Save error:", error);
        Swal.fire("Error", "Failed to save approval data", "error");
      }
    }

    // if (data.ppp_IsRejected != 1) {
    //   setPPPAction3(prev => ({ ...prev, [id]: action }));
    // }

  };




  const handlePPPPVClick3 = (action, id) => {
    setPPPPVAction2(prev => ({ ...prev, [id]: action }));
  };

  const handlePPPPVDirector = (action, id) => {
    setPPPPVAction1(prev => ({ ...prev, [id]: action }));
  };

  useEffect(() => {

    const loadIsadmindetails = async () => {
      const userData = getUserDetails();
      setUserData(userData);
      console.log("userd data", userData);


    }
    loadIsadmindetails();

    // const fetchClaimApprovedDetails = async () => {
    //   const res = await Getclaimapprovaldetails(1, 1, 1, UserData?.u_id);
    //   if (res.status) {

    //     setclaims(res.data);
    //     const initialAction1 = {};
    //     const initialAction2 = {};
    //     const initialPPPAction1 = {};
    //     const initialPPPAction2 = {};

    //     const initialPPPAction3 = {};
    //     const initialPPPPVAction1 = {};
    //     const initialPPPPVAction2 = {};
    //     res.data.forEach((claim) => {
    //       // For normal claim approvals (GM)
    //       if (claim.approvedone) initialAction1[claim.id] = 'approve';
    //       else if (claim.discussedone) initialAction1[claim.id] = 'discuss';

    //       // For normal claim approvals (Director)
    //       if (claim.approvedtwo) initialAction2[claim.id] = 'approve';
    //       else if (claim.discussedtwo) initialAction2[claim.id] = 'discuss';

    //       // For PPP approvals (GM)
    //       if (claim.ppp_gm_approvalone) initialPPPAction1[claim.id] = 'approve';
    //       else if (claim.ppp_gm_discussedone) initialPPPAction1[claim.id] = 'discuss'; // if you have a discussed flag for PPP GM

    //       // For PPP approvals (Director)
    //       if (claim.ppp_director_approvalone) initialPPPAction2[claim.id] = 'approve';
    //       else if (claim.ppp_director_discussedone) initialPPPAction2[claim.id] = 'discuss'; // if exists



    //       // For PPP approvals (Commissioner)
    //       if (claim.ppp_commissioner_approvalone) initialPPPAction3[claim.id] = 'approve';
    //       else if (claim.ppp_commissioner_discussedone) initialPPPAction3[claim.id] = 'discuss'; // if exists

    //       // For PPP PV approvals (Commissioner)
    //       if (claim.PPP_PV_Commissioner) initialPPPPVAction1[claim.id] = 'approve';

    //       // For PPP PV approvals (Commissioner)
    //       if (claim.PPP_PV_Commissioner_approveone) {
    //         initialPPPPVAction2[claim.id] = 'approve';
    //       } else if (claim.ppp_pv_Commissioner_discussedone) {
    //         initialPPPPVAction2[claim.id] = 'discuss';
    //       }

    //       if (claim.PPP_PV_Director_approve) {
    //         initialPPPPVAction1[claim.id] = 'approve';
    //       } else if (claim.ppp_pv_Director_discussed) {
    //         initialPPPPVAction1[claim.id] = 'discuss';
    //       }

    //     });
    //     // Set the states accordingly
    //     setAction1(initialAction1);
    //     setAction2(initialAction2);
    //     setPPPAction1(initialPPPAction1);
    //     setPPPAction2(initialPPPAction2);

    //     setPPPAction3(initialPPPAction3);
    //     setPPPPVAction1(initialPPPPVAction1);
    //     setPPPPVAction2(initialPPPPVAction2);
    //   } else {
    //     Swal.fire({
    //       icon: 'error',
    //       title: 'Initial Load Failed',
    //       text: res.message || 'Unable to fetch claim approve data.',
    //     });
    //   }
    // };

    // const GetAccessRights =async() =>{
    //   const res = await GetApprovalSettings(UserData?.u_id, 1, 1,27 );
    //   if (res.status) {
    //   setroledetails(res.data);
    //   }else{
    //     Swal.fire({
    //       icon: 'error',
    //       text: res.message || 'No access rights for this page.',
    //   });  
    //   }
    // }
    // GetAccessRights();
    //    fetchClaimApprovedDetails();
  }, []);

  const handleDiscuss = (rowData) => {
    setSelectedClaim(rowData);
    setShowModal(true);
  };

  const handleDiscussPPP = (rowData, Approver) => {
    setselectedapprover(Approver);
    setSelectedClaim(rowData);
    setShowModalPPP(true);
  };
  const handleClickgmapprovan = (action, id, rowData) => {

    if (action === 'approve' && action2[id] === 'discuss') {

      setAction2(prev => ({ ...prev, [id]: 'update' }));

      setSelectedClaim(rowData);
      setGmShowModal(true);
      return;
    }
    setAction1(prev => ({ ...prev, [id]: action }));
  };




  useEffect(() => {
    const GetAccessRights = async () => {
      const res = await GetApprovalSettings(UserData?.u_id, 1, 1, 27);
      if (res.status) {
        setroledetails(res.data);
      } else {
        Swal.fire({
          icon: 'error',
          text: res.message || 'No access rights for this page.',
        });
      }
    };


    const fetchClaimApprovedDetails = async () => {
      const res = await Getclaimapprovaldetails(1, 1, 1, UserData?.u_id);
      if (res.status) {

        setclaims(res.data);
        const initialAction1 = {};
        const initialAction2 = {};
        const initialAction3 = {};
        const initialPPPAction1 = {};
        const initialPPPAction2 = {};

        const initialPPPAction3 = {};
        const initialPPPPVAction1 = {};
        const initialPPPPVAction2 = {};
        res.data.forEach((claim) => {
          // For normal claim approvals (GM)

          if (claim.approvedeight) initialAction3[claim.id] = 'approve';
          else if (claim.discussedeight) initialAction3[claim.id] = 'discuss';


          if (claim.approvedone) initialAction1[claim.id] = 'approve';
          else if (claim.discussedone) initialAction1[claim.id] = 'discuss';

          // For normal claim approvals (Director)
          if (claim.approvedtwo) initialAction2[claim.id] = 'approve';
          else if (claim.discussedtwo) initialAction2[claim.id] = 'discuss';

          // For PPP approvals (GM)
          if (claim.ppp_gm_approvalone) initialPPPAction1[claim.id] = 'approve';
          else if (claim.ppp_gm_discussed) initialPPPAction1[claim.id] = 'discuss'; // if you have a discussed flag for PPP GM

          // For PPP approvals (Director)
          if (claim.ppp_director_approvalone) initialPPPAction2[claim.id] = 'approve';
          else if (claim.ppp_director_discussed) initialPPPAction2[claim.id] = 'discuss'; // if exists



          // For PPP approvals (Commissioner)
          if (claim.ppp_commissioner_approvalone) initialPPPAction3[claim.id] = 'approve';
          else if (claim.ppp_commissioner_discussed) initialPPPAction3[claim.id] = 'discuss'; // if exists

          // For PPP PV approvals (Commissioner)
          if (claim.PPP_PV_Commissioner) initialPPPPVAction1[claim.id] = 'approve';

          // For PPP PV approvals (Commissioner)
          if (claim.PPP_PV_Commissioner_approveone) {
            initialPPPPVAction2[claim.id] = 'approve';
          } else if (claim.ppp_pv_Commissioner_discussedone) {
            initialPPPPVAction2[claim.id] = 'discuss';
          }

          if (claim.PPP_PV_Director_approve) {
            initialPPPPVAction1[claim.id] = 'approve';
          } else if (claim.ppp_pv_Director_discussed) {
            initialPPPPVAction1[claim.id] = 'discuss';
          }

        });
        // Set the states accordingly
        setAction1(initialAction1);
        setAction2(initialAction2);
        setAction3(initialAction3);
        setPPPAction1(initialPPPAction1);
        setPPPAction2(initialPPPAction2);

        setPPPAction3(initialPPPAction3);
        setPPPPVAction1(initialPPPPVAction1);
        setPPPPVAction2(initialPPPPVAction2);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Initial Load Failed',
          text: res.message || 'Unable to fetch claim approve data.',
        });
      }
    };
    if (UserData?.u_id) {
      GetAccessRights();
      fetchClaimApprovedDetails();
    }
  }, [UserData]);


  const handleClick1 = (action, id) => {

    setAction1(prev => ({ ...prev, [id]: action }));
  };



  const handleClick3 = (action, id) => {

    setAction3(prev => ({ ...prev, [id]: action }));
  };


  const handleClick2 = (action, id) => {

    setAction2(prev => ({ ...prev, [id]: action }));
  };

  const ApproverIndicator = ({ approved, discussed }) => {
    let severity = 'secondary'; // default gray
    if (approved === 1) severity = 'success';
    else if (discussed === 1) severity = 'warning';
    else severity = 'danger';

    const label = approved === 1
      ? 'Approved'
      : discussed === 1
        ? 'Discussed'
        : 'Pending';

    return <Badge style={{ width: "85px", fontSize: "13px", margin: "3px" }} value={label} severity={severity} />;
  };
  const handleSaveComment = () => {
    if (selectedClaim) {
      // Update the comment in the selected claim

      var updatedClaims = "";
      if (selectedClaim?.Claim_Discussed_Count == 2) {
        updatedClaims = claims.map(claim =>
          claim.id === selectedClaim.id
            ? { ...claim, comment: " Cancel The Transaction : " + selectedClaim.comment }
            : claim
        );

      } else {
        updatedClaims = claims.map(claim =>
          claim.id === selectedClaim.id
            ? { ...claim, comment: selectedClaim.comment }
            : claim
        );
      }
      // Update the state with the new claims array
      setclaims(updatedClaims);

      // Optionally, close the modal
      setShowModal(false);
    }
  };



  // const handleSaveCommentPPP = () => {
  //   if (selectedClaim) {
  //     debugger;

  //     var updatedClaims = "";
  //     if (selectedClaim?.PPP_Discussed_Count == 2) {


  //       updatedClaims = claims.map(claim =>
  //         claim.SummaryId === selectedClaim.SummaryId && claim.ppp_IsRejected != 1
  //           ? { ...claim, comment: " Cancel The Transaction : " + selectedClaim.comment }
  //           : claim
  //       );

  //     } else {
  //       updatedClaims = claims.map(claim =>
  //         claim.SummaryId === selectedClaim.SummaryId && claim.ppp_IsRejected != 1
  //           ? { ...claim, comment: selectedClaim.comment }
  //           : claim
  //       );
  //     }

  const handleSaveCommentPPP = async () => {
    if (selectedClaim) {
      let approver = 0;
      if (selectedapprover == "GM") {
        approver = 1;
      }
      else if (selectedapprover == "Director") {
        approver = 2;
      }
      else if (selectedapprover == "CEO") {
        approver = 3;
      }

      var updatedClaims = "";
      if (selectedClaim?.PPP_Discussed_Count == 2) {


        updatedClaims = claims.map(claim =>
          claim.SummaryId === selectedClaim.SummaryId && claim.ppp_IsRejected != 1 && claim.id === selectedClaim.id
            ? { ...claim, comment: " Cancel The Transaction : " + selectedClaim.comment }
            : claim
        );

        const payload = {
          approve: {
            userId: UserData?.u_id,
            claimid: selectedClaim.id,
            isapproved: false,
            isdiscussed: true,
            gmComment: " Cancel The Transaction : " + selectedClaim.comment,
            level: approver

          },
        };
        try {
          const res = await AutoApprove(payload);
          if (res.status) {
            // Update the state with the new claims array
            setclaims(updatedClaims);

            // Optionally, close the modal
            setShowModalPPP(false);
          } else {
            Swal.fire("Error", res.message || "Something went wrong", "error");
          }
        } catch (error) {
          console.error("Save error:", error);
          Swal.fire("Error", "Failed to save approval data", "error");
        }


      } else {
        updatedClaims = claims.map(claim =>
          claim.SummaryId === selectedClaim.SummaryId && claim.ppp_IsRejected != 1 && claim.id === selectedClaim.id
            ? { ...claim, comment: selectedClaim.comment }
            : claim
        );


        const payload = {
          approve: {
            userId: UserData?.u_id,
            claimid: selectedClaim.id,
            isapproved: false,
            isdiscussed: true,
            gmComment: selectedClaim.comment,
            level: approver

          },
        };
        try {
          const res = await AutoApprove(payload);
          if (res.status) {
            // Update the state with the new claims array
            setclaims(updatedClaims);

            // Optionally, close the modal
            setShowModalPPP(false);
          } else {
            Swal.fire("Error", res.message || "Something went wrong", "error");
          }
        } catch (error) {
          console.error("Save error:", error);
          Swal.fire("Error", "Failed to save approval data", "error");
        }
      }






    }
  };
  const headerTemplate = (type) => (
    <div className="d-flex justify-content-between align-items-center">
      <span>{type}</span>
      <Button

        icon="pi pi-history"
        data-access="viewdetails"
        className="p-button-text"
        onClick={(e) => {
          e.stopPropagation();
          setHistoryForType(type);
          setHistoryVisible(true);
          handleHistoryClick();
        }}
        tooltip="History" tooltipOptions={{ position: 'bottom' }}
      />
    </div>
  );

  const desiredOrder = ['Claim', 'Cash Advance', 'Supplier Payment', 'PPP', 'PPP PV'];
  const actionpoBodyTemplate = (rowData) => {
    return <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
      onClick={() => handleShowPODetails(rowData)}>{rowData.pono}</span>;
  };

  const handlePRClick = async (prid) => {
    if (!prid || prid <= 0) {
      Swal.fire("Invalid", "No valid PR found", "warning");
      return;
    }

    try {
      const res = await GetByIdPurchaseRequisition(prid, 1, 1);

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
      Swal.fire("Error", "Failed to load PR details", "error");
    }
  };

  const handleShowPODetails = async (row) => {
    const res = await GetByIdPurchaseOrder(row.poid, 1, 1);
    const supplier_id = res?.data?.Header?.supplierid;
    const currency_id = res?.data?.Header?.currencyid;
    // const prList = await GetCommonProcurementPRNoList(supplier_id,orgId,branchId);
    const prList = await GetPRNoBySupplierAndCurrency(supplier_id, currency_id, 1, 1);
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
  const printArrayData = (data) => {
    const tableHeaders = `
      <tr>
        <th>Claim#</th>
        <th>Date</th>
        <th>Name</th>
        <th>Department</th>
        <th>Amount</th>
        <th>Currency</th>
        <th>GM</th>
        <th>Director</th>
        <th>Remarks</th>
      </tr>`;

    const tableRows = data
      .map((item) => {
        const gm =
          item.approvedone === 1
            ? "Approved"
            : item.discussedone === 1
              ? "Discussed"
              : "Pending";
        const director =
          item.approvedtwo === 1
            ? "Approved"
            : item.discussedtwo === 1
              ? "Discussed"
              : "Pending";

        return `
          <tr>
            <td>${item.claimno}</td>
            <td>${item.date}</td>
            <td>${item.name}</td>
            <td>${item.dept}</td>
            <td style="text-align:right">${item.amount?.toLocaleString('en-US', {
          style: 'decimal',
          minimumFractionDigits: 2
        })}</td>
            <td>${item.curr}</td>
            <td>${gm}</td>
            <td>${director}</td>
            <td>${item.comment || ""}</td>
          </tr>`;
      })
      .join("");

    const htmlContent = `
      <html>
        <head>
          <title>Print Claims</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ccc; padding: 8px; }
            th { background-color: #f4f4f4; }
          </style>
        </head>
        <body>
          <h2>Claim Approval Report</h2>
          <table>${tableHeaders}${tableRows}</table>
        </body>
      </html>`;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleShowDetails = async (row) => {
    if (!access?.canViewDetails) {
      // Optionally show a message or do nothing
      return;
    }
    console.log("Fetching details for row:", row);
    const res = await ClaimAndPaymentGetById(row.id, 1, 1);
    console.log("API Response:", res);
    console.log("Response data:", res.data);
    console.log("Response data.header:", res.data?.header);
    console.log("Response data.details:", res.data?.details);

    if (res.status) {
      setSelectedDetail(res.data);
      setDetailVisible(true);
      setPreviewUrl(res.data?.header?.AttachmentPath || "");
      setFileName(res.data?.header?.AttachmentName || "");
    } else {
      Swal.fire("Error", "Data is not available", "error");
    }
  };
  const grouped = claims.reduce((acc, item) => {
    (acc[item.type] = acc[item.type] || []).push(item);
    return acc;
  }, {});

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



  const handleConvertClick = (data) => {

    setCashInHand(data.cashInHand);
    setCashFromSales(data.cashFromSalesAtFactory);
    setselectedSumary({ PaymentPlanDate: data.PaymentPlanDate, cashFromSalesAtFactory: data.cashFromSalesAtFactory, cashInHand: data.cashInHand });

    setCashInHand({
      CNY: data.InHand_CNY || 0,
      USD: data.InHand_USD || 0,
      SGD: data.InHand_SGD || 0,
      IDR: data.InHand_IDR || 0,
      MYR: data.InHand_MYR || 0,
    });
    setCashFromSales({
      CNY: data.Sales_CNY || 0,
      USD: data.Sales_USD || 0,
      SGD: data.Sales_SGD || 0,
      IDR: data.Sales_IDR || 0,
      MYR: data.Sales_MYR || 0,
    });
    setSeqno(data.PaymentNo);
    setConvertFromDate(data.FromDate ? new Date(data.FromDate) : null);
    setConvertToDate(data.ToDate ? new Date(data.ToDate) : null);

    setselectedsummaryRows(data.rows);
    setConvertModalVisible(true);
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
    <div style="padding:20px; display: flex; justify-content: space-between; align-items: center;">
<h2 style="margin: 0 auto;padding-left:100px;">Claim Details</h2>
<div style="font-size: 10px; text-align: right;">Printed on: ${formattedDateTime}</div>
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
          <td class="label">Job Title</td><td>${detail.header?.JobTitle || ''}</td>
          <td class="label">Department</td><td>${detail.header?.departmentname || ''}</td>
        </tr>
        <tr>
          <td class="label">HOD</td><td>${detail.header?.HOD_Name || ''}</td>
          <td class="label">Currency</td><td>${detail.header?.transactioncurrency || ''}</td>
        </tr>
        <tr>
          <td class="label">Cost Center</td><td>${detail.header?.CostCenter || ''}</td>
          <td class="label">Supplier</td><td>${detail.header?.SupplierName || ''}</td>
        </tr>
        <tr>
          <td class="label">Claim Amt in TC</td><td>${detail.header?.ClaimAmountInTC?.toLocaleString('en-US', {
      style: 'decimal',
      minimumFractionDigits: 2
    }) || ''}</td>
          <td class="label">Attachment</td><td>${detail.header?.AttachmentName || 'No Attachment'}</td>
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
    <div style="border-bottom: 1px solid #ccc;padding-top:5px;"></div>
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
      <div class="section-title">Remarks</div>
      <div class="remarks-box">
        ${detail.header?.Remarks || ''}
      </div>
    `;

    const statusIndicators = `
   
     <table class="status-table">
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
  const cleardata = async () => {
    load();
    setAction1({});
    setAction2({});
    setPPPAction3({});
    setPPPAction1({});
    setPPPAction2({});
    setPPPAction3({});
    setPPPPVAction1({});
    setPPPPVAction2({});
  }
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
  const handleRemove = async (rowsToRemove) => {
    const ids = rowsToRemove.map(r => ({ "Id": r.id }));
    console.log("Removed Items : ", ids);
    try {
      const res = await ClaimReject({ Rej: { Reject: ids, UserId: UserData?.u_id, IsPPP: 1 } }); // replace with your API/service
      if (res.status) {
        Swal.fire("Removed!", "Selected items were removed.", "success");
        load(); // reload data
        setSelectedPPPRows([]);
        cleardata();
      } else {
        Swal.fire("Error", res.message || "Failed to remove.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "Failed to remove.", "error");
    }
  };

  const confirmRemove = (rows) => {
    Swal.fire({
      title: "Are you sure?",
      text: `You are about to remove ${rows.length} item(s).`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, remove",
    }).then((result) => {
      if (result.isConfirmed) {
        handleRemove(rows);
      }
    });
  };
  const updateselectedrows = async (object) => {
    debugger;

    setSelectedPPPRows(object);

  }


  // ✅ FIXED: Filter out PPP PV claims without valid payment plan data
  const pvgroupedBySummary = claims
    .filter(x =>
      x.type == "PPP PV" &&
      x.SummaryId &&
      x.SummaryId > 0 &&
      x.PaymentNo &&
      x.PaymentPlanDate
    )
    .reduce((acc, item) => {
      const key = item.SummaryId;
      if (!acc[key]) acc[key] = {
        pv_dis_count: item.pv_dis_count, PPP_PV_Commissioner_approveone: item.PPP_PV_Commissioner_approveone, PPP_PV_Director_approve: item.PPP_PV_Director_approve, type: item.type, PaymentNo: item.PaymentNo, PaymentPlanDate: item.PaymentPlanDate, cashInHand: item.cashInHand, cashFromSalesAtFactory: item.cashFromSalesAtFactory,
        FromDate: item.FromDate, ToDate: item.ToDate, InHand_CNY: item.InHand_CNY, InHand_USD: item.InHand_USD, InHand_SGD: item.InHand_SGD, InHand_IDR: item.InHand_IDR,
        InHand_MYR: item.InHand_MYR, Sales_CNY: item.Sales_CNY, Sales_USD: item.Sales_USD, Sales_SGD: item.Sales_SGD, Sales_IDR: item.Sales_IDR, Sales_MYR: item.Sales_MYR,
        rows: []
      };
      acc[key].rows.push(item);

      return acc;
    }, {});

  // ✅ FIXED: Filter out PPP claims without valid payment plan data
  const groupedBySummary = claims
    .filter(x =>
      x.type == "PPP" &&
      x.SummaryId &&
      x.SummaryId > 0 &&
      x.PaymentNo &&
      x.PaymentPlanDate
    )
    .reduce((acc, item) => {
      const key = item.SummaryId;
      if (!acc[key]) acc[key] = {
        PPP_PV_Commissioner_approveone: item.PPP_PV_Commissioner_approveone, PPP_PV_Director_approve: item.PPP_PV_Director_approve, type: item.type, PaymentNo: item.PaymentNo, PaymentPlanDate: item.PaymentPlanDate, cashInHand: item.cashInHand, cashFromSalesAtFactory: item.cashFromSalesAtFactory,
        FromDate: item.FromDate, ToDate: item.ToDate, InHand_CNY: item.InHand_CNY, InHand_USD: item.InHand_USD, InHand_SGD: item.InHand_SGD, InHand_IDR: item.InHand_IDR,
        InHand_MYR: item.InHand_MYR, Sales_CNY: item.Sales_CNY, Sales_USD: item.Sales_USD, Sales_SGD: item.Sales_SGD, Sales_IDR: item.Sales_IDR, Sales_MYR: item.Sales_MYR,
        rows: []
      };
      acc[key].rows.push(item);

      return acc;
    }, {});


  const normalizeHistory = (data) => {
    const rows = [];

    data.forEach((item) => {
      // Claim
      rows.push({
        type: "Claim",
        gm: item.gm_status,
        director: item.director_status,
        ...item,
      });

      // PPP
      rows.push({
        type: "PPP",
        gm: item.ppp_gm_status,
        director: item.ppp_director_status,
        ceo: item.ppp_commissioner_status,
        ...item,
      });

      // PPP PV
      rows.push({
        type: "PPP PV",
        director: item.ppp_pv_Director_status,
        ceo: item.ppp_pv_Commissioner_status,
        ...item,
      });
    });

    return rows;
  };

  const statusBodyTemplate = (value) => {
    if (!value) return null;

    let className = "badge bg-secondary"; // default grey
    if (value.toLowerCase() === "pending") className = "badge bg-danger"; // red
    else if (value.toLowerCase() === "approved") className = "badge bg-success"; // green
    else if (value.toLowerCase() === "discussed") className = "badge bg-warning text-dark"; // orange

    return <span style={{ padding: "5px", fontSize: "12px" }} className={className}>{value}</span>;
  };

  const handleHistoryClick = async () => {
    const today = new Date();
    const defaultTo = today;
    const defaultFrom = new Date();
    defaultFrom.setMonth(defaultFrom.getMonth() - 1);

    const res = await Getclaimhistorydetails(
      0,
      1,
      1,
      1,
      (historyRange.from || defaultFrom).toISOString().split("T")[0],
      (historyRange.to || defaultTo).toISOString().split("T")[0]
    );

    if (res?.data) {
      sethistoryArray(res.data);
      setHistoryVisible(true);
    }
  };
  const renderHeaderhistory = () => {
    return (
      <div className="d-flex justify-content-between">
        <h5 className="m-0">History</h5>
        <span className="p-input-icon-left">

          <InputText
            type="search"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Global Search"
          />
        </span>
      </div>
    );
  };
  const historyHeaderGroup = (
    <ColumnGroup>
      <Row>
        {/* Common columns */}
        <Column header="Claim#" rowSpan={2} />
        <Column header="Claim Date" rowSpan={2} />
        <Column header="Applicant Name" rowSpan={2} />
        <Column header="Applicant Department" rowSpan={2} />
        <Column header="Claim Amount in TC" rowSpan={2} />
        <Column header="Currency" rowSpan={2} />
        <Column header="Approved Date" rowSpan={2} />
        <Column header="Remarks" rowSpan={2} />

        {/* Claim group */}
        <Column header="Claim" colSpan={2} />

        {/* PPP group */}
        <Column header="PPP" colSpan={3} />

        {/* PPP PV group */}
        <Column header="PPP PV" colSpan={2} />
      </Row>
      <Row>
        {/* Claim sub-columns */}
        <Column header="GM" field="gm_status" />
        <Column header="Director" field="director_status" />

        {/* PPP sub-columns */}
        <Column header="GM" field="ppp_gm_status" />
        <Column header="Director" field="ppp_director_status" />
        <Column header="CEO" field="ppp_commissioner_status" />

        {/* PPP PV sub-columns */}
        <Column header="Director" field="ppp_pv_Director_status" />
        <Column header="CEO" field="ppp_pv_Commissioner_status" />
      </Row>
    </ColumnGroup>
  );

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

          <Breadcrumbs title="Finance" breadcrumbItem="Approval" />

          {/* 🔍 Search Filter */}
          <Card className="p-3 mb-3">
            <Row className="align-items-center g-2">


              {/*
          <Col lg="6" md="6">
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                   
                    {types.map((type, index) => (
                        <div key={index} className="p-field-radiobutton" style={{ display: 'flex', alignItems: 'center' }}>
                            <RadioButton
                                inputId={type}
                                name="type"
                                value={type}
                                onChange={(e) => setSelectedType(e.value)}
                                checked={selectedType === type}
                            />
                            <span htmlFor={type} style={{ marginLeft: '8px',fontWeight:"bold" }}>{type}</span>
                        </div>
                    ))}
                </div>

         
</Col> */}

              <Col lg="5" md="5">

              </Col>
              <Col lg="7" md="7">

                <div className="text-end button-items">
                  <label style={{ color: "red" }}>Please click Save button to approve the selected rows</label>
                  <button type="button" data-access="save" className="btn btn-primary" onClick={handleSave}>

                    <i className="bx bx-check-circle label-icon font-size-16 align-middle me-2"></i> Submit
                  </button>
                  {/* <button type="button" className="btn btn-warning">
    <i className="bx bx-chat label-icon font-size-16 align-middle me-2"></i> Discuss
  </button> */}
                  <button type="button" className="btn btn-danger" onClick={cleardata}>
                    <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Cancel
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={exportToExcel}>
                    <i className="bx bx-export label-icon font-size-16 align-middle me-2"></i> Export
                  </button>

                  {/* <button className="btn btn-primary" onClick={() => printArrayData(claims)}>
                    <i className="bx bx-printer label-icon font-size-16 align-middle me-2"></i> Print
                  </button> */}

                </div>
              </Col>
            </Row>
          </Card>


          {/* <Row>
            <Col lg="12">
              <Card>
                <Accordion multiple>
                  {Object.entries(grouped).map(([type, rows]) => (
                    <AccordionTab key={type} header={headerTemplate(type)}>
                      <ApprovalTable type={type} data={claims.filter(x => x.type == type)}
                        handleDiscuss={handleDiscuss}
                        handleClick1={handleClick1}
                        handleClick2={handleClick2}
                        action1={action1}
                        action2={action2} handleShowDetails={handleShowDetails} roledetails={roledetails} />
                    </AccordionTab>
                  ))}
                </Accordion>
              </Card>
            </Col>
          </Row> */}

          <Row>
            <Col lg="12">
              <Card>
                <Accordion multiple>
                  {desiredOrder
                    .filter(type => {
                      // ✅ FIXED: Hide PPP tab if no valid PPP records exist
                      if (type === 'PPP') {
                        return Object.keys(groupedBySummary).length > 0;
                      }
                      // ✅ FIXED: Hide PPP PV tab if no valid PPP PV records exist
                      if (type === 'PPP PV') {
                        return Object.keys(pvgroupedBySummary).length > 0;
                      }
                      // For other types, check if they exist in grouped
                      return grouped[type];
                    })
                    .map(type => (


                      <AccordionTab key={type} header={headerTemplate(type)}>


                        {type === "PPP"
                          ? Object.entries(groupedBySummary)
                            .filter(([_, group]) => group.type === type)
                            .map(([summaryId, group]) => (




                              <Card key={summaryId} className="mb-4">
                                <div className="d-flex justify-content-between align-items-center alert alert-primary mb-0">
                                  <div>
                                    <strong>Payment Plan Date:</strong> {group.PaymentPlanDate}
                                    <strong> / PPP Number:</strong> {group.PaymentNo}

                                  </div>

                                  <button style={{ marginRight: "10px" }} className="btn btn-info" onClick={() => handleConvertClick(group)}>
                                    PPP View
                                  </button>

                                </div>

                                <ApprovalTable
                                  access={access}
                                  key={summaryId} // always add a key in lists
                                  type={type}
                                  // data={claims.filter(x => x.type === type)}
                                  data={group.rows.filter(x => x.id > 0)}
                                  handleDiscuss={handleDiscuss}
                                  handleHodDiscuss={handleHodDiscuss}
                                  handleDiscussPPP={handleDiscussPPP}
                                  handleClickgmapprovan={handleClickgmapprovan}
                                  handleHodGmDiscuss={handleHodGmDiscuss}
                                  handleGmDirectorDiscuss={handleGmDirectorDiscuss}
                                  load={load}
                                  handleClick1={handleClick1}
                                  handleClick2={handleClick2}
                                  handleClick3={handleClick3}
                                  handlePPPClick1={handlePPPClick1}
                                  handlePPPClick2={handlePPPClick2}
                                  handlePPPClick3={handlePPPClick3}
                                  handlePPPPVClick3={handlePPPPVClick3}
                                  handlePPPPVDirector={handlePPPPVDirector}
                                  action1={action1}
                                  action2={action2}
                                  action3={action3}
                                  pppAction1={pppAction1}
                                  pppAction2={pppAction2}
                                  pppAction3={pppAction3}
                                  PPPPVAction1={PPPPVAction1}
                                  PPPPVAction2={PPPPVAction2}
                                  handleShowDetails={handleShowDetails}
                                  roledetails={roledetails}
                                  handleVoucherClick={handleVoucherClick}
                                  selectedPPPRows={selectedPPPRows}

                                  confirmRemove={confirmRemove}
                                  handleRemove={handleRemove}
                                  updateselectedrows={updateselectedrows}
                                  groupedBySummary={groupedBySummary}
                                  handlePVSave={handlePVSave}
                                  pvgroupedBySummary={pvgroupedBySummary}
                                  handleViewRemarks={handleViewRemarks}
                                  FilterMatchMode={FilterMatchMode}
                                  FilterOperator={FilterOperator}
                                  cleardata={cleardata}
                                  setSelectedSummaryId={setSelectedSummaryId}
                                  setShowDiscussModal={setShowDiscussModal}
                                  handleViewPVHistory={handleViewPVHistory}
                                />
                              </Card>
                            ))
                          : (
                            <ApprovalTable
                              access={access}
                              type={type}
                              data={claims.filter(x => x.type === type)}
                              handleDiscuss={handleDiscuss}
                              handleHodDiscuss={handleHodDiscuss}
                              handleDiscussPPP={handleDiscussPPP}
                              handleClickgmapprovan={handleClickgmapprovan}
                              handleHodGmDiscuss={handleHodGmDiscuss}
                              handleGmDirectorDiscuss={handleGmDirectorDiscuss}
                              load={load}
                              handleClick1={handleClick1}
                              handleClick3={handleClick3}
                              handleClick2={handleClick2}
                              handlePPPClick1={handlePPPClick1}
                              handlePPPClick2={handlePPPClick2}
                              handlePPPClick3={handlePPPClick3}
                              handlePPPPVClick3={handlePPPPVClick3}
                              handlePPPPVDirector={handlePPPPVDirector}
                              action1={action1}
                              action3={action3}
                              action2={action2}
                              pppAction1={pppAction1}
                              pppAction2={pppAction2}
                              pppAction3={pppAction3}
                              PPPPVAction1={PPPPVAction1}
                              PPPPVAction2={PPPPVAction2}
                              handleShowDetails={handleShowDetails}
                              roledetails={roledetails}
                              handleVoucherClick={handleVoucherClick}
                              PaymentSummaryTable={PaymentSummaryTable}
                              groupedBySummary={groupedBySummary}
                              handlePVSave={handlePVSave}
                              pvgroupedBySummary={pvgroupedBySummary}
                              handleViewRemarks={handleViewRemarks}
                              FilterMatchMode={FilterMatchMode}
                              FilterOperator={FilterOperator}
                              cleardata={cleardata}
                              setSelectedSummaryId={setSelectedSummaryId}
                              setShowDiscussModal={setShowDiscussModal}
                              setRemarks={setRemarks}
                              handleViewPVHistory={handleViewPVHistory}
                            />
                          )
                        }


                      </AccordionTab>
                    ))}
                </Accordion>
              </Card>
            </Col>
          </Row>

        </Container>
      </div>
      <Dialog
        visible={showGmModal}
        onHide={() => setGmShowModal(false)}
        style={{ width: '50vw', maxWidth: '600px' }}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
        contentStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        <Input
          type="textarea"
          className="custom-textarea"
          value={selectedClaim?.comment || ''}
          onChange={(e) =>
            setSelectedClaim({ ...selectedClaim, comment: e.target.value })
          }
          placeholder="Enter your comment"
        />
        <div className="mt-3 text-end">
          <Button label="Close" icon="pi pi-check" onClick={handleSaveCommentGm} />
        </div>
      </Dialog>
      <Dialog
        header="Remarks"
        visible={showModal}
        onHide={() => setShowModal(false)}
        style={{ width: '50vw', maxWidth: '600px' }}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
        contentStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        {selectedClaim?.Claim_Discussed_Count == 2 && (
          <span style={{ color: "red" }}>Cancel The Transaction</span>
        )}
        <Input
          type="textarea"
          className="custom-textarea"
          value={selectedClaim?.comment || ''}
          onChange={(e) =>
            setSelectedClaim({ ...selectedClaim, comment: e.target.value })
          }
          placeholder="Enter your comment"
        />
        <div className="mt-3 text-end">
          <Button label="Close" icon="pi pi-check" onClick={handleSaveComment} />
        </div>
      </Dialog>


      <Dialog
        header="Remarks"
        visible={showModalPPP}
        onHide={() => setShowModalPPP(false)}
        style={{ width: '50vw', maxWidth: '600px' }}
        breakpoints={{ '960px': '75vw', '640px': '100vw' }}
        contentStyle={{ maxHeight: '70vh', overflowY: 'auto' }}
      >
        {selectedClaim?.PPP_Discussed_Count == 2 && (
          <span style={{ color: "red" }}>Cancel The Transaction</span>
        )}
        <Input
          type="textarea"
          className="custom-textarea"
          value={selectedClaim?.comment || ''}
          onChange={(e) =>
            setSelectedClaim({ ...selectedClaim, comment: e.target.value })
          }
          placeholder="Enter your comment"
        />
        <div className="mt-3 text-end">
          <Button label="Submit" icon="pi pi-check" onClick={handleSaveCommentPPP} />
        </div>
      </Dialog>
      <Modal isOpen={showvoucherModal} toggle={togglevoucherModal} size="xl">
        <ModalHeader toggle={togglevoucherModal}>Voucher</ModalHeader>
        <ModalBody>

          {selectedVoucherId && (
            <PaymentVoucher VoucherId={selectedVoucherId} />
          )}
        </ModalBody>
      </Modal>

      <Modal isOpen={historyVisible} toggle={() => setHistoryVisible(false)} className="modal-fullscreen">
        <ModalHeader toggle={() => setHistoryVisible(false)}>
          History
        </ModalHeader>
        <ModalBody>
          <Row form className="align-items-end mb-3">
            <Col sm="4">
              <label>From</label>


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
                  value={historyRange.from}
                  onChange={([date]) =>
                    setHistoryRange((r) => ({ ...r, from: date }))
                  }

                  style={{ cursor: "default" }}
                />

              </InputGroup>
            </Col>
            <Col sm="4">
              <label>To</label>
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
                  value={historyRange.to}
                  onChange={([date]) =>
                    setHistoryRange((r) => ({ ...r, to: date }))
                  }
                  style={{ cursor: "default" }}
                />

              </InputGroup>
            </Col>
            <Col sm="4">



              <button type="button" className="btn btn-info" onClick={() => {
                const filtered = historyArray.filter(h =>
                  h.type === historyForType &&
                  (!historyRange.from || new Date(h.transactiondate) >= historyRange.from) &&
                  (!historyRange.to || new Date(h.transactiondate) <= historyRange.to)
                );
                handleHistoryClick();
              }}>
                <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search</button>

            </Col>
          </Row>


          <DataTable paginator rows={10} value={historyArray}
            filters={{ global: { value: globalFilter, matchMode: "contains" } }}
            header={renderHeaderhistory()}
            globalFilterFields={[
              "claimno",
              "claimdate",
              "applicantname",
              "departmentname",
              "claimamountintc",
              "curr",
              "logdate",
              "claim_comment",
              "gm_status",
              "director_status",
              "ppp_gm_status",
              "ppp_director_status",
              "ppp_commissioner_status",
              "ppp_pv_Director_status",
              "ppp_pv_Commissioner_status"
            ]}
            headerColumnGroup={historyHeaderGroup} responsiveLayout="scroll">
            {/* Common columns (no header here because handled in headerGroup) */}
            <Column field="claimno" />
            <Column field="claimdate" />
            <Column field="applicantname" />
            <Column field="departmentname" />
            <Column field="claimamountintc" body={(rowData) =>
              rowData.claimamountintc?.toLocaleString("en-US", { minimumFractionDigits: 2 })
            } />
            <Column field="curr" />
            <Column field="logdate" />
            <Column field="claim_comment" />

            {/* Claim group */}
            {/* <Column field="gm_status" />
  <Column field="director_status" /> */}

            {/* PPP group */}
            {/* <Column field="ppp_gm_status" />
  <Column field="ppp_director_status" />
  <Column field="ppp_commissioner_status" /> */}

            {/* PPP PV group */}
            {/* <Column field="ppp_pv_Director_status" />
  <Column field="ppp_pv_Commissioner_status" /> */}

            {/* Claim group */}
            <Column field="gm_status" header="Claim - GM" body={(rowData) => statusBodyTemplate(rowData.gm_status)} />
            <Column field="director_status" header="Claim - Director" body={(rowData) => statusBodyTemplate(rowData.director_status)} />

            {/* PPP group */}
            <Column field="ppp_gm_status" header="PPP - GM" body={(rowData) => statusBodyTemplate(rowData.ppp_gm_status)} />
            <Column field="ppp_director_status" header="PPP - Director" body={(rowData) => statusBodyTemplate(rowData.ppp_director_status)} />
            <Column field="ppp_commissioner_status" header="PPP - CEO" body={(rowData) => statusBodyTemplate(rowData.ppp_commissioner_status)} />

            {/* PPP PV group */}
            <Column field="ppp_pv_Director_status" header="PPP PV - Director" body={(rowData) => statusBodyTemplate(rowData.ppp_pv_Director_status)} />
            <Column field="ppp_pv_Commissioner_status" header="PPP PV - CEO" body={(rowData) => statusBodyTemplate(rowData.ppp_pv_Commissioner_status)} />
          </DataTable>



        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-danger" onClick={() => setHistoryVisible(false)} ><i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Close</button>

        </ModalFooter>
      </Modal>

      {/* PPP PV History Modal */}
      <Modal isOpen={pvHistoryModalOpen} toggle={() => setPvHistoryModalOpen(false)} size="lg" centered>
        <ModalHeader toggle={() => setPvHistoryModalOpen(false)}>PPP PV Discussion History</ModalHeader>
        <ModalBody style={{ maxHeight: '60vh', overflowY: 'auto', backgroundColor: '#f8f9fa' }}>
          <div className="history-container p-3">
            {pvHistoryData && pvHistoryData.length > 0 ? (
              pvHistoryData.map((item, index) => {
                // Handle different possible field names from the API (case-insensitive)
                const getField = (obj, ...keys) => {
                  for (const key of keys) {
                    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
                    // Try case-insensitive
                    const found = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
                    if (found && obj[found] !== undefined && obj[found] !== null) return obj[found];
                  }
                  return "";
                };

                const senderName = getField(item, "username", "Username", "UserName", "user_name", "applicantname", "name", "FullName");
                const logDate = getField(item, "logdate", "LogDate", "log_date", "createddate", "CreatedDate", "transactiondate");
                const logTime = getField(item, "logtime", "LogTime", "log_time");
                const comment = getField(item, "claim_comment", "Claim_Comment", "ClaimComment", "comment", "Comment", "remarks", "Remarks");

                const currentUserName = UserData?.username || UserData?.FullName || "";
                const isMe = currentUserName && senderName?.toLowerCase() === currentUserName.toLowerCase();
                return (
                  <div key={index} className={`d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'} mb-3`}>
                    <div
                      className="p-3 shadow-sm"
                      style={{
                        maxWidth: '75%',
                        borderRadius: '15px',
                        backgroundColor: isMe ? '#5b73e8' : '#ffffff',
                        color: isMe ? '#ffffff' : '#000000',
                        borderBottomRightRadius: isMe ? '0' : '15px',
                        borderBottomLeftRadius: !isMe ? '0' : '15px'
                      }}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="fw-bold me-3" style={{ opacity: 0.9 }}>{senderName || "Unknown"}</small>
                        <small style={{ fontSize: '0.75rem', opacity: 0.8 }}>{logDate} {logTime}</small>
                      </div>
                      <p className="mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'Inter, sans-serif', fontSize: '14px' }}>
                        {comment || "(No comment)"}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-muted">No discussion history yet.</div>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" className="btn btn-secondary" onClick={() => setPvHistoryModalOpen(false)}>Close</button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={convertModalVisible} className="modal-fullscreen" toggle={() => setConvertModalVisible(false)}>

        <ModalHeader toggle={() => setConvertModalVisible(false)}>

          <div className="d-flex justify-content-between align-items-center w-100" >
            <span>Payment Summary</span>

          </div>
        </ModalHeader>
        <ModalBody>
          <Row className="mb-3">

            <Col md="2">
              <label className="form-label">PPP Number</label>
              <Input type="text" disabled={true} value={Seqno}></Input>
            </Col>


            <Col md="3">
              <label className="form-label">From Date</label>
              <Flatpickr
                className="form-control"
                placeholder="From Date"
                options={{
                  dateFormat: "Y-m-d",
                  altInput: true,
                  altFormat: "d-M-Y"
                }}
                disabled={true}
                value={convertFromDate}



              />
            </Col>

            <Col md="3">
              <label className="form-label">To Date</label>
              <Flatpickr
                className="form-control"
                placeholder="To Date"
                options={{
                  dateFormat: "Y-m-d",
                  altInput: true,
                  altFormat: "d-M-Y"
                }}
                disabled={true}
                value={convertToDate}

              />
            </Col>

            <Col md="4">
              <div className="d-flex justify-content-end align-items-end h-100">



                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setConvertModalVisible(false)}
                >
                  <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>
                  Close
                </button>
              </div>
            </Col>
          </Row>

          <hr />
          {(() => {
            const currencies = ["IDR", "SGD", "USD", "MYR", "CNY"];



            const getAmountForCategoryCurrency = (category, currency, method) => {
              debugger;
              return selectedsummaryRows
                .filter(r =>
                  r.ClaimCategory === category &&
                  r.curr === currency // &&
                  // (!method || (r.paymentMethod || '').toLowerCase() === method.toLowerCase())
                )
                .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
            };


            const buildTable = (data) => {
              if (!data || data.length === 0) return null;

              const currencies = ["IDR", "SGD", "USD", "MYR", "CNY"];

              // Group data by PaymentMethod
              const grouped = data.reduce((acc, row) => {
                const method = row.PaymentMethod || "-";
                if (!acc[method]) acc[method] = { rows: [], method };
                acc[method].rows.push(row);
                return acc;
              }, {});

              // Calculate overall totals
              const overallTotals = currencies.reduce((acc, curr) => {
                acc[curr] = data
                  .filter(r => r.curr === curr)
                  .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
                return acc;
              }, {});

              // Create rows for the table body
              const rows = Object.values(grouped).map((group, index) => {
                const rowTotals = currencies.reduce((acc, curr) => {
                  acc[curr] = group.rows
                    .filter(r => r.curr === curr)
                    .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
                  return acc;
                }, {});

                return (

                  <tr key={`row-${index}`}>
                    <td style={{ textAlign: "left" }}>{group.method}</td>
                    {currencies.map(curr => (
                      <td style={{ textAlign: "right" }} key={curr}>
                        {rowTotals[curr].toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}
                      </td>
                    ))}
                  </tr>
                );
              });

              // Total row
              const totalRow = (
                <tr style={{ backgroundColor: "#f1f1f1", fontWeight: "bold" }}>
                  <td>Total</td>
                  {currencies.map(curr => (
                    <td style={{ textAlign: "right" }} key={`total-${curr}`}>
                      {overallTotals[curr].toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                  ))}
                </tr>
              );

              return [...rows, totalRow]; // Return both the rows and the total row
            };


            // const getAmountForCategoryCurrency = (category, currency, cashOnly = null) => {
            //   if(cashOnly=="Cash"){

            //     return selectedsummaryRows
            //     .filter(r =>
            //       r.curr === currency &&
            //         (r.paymentMethod || "").toLowerCase() === "cash"
            //     )
            //     .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
            //   }
            //   else{
            //   return selectedsummaryRows
            //     .filter(r =>
            //       r.type === category &&
            //       r.curr === currency &&

            //         (r.paymentMethod || "").toLowerCase() !== "cash"

            //     )
            //     .reduce((sum, r) => sum + parseFloat(r.amount || 0), 0);
            //   }
            // };


            const getTotalA = () => {
              return currencies.reduce((acc, curr) => {
                const val = parseFloat(cashInHand[curr] || 0) + parseFloat(cashFromSales[curr] || 0);
                return { ...acc, [curr]: val };
              }, {});
            };

            const getTotalB = () => {
              return currencies.reduce((acc, curr) => {
                const val = ["Claim", "Cash Advance", "Supplier Payment"]
                  .reduce((sum, cat) =>
                    sum + getAmountForCategoryCurrency(cat, curr, "Cash")
                    , 0);
                return { ...acc, [curr]: val };
              }, {});
            };

            // const getTotalB = () => {
            //   return currencies.reduce((acc, curr) => {
            //     // sum non-cash categories
            //     const nonCash = ["Claim", "Cash Advance", "Supplier Payment"]
            //       .reduce((sum, cat) => sum + getAmountForCategoryCurrency(cat, curr, "NonCash"), 0);

            //     // sum cash withdrawals (once)
            //     const cash = getAmountForCategoryCurrency(null, curr, "Cash");

            //     return { ...acc, [curr]: nonCash + cash };
            //   }, {});
            // };
            const formatWithCommas = (value) => {
              if (!value) return '';
              const parts = value.toString().split('.');
              const intPart = parts[0];
              const decPart = parts[1];
              const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
            };
            const getCashNeeded = () => {
              const A = getTotalA();
              const B = getTotalB();
              return currencies.reduce((acc, curr) => {
                return { ...acc, [curr]: (B[curr] || 0) - (A[curr] || 0) };
              }, {});
            };

            const getBankPayment = () => {
              return currencies.reduce((acc, curr) => {
                const val = getAmountForCategoryCurrency("Bank Payment", curr, "Bank Transfer");
                return { ...acc, [curr]: val };
              }, {});
            };

            const totalA = getTotalA();
            const totalB = getTotalB();
            const cashNeeded = getCashNeeded();
            const bankPayment = getBankPayment();

            return (
              <>

                <h5>Finance Summary</h5>
                <table className="table table-sm table-bordered align-middle mb-2">
                  <thead>
                    <tr className="table-secondary">
                      <th>Category</th>
                      {currencies.map(curr => (
                        <th key={curr} className="text-center">{curr}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* First row: Cash Needed */}
                    <tr className="table-warning fw-bold">
                      <td>Cash Needed (B - A)</td>
                      {currencies.map(curr => (
                        <td key={`cashNeeded-${curr}`} className="text-end">
                          {cashNeeded[curr]?.toLocaleString()}
                        </td>
                      ))}
                    </tr>

                    {/* Cash In Hand */}
                    <tr>
                      <td>Cash in Hand</td>
                      {currencies.map(curr => (
                        <td key={`cih-${curr}`}>



                          <Input
                            type="text"
                            disabled={true}
                            className="text-end"
                            value={formatWithCommas(cashInHand[curr])}
                            onChange={e =>
                              setCashInHand({ ...cashInHand, [curr]: e.target.value })
                            }
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Cash From Sales */}
                    <tr>
                      <td>Cash from Factory Sales</td>
                      {currencies.map(curr => (
                        <td key={`cfs-${curr}`}>
                          <Input
                            type="text"
                            disabled={true}
                            className="text-end"
                            value={formatWithCommas(cashFromSales[curr])}
                            onChange={e =>
                              setCashFromSales({ ...cashFromSales, [curr]: e.target.value })
                            }
                          />
                        </td>
                      ))}
                    </tr>

                    {/* Total A */}
                    <tr className="table-light fw-bold">
                      <td>Total A</td>
                      {currencies.map(curr => (
                        <td key={`totalA-${curr}`} className="text-end">
                          {totalA[curr]?.toLocaleString()}
                        </td>
                      ))}
                    </tr>

                    {/* Category Summary */}
                    {/* {["Claim", "Cash Advance", "Supplier Payment"].map(category => (
<tr key={category}>
  <td>{category}</td>
  {currencies.map(curr => (
    <td key={`${category}-${curr}-cash`} className="text-end">
      {getAmountForCategoryCurrency(category, curr, "").toLocaleString()}
    </td>
  ))}
</tr>
))} */}

                    {["Claim", "Cash Advance", "Supplier Payment"].map(category => (
                      <tr key={category}>
                        <td>{category}</td>
                        {currencies.map(curr => {
                          const method =
                            category === "Cash Withdrawal"
                              ? "Cash"     // only Cash for Cash Withdrawal row
                              : "NonCash"; // exclude Cash everywhere else
                          return (
                            <td key={`${category}-${curr}`} className="text-end">
                              {getAmountForCategoryCurrency(category, curr, method).toLocaleString()}
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    {/* Total B */}
                    <tr className="table-light fw-bold">
                      <td>Total B</td>
                      {currencies.map(curr => (
                        <td key={`totalB-${curr}`} className="text-end">
                          {totalB[curr]?.toLocaleString()}
                        </td>
                      ))}
                    </tr>

                    <tr className="table-secondary">
                      <th>Mode of payment</th>
                      {currencies.map(curr => (
                        <th key={`totalB-${curr}`} className="text-end">

                        </th>
                      ))}
                    </tr>

                    {buildTable(selectedsummaryRows)}
                  </tbody>
                </table>
                <br />



                <Row>
                  <Col md="6">
                    <h5 className="text-start">Claim Details</h5></Col>
                  <Col md="6">



                  </Col>
                </Row>
                <br />
                <DataTable
                  value={selectedsummaryRows}
                  sortField="curr" sortOrder={1}

                  dataKey="id"
                  responsiveLayout="scroll"
                >
                  <Column field="claimno" sortable header="Claim#" />
                  <Column field="name" sortable header="Name" />
                  <Column field="suppliername" sortable header="Supplier Name" />
                  <Column field="type" sortable header="Type" />
                  <Column field="amount" sortable header="Amount"
                    body={(rowData) =>
                      rowData.amount?.toLocaleString('en-US', {
                        style: 'decimal',
                        minimumFractionDigits: 2
                      })
                    }
                    style={{ textAlign: "right" }} />
                  <Column field="curr" sortable header="Currency" />
                  <Column field="PaymentMethod" sortable header="Mode of Payment" />


                </DataTable>


              </>
            );
          })()}




        </ModalBody>

        <ModalFooter>



          <button type="button" className="btn btn-danger" onClick={() => setConvertModalVisible(false)}>
            <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Close
          </button>

        </ModalFooter>
      </Modal>



      <Modal isOpen={detailVisible} toggle={() => setDetailVisible(false)} size="xl">
        <ModalHeader toggle={() => setDetailVisible(false)}>Claim Details</ModalHeader>
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
                  ["Job Title", selectedDetail.header?.JobTitle],
                  ["HOD", selectedDetail.header?.HOD_Name],
                  ["Trans Currency ", selectedDetail.header?.transactioncurrency],
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


                  ["Cost Center", selectedDetail.header?.CostCenter],
                  ["Claim Amt in TC", <span key="amtintc"> {selectedDetail.header?.ClaimAmountInTC?.toLocaleString('en-US', {
                    style: 'decimal',
                    minimumFractionDigits: 2
                  })}</span>],
                  ["Supplier", selectedDetail.header?.SupplierName],
                ].map(([label, val], i) => (
                  <Col md="4" key={i} className="form-group row ">
                    <Label className="col-sm-4 col-form-label bold">{label}</Label>
                    <Col sm="8" className="mt-2">: {val}</Col>
                  </Col>
                ))}
              </Row>
              <hr />
              <DataTable value={selectedDetail.details}>
                <Column headerStyle={{ textAlign: 'center' }} header="#" body={(_, { rowIndex }) => rowIndex + 1} />

                {(selectedDetail.header?.ClaimCategoryId === 3) && (

                  <Column
                    field="pono"
                    header="PO No"

                    className="text-left"
                    style={{ width: "10%" }}
                    body={actionpoBodyTemplate}
                  />
                )}

                <Column headerStyle={{ textAlign: 'center' }} field="claimtype" header="Claim Type" />
                <Column headerStyle={{ textAlign: 'center' }} field="PaymentDescription" header="Claim & Payment Description" />
                <Column style={{ textAlign: "right" }} field="TotalAmount" header="Amount"
                  body={(rowData) =>
                    rowData.TotalAmount?.toLocaleString('en-US', {
                      style: 'decimal',
                      minimumFractionDigits: 2
                    })
                  } />
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
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.ClmhodStatus)}`} /></td>

                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.ClmgmStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.ClmDrStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.PPPgmStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.PPPDrStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.PPPCEOStatus)}`} /></td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.VouCmrStatus)}`} /> </td>
                        <td className="text-center p-1"><Button className={`btn-circle p-button-rounded btn ${getSeverity(selectedDetail.header?.VouDrStatus)}`} /> </td>
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
                      {label === "PR No." ? (
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
                                          color: "#007bff",
                                          textDecoration: "underline",
                                          cursor: "pointer",
                                        }}
                                        onClick={(e) => {
                                          e.preventDefault();
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

              <DataTable value={selectedPODetail.Requisition}>
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
                  footer={selectedPODetail.Header?.unitprice?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                />

                <Column
                  field="discountvalue"
                  header="Discount"
                  body={(rowData) =>
                    rowData.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                  }
                  footer={selectedPODetail.Header?.discountvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                />

                <Column field="taxperc" header="Tax %" />

                <Column
                  field="taxvalue"
                  header="Tax Amt"
                  body={(rowData) =>
                    rowData.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                  }
                  footer={selectedPODetail.Header?.taxvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                />

                <Column field="vatperc" header="VAT %" />

                <Column
                  field="vatvalue"
                  header="VAT Amt"
                  body={(rowData) =>
                    rowData.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                  }
                  footer={selectedPODetail.Header?.vatvalue?.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                />

                <Column
                  field="nettotal"
                  header="Total Amt"
                  body={(rowData) =>
                    rowData.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })
                  }
                  footer={<b>{selectedPODetail.Header?.nettotal?.toLocaleString("en-US", { minimumFractionDigits: 2 })}</b>}
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
                    {/* <Col sm="7" className="mt-2">: {val || "N/A"}</Col> */}

                    <Col sm="7" className="mt-2" style={{ wordWrap: "break-word" }}>
                      :{" "}
                      {(label === "Supplier") ? (
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
                    <Column footerStyle={{ color: "orange" }} footer={<b>{selectedPRDetail.Header?.HeaderNetValue?.toLocaleString('en-US', { minimumFractionDigits: 2 })}</b>} />
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
                <Column field="NetTotal" bodyStyle={{ color: "orange" }} header="Total Amount" body={(row) => row.NetTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 })} />
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

      <Modal isOpen={showDiscussModal} toggle={() => setShowDiscussModal(false)}>
        <ModalHeader toggle={() => setShowDiscussModal(false)}>
          Add Remarks
        </ModalHeader>
        <ModalBody>
          <textarea
            className="form-control"
            rows="4"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Enter remarks..."
          />
          {selectedSummaryId?.pv_dis_count == 2 && (
            <span style={{ color: "red" }}>Cancel The Transaction</span>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setShowDiscussModal(false)}>
            Cancel
          </Button>
          <Button
            color="primary"
            onClick={async () => {
              await handlePVSave(selectedSummaryId?.summaryId, selectedSummaryId?.type, selectedSummaryId?.operation);
              setShowDiscussModal(false);
              setRemarks("");


            }}
          >
            Save
          </Button>
        </ModalFooter>
      </Modal>

      <DiscussionHistoryModal
        isOpen={historyModalOpen}
        toggle={() => setHistoryModalOpen(false)}
        claimId={historyClaimId}
        currentUser={UserData}
        mode={historyMode}
        senderRole={senderRole}
        onSuccess={() => {
          load();
        }}
      />
    </React.Fragment>
  );




};



const ApprovalTable = ({
  type,
  data,
  handleDiscuss,
  handleHodDiscuss,
  handleHodGmDiscuss,
  handleGmDirectorDiscuss,
  handleDiscussPPP,
  load,
  handleClick1,
  handleClick2,
  handleClick3,
  action1,
  action2,
  action3,
  handleShowDetails,
  roledetails,
  pppAction1,
  pppAction2,
  pppAction3,
  PPPPVAction1,
  PPPPVAction2,
  handlePPPClick1,
  handlePPPClick2, handlePPPClick3, handleVoucherClick, handlePPPPVClick3, handlePPPPVDirector, handleClickgmapprovan
  , selectedPPPRows, confirmRemove, handleRemove, updateselectedrows, PaymentSummaryTable, groupedBySummary, handlePVSave, pvgroupedBySummary, handleViewRemarks, FilterMatchMode, FilterOperator, cleardata,
  setSelectedSummaryId, setShowDiscussModal, setRemarks,
  access, handleViewPVHistory
}) => {

  const [filters, setFilters] = useState({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },

    claimno: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    date: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    name: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    dept: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    curr: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
    amount: {
      operator: FilterOperator.OR,
      constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }]
    },
    voucherno: {
      operator: FilterOperator.AND,
      constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
    },
  });
  const [globalFilterValue, setGlobalFilterValue] = useState("");

  const ApproverOne = roledetails?.[0]?.ApproverOne === 1;

  const ApproverTwo = roledetails?.[0]?.ApproverTwo === 1;
  const ApproverThree = roledetails?.[0]?.ApproverThree === 1;
  const ApproverFour = roledetails?.[0]?.ApproverFour === 1;
  const ApproverFive = roledetails?.[0]?.ApproverFive === 1;
  const ApproverSix = roledetails?.[0]?.ApproverSix === 1;
  const ApproverSeven = roledetails?.[0]?.ApproverSeven === 1;
  const ApproverEight = roledetails?.[0]?.ApproverEight === 1;

  const clearFilter = () => {
    initFilters();
  };
  const initFilters = () => {
    setFilters({
      global: { value: null, matchMode: FilterMatchMode.CONTAINS },

      claimno: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      date: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },

      name: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      dept: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      curr: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
      amount: { operator: FilterOperator.OR, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
      voucherno: {
        operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }]
      },
    });
    setGlobalFilterValue('');
  };

  const onGlobalFilterChange = (e) => {
    const value = e.target.value;
    setGlobalFilterValue(value);
    setFilters((prevFilters) => ({
      ...prevFilters,
      global: { value, matchMode: FilterMatchMode.CONTAINS }
    }));
  };





  const deptOptions = [...new Set(data.map(d => d.dept))].map(d => ({ label: d, value: d }));

  const detailTemplate = (rowData) => (
    <div className="p-3">
      <strong>Transactions:</strong> {rowData.transactions}
    </div>
  );

  const renderHeader = () => {
    return (
      <div className="row align-items-center g-3 clear-spa">
        <div className="col-12 col-lg-6">
          <Button className="btn btn-danger btn-label" onClick={clearFilter} >
            <i className="mdi mdi-filter-off label-icon" /> Clear
          </Button>
        </div>
        <div className="col-12 col-lg-3 text-end">
          <span className="me-4">
            <Button
              icon="pi pi-check"
              className={`btn-circle p-button-rounded p-button-success`}

            /> Approved</span>
          <span className="me-4"><Button
            icon="pi pi-comment"
            className={`btn-circle p-button-rounded  p-button-warning`}
          /> Discussed</span>
          {/* <span className="me-1"><Tag value="P" severity={getSeverity("Posted")} /> Posted</span> */}
        </div>
        <div className="col-12 col-lg-3">
          <input className="form-control" type="text" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
        </div>
      </div>
    );
  };
  const actionAckBodyTemplate = (rowData) => {
    return (
      <span style={{ cursor: "pointer", color: "blue" }} className="btn-rounded btn btn-link"
        onClick={() => handleVoucherClick(rowData.voucherid)}>{rowData.voucherno}</span>
    );
  };

  const renderPPPHeader = () => {
    const isSummarySelected = selectedPPPRows?.some(sel =>
      data?.some(d => d.id === sel.id)
    );
    return (


      <div className="row align-items-center g-3 clear-spa">

        <div className="col-12 col-lg-2">
          <Button className="btn btn-danger btn-label" onClick={clearFilter} >
            <i className="mdi mdi-filter-off label-icon" /> Clear
          </Button>
        </div>
        {ApproverFive == false && (

          <div className="col-12 col-lg-7">
            <Button
              icon="pi pi-trash"
              label="Move Back"
              className="p-button-danger"
              onClick={() => confirmRemove(selectedPPPRows)}
              // disabled={selectedPPPRows?.length === 0}
              disabled={!isSummarySelected}
            />

          </div>)
        }
        <div className="col-12 col-lg-3">
          <input className="form-control" type="text" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
        </div>
      </div>
    )
  }
  const PPPHeader = renderPPPHeader();


  const header = renderHeader();




  if (type === "PPP") {


    return (





      <DataTable value={data} paginator rows={access.records || 10} header={PPPHeader}
        filters={filters} globalFilterFields={['claimno', 'date', 'name', 'dept', 'curr', 'amount', 'voucherno']}
        dataKey="id" expandedRows={null} rowExpansionTemplate={detailTemplate}
        onFilter={(e) => setFilters(e.filters)}
        onRowToggle={(e) => { }} responsiveLayout="scroll" selection={selectedPPPRows} className="PPP_Datatable"
        onSelectionChange=
        {(e) => {
          debugger;
          updateselectedrows(e.value);
        }}
        rowSelectable={(rowData) => rowData.ppp_IsRejected !== 1}
        rowClassName={(rowData) =>
          rowData.ppp_IsRejected === 1 ? "rejected-row" : ""
        }
      >
        {/* <Column expander style={{ width: '3em' }} /> */}
        <Column
          header="Sel"
          headerStyle={{ width: '3em', textAlign: 'center' }}
          body={(rowData) => {
            const isDisabled = rowData.ppp_IsRejected === 1 || rowData.ppp_commissioner_approvalone === 1;
            const isSelected = selectedPPPRows.some(r => r.id === rowData.id);

            return (
              <Checkbox
                inputId={`select-${rowData.id}`}
                checked={isSelected}
                disabled={isDisabled}
                onChange={(e) => {
                  const updatedSelection = e.checked
                    ? [...selectedPPPRows, rowData]
                    : selectedPPPRows.filter(r => r.id !== rowData.id);
                  updateselectedrows(updatedSelection);
                }}
              />
            );
          }}
        />

        <Column
          header="S.No" style={{ textAlign: 'center' }}
          body={(rowData, { rowIndex }) => rowIndex + 1}
        />
        {/* <Column field="claimno" header="Claim#"  /> */}
        <Column field="claimno" header="Claim#" filter body={(rowData) => {
          const handleClaimClick = () => {
            if (access.canViewDetails) {
              handleShowDetails(rowData);
            }
          };
          if (access.canViewDetails) {
            return (
              <span
                id={`tt-${rowData.claimno}`}
                style={{ color: '#007bff', cursor: 'pointer', textDecoration: 'underline' }}
                className="btn-rounded btn btn-link"
                onClick={handleClaimClick}
              >
                {rowData.claimno}
              </span>
            );
          } else {
            return (
              <button
                style={{ color: 'gray', background: 'none', border: 'none', cursor: 'default', padding: 0 }}
                disabled
                onClick={handleClaimClick}
              >
                {rowData.claimno}
              </button>
            );
          }
        }} />
        <Column field="date" header="Claim Date" filter />
        <Column field="name" header="Applicant Name" filter />
        <Column field="dept" filter header="Applicant Department" />
        <Column field="amount" filter header="Claim Amount in TC"
          body={(rowData) =>
            rowData.amount?.toLocaleString('en-US', {
              style: 'decimal',
              minimumFractionDigits: 2
            })
          }
          style={{ textAlign: 'right' }} />
        <Column field="curr" filter header="Currency" />
        <Column header="History" field="voucherno" body={(rowData) => (
          <span onClick={() => handleViewRemarks(rowData.id)} title="View History" style={{ cursor: 'pointer' }}>
            <i className="mdi mdi-comment-text-outline" style={{ fontSize: '1.5rem', color: '#17a2b8' }}></i>
          </span>

        )} />
        <Column header="PV" field="voucherno" filter body={actionAckBodyTemplate} className="text-center" />
        {/* <Column header="Details" body={(rowData) => (
          <span id={`tt-${rowData.claimno}`} style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => {
            handleShowDetails(rowData);
          }}>
            Details

            <Tooltip target={`#tt-${rowData.claimno}`} content={"View Details"} mouseTrack />
          </span>
        )} /> */}
        {/* <Column
          style={{ textAlign: 'center' }}
          header="GM"
          body={(rowData) => {
            const gmDisabled = rowData.ppp_gm_approvalone === 1;

            return (
              <div className="d-flex gap-2">
                <Button
                  icon="pi pi-check"
                  className={`btn-circle p-button-rounded ${pppAction1[rowData.id] === 'approve' ? 'p-button-success' : 'p-button-outlined'
                    }`}
                  onClick={() => handlePPPClick1('approve', rowData.id)}
                  tooltip="Approve"
                  tooltipOptions={{ position: 'top' }}
                  disabled={gmDisabled}
                />
                <Button
                  icon="pi pi-comment"
                  className={`btn-circle p-button-rounded ${pppAction1[rowData.id] === 'discuss' ? 'p-button-warning' : 'p-button-outlined'
                    }`}
                  onClick={() => {
                    handlePPPClick1('discuss', rowData.id);
                    handleDiscuss(rowData);
                  }}
                  tooltip="Discuss"
                  tooltipOptions={{ position: 'top' }}
                  disabled={gmDisabled}
                />
              </div>
            );
          }}
        /> */}

        <Column
          style={{ textAlign: 'center' }}
          header="GM"
          body={(rowData) => {
            const gmDisabled1 = !ApproverThree || rowData.approvedtwo === 0 || rowData.ppp_gm_approvalone === 1 || rowData.ppp_IsRejected === 1;
            const gmDisabled = gmDisabled1 == true && rowData.PPP_temp_GM_status === 0
            if (rowData.approvedtwo === 1) {
              return (
                <div className="d-flex gap-2">
                  <Button
                    icon="pi pi-check"
                    className={`btn-circle p-button-rounded ${pppAction1[rowData.id] === 'approve' ? 'p-button-success' : 'p-button-outlined'
                      }`}
                    onClick={() => handlePPPClick1('approve', rowData.id, rowData)}

                    tooltipOptions={{ position: 'top' }}
                    disabled={gmDisabled}
                  />
                  <Button
                    icon="pi pi-comment"
                    className={`btn-circle p-button-rounded ${pppAction1[rowData.id] === 'discuss' ? 'p-button-warning' : 'p-button-outlined'
                      }`}
                    onClick={() => {
                      handlePPPClick1('discuss', rowData.id, rowData);
                      handleDiscussPPP(rowData, "GM");
                    }}
                    tooltip={rowData.comment}
                    tooltipOptions={{ position: 'top' }}
                    disabled={gmDisabled}
                  />
                </div>
              );
            }
          }}
        />

        {(ApproverFour == true || ApproverFive == true) && (
          <Column
            style={{ textAlign: 'center' }}
            header="Director"
            body={(rowData) => {



              const directorDisabled1 = !ApproverFour || rowData.ppp_gm_approvalone == 0 || rowData.ppp_director_approvalone === 1 || rowData.ppp_IsRejected === 1;
              const directorDisabled = directorDisabled1 == true && rowData.PPP_temp_Director_status === 0


              if (rowData.ppp_gm_approvalone == 1) {

                return (
                  <div className="d-flex gap-2">
                    <Button
                      icon="pi pi-check"
                      className={`btn-circle p-button-rounded  ${pppAction2[rowData.id] === 'approve' ?
                        'p-button-success'
                        : pppAction2[rowData.id] === 'approve'
                          ? 'p-button-success'
                          : 'p-button-outlined'
                        }`}
                      onClick={() => handlePPPClick2('approve', rowData.id, rowData)}

                      tooltipOptions={{ position: 'top' }}
                      disabled={directorDisabled}
                    />
                    <Button
                      icon="pi pi-comment"
                      className={`btn-circle p-button-rounded  ${pppAction2[rowData.id] === 'discuss'
                        ? 'p-button-warning'
                        : pppAction2[rowData.id] === 'discuss'
                          ? 'p-button-warning'
                          : 'p-button-outlined'
                        }`}
                      onClick={() => {
                        handlePPPClick2('discuss', rowData.id, rowData);
                        handleDiscussPPP(rowData, "Director");
                      }}
                      tooltip={rowData.comment}
                      tooltipOptions={{ position: 'top' }}
                      disabled={directorDisabled}
                    />
                  </div>
                );
              }
            }}
          />
        )}

        {ApproverFive == true && (
          <Column
            style={{ textAlign: 'center' }}
            header="CEO"
            body={(rowData) => {

              const CEODisabled1 = !ApproverFive || rowData.ppp_director_approvalone === 0 || rowData.ppp_commissioner_approvalone === 1 || rowData.ppp_IsRejected === 1;
              const CEODisabled = CEODisabled1 == true && rowData.PPP_temp_CEO_status === 0


              if (rowData.ppp_director_approvalone == 1) {
                return (
                  <div className="d-flex gap-2">
                    <Button
                      icon="pi pi-check"
                      className={`btn-circle p-button-rounded  ${pppAction3[rowData.id] === 'approve' ?
                        'p-button-success'
                        : pppAction3[rowData.id] === 'approve'
                          ? 'p-button-success'
                          : 'p-button-outlined'
                        }`}
                      onClick={() => handlePPPClick3('approve', rowData.id, rowData)}

                      tooltipOptions={{ position: 'top' }}
                      disabled={CEODisabled}
                    />

                    {/* {rowData.voucherid==0 &&( */}
                    <Button
                      icon="pi pi-comment"
                      className={`btn-circle p-button-rounded  ${pppAction3[rowData.id] === 'discuss'
                        ? 'p-button-warning'
                        : pppAction3[rowData.id] === 'discuss'
                          ? 'p-button-warning'
                          : 'p-button-outlined'
                        }`}
                      onClick={() => {
                        handlePPPClick3('discuss', rowData.id, data);
                        handleDiscussPPP(rowData, "CEO");
                      }}
                      tooltip={rowData.comment}
                      tooltipOptions={{ position: 'top' }}
                      disabled={CEODisabled}
                    />
                    {/* )} */}
                  </div>
                );
              }
            }}
          />
        )}
        {/* <Column
  style={{ textAlign: 'center' }}
  header="GM"
  body={(rowData) => {
    const gmDisabled = !ApproverOne || rowData.ppp_gm_approvalone === 1;

    return (
      <div className="d-flex gap-2">
        <Button
          icon="pi pi-check"
          className={`btn-circle p-button-rounded ${pppAction1[rowData.id] === 'approve' ? 'p-button-success' : 'p-button-outlined'}`}
          onClick={() => handlePPPClick1('approve', rowData.id)}
          tooltip="Approve"
          tooltipOptions={{ position: 'top' }}
          disabled={gmDisabled}
        />
        <Button
          icon="pi pi-comment"
          className={`btn-circle p-button-rounded ${pppAction1[rowData.id] === 'discuss' ? 'p-button-warning' : 'p-button-outlined'}`}
          onClick={() => {
            handlePPPClick1('discuss', rowData.id);
            handleDiscuss(rowData);
          }}
          tooltip="Discuss"
          tooltipOptions={{ position: 'top' }}
          disabled={gmDisabled}
        />
      </div>
    );
  }}
/>
<Column
  style={{ textAlign: 'center' }}
  header="Director"
  body={(rowData) => {
    const directorDisabled = !ApproverTwo || rowData.ppp_gm_approvalone === 0 || rowData.ppp_director_approvalone === 1;

    return (
      <div className="d-flex gap-2">
        <Button
          icon="pi pi-check"
          className={`btn-circle p-button-rounded ${pppAction2[rowData.id] === 'approve' ? 'p-button-success' : 'p-button-outlined'}`}
          onClick={() => handlePPPClick2('approve', rowData.id)}
          tooltip="Approve"
          tooltipOptions={{ position: 'top' }}
          disabled={directorDisabled}
        />
        <Button
          icon="pi pi-comment"
          className={`btn-circle p-button-rounded ${pppAction2[rowData.id] === 'discuss' ? 'p-button-warning' : 'p-button-outlined'}`}
          onClick={() => {
            handlePPPClick2('discuss', rowData.id);
            handleDiscuss(rowData);
          }}
          tooltip="Discuss"
          tooltipOptions={{ position: 'top' }}
          disabled={directorDisabled}
        />
      </div>
    );
  }}
/> */}

        {/* <Column
          header="Remarks"
          body={(rowData) => rowData.comment}
        /> */}
        {/* <Column header="Convert to PPP" body={() => <input type="checkbox" />} /> */}
      </DataTable>

    );
  } else
    if (type != "PPP PV") {
      return (

        <DataTable value={data} paginator rows={access.records || 10} header={header}
          filters={filters} globalFilterFields={['claimno', 'date', 'name', 'dept', 'curr', 'amount']}
          dataKey="claimno" onFilter={(e) => setFilters(e.filters)} expandedRows={null} rowExpansionTemplate={detailTemplate}
          onRowToggle={(e) => { }} responsiveLayout="scroll"
          rowClassName={(rowData) =>
            rowData.discussedone == 1 || rowData.discussedtwo == 1 || rowData.discussedeight == 1 ? "Discussed-row" : ""
          }
        >
          {/* <Column expander style={{ width: '3em' }} /> */}
          <Column
            header="S.No" style={{ textAlign: 'center' }}
            body={(rowData, { rowIndex }) => rowIndex + 1}
          />
          {/* <Column field="claimno" header="Claim#" filter  /> */}

          <Column field="claimno" header="Claim#" filter body={(rowData) => (

            <span id={`tt-${rowData.claimno}`} style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => {
              handleShowDetails(rowData);
            }}>
              {rowData.claimno}

            </span>

          )} />

          <Column field="date" header="Claim Date" filter />
          <Column field="name" header="Applicant Name" filter />
          <Column field="dept" header="Applicant Department" filter />
          <Column field="amount" header="Claim Amount in TC"
            body={(rowData) =>
              rowData.amount?.toLocaleString('en-US', {
                style: 'decimal',
                minimumFractionDigits: 2
              })
            }
            filter style={{ textAlign: 'right' }} />



          <Column field="curr" header="Currency" filter />
          <Column header="History" body={(rowData) => (
            <span onClick={() => handleViewRemarks(rowData.id)} title="View Remarks" style={{ cursor: 'pointer' }}>
              <i className="mdi mdi-comment-text-outline" style={{ fontSize: '1.5rem', color: '#17a2b8' }}></i>
            </span>

          )} />
          {/* <Column header="Details" body={(rowData) => (
            <span id={`tt-${rowData.claimno}`} style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => {
              handleShowDetails(rowData);
            }}>
              Details

              <Tooltip target={`#tt-${rowData.claimno}`} content={"View Details"} mouseTrack />
            </span>
          )} /> */}


          <Column
            style={{ textAlign: 'center' }}
            header="HOD"
            body={(rowData) => {
              const hodApproved = action3[rowData.id] === 'approve';
              const gmDiscussed = action3[rowData.id] === 'discuss';
              const hodDisabled = !ApproverEight || (rowData.approvedeight === 1 && !gmDiscussed) || rowData.discussedeight == 1;


              const tooltipId = `hod-tooltip-${rowData.id}`;   // unique for every row

              return (
                <>
                  <Tooltip target={`#${tooltipId}`} content={rowData.comment || ''} position="top" />


                  <div className={`d-flex gap-2`} id={tooltipId}>
                    <Button
                      icon="pi pi-check"
                      className={`btn-circle p-button-rounded ${hodApproved ? 'p-button-success' : 'p-button-outlined'}`}
                      onClick={() => handleClick3('approve', rowData.id)}

                      tooltipOptions={{ position: 'top' }}
                      disabled={hodDisabled}
                    />
                    <Button
                      icon="pi pi-comment"
                      className={`btn-circle p-button-rounded ${action3[rowData.id] === 'discuss' ? 'p-button-warning' : 'p-button-outlined'}`}
                      onClick={() => {
                        handleHodDiscuss(rowData);
                      }}


                      disabled={hodDisabled}
                    />
                  </div>
                </>
              );



            }}
          />

          {(ApproverOne === true || ApproverTwo === true || ApproverEight === true) && (
            <Column
              style={{ textAlign: 'center' }}
              header="GM"
              body={(rowData) => {
                // HOD discussing with GM
                if (ApproverEight && !ApproverOne && !ApproverTwo) {
                  return (
                    <Button
                      icon="pi pi-comment"
                      className="p-button-rounded p-button-info p-button-text"
                      onClick={() => handleHodGmDiscuss(rowData, 'HOD')}
                      tooltip="Discuss with GM"
                      tooltipOptions={{ position: 'top' }}
                    />
                  );
                }

                const gmApproved = action1[rowData.id] === 'approve';
                const directorDiscussed = action2[rowData.id] === 'discuss';
                const gmDisabled = !ApproverOne || (rowData.approvedone === 1 && !directorDiscussed) || rowData.discussedone == 1;

                // CASE: gmApproved is true AND directorDiscussed is false
                const tooltipId = `gm-tooltip-${rowData.id}`;   // unique for every row
                if (rowData.approvedeight === 1) {
                  return (
                    <>
                      <Tooltip target={`#${tooltipId}`} content={rowData.comment || ''} position="top" />


                      <div className={`d-flex gap-2`} id={tooltipId}>
                        <Button
                          icon="pi pi-check"
                          className={`btn-circle p-button-rounded ${gmApproved ? 'p-button-success' : 'p-button-outlined'}`}
                          onClick={() => handleClick1('approve', rowData.id)}

                          tooltipOptions={{ position: 'top' }}
                          disabled={gmDisabled}
                        />
                        <Button
                          icon="pi pi-comment"
                          className={`btn-circle p-button-rounded ${action1[rowData.id] === 'discuss' ? 'p-button-warning' : 'p-button-outlined'}`}
                          onClick={() => {
                            handleClick1('discuss', rowData.id);
                            handleHodGmDiscuss(rowData, 'GM');
                          }}


                          disabled={gmDisabled}
                        />
                      </div>
                    </>
                  );
                }
                else if (rowData.discussedone == 1) {
                  return (
                    <div className="d-flex gap-2  ">
                      <Button
                        icon="pi pi-check"
                        className={`btn-circle p-button-rounded ${action1[rowData.id] === 'approve' ? 'p-button-success' : 'p-button-outlined'
                          }`}

                        tooltip="Approve"
                        tooltipOptions={{ position: 'top' }}
                        disabled={true}
                      />
                      <Button
                        icon="pi pi-comment"
                        className={`btn-circle p-button-rounded ${action1[rowData.id] === 'discuss' ? 'p-button-warning' : 'p-button-outlined'
                          }`}
                        tooltip={rowData.comment}
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>)
                }


              }}
            />

          )
          }
          {(ApproverTwo == true || ApproverOne == true) && (
            <Column
              style={{ textAlign: 'center' }}
              header="Director"
              body={(rowData) => {
                // GM discussing with Director
                if (ApproverOne && !ApproverTwo) {
                  return (
                    <Button
                      icon="pi pi-comment"
                      className="p-button-rounded p-button-info p-button-text"
                      onClick={() => handleGmDirectorDiscuss(rowData, 'GM')}
                      tooltip="Discuss with Director"
                      tooltipOptions={{ position: 'top' }}
                    />
                  );
                }

                const directorDisabled =
                  !ApproverTwo || rowData.approvedone === 0 || rowData.approvedtwo === 1 || rowData.discussedtwo == 1;
                if (rowData.approvedone === 1) {
                  return (
                    <div className="d-flex gap-2">
                      <Button
                        icon="pi pi-check"
                        className={`btn-circle p-button-rounded ${action2[rowData.id] === 'approve' ? 'p-button-success' : 'p-button-outlined'
                          }`}
                        onClick={() => handleClick2('approve', rowData.id)}
                        tooltip="Approve"
                        tooltipOptions={{ position: 'top' }}
                        disabled={directorDisabled}
                      />
                      <Button
                        icon="pi pi-comment"
                        className={`btn-circle p-button-rounded ${action2[rowData.id] === 'discuss' ? 'p-button-warning' : 'p-button-outlined'
                          }`}
                        onClick={() => {
                          handleClick2('discuss', rowData.id);
                          handleGmDirectorDiscuss(rowData, 'Director');
                        }}
                        tooltip={rowData.comment}
                        tooltipOptions={{ position: 'top' }}
                        disabled={directorDisabled}
                      />
                    </div>
                  );
                }
                else if (rowData.discussedtwo == 1) {
                  return (
                    <div className="d-flex gap-2  ">
                      <Button
                        icon="pi pi-check"
                        className={`btn-circle p-button-rounded ${action2[rowData.id] === 'approve' ? 'p-button-success' : 'p-button-outlined'
                          }`}

                        tooltip="Approve"
                        tooltipOptions={{ position: 'top' }}
                        disabled={true}
                      />
                      <Button
                        icon="pi pi-comment"
                        className={`btn-circle p-button-rounded ${action2[rowData.id] === 'discuss' ? 'p-button-warning' : 'p-button-outlined'
                          }`}
                        tooltip={rowData.comment}
                        tooltipOptions={{ position: 'top' }}
                      />
                    </div>)
                }

              }}
            />
          )}
          {/* <Column
            header="Remarks"
            body={(rowData) => (
              <div
                style={{
                  maxWidth: '100px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={rowData.comment}
              >
                {rowData.comment}
              </div>
            )}
          /> */}

        </DataTable>

      );
    }
    else {
      return (

        // <DataTable value={data} paginator rows={5} header={header}
        //   filters={filters} globalFilterFields={['claimno', 'name', 'dept', 'curr']}
        //   dataKey="claimno" expandedRows={null} rowExpansionTemplate={detailTemplate}
        //   onRowToggle={(e) => { }} responsiveLayout="scroll">

        //   <Column
        //     header="S.No" style={{ textAlign: 'center' }}
        //     body={(rowData, { rowIndex }) => rowIndex + 1}
        //   />
        //   <Column field="claimno" header="Claim#" filter />
        //   <Column field="date" header="Claim Date" filter />
        //   <Column field="name" header="Applicant Name" filter />
        //   <Column header="PV" showFilterMatchModes={false} body={actionAckBodyTemplate} className="text-center" />
        //   <Column field="dept" header="Applicant Department" filter filterElement={(opts) => (
        //     <Dropdown value={opts.value} options={deptOptions} onChange={(e) => opts.filterCallback(e.value, opts.index)} placeholder="All Depts" className="p-column-filter" />
        //   )} />
        //   <Column field="amount" header="Claim Amount in TC" filter style={{ textAlign: 'right' }} />
        //   <Column field="curr" header="Currency" filter />
        //   <Column header="Details" body={(rowData) => (
        //     <span id={`tt-${rowData.claimno}`} style={{ color: '#007bff', cursor: 'pointer' }} onClick={() => {
        //       handleShowDetails(rowData);
        //     }}>
        //       Details

        //       <Tooltip target={`#tt-${rowData.claimno}`} content={"View Details"} mouseTrack />
        //     </span>
        //   )} />


        //   <Column
        //     style={{ textAlign: 'center' }}
        //     header="Director"
        //     body={(rowData) => {
        //       const approved = rowData.PPP_PV_Director_approve === 1;
        //       const discussed = rowData.ppp_pv_Director_discussed === 1;

        //       return (
        //         <div className="d-flex gap-2">

        //           <Button
        //             icon="pi pi-check"
        //             className={`btn-circle p-button-rounded ${(PPPPVAction1[rowData.id] ?? (approved ? 'approve' : '')) === 'approve'
        //               ? 'p-button-success'
        //               : 'p-button-outlined'
        //               }`}
        //             onClick={() => handlePPPPVDirector('approve', rowData.id)}
        //             tooltip="Approve"
        //             tooltipOptions={{ position: 'top' }}
        //             disabled={false}
        //           />


        //           <Button
        //             icon="pi pi-comment"
        //             className={`btn-circle p-button-rounded ${(PPPPVAction1[rowData.id] ?? (discussed ? 'discuss' : '')) === 'discuss'
        //               ? 'p-button-warning'
        //               : 'p-button-outlined'
        //               }`}
        //             onClick={() => handlePPPPVDirector('discuss', rowData.id)}
        //             tooltip="Discuss"
        //             tooltipOptions={{ position: 'top' }}
        //             disabled={approved}
        //           />
        //         </div>
        //       );
        //     }}
        //   />


        //   <Column
        //     style={{ textAlign: 'center' }}
        //     header="Commissioner"
        //     body={(rowData) => {
        //       const approved = rowData.PPP_PV_Commissioner_approveone === 1;
        //       const discussed = rowData.ppp_pv_Commissioner_discussedone === 1;

        //       return (
        //         <div className="d-flex gap-2">

        //           <Button
        //             icon="pi pi-check"
        //             className={`btn-circle p-button-rounded ${(PPPPVAction2[rowData.id] ?? (approved ? 'approve' : '')) === 'approve'
        //               ? 'p-button-success'
        //               : 'p-button-outlined'
        //               }`}
        //             onClick={() => handlePPPPVClick3('approve', rowData.id)}
        //             tooltip="Approve"
        //             tooltipOptions={{ position: 'top' }}
        //             disabled={false}
        //           />


        //           <Button
        //             icon="pi pi-comment"
        //             className={`btn-circle p-button-rounded ${(PPPPVAction2[rowData.id] ?? (discussed ? 'discuss' : '')) === 'discuss'
        //               ? 'p-button-warning'
        //               : 'p-button-outlined'
        //               }`}
        //             onClick={() => handlePPPPVClick3('discuss', rowData.id)}
        //             tooltip="Discuss"
        //             tooltipOptions={{ position: 'top' }}
        //             disabled={approved}
        //           />
        //         </div>
        //       );
        //     }}
        //   />


        // </DataTable>


        Object.entries(pvgroupedBySummary)
          .filter(([_, group]) => group.type === "PPP PV")
          .map(([summaryId, group]) => (
            <Card key={summaryId} className="mb-4">
              <div className=" button-items alert alert-primary">
                <div className="text-start" style={{ width: "50%", float: "left" }}>
                  <strong>Payment Plan Date:</strong> {group.PaymentPlanDate} /
                  <strong> PPP No:</strong> {group.PaymentNo}

                </div>



                <div className="text-end" style={{ width: "50%", float: "right" }}>

                  <span onClick={() => handleViewPVHistory(summaryId)} title="View PV History" style={{ cursor: 'pointer', marginRight: '10px', verticalAlign: 'middle' }}>
                    <i className="mdi mdi-comment-text-outline" style={{ fontSize: '1.5rem', color: '#17a2b8' }}></i>
                  </span>

                  {group.PPP_PV_Director_approve === 0 && ApproverSix === true ? (
                    <>
                      <button type="button" className="btn btn-primary" onClick={() => handlePVSave(summaryId, 1, 1)}>

                        <i className="bx bx-check-circle label-icon font-size-16 align-middle me-2"></i> Director Approval
                      </button>

                      <button type="button" className="btn btn-warning" onClick={() => {
                        // handlePVSave(summaryId, 1,2)
                        setSelectedSummaryId({ pv_dis_count: group.pv_dis_count, summaryId: summaryId, type: 1, operation: 2 }); // or row.id, depending on your data
                        setShowDiscussModal(true);
                      }
                      }>

                        <i className="bx bx-check-circle label-icon font-size-16 align-middle me-2"></i> Director Discuss
                      </button>
                    </>

                  ) :

                    (
                      <>
                        {group.PPP_PV_Director_approve === 1 && (


                          <button type="button" className="btn btn-success bg-success"     >

                            Director Approved
                          </button>


                        )}
                        {group.PPP_PV_Director_approve === 1 && group.PPP_PV_Commissioner_approveone === 0 && ApproverSeven === true && (
                          <>
                            <button type="button" data-access="save" className="btn btn-primary" onClick={() => handlePVSave(summaryId, 2, 1)}>

                              <i className="bx bx-check-circle label-icon font-size-16 align-middle me-2"></i> CEO Approval
                            </button>

                            <button type="button" data-access="save" className="btn btn-warning" onClick={() => {

                              // handlePVSave(summaryId, 2,2);
                              setSelectedSummaryId({ pv_dis_count: group.pv_dis_count, summaryId: summaryId, type: 2, operation: 2 }); // or row.id, depending on your data
                              setShowDiscussModal(true);
                              setRemarks("");

                            }
                            }>

                              <i className="bx bx-check-circle label-icon font-size-16 align-middle me-2"></i> CEO Discuss
                            </button>
                          </>
                        )}
                      </>
                    )}
                </div>
              </div>
              <div className="text-end mb-2">
              </div>

              {/* Dynamic tables */}
              <PaymentSummaryTable claims={group.rows} approvedata={group} onRefresh={() => load()} />

              {/* Optional buttons */}

            </Card>
          ))

      );



    }
};

export default ManageApproval;