import React, { useState, useEffect } from "react";
import { Card, CardBody, Collapse, Col, Container, Row, Button, FormGroup, Label, Input, Table, Modal, ModalHeader, ModalBody, ModalFooter, UncontrolledAlert, } from "reactstrap";
import { useHistory, useParams } from "react-router-dom";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import { Formik, Form, ErrorMessage } from "formik";
import Breadcrumbs from "../../../components/Common/Breadcrumb";
import { GetCustomerFilter, GetUoM, GetCurrency, fetchGasListDSI, GetCascodedetail, GetCurrencyconversion, getPackingDetails } from "../../../common/data/mastersapi";

import { GetInvoiceDetails, CreatenewInvoice, UpdateInvoice, GetAvailableDOs } from "../../../common/data/invoiceapi";
import useAccess from "../../../common/access/useAccess";
import { postInvoiceToAR } from "../../FinanceModule/service/financeapi";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { InputText } from "primereact/inputtext"; // [ADDED] For Search Bar

const AddManualInvoice = () => {
  const { access, applyAccessUI } = useAccess("Invoice", " Direct Sales Invoice");
  const [gasCodeList, setGasCodeList] = useState([]);
  const [CurrencyList, setCurrencyList] = useState([]);
  const [UOMList, setUOMList] = useState([]);
  const [isSearchable, setIsSearchable] = useState(true);
  const [isClearable, setIsClearable] = useState(true);
  const [activeAccord, setActiveAccord] = useState({ col1: true, col2: true, });
  const showAccord = activeItem => {
    setActiveAccord(prevState => ({
      ...prevState,
      [activeItem]: !prevState[activeItem],
    }));
  };
  const history = useHistory();
  const { id } = useParams();
  const currentDate = new Date();

  const [branchId] = useState(1);
  const [submitType, setSubmitType] = useState(1);
  const [iscustomerchange, setIscustomerchange] = useState(0);
  const [customerList, setCustomerList] = useState([]);
  const [packingDetails, setPackingDetails] = useState([]);
  const [doDetail, setDoDetail] = useState([]);
  const [tooltipOpen, setTooltipOpen] = useState({});
  const [errorMsg, setErrorMsg] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successStatus, setSuccessStatus] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [isDisabled, setIsDisabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- NEW STATES FOR DO CONVERSION ---
  const [convertModal, setConvertModal] = useState(false);
  const [availableDOs, setAvailableDOs] = useState([]);
  const [selectedDOs, setSelectedDOs] = useState([]);
  const [doLoading, setDoLoading] = useState(false);
  const [globalFilter, setGlobalFilter] = useState(""); // [ADDED] State for Search

  const [invoiceHeader, SetInvoiceHeader] = useState({
    doid: [],
    id: 0,
    salesInvoiceNbr: "",
    customerId: "",
    salesInvoiceDate: currentDate,
    totalAmount: 1,
    totalQty: 1,
    isSubmitted: 0,
    orgId: 1,
    branchId: 1,
    userId: 1,
    calculatedPrice: 1,
  });
  const [totalQty, setTotalQty] = useState();
  const [totalPrice, setTotalPrice] = useState();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currencySelect, setcurrencySelect] = useState(null);

  const handleDeleteRow = (rowIndex) => {
    setmanualinvoiceDetails(prev =>
      prev.filter((_, index) => index !== rowIndex)
    );
  };

  const [manualinvoiceDetails, setmanualinvoiceDetails] = useState([
    {
      sqid: 0,
      packingid: 0,
      id: 0,
      salesInvoicesId: 0,
      packingDetailId: 0,
      deliveryNumber: "",
      GasCodeId: 0,
      gasCode: "",
      Volume: 1,
      Pressure: 1,
      Qty: 1,
      pickedQty: 1,
      Uom: "",
      UomId: 0,
      CurrencyId: currencySelect,
      UnitPrice: 0,
      TotalPrice: 0,
      ConvertedPrice: "",
      price: "",
      Exchangerate: 0,
      driverName: "",
      truckName: "",
      poNumber: "",
      doNumber: "",
      requestDeliveryDate: currentDate,
      deliveryAddress: "",
      deliveryInstruction: "",
      soQty: 0,
      so_Issued_Qty: 0,
      balance_Qty: 0,
      ConvertedCurrencyId: currencySelect,
      isImportedDO: false,
      Note: ""
    },
  ]);

  // [FIX] Helper to Format Number with Commas for Display (e.g. 1000 -> 1,000)
  const formatInputNumber = (val) => {
    if (val === undefined || val === null || val === "") return "";
    // Split integer and decimal parts to handle typing like "100."
    const parts = val.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  useEffect(() => {
    if (!access.loading) {
      applyAccessUI();
    }
  }, [access, applyAccessUI]);

  useEffect(() => {
    const getCustomerList = async () => {
      try {
        const data = await GetCustomerFilter(branchId, "%");
        if (Array.isArray(data) && data.length > 0) {
          setCustomerList(data);
        } else {
          setCustomerList([]);
        }
      } catch (err) {
        console.error("Error fetching customer list:", err.message);
      }
    };
    getCustomerList();

    if (id) {
      getInvoiceDetails(id);
    }
  }, [branchId, id]);

  const handleAddItem = async () => {
    const lastRow = manualinvoiceDetails[manualinvoiceDetails.length - 1];
    const previousPO = lastRow ? lastRow.poNumber : "";

    const newRow = {
      sqid: 0,
      packingid: 0,
      id: 0,
      salesInvoicesId: invoiceHeader.id || 0,
      packingDetailId: 0,
      deliveryNumber: "",
      GasCodeId: 0,
      gasCode: "",
      Volume: "1",
      Pressure: "1",
      Qty: 1,
      pickedQty: 1,
      Uom: "",
      UomId: 0,
      CurrencyId: currencySelect || null,
      UnitPrice: 0,
      TotalPrice: 0,
      ConvertedPrice: "",
      price: "",
      Exchangerate: "",
      driverName: "",
      truckName: "",
      poNumber: previousPO,
      doNumber: "",
      requestDeliveryDate: currentDate,
      deliveryAddress: "",
      deliveryInstruction: "",
      soQty: 0,
      so_Issued_Qty: 0,
      balance_Qty: 0,
      ConvertedCurrencyId: currencySelect || null,
      isImportedDO: false,
      Note: ""
    };

    const updatedDetails = [...manualinvoiceDetails, newRow];
    setmanualinvoiceDetails(updatedDetails);

    if (currencySelect) {
      await GetCurrencyval(updatedDetails.length - 1, currencySelect);
    }
  };


  useEffect(() => {
    setDoDetail([]);
  }, [iscustomerchange]);

  useEffect(() => {
    setPackingDetails([]);
  }, [doDetail]);

  const handleCustomerSelectChange = option => {
    SetInvoiceHeader(prev => ({
      ...prev,
      customerId: option ? option.value : "",
    }));
    setIscustomerchange(prev => prev + 1);

    setmanualinvoiceDetails([{
      sqid: 0, packingid: 0, id: 0, salesInvoicesId: 0, packingDetailId: 0, deliveryNumber: "", GasCodeId: 0, gasCode: "",
      Volume: 1, Pressure: 1, Qty: 1, pickedQty: 1, Uom: "", UomId: 0, CurrencyId: currencySelect, UnitPrice: 0, TotalPrice: 0,
      ConvertedPrice: "", price: "", Exchangerate: 0, driverName: "", truckName: "", poNumber: "", doNumber: "",
      requestDeliveryDate: currentDate, deliveryAddress: "", deliveryInstruction: "", soQty: 0, so_Issued_Qty: 0, balance_Qty: 0,
      ConvertedCurrencyId: currencySelect, isImportedDO: false, Note: ""
    }]);
  };

  const handleDOSelectChange = options => {
    setPackingDetails([]);
    if (options.length === 0) {
      setPackingDetails([]);
    }
    const updatedOptions = options.map((item, index) => ({
      ...item,
      doid: item.id || 0,
      id: item.id || 0,
      salesInvoicesId: id || 0,
      packingId: item.value,
    }));
    setDoDetail(updatedOptions);
    SetInvoiceHeader(prev => ({
      ...prev,
      doid: updatedOptions,
    }));
    updatedOptions.forEach(async item => {
      const data = await getPackingDetails(item.doid, branchId);
      if (data) {
        setPackingDetails(prev => [...prev, ...data]);
      }
    });
  };

  // --- START NEW DO IMPORT LOGIC ---
  const toggleConvertModal = () => {
    if (!invoiceHeader.customerId) {
      setErrorMsg(["Please select a Customer first."]);
      return;
    }
    const isOpening = !convertModal;
    setConvertModal(isOpening);

    if (isOpening) {
      setGlobalFilter(""); // [ADDED] Reset search on open
      fetchAvailableDOs();
    }
  };

  const fetchAvailableDOs = async () => {
    setDoLoading(true);
    try {
      const payload = {
        customerid: invoiceHeader.customerId,
        gascodeid: 0
      };
      const response = await GetAvailableDOs(payload);
      const allData = response.data || response || [];

      // 🟢 FIX: Get list of DOs already added to the grid
      const addedDOs = new Set(
        manualinvoiceDetails
          .map(item => item.doNumber)
          .filter(num => num && num.trim() !== "")
      );

      // Filter for Confirmed DOs AND exclude those already in the grid
      const filteredData = allData.filter(item => {
        const ref = item.do_number || "";

        // 1. Must match DO pattern
        const isValidRef = ref.startsWith("DO") || ref.startsWith("27");

        // 2. Must NOT be already added
        const isNotAdded = !addedDOs.has(ref);

        return isValidRef && isNotAdded;
      });

      setAvailableDOs(filteredData);
    } catch (e) {
      console.error(e);
    } finally {
      setDoLoading(false);
    }
  };

  const handleImportDOs = async () => {
    if (selectedDOs.length === 0) return;

    setConvertModal(false);
    setIsLoading(true);

    try {
      let newItems = [];

      for (const doHeader of selectedDOs) {
        const doId = doHeader.do_id;
        const doNumber = doHeader.do_number;

        // Fetch details for each selected DO
        const detailsData = await GetInvoiceDetails(doId);

        if (detailsData && detailsData.Items && detailsData.Items.length > 0) {
          const mappedItems = await Promise.all(detailsData.Items.map(async (item) => {
            // 🟢 FIX: SMART MATCH GAS CODE ID
            // If the imported ID doesn't exist in our list, try to find it by NAME
            let validGasId = item.gascodeid;
            let gasInfo = gasCodeList.find(g => g.GasCodeId === item.gascodeid);

            if (!gasInfo) {
              // Try matching by Name if ID mismatch (e.g. 78 vs 1928)
              gasInfo = gasCodeList.find(g => g.GasName === item.GasName);
              if (gasInfo) {
                console.log(`Auto-Correction: Mapped obsolete ID ${item.gascodeid} to ${gasInfo.GasCodeId} for ${item.GasName}`);
                validGasId = gasInfo.GasCodeId;
              }
            }

            let description = "";
            let volume = "";
            let pressure = "";

            if (gasInfo) {
              try {
                const gDet = await GetCascodedetail(validGasId);
                if (gDet && gDet[0]) {
                  description = gDet[0].Descriptions;
                  volume = gDet[0].Volume;
                  pressure = gDet[0].pressure;
                }
              } catch (e) { }
            }

            return {
              sqid: 0, packingid: 0, id: 0, salesInvoicesId: invoiceHeader.id || 0, packingDetailId: 0, deliveryNumber: "",

              GasCodeId: validGasId, // 🟢 Use the corrected ID
              gasCode: gasInfo ? gasInfo.GasName : "", // Store Name for UI
              Description: description || (gasInfo ? gasInfo.GasName : ""),
              Volume: volume,
              Pressure: pressure,

              Qty: item.PickedQty,
              pickedQty: item.PickedQty,

              UnitPrice: item.UnitPrice,
              TotalPrice: item.TotalPrice,
              ConvertedPrice: item.TotalPrice * (item.ExchangeRate || 1),
              CurrencyId: item.Currencyid,
              ConvertedCurrencyId: item.Currencyid,
              Exchangerate: item.ExchangeRate,

              Uom: "", UomId: 0,

              poNumber: detailsData.PONumber || "",
              doNumber: doNumber,

              requestDeliveryDate: currentDate,
              isImportedDO: true,
              Note: ""
            };
          }));
          newItems = [...newItems, ...mappedItems];
        } else if (detailsData) {
          // If the DO has NO items (e.g. legacy DOs),
          // add a fallback row so it appears in the grid.
          const fallbackItem = {
            sqid: 0, packingid: 0, id: 0, salesInvoicesId: invoiceHeader.id || 0, packingDetailId: 0, deliveryNumber: "",
            GasCodeId: 0,
            gasCode: "",
            Description: "",
            Volume: "",
            Pressure: "",
            Qty: doHeader.qty || 1,
            pickedQty: doHeader.qty || 1,
            UnitPrice: doHeader.qty ? (doHeader.total / doHeader.qty) : doHeader.total,
            TotalPrice: doHeader.total || 0,
            ConvertedPrice: doHeader.total || 0,
            CurrencyId: currencySelect || null,
            ConvertedCurrencyId: currencySelect || null,
            Exchangerate: 1,
            Uom: "", UomId: 0,
            poNumber: detailsData.PONumber || "",
            doNumber: doNumber,
            requestDeliveryDate: currentDate,
            isImportedDO: true,
            Note: ""
          };
          newItems.push(fallbackItem);
        }
      }

      setmanualinvoiceDetails(prev => {
        const cleanPrev = prev.filter(r => r.GasCodeId !== 0);
        return [...cleanPrev, ...newItems];
      });

      if (newItems.length > 0 && newItems[0].ConvertedCurrencyId) {
        setcurrencySelect(newItems[0].ConvertedCurrencyId);
      }

    } catch (error) {
      console.error("Import failed", error);
      setErrorMsg(["Failed to import DO details."]);
    } finally {
      setIsLoading(false);
      setSelectedDOs([]);
    }
  };
  // --- END NEW DO IMPORT LOGIC ---


  const toggleTooltip = tid => {
    setTooltipOpen(prev => ({
      ...prev,
      [tid]: !prev[tid],
    }));
  };

  const validateForm = () => {
    if (!invoiceHeader || !invoiceHeader.salesInvoiceNbr || !invoiceHeader.customerId || !invoiceHeader.salesInvoiceDate || invoiceHeader.totalAmount <= 0 || invoiceHeader.totalQty <= 0) {
      setErrorMsg(["Invoice header details are incomplete or invalid."]);
      return false;
    }
    for (let i = 0; i < manualinvoiceDetails.length; i++) {
      const item = manualinvoiceDetails[i];
      if (!item.poNumber || item.poNumber.trim() === "") {
        setErrorMsg([`PO Number is required.`]);
        return false;
      }
    }
    return true;
  };

  const formatDateForAPI = (date) => {
    if (!date) return "";
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleSubmit = async (submitTypeParam) => {
    const submitValue = Number(submitTypeParam ?? submitType);
    if (!validateForm()) return;

    const totalQty = manualinvoiceDetails.reduce((acc, item) => acc + (Number(item.pickedQty) || 0), 0);
    const totalAmount = manualinvoiceDetails.reduce((acc, item) => acc + (Number(item.TotalPrice) || 0), 0);
    const calculatedPrice = manualinvoiceDetails.reduce((acc, item) => acc + (Number(item.ConvertedPrice) || 0), 0);

    const headerdetails = {
      id: invoiceHeader.id || 0,
      customerId: invoiceHeader.customerId || "",
      salesInvoiceDate: formatDateForAPI(invoiceHeader.salesInvoiceDate || currentDate),
      salesInvoiceNbr: invoiceHeader.salesInvoiceNbr || "",
      orgId: invoiceHeader.orgId || 1,
      branchId: invoiceHeader.branchId || 1,
      userId: invoiceHeader.userId || 1,
      isSubmitted: Number(submitType),
      ismanual: 1,
      totalQty,
      totalAmount,
      calculatedPrice,
    };

    const updatedDetails = manualinvoiceDetails.map(item => ({
      sqid: item.sqid || 0,
      packingid: item.packingid || 0,
      id: item.id || 0,
      salesInvoicesId: invoiceHeader.id || 0,
      packingDetailId: item.packingDetailId || 0,
      deliveryNumber: item.deliveryNumber || "",
      gasCodeId: item.GasCodeId || 0,
      gasCode: item.gasCode || "",
      Volume: item.Volume || "",
      Pressure: item.Pressure || "",
      Qty: Number(item.pickedQty) || 1,
      Uom: item.Uom || 0,
      UomId: item.UomId || 0,
      doNumber: item.doNumber || "",
      CurrencyId: item.CurrencyId,
      UnitPrice: Number(item.UnitPrice) || 0,
      TotalPrice: Number(item.TotalPrice) || 0,
      price: Number(item.ConvertedPrice) || 0,
      Exchangerate: Number(item.Exchangerate) || 0,
      driverName: item.driverName || "",
      truckName: item.truckName || "",
      poNumber: item.poNumber,
      requestDeliveryDate: item.requestDeliveryDate || currentDate,
      deliveryAddress: item.deliveryAddress || "",
      deliveryInstruction: item.deliveryInstruction || "",
      soQty: Number(item.soQty) || 0,
      pickedQty: Number(item.pickedQty) || 0,
      so_Issued_Qty: Number(item.so_Issued_Qty) || 0,
      balance_Qty: Number(item.balance_Qty) || 0,
      ConvertedCurrencyId: item.ConvertedCurrencyId,
      Note: item.Note || "",
    }));

    const doDetailPayload = doDetail.map(item => ({
      doid: item.doid || 0,
      id: item.id || 0,
      salesInvoicesId: item.salesInvoicesId || 0,
      packingId: item.packingId || 0,
    }));

    const finalPayload = {
      command: id > 0 ? "UpdateInvoice" : "CreateInvoice",
      header: {
        ...headerdetails,
        isSubmitted: Number(submitType) || 0,
      },
      details: updatedDetails,
      doDetail: doDetailPayload
    };

    console.log("Submitting Payload:", finalPayload);

    setIsSubmitting(true);
    try {
      let response;
      if (id > 0) {
        response = await UpdateInvoice(finalPayload);
      } else {
        response = await CreatenewInvoice(finalPayload);
      }

      const msg = response?.message?.toLowerCase() || "";
      if (msg.includes("invoice number already exist") || msg.includes("invoice number already used")) {
        setErrorMsg([response.message]);
        setSuccessStatus(false);
        setIsSubmitting(false);
        return;
      }
      if (response?.status) {
        setErrorMsg([]);
        setSuccessStatus(true);

        let targetInvoiceId = id ? parseInt(id) : null;

        if (!targetInvoiceId && response?.data) {
          targetInvoiceId = typeof response.data === 'object' ? response.data.id : response.data;
        }

        console.log("Target Invoice ID for Posting:", targetInvoiceId);

        const isAlreadyPosted = invoiceHeader.isSubmitted === 1 || invoiceHeader.isSubmitted === true;
        const isPostingNow = Number(submitType) === 1;

        if ((isPostingNow || isAlreadyPosted) && targetInvoiceId) {
          console.log("Syncing to AR Book...");
          await postInvoiceToAR({
            "orgId": 1,
            "branchId": 1,
            "userId": 1,
            "invoiceId": parseInt(targetInvoiceId)
          });
        }

        const action = id > 0 ? submitType === 0 ? "Updated" : "Posted" : submitType === 0 ? "Saved" : "Posted";

        setSuccessMsg(`Sales Invoice ${action} Successfully!`);
        setTimeout(() => {
          history.push("/manual-invoices");
        }, 1000);
      } else {
        setErrorMsg([response?.message || "Operation failed."]);
      }
    } catch (err) {
      console.error("Error creating/updating invoice:", err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInvoiceDetails = async id => {
    try {
      console.log("Fetching invoice details for ID:", id);
      const data = await GetInvoiceDetails(id);
      const actualHeaderId = data.InvoiceId || data.RealHeaderId || data.id || id;

      // Determine if response is from Python (Items/Header flat) or Old .NET (Header/Details obj)
      const isNewStructure = data?.Items && !data?.Header;

      // 1. HEADER MAPPING
      if (isNewStructure) {
        SetInvoiceHeader(prev => ({
          ...prev,
          id: actualHeaderId,
          salesInvoiceNbr: data.InvoiceNbr || "",
          customerId: data.customerid || "",
          salesInvoiceDate: data.Salesinvoicesdate || new Date(),
          totalAmount: data.TotalAmount || 0,
          calculatedPrice: data.CalculatedPrice || 0,
          isSubmitted: data.Status === 'Posted' ? 1 : 0,
        }));
      } else if (data?.Header) {
        SetInvoiceHeader(prev => ({
          ...prev,
          ...data.Header,
          id: data.Header.id || id,
          isSubmitted: data.Header.IsSubmitted ?? data.Header.isSubmitted ?? 0,
        }));
      }

      // 2. DETAILS MAPPING
      let rawDetails = [];
      if (isNewStructure) {
        rawDetails = data.Items || [];
      } else if (Array.isArray(data?.Details)) {
        rawDetails = data.Details || [];
      }

      if (rawDetails.length > 0) {
        const mappedDetails = rawDetails.map(item => ({
          sqid: item.sqid || 0,
          packingid: item.packingid || 0,
          id: item.Id || item.id || 0,
          salesInvoicesId: actualHeaderId,
          packingDetailId: item.packingDetailId || 0,

          // Gas Info
          GasCodeId: item.gascodeid || item.GasCodeId || 0,
          gasCode: item.GasName || item.gasCode || "",
          Description: item.gasDescription || item.Description || "",
          Volume: item.Volume || "",
          Pressure: item.Pressure || "",

          // Qty Logic (Priority to PickedQty)
          Qty: item.PickedQty ?? item.qty ?? 1,
          pickedQty: item.PickedQty ?? item.pickedQty ?? item.qty ?? 1,

          // 🟢 FIX: Robust checks for UOM, PO, DO (Case Insensitive Fallbacks)
          Uom: item.UOM || item.uom || item.Uom || "",
          UomId: item.uomid || item.UomId || 0,

          poNumber: item.PONumber || item.poNumber || item.PoNumber || "",
          doNumber: item.DOnumber || item.doNumber || item.DoNumber || item.deliveryNumber || "",

          // Financials
          CurrencyId: item.Currencyid || item.currencyId || 0,
          UnitPrice: item.UnitPrice || item.unitPrice || 0,
          TotalPrice: item.TotalPrice || item.totalPrice || 0,
          price: item.price || "",
          ConvertedPrice: item.ConvertedPrice || item.price || 0,
          Exchangerate: item.ExchangeRate || item.exchangerate || item.Exchangerate || 0,

          // Logistics
          driverName: item.driverName || "",
          truckName: item.truckName || "",
          deliveryNumber: item.deliveryNumber || "",
          requestDeliveryDate: item.requestDeliveryDate ? new Date(item.requestDeliveryDate) : new Date(),
          deliveryAddress: item.deliveryAddress || "",
          deliveryInstruction: item.deliveryInstruction || "",

          // SO Info
          soQty: item.soQty || 0,
          so_Issued_Qty: item.so_Issued_Qty || 0,
          balance_Qty: item.balance_Qty || 0,

          ConvertedCurrencyId: item.convertedCurrencyId || item.Currencyid || 0,
          isImportedDO: !!item.ref_do_id,
          Note: item.Note || "",
        }));

        setmanualinvoiceDetails(mappedDetails);

        // Set currency select based on first item
        if (mappedDetails.length > 0) {
          setcurrencySelect(mappedDetails[0]?.ConvertedCurrencyId || null);
        }
      }

      // 3. DO DETAILS MAPPING (For existing DO links)
      if (Array.isArray(data?.DoDetail)) {
        setDoDetail(data.DoDetail);
        const updatedOptions = data.DoDetail.map(item => ({
          ...item,
          value: item.packingId,
          label: item.packno,
        }));
        handleDOSelectChange(updatedOptions);
      }

    } catch (err) {
      console.error("Error fetching invoice details:", err.message);
    }
  };

  useEffect(() => {
    SetInvoiceHeader(prev => ({
      ...prev,
      totalAmount: totalPrice,
      totalQty: totalQty,
    }));
  }, [totalPrice, totalQty]);

  useEffect(() => {
    const totalQtys = manualinvoiceDetails.reduce(
      (acc, item) => acc + (Number(item.pickedQty) || 0),
      0
    );
    const totalPrices = manualinvoiceDetails.reduce(
      (acc, item) => acc + (Number(item.TotalPrice) || 0),
      0
    );
    setTotalQty(totalQtys);
    setTotalPrice(totalPrices);

    SetInvoiceHeader(prev => ({
      ...prev,
      totalQty: totalQtys,
      totalAmount: totalPrices,
    }));
  }, [manualinvoiceDetails]);

  const openpopup = (e, submitype) => {
    if (!validateForm()) {
      return true;
    }
    else {
      setSubmitType(submitype);
      setIsModalOpen(true);
    }
  };

  const handleUOMChange = (index, uomId) => {
    const updatedDetails = [...manualinvoiceDetails];
    const selectedUOM = UOMList.find(u => u.UoMId === Number(uomId));
    updatedDetails[index].Uom = selectedUOM ? selectedUOM.UoM : "";
    updatedDetails[index].UomId = selectedUOM ? selectedUOM.UoMId : 0;
    setmanualinvoiceDetails(updatedDetails);
  };

  const handlePOChange = (index, ponumber) => {
    const updatedDetails = [...manualinvoiceDetails];
    if (!updatedDetails[index]) return;
    updatedDetails[index].poNumber = ponumber;
    setmanualinvoiceDetails(updatedDetails);
  };

  const handleDOChange = (index, donumber) => {
    const updatedDetails = [...manualinvoiceDetails];
    if (!updatedDetails[index]) return;
    updatedDetails[index].doNumber = donumber;
    setmanualinvoiceDetails(updatedDetails);
  };

  const handleNoteChange = (index, note) => {
    const updatedDetails = [...manualinvoiceDetails];
    if (!updatedDetails[index]) return;
    updatedDetails[index].Note = note;
    setmanualinvoiceDetails(updatedDetails);
  };

  const handleCurrencyChange = async (index, value) => {
    if (index === null) {
      const updatedDetails = manualinvoiceDetails.map(item => ({
        ...item,
        ConvertedCurrencyId: value,
        CurrencyId: value,
      }));
      setmanualinvoiceDetails(updatedDetails);
      setcurrencySelect(value);

      if (value) {
        for (let i = 0; i < updatedDetails.length; i++) {
          await GetCurrencyval(i, value);
        }
      }
    } else {
      const updatedDetails = [...manualinvoiceDetails];
      updatedDetails[index].ConvertedCurrencyId = value;
      updatedDetails[index].CurrencyId = value;
      setmanualinvoiceDetails(updatedDetails);

      if (value) {
        await GetCurrencyval(index, value);
      }
    }
  };

  const [currencyval, setCurrencyval] = useState({});
  const [pendingIndex, setPendingIndex] = useState(null);

  const GetCurrencyval = async (index, currencyId) => {
    const data = await GetCurrencyconversion(currencyId);
    console.log("call currency", data[0]);
    setCurrencyval(data[0]);
    setPendingIndex(index);
  };

  useEffect(() => {
    if (currencyval && pendingIndex !== null) {
      currencyvalfn(pendingIndex);
      setPendingIndex(null);
    }
  }, [currencyval]);

  const currencyvalfn = async index => {
    const updatedDetails = [...manualinvoiceDetails];
    if (!updatedDetails[index]) return;

    updatedDetails[index].CurrencyId = updatedDetails[index].CurrencyId || currencySelect;
    updatedDetails[index].ConvertedCurrencyId = updatedDetails[index].ConvertedCurrencyId || currencySelect;
    updatedDetails[index].Exchangerate = currencyval.Exchangerate;

    const price = currencyval.Exchangerate || 1;
    const unitPrice = updatedDetails[index].UnitPrice || 0;
    const qty = updatedDetails[index].pickedQty || 1;

    let total_price = parseFloat(unitPrice) * parseFloat(qty);
    total_price = parseFloat(total_price.toFixed(2));
    updatedDetails[index].TotalPrice = total_price;

    let esti_price = parseFloat(price) * total_price;
    esti_price = parseFloat(esti_price.toFixed(2));

    updatedDetails[index].ConvertedPrice = esti_price;
    setmanualinvoiceDetails(updatedDetails);
  };

  const handleUnitPriceChange = async (index, uprice) => {
    const updatedDetails = [...manualinvoiceDetails];
    // Store as plain number/string in state to ensure calculation consistency
    updatedDetails[index].UnitPrice = uprice;
    updatedDetails[index].ConvertedPrice = uprice;
    setmanualinvoiceDetails(updatedDetails);
    await GetCurrencyval(index, updatedDetails[index].ConvertedCurrencyId);
  };

  const handleQtyUpdate = async (index, value) => {
    const updatedDetails = [...manualinvoiceDetails];
    if (!updatedDetails[index]) return;
    updatedDetails[index] = {
      ...updatedDetails[index],
      pickedQty: value
    };
    setmanualinvoiceDetails(updatedDetails);
    await GetCurrencyval(index, updatedDetails[index].ConvertedCurrencyId);
  };

  const handleGasCodeChange = async (index, selectedValue) => {
    const updatedDetails = [...manualinvoiceDetails];
    setIsLoading(true);
    if (!selectedValue) {
      updatedDetails[index] = {
        ...updatedDetails[index],
        GasCodeId: "",
        Description: "",
        Volume: "",
        Pressure: "",
        Qty: 1,
        Uom: "",
        CurrencyId: currencySelect,
        UnitPrice: 0,
        TotalPrice: 0,
        ConvertedPrice: "",
        ConvertedCurrencyId: currencySelect,
        Exchangerate: "",
        Note: "",
      };
      setmanualinvoiceDetails(updatedDetails);
      return;
    }

    const selectedGas = gasCodeList.find(c => c.GasCodeId === selectedValue);
    if (selectedGas) {
      try {
        const gascodedetails = await GetCascodedetail(selectedGas.GasCodeId);
        updatedDetails[index] = {
          ...updatedDetails[index],
          GasCodeId: selectedGas.GasCodeId,
          Description: gascodedetails[0]?.Descriptions || "",

          // 🟢 FIX: Ensure this is the NAME so the select displays correctly
          gasCode: selectedGas.GasName,

          Volume: gascodedetails[0]?.Volume || "",
          Pressure: gascodedetails[0]?.pressure || "",
          Qty: 1,
          Uom: "",
          CurrencyId: currencySelect,
          UnitPrice: 0,
          TotalPrice: 0,
          ConvertedPrice: "",
          ConvertedCurrencyId: currencySelect,
          Exchangerate: "",
          Note: "",
        };
        setIsLoading(false);
        setmanualinvoiceDetails(updatedDetails);
      } catch (error) {
        console.error("Error fetching gas code details:", error);
      }
    }
  };

  useEffect(() => {
    const loadGasList = async () => {
      const data = await fetchGasListDSI(1, 0);
      setGasCodeList(data);
    };
    loadGasList();

    const loadCurrencyList = async () => {
      const data = await GetCurrency(1, 0);
      setCurrencyList(data);
    };
    loadCurrencyList();

    const loadUOMList = async () => {
      const data = await GetUoM(1, 0);
      setUOMList(data);
    };
    loadUOMList();
  }, []);


  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Sales" breadcrumbItem="Direct Sales Invoice" />
        <Row>
          <Col lg="12">
            <div className="content clearfix mt-1" style={{ minHeight: "560px" }} >
              <Card>
                <CardBody>
                  <Formik
                  >
                    {({ errors, touched, setFieldValue }) => (
                      <Form>
                        <Row>
                          <Col md="8">
                            {errors && Object.keys(errors).length > 0 && (
                              <div className="alert alert-danger alert-new">
                                <ul className="mb-0">
                                  <li>{Object.values(errors)[0]}</li>
                                </ul>
                              </div>
                            )}
                            {errorMsg && Object.keys(errorMsg).length > 0 && (
                              <div className="alert alert-danger alert-new">
                                <ul className="mb-0">
                                  <li>{Object.values(errorMsg)[0]}</li>
                                </ul>
                              </div>
                            )}
                            {successStatus && (
                              <UncontrolledAlert color="success" role="alert">
                                {successMsg}
                              </UncontrolledAlert>
                            )}
                          </Col>

                          <Col md="12" className="mb-3">
                            <div className="d-flex justify-content-end align-items-center gap-2">
                              {access.canSave && (
                                <Button color="secondary" onClick={(e) => { openpopup(e, 0) }} disabled={isSubmitting} >
                                  {id > 0 ? "Update" : "Save"}
                                </Button>
                              )}

                              {access.canPost && (
                                <Button color="success" onClick={(e) => { openpopup(e, 1) }}
                                  disabled={isSubmitting} >
                                  <i className="bx bxs-save me-2"></i>Post
                                </Button>
                              )}

                              <Button
                                color="warning"
                                onClick={toggleConvertModal}
                                disabled={!invoiceHeader.customerId}
                                title="Convert DO"
                              >
                                <i className="bx bx-import me-1"></i> Convert DO
                              </Button>

                              <Button color="danger" onClick={() => history.push("/manual-invoices")} disabled={isSubmitting} >
                                <i className="bx bx-window-close me-2"></i>Cancel
                              </Button>
                            </div>
                          </Col>

                          <Col md="2">
                            <FormGroup>
                              <Label className="required-label" for="SalesInvoiceNum">Invoice No.</Label>

                              <Input
                                type="text"
                                name="salesInvoiceNbr"
                                value={invoiceHeader.salesInvoiceNbr}
                                id="salesInvoiceNbr"
                                maxLength="40"
                                onChange={(e) => {
                                  SetInvoiceHeader((prev) => ({
                                    ...prev,
                                    salesInvoiceNbr: e.target.value,
                                  }))
                                }
                                }
                              />
                              {touched.salesInvoiceNbr && errors.salesInvoiceNbr && (
                                <div className="text-danger">{errors.salesInvoiceNbr}</div>
                              )}
                            </FormGroup>
                          </Col>

                          <Col md="2">
                            <FormGroup>
                              <Label>Date</Label>
                              <Flatpickr className="form-control d-block" placeholder="dd-mm-yyyy"
                                value={invoiceHeader.salesInvoiceDate}
                                options={{
                                  altInput: true,
                                  altFormat: "d-M-Y",
                                  dateFormat: "Y-m-d",
                                  defaultDate: invoiceHeader.salesInvoiceDate,
                                }}
                                name="SalesInvoiceDate"
                                onChange={date =>
                                  SetInvoiceHeader(prev => ({
                                    ...prev,
                                    salesInvoiceDate: date[0]
                                  }))
                                }
                              />
                              <ErrorMessage name="SalesInvoiceDate" component="div" className="text-danger" />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label htmlFor="customerId" className="required-label">Customer</Label>
                              <Select
                                name="customerId"
                                classNamePrefix="select"
                                className={errors.customerId && touched.customerId ? "select-invalid" : ""}
                                isClearable
                                isSearchable
                                options={customerList.map(cus => ({
                                  value: cus.CustomerID,
                                  label: cus.CustomerName,
                                }))}
                                onChange={handleCustomerSelectChange}
                                value={
                                  customerList
                                    .map(cus => ({
                                      value: cus.CustomerID,
                                      label: cus.CustomerName,
                                    }))
                                    .find(option => option.value === invoiceHeader.customerId) || null
                                }
                              />
                              <ErrorMessage name="customerId" component="div" className="text-danger" />
                            </FormGroup>
                          </Col>

                          <Col md="4">
                            <FormGroup>
                              <Label className="required-label">Currency</Label>
                              <Select
                                name="ConvertedCurrencyId"
                                classNamePrefix="select"
                                className={errors.currencyId && touched.currencyId ? "select-invalid" : ""}
                                isClearable
                                isSearchable
                                options={CurrencyList.map(currency => ({
                                  value: currency.currencyid,
                                  label: currency.Currency
                                }))}
                                onChange={option => handleCurrencyChange(null, option ? option.value : null)}
                                id="Currency-Global"
                                value={
                                  currencySelect
                                    ? {
                                      value: currencySelect,
                                      label: CurrencyList.find(c => c.currencyid === currencySelect)?.Currency
                                    }
                                    : null
                                }
                              />
                              {touched.ConvertedCurrencyId && errors.ConvertedCurrencyId && (
                                <div className="text-danger">{errors.ConvertedCurrencyId}</div>
                              )}
                            </FormGroup>
                          </Col>


                          <Col md="12">
                            <div
                              className="accordion accordion-flush"
                              id="accordionFlushExample"
                            >
                              <div className="accordion-item">
                                <h2 className="accordion-header" id="headingFlushTwo" style={{ backgroundColor: "#cee3f8" }} >
                                  <button className={`accordion-button fw-medium ${!activeAccord.col2 ? "collapsed" : ""}`} type="button"
                                    onClick={() => showAccord("col2")} style={{ cursor: "pointer" }} >
                                    {" "}
                                    GAS DETAIL{" "}
                                  </button>
                                </h2>
                                <Collapse
                                  isOpen={activeAccord.col2}
                                  className="accordion-collapse"
                                >
                                  <div className="accordion-body">
                                    <div className="table-responsive tab-wid table-height">
                                      <Table className="table mb-0">
                                        <thead style={{ backgroundColor: "#3e90e2" }}>
                                          <tr>
                                            <th className="text-center" style={{ width: "2%" }}>
                                              <span style={{ cursor: "pointer", alignItems: "center" }} onClick={handleAddItem}>
                                                <i className="mdi mdi-plus" />
                                              </span>
                                            </th>
                                            <th className="text-center required-label" style={{ width: "14%" }}> Gas Name </th>

                                            <th className="text-center required-label" style={{ width: "8%" }}> PO No. </th>
                                            <th className="text-center " style={{ width: "8%" }}> DO No. </th>
                                            <th className="text-center " style={{ width: "13%" }}> Note </th>

                                            <th className="text-center required-label" style={{ width: "8%" }}> Qty </th>

                                            <th className="text-center required-label" style={{ width: "10%" }}> UOM </th>
                                            <th className="text-center required-label" style={{ width: "12%" }}> Unit Price </th>
                                            <th className="text-center" style={{ width: "11%" }}> Total Price{" "} </th>
                                            <th className="text-center" style={{ width: "14%" }}> Price (IDR) </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {manualinvoiceDetails.map((item, index) => {
                                            // --- ALL ROWS ARE NOW EDITABLE ---

                                            return (
                                              <tr key={index}>
                                                <td>
                                                  {/* Always allow delete if user has permission */}
                                                  {access.canDelete && (
                                                    <span color="danger" className="btn-sm" onClick={() => handleDeleteRow(index)} title="Delete">
                                                      <i className="mdi mdi-trash-can-outline label-icon align-middle" title="Delete" />
                                                    </span>
                                                  )}
                                                </td>

                                                {/* Gas Code Column - [FIX 2] Removed .filter() to allow duplicate item selection */}
                                                <td>
                                                  <div title={manualinvoiceDetails[index].gasCode || gasCodeList.find(g => g.GasCodeId === manualinvoiceDetails[index].GasCodeId)?.GasName}>
                                                    <Select
                                                      name="GasCodeId"
                                                      id={`GasCodeId-${index}`}
                                                      options={gasCodeList
                                                        .map(code => ({ value: code.GasCodeId, label: code.GasName }))}

                                                      value={
                                                        manualinvoiceDetails[index]?.GasCodeId
                                                          ? {
                                                            value: manualinvoiceDetails[index].GasCodeId,
                                                            label: manualinvoiceDetails[index].gasCode || gasCodeList.find(g => g.GasCodeId === manualinvoiceDetails[index].GasCodeId)?.GasName
                                                          }
                                                          : null
                                                      }

                                                      onChange={option => handleGasCodeChange(index, option ? option.value : null)}
                                                      classNamePrefix="select"
                                                      isDisabled={isDisabled}
                                                      isLoading={isLoading}
                                                      isClearable={isClearable}
                                                      isSearchable={isSearchable}
                                                    />
                                                  </div>
                                                  <ErrorMessage name={`manualinvoiceDetails.${index}.GasCodeId`} component="div" className="text-danger" />
                                                </td>

                                                {/* PO Number Column */}
                                                <td>
                                                  <Input type="text" name={`manualinvoiceDetails.${index}.poNumber`} className="text-end" maxLength={40}
                                                    onChange={e => handlePOChange(index, e.target.value)}
                                                    value={manualinvoiceDetails[index]?.poNumber}
                                                    id={`poNumber-${index}`}
                                                  />
                                                  <ErrorMessage name={`manualinvoiceDetails.${index}.poNumber`} component="div" className="text-danger" />
                                                </td>

                                                {/* DO Number Column */}
                                                <td>
                                                  <Input type="text" className="text-end" maxLength={20}
                                                    onChange={e => handleDOChange(index, e.target.value)}
                                                    value={manualinvoiceDetails[index]?.doNumber}
                                                    id={`doNumber-${index}`}
                                                  />
                                                </td>

                                                {/* Note Column */}
                                                <td>
                                                  <Input type="text" maxLength={255}
                                                    onChange={e => handleNoteChange(index, e.target.value)}
                                                    value={manualinvoiceDetails[index]?.Note || ""}
                                                    id={`Note-${index}`}
                                                    placeholder="Add note..."
                                                  />
                                                </td>

                                                {/* Qty Column */}
                                                <td>
                                                  <Input
                                                    name={`manualinvoiceDetails.${index}.pickedQty`}
                                                    type="text"
                                                    inputMode="decimal"  // [FIX] Decimal input
                                                    className="text-end"
                                                    maxLength={10}
                                                    value={manualinvoiceDetails[index]?.pickedQty || ""}
                                                    id={`Qty-${index}`}
                                                    onChange={e => {
                                                      // Allow numbers and one dot only
                                                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                                                      if ((raw.match(/\./g) || []).length > 1) return;
                                                      handleQtyUpdate(index, raw);
                                                    }}
                                                    onKeyDown={e => {
                                                      const allowedKeys = ["Backspace", "Tab", "ArrowLeft", "ArrowRight", "Delete"];
                                                      if (!/[0-9.]/.test(e.key) && !allowedKeys.includes(e.key)) {
                                                        e.preventDefault();
                                                      }
                                                    }}
                                                  />
                                                  <ErrorMessage name={`manualinvoiceDetails.${index}.pickedQty`} component="div" className="text-danger" />
                                                </td>

                                                {/* UOM Column */}
                                                <td>
                                                  <Input type="select"
                                                    onChange={e => handleUOMChange(index, e.target.value)}
                                                    id={`Uom-${index}`}
                                                    value={manualinvoiceDetails[index]?.UomId || ""}
                                                  >
                                                    <option key="0" value="">Select</option>
                                                    {UOMList.map(uom => (
                                                      <option key={uom.UoMId} value={uom.UoMId}> {uom.UoM} </option>
                                                    ))}
                                                  </Input>
                                                  <ErrorMessage name={`manualinvoiceDetails.${index}.UomId`} component="div" className="text-danger" />
                                                </td>

                                                {/* Unit Price Column - [FIX 3] Formatted Value */}
                                                <td>
                                                  <Input type="text" name={`manualinvoiceDetails.${index}.UnitPrice`} inputMode="decimal" className="text-end" maxLength={15}
                                                    value={formatInputNumber(manualinvoiceDetails[index]?.UnitPrice || "")} // [FIX] Show formatted string
                                                    onChange={e => {
                                                      const raw = e.target.value.replace(/[^0-9.]/g, ""); // [FIX] Strip non-numeric for state
                                                      if ((raw.match(/\./g) || []).length > 1) return;
                                                      if (raw.length <= 15) handleUnitPriceChange(index, raw);
                                                    }}
                                                    onKeyDown={e => {
                                                      if (e.key === "e" || e.key === "-" || (e.key.length === 1 && !/[0-9.]/.test(e.key))) {
                                                        e.preventDefault();
                                                      }
                                                    }}
                                                  />
                                                  <ErrorMessage name={`manualinvoiceDetails.${index}.UnitPrice`} component="div" className="text-danger" />
                                                </td>

                                                {/* Total Price Column */}
                                                <td>
                                                  <Input type="text" disabled name="TotalPrice" className="text-end" value={new Intl.NumberFormat("en-US",
                                                    { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2, }
                                                  ).format(manualinvoiceDetails[index]?.TotalPrice || 0)}
                                                    id={`TotalPrice-${index}`}
                                                  />
                                                </td>

                                                {/* Converted Price Column */}
                                                <td>
                                                  <Input type="text" disabled name="ConvertedPrice"
                                                    value={new Intl.NumberFormat("en-US",
                                                      { style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2, }
                                                    ).format(manualinvoiceDetails[index]?.ConvertedPrice || 0)}
                                                    id={`ConvertedPrice-${index}`} className="text-end"
                                                  />
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                        {/* Footer remains unchanged as colSpan covers the rearranged columns */}
                                        <tfoot>
                                          <tr className="fw-bold">
                                            <td colSpan="8" className="text-end">Total</td>
                                            <td className="text-end">
                                              {new Intl.NumberFormat("en-US", {
                                                style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2,
                                              }).format(
                                                manualinvoiceDetails.reduce((sum, item) => sum + (parseFloat(item.TotalPrice) || 0), 0)
                                              )}
                                            </td>
                                            <td className="text-end">
                                              {new Intl.NumberFormat("en-US", {
                                                style: "decimal", minimumFractionDigits: 2, maximumFractionDigits: 2,
                                              }).format(
                                                manualinvoiceDetails.reduce((sum, item) => sum + (parseFloat(item.ConvertedPrice) || 0), 0)
                                              )}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </Table>
                                    </div>
                                  </div>
                                </Collapse>
                              </div>   </div>
                          </Col>
                        </Row>
                      </Form>
                    )}
                  </Formik>
                </CardBody>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>

      {/* --- DO IMPORT MODAL --- */}
      <Modal isOpen={convertModal} toggle={toggleConvertModal} size="lg" centered>
        <ModalHeader toggle={toggleConvertModal}>Select DO to Convert</ModalHeader>
        <ModalBody>
          {/* [ADDED] Search Bar */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <p className="text-muted mb-0">Select confirmed Delivery Orders to import items from.</p>
            <InputText
              type="search"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Search DO Number or Date..."
              style={{ width: '250px' }}
              className="p-inputtext-sm"
            />
          </div>

          <div className="table-responsive border rounded" style={{ minHeight: '300px' }}>
            <DataTable
              value={availableDOs}
              selection={selectedDOs}
              onSelectionChange={(e) => setSelectedDOs(e.value)}
              dataKey="do_id"
              emptyMessage={doLoading ? "Loading..." : "No available DOs found."}
              showGridlines
              className="p-datatable-sm"
              loading={doLoading}
              globalFilter={globalFilter} // [ADDED] Pass filter
            >
              <Column selectionMode="multiple" headerStyle={{ width: '3em' }}></Column>
              <Column field="do_number" header="DO Number" sortable></Column>
              <Column field="do_date" header="Date" sortable></Column>
              <Column field="qty" header="Qty" className="text-end"></Column>
              <Column field="total" header="Amount" className="text-end" body={(r) => r.total ? r.total.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}></Column>
            </DataTable>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={toggleConvertModal}>Cancel</Button>
          <Button
            color="primary"
            onClick={handleImportDOs}
            disabled={selectedDOs.length === 0}
          >
            Import ({selectedDOs.length})
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(false)} centered tabIndex="1"
      >
        <ModalBody className="py-3 px-5">
          <Row>
            <Col lg={12}>
              <div className="text-center">
                <i className="mdi mdi-alert-circle-outline" style={{ fontSize: "9em", color: "orange" }} />
                <h4> Do you want to{" "}
                  {id > 0 ? submitType === 0 ? "Update" : "Post" : submitType === 0 ? "Save" : "Post"} ? </h4>
              </div>
            </Col>
          </Row>
          <Row>
            <Col>
              <div className="text-center mt-3 button-items">
                <Button className="btn btn-info" color="success" size="lg" onClick={() => { handleSubmit(submitType); setIsModalOpen(false); }} > Yes </Button>
                <Button color="danger" size="lg" className="btn btn-danger" onClick={() => setIsModalOpen(false)} > Cancel </Button>
              </div>
            </Col>
          </Row>
        </ModalBody>
      </Modal>
    </div>
  );
};

export default AddManualInvoice;