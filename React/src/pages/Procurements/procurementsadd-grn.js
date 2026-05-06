import React, { useEffect, useState } from "react";
import { useHistory, useParams, useLocation } from "react-router-dom";
import {
  Container,
  Row,
  Col,
  Card,
  CardBody,
  FormGroup,
  Label,
} from "reactstrap";
import Flatpickr from "react-flatpickr";
import { Formik, Form, Field } from "formik";
import * as Yup from "yup";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import Select from "react-select";
import Swal from 'sweetalert2';
import {
  GetPOSupplierDetails,
  GetPOList, GetPOItemDetails,
  SaveGRN,
  GetGRNById,
  GetGRNNoSeq,
  GetByIdPurchaseOrder
} from "common/data/mastersapi";


const getUserDetails = () => {
  if (localStorage.getItem("authUser")) {
    const obj = JSON.parse(localStorage.getItem("authUser"))
    return obj;
  }
}

const ProcurementsAddGRN = () => {
  const history = useHistory();
  const location = useLocation();
  const { id } = useParams();
  const isEditMode = !!id;
  const grn_id = Number(id ?? 0);
  // const grnData=location.state?.grnData?.data?.[0];
  // const grnData=location.state?.grnData;
  // const grnSeqNo = location.state?.grnSeqNo ;
  const [successmsg, setSuccessmsg] = useState("");
  const [errormsg, setErrormsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [poNo, setPoNo] = useState([]);
  const [grnSeqNo, setGrnSeqNo] = useState('');
  const [branchId, setBranchId] = useState(1);
  const [orgId, setOrgId] = useState(1);
  const [UserData, setUserData] = useState(null);
  const isRestrictedUser = [159, 160, 161, 163, 165].includes(UserData?.u_id);
  // const isEditMode = !!grnData;

  // const initialValues = {
  //   grnid: grnData?.Header?.grnid || 0,
  //   poNo: grnData? {value:grnData.poid, label:grnData.pono} : null,
  //   supplier: grnData? {value:grnData?.Header?.supplierid, label:grnData?.Header?.suppliername} : null,
  //   grnNo: grnSeqNo || grnData?.Header?.grnno || 0,
  //   grnDate: grnData? new Date(grnData?.Header?.grndate) : new Date(),
  //   //doNo: grnData?.dono?? "",
  //   //doDate: grnData? new Date(grnData.dodate): null,
  //   //invNo: grnData?.invoiceno?? "",
  //   //invDate: grnData? new Date(grnData.invoicedate): null,
  //   items: [],
  // };

  const [initialValues, setInitialValues] = useState({
    grnid: 0,
    poNo: null,
    supplier: null,
    grnNo: "",
    grnDate: new Date(),
    poDate: null,
    items: [],
  });
  // const [isEditMode, setIsEditMode] = useState(false);

  const [items, setItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const isAllSelected = items.length > 0 && selectedItems.length === items.length;

  // useEffect(() => {
  //   if(grnData)console.log("grnData", grnData);    
  //   if(grnSeqNo)console.log("grnSeqNo", grnSeqNo); 

  //   const fetchData = async () => {
  //     debugger
  //     const po_Id = 0;
  //     const orgId = 1;
  //     const branchId = 1;
  //     console.log("po_Id", po_Id);     

  //     const supplierdata = await GetPOSupplierDetails(po_Id, orgId, branchId, '%');

  //     console.log("supplierdata", supplierdata);

  //     const data = Array.isArray(supplierdata.data)? supplierdata.data : [supplierdata.data];

  //     console.log("data", data);

  //     if (data.length > 0) {
  //       const options = data.map(item => ({
  //         value: item.supplierid,
  //         label: item.suppliername,
  //       }));
  //       setSuppliers(options);
  //       debugger
  //       if(isEditMode && grnData){ 
  //         const existPONO = grnData.poid;
  //         await loadItemsByPO(existPONO, true);
  //      }
  //     }
  //   };
  //   fetchData();

  // }, []);

  const [grnData, setGrnData] = useState(null);

  useEffect(() => {

    const userData = getUserDetails();

    setUserData(userData);

    if (isEditMode) {
      GetGRNById(id, branchId, orgId).then((response) => {
        setGrnData(response);
      });

    } else {
      GetGRNNoSeq(branchId, orgId).then((response) => {
        setGrnSeqNo(response.data.grnno);
      });
    }
  }, [grn_id]);

  useEffect(() => {
    console.log('grnData ====> ', grnData)
    const fetchData = async () => {
      const orgId = 1;
      const branchId = 1;

      // 1️⃣ Load suppliers
      const supplierResp = await GetPOSupplierDetails(0, orgId, branchId, '%', 0);
      const suppliersArray = Array.isArray(supplierResp.data) ? supplierResp.data : [supplierResp.data];
      const supplierOptions = suppliersArray.map(s => ({ value: s.supplierid || s.SupplierId || s.id, label: s.suppliername || s.SupplierName || s.name }));
      setSuppliers(supplierOptions);

      // 2️⃣ Edit mode: preload GRN data
      if (grnData) {
        await preloadGRNData(grnData);
      }
      // 3️⃣ New GRN mode: only GRN number from grnSeqNo
      else if (grnSeqNo) {
        setInitialValues(prev => ({
          ...prev,
          grnNo: grnSeqNo,       // assign GRN number
          grnDate: new Date(),
        }));
      }
    };

    fetchData();
  }, [grnData, grnSeqNo]);

  const preloadGRNData = async (grnData) => {
    if (!grnData) return;

    const header = grnData.data.Header;
    const details = grnData.data.Details || [];

    // Supplier
    const supplierResp = await GetPOSupplierDetails(0, 1, 1, '%', header.grnid);
    const suppliersArray = Array.isArray(supplierResp.data) ? supplierResp.data : [supplierResp.data];
    const supplierOptions = suppliersArray.map(s => ({ value: s.supplierid || s.SupplierId || s.id, label: s.suppliername || s.SupplierName || s.name }));
    setSuppliers(supplierOptions);
    const selectedSupplier = supplierOptions.find(s => s.value === header.supplierid) || null;

    // All POs of supplier
    let poOptions = [];
    if (selectedSupplier) {
      const poResp = await GetPOList(selectedSupplier.value, 1, 1, header.grnid);
      if (poResp?.status) {
        const poArray = Array.isArray(poResp.data) ? poResp.data : [poResp.data];
        poOptions = poArray.map(p => ({ value: p.poid, label: p.pono, podate: p.podate }));
      }
    }
    setPoNo(poOptions);

    // POs used in GRN
    const usedPOIds = [...new Set(details.map(d => d.poid))];
    const selectedPOs = poOptions.filter(p => usedPOIds.includes(p.value));

    // Items from all used POs
    let allItems = [];
    for (const poid of usedPOIds) {
      const poItems = await loadItemsByPO(poid, details, header.grnid ? header.grnid : 0);
      allItems = [...allItems, ...poItems];
    }
    setItems(allItems);

    // Preselect items from GRN
    const selectedPorIds = details.map(i => i.porid);
    setSelectedItems(selectedPorIds);

    // Formik values
    setInitialValues({
      grnid: header.grnid,
      grnNo: header.grnno,
      grnDate: new Date(header.grndate),
      supplier: selectedSupplier,
      poNo: selectedPOs.length > 0 ? selectedPOs[0] : null,   // ✅ SINGLE PO
      poDate: selectedPOs.length > 0 ? selectedPOs[0].podate : null,
      items: allItems,
    });

    // setIsEditMode(true);
  };



  const loadItemsByPO = async (poId, details = [], grnid) => {
    try {
      const response = await GetPOItemDetails(poId, 1, 1, grnid == undefined || grnid == null || grnid == "" ? 0 : grnid);
      if (!response.status || !Array.isArray(response.data)) return [];
      return response.data.map(item => {
        const grnDetail = details.find(d => d.porid === item.porid);
        console.log('grnDetail > ', grnDetail)
        return {
          id: `${poId}-${item.porid}`,
          poid: poId,
          porid: item.porid,
          itemid: item.itemid ?? 0,
          poNo: item.pono,
          itemDescription: item.itemDescription,
          itemCode: item.itemcode,
          uom: item.uom,
          uomid: item.uomid,
          grnid: grnDetail?.grnid || 0,
          grndid: grnDetail?.grndid || 0,
          doNo: grnDetail?.dono || item.dono,
          doDate: formatDate(grnDetail?.dodate || item.dodate),
          poQty: item.poqty,
          alreadyRecQty: grnDetail?.alreadyrecqty ?? item.alreadyrecqty ?? 0,
          balanceQty: grnDetail?.balanceqty ?? item.balanceqty ?? 0,
          oribalanceqty: grnDetail?.oribalanceqty ?? item.oribalanceqty ?? 0,
          grnQty: grnDetail?.grnQty ?? 0,
          containerNo: grnDetail?.containerno || "",
        };
      });
    } catch (err) {
      console.error("Failed to load PO items", err);
      return [];
    }
  };



  // const loadItemsByPO = async (poId, isEdit = false) => {
  //   debugger
  //   const orgId = 1;
  //   const branchId = 1;
  //   try {
  //     const response = await GetPOItemDetails(poId, orgId, branchId);
  //     console.log("POItemdetails", response.data);
  //     if (response.status && Array.isArray(response.data)) {
  //       const data = response.data.map((item, index) => ({
  //         id: index + 1,
  //         itemid: item.itemid ?? 0,
  //         poNo: item.pono,
  //         itemDescription: item.itemDescription,
  //         itemCode: item.itemcode,
  //         uom: item.uom,
  //         doNo: item.dono,
  //         doDate: formatDate(item.dodate),
  //         poQty: item.poqty,
  //         alreadyRecQty: item.alreadyrecqty ?? 0,
  //         balanceQty: item.balanceqty ?? 0,
  //         //grnQty: grnData?.grnqty ?? "",
  //         grnQty: "",
  //         containerNo: grnData?.containerno?? "",
  //       }));
  //       setItems(data);

  //       if(isEdit){
  //       setSelectedItems(data.map(item => item.porid));
  //       }
  //       else{
  //         setSelectedItems([]);
  //       }
  //     }
  //     else {
  //       setItems([]);
  //       setSelectedItems([]);
  //     }
  //   }
  //   catch (err) {
  //     console.error("Failed to Load PO Item Details", err);
  //     setItems([]);
  //     setSelectedItems([]);
  //   }

  // };

  // const loadItemsByPO = async (poId, isEdit = false) => {
  //   const orgId = 1;
  //   const branchId = 1;

  //   try {
  //     const response = await GetPOItemDetails(poId, orgId, branchId);
  //     console.log("POItemdetails", response.data);

  //     if (response.status && Array.isArray(response.data)) {
  //       const data = response.data.map((item, index) => ({
  //         id: `${poId}-${index + 1}`, // unique id per PO + item
  //         poid: poId,
  //         porid: item.porid, // unique id per PO + item
  //         itemid: item.itemid ?? 0,
  //         poNo: item.pono,
  //         itemDescription: item.itemDescription,
  //         itemCode: item.itemcode,
  //         uom: item.uom,
  //         doNo: item.dono,
  //         doDate: formatDate(item.dodate),
  //         poQty: item.poqty,
  //         alreadyRecQty: item.alreadyrecqty ?? 0,
  //         balanceQty: item.balanceqty ?? 0,
  //         grnQty: "",
  //         containerNo: grnData?.containerno ?? "",
  //       }));

  //       if (isEdit) {
  //         setSelectedItems(data.map(item => item.porid));
  //       }

  //       return data; // ✅ return instead of setting directly
  //     } else {
  //       return [];
  //     }
  //   } catch (err) {
  //     console.error("Failed to Load PO Item Details", err);
  //     return [];
  //   }
  // };


  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = items.map(item => item.porid);
      setSelectedItems(allIds);
    }
    else {
      setSelectedItems([]);
    }
  };

  const handleCheckBoxChange = (e, item) => {
    const { checked } = e.target;
    let updatedSelected = [...selectedItems];
    if (checked) {
      if (!updatedSelected.includes(item.porid)) updatedSelected.push(item.porid);
    } else {
      updatedSelected = updatedSelected.filter(id => id !== item.porid);
    }
    setSelectedItems(updatedSelected);
  };

  const handleInputChange = (index, field, value) => {
    setItems((prevItems) => {
      const updatedItems = [...prevItems];
      const item = { ...updatedItems[index] };

      if (field === "grnQty") {
        const balanceQty = parseFloat(item.oribalanceqty || 0);

        if (value === "") {
          item.grnQty = "";
        } else {
          const enteredQty = parseFloat(value);

          if (isNaN(enteredQty) || enteredQty < 0) {
            Swal.fire({
              icon: "warning",
              title: "Invalid Quantity",
              text: `GRN Qty cannot be negative for item: ${item.itemDescription}`,
            });
            item.grnQty = "";
          } else if (enteredQty > balanceQty) {
            Swal.fire({
              icon: "warning",
              title: "Quantity Exceeded",
              text: `GRN Qty cannot exceed Balance Qty (${balanceQty}) for item: ${item.itemDescription}`,
            });
            item.grnQty = "";
          } else {
            // ✅ Keep as string until save (avoid losing decimals)
            item.grnQty = value;
          }
        }
      }
      else {
        item[field] = value;
      }

      updatedItems[index] = item;
      return updatedItems;
    });
  };


  const validationSchema = Yup.object().shape({
    poNo: Yup.object().required("PO No. is required"),
    supplier: Yup.object().required("Supplier is required"),
    grnNo: Yup.string().required("GRN No. is required"),
    grnDate: Yup.date()
      .required("GRN Date is required")
      .test("min-po-date", "GRN Date cannot be earlier than PO Date", function (value) {
        const { poDate } = this.parent;
        if (!poDate || !value) return true;
        // Compare dates without time to avoid precision issues
        const grnDt = new Date(value);
        const poDt = new Date(poDate);
        grnDt.setHours(0, 0, 0, 0);
        poDt.setHours(0, 0, 0, 0);
        return grnDt >= poDt;
      }),
    items: Yup.array().of(
      Yup.object().shape({
        grnQty: Yup.number()
          .typeError("GRN Qty must be a number")
          .min(0, "GRN Qty cannot be negative")
          .test(
            "max-balance",
            function (value) {
              const { balanceQty } = this.parent;
              if (value > balanceQty) {
                return this.createError({
                  message: `GRN Qty cannot exceed Balance Qty (${balanceQty})`,
                });
              }
              return true;
            }
          ),
        doNo: Yup.string().required("DO No. is required"),
        doDate: Yup.date().required("DO Date is required"),
      })
    ),
    //doNo: Yup.string().required("DO No. is required"),
    //doDate: Yup.date().required("DO Date is required"),
    //invNo: Yup.string().required("Invoice No. is required"),
    //invDate: Yup.date().required("Invoice Date is required"),
  });

  const handleCancel = () => {
    history.push("/procurementsgrn");
  };
  const formatDate = (dateObj) => {
    const d = new Date(dateObj);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const transformToApiPayload = (values, isSubmitted) => {
    const ipAddress = ""; // You can replace this with actual IP if needed
    // debugger
    return {
      header: {
        grnid: values.grnid ?? 0,
        grnno: values.grnNo ?? "",
        grndate: formatDate(values.grnDate),
        grnvalue: values.grnValue ?? 0,
        // poid: values.poNo.value ?? 0,
        //podate: formatDate(values.poDate),
        supplierid: values.supplier?.value ?? 0,
        //invoiceno: values.invNo ?? "",
        //invoicedate: formatDate(values.invDate),
        isSubmitted: isSubmitted === 0 ? false : true,
        userid: UserData?.u_id ?? 0,
        createdip: "",
        modifiedip: "",
        isActive: 1,
        orgid: 1,
        branchId: 1,
      },

      details: (values.items || []).map(item => {
        return {
          grndid: item?.grndid || 0,
          grnid: item?.grnid || 0,
          porid: item.porid || 0,
          poid: item.poid || 0,
          itemid: item.itemid ?? 0,
          uomid: item.uomid ?? 0,
          dono: item.doNo ?? "",
          dodate: formatDate(item.doDate),
          poqty: Number(item.poQty) || 0,
          alreadyrecqty: item.grnQty ? (Number(item.alreadyRecQty) + Number(item.grnQty)) : item.alreadyRecQty ? item.alreadyRecQty : 0,
          balanceqty: item.grnQty ? (Number(item.poQty) - Number(item.alreadyRecQty) - Number(item.grnQty)) : item.balanceQty ? item.balanceQty : 0,
          grnqty: parseFloat(item.grnQty) || 0,
          //costperqty: Number(item.costperqty) || 0,
          containerno: item.containerNo ?? "",
          //amount: item.amount || 0,
          isActive: 1,
          userid: UserData?.u_id ?? 0,
          createdIP: "",
          modifiedIP: "",
        };
      })
    };
  };

  const handleSubmit = async (values, isSubmitted) => {
    setIsSubmitting(true);

    const selectedItemsData = items.filter((item) => selectedItems.includes(item.porid));

    if (selectedItemsData.length === 0) {
      await Swal.fire({
        icon: "warning",
        title: "No Item Selected",
        text: "Please select at least one item to submit GRN.",
      });
      setIsSubmitting(false);
      return;
    }

    // Validate each selected item
    for (let i = 0; i < selectedItemsData.length; i++) {
      const item = selectedItemsData[i];
      const grnQty =
        item.grnQty === "" || item.grnQty === null || item.grnQty === undefined
          ? 0
          : Number(item.grnQty);
      const alreadyRecQty = Number(item.alreadyRecQty || 0);
      const poQty = Number(item.poQty || 0);
      const doNo = item.doNo || values.doNo;
      const doDate =
        item.doDate && item.doDate !== "NaN-NaN-NaN" ? item.doDate : values.doDate;

      if (!doNo || !doDate || grnQty <= 0) {
        await Swal.fire({
          icon: "warning",
          title: "Validation Error",
          text: `Please fill DO Number, DO Date, and valid GRN Qty for item: ${item.itemDescription}`,
        });
        setIsSubmitting(false);
        return;
      }
      let totalReceived = parseFloat((grnQty + alreadyRecQty).toFixed(3));

      if (totalReceived > poQty) {
        await Swal.fire({
          icon: "warning",
          title: "Quantity Exceeded",
          text: `GRN Qty + Already Received Qty cannot exceed PO Qty (${poQty}) for item: ${item.itemDescription}`,
        });
        setIsSubmitting(false);
        return;
      }
    }

    // Determine action type
    let actionType = "Save";
    if (isEditMode && !isSubmitted) actionType = "Update";
    else if (isSubmitted) actionType = "Post";

    // Confirmation
    const result = await Swal.fire({
      title: `Are you sure you want to ${actionType}?`,
      text: `This will ${actionType.toLowerCase()} the procurement requisition.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: `Yes, ${actionType}`,
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) {
      setIsSubmitting(false);
      return;
    }

    // Prepare payload
    const transformedValues = {
      ...values,
      items: selectedItemsData.map((item) => ({
        ...item,
        doNo: item.doNo || values.doNo,
        doDate:
          item.doDate && item.doDate !== "NaN-NaN-NaN" ? item.doDate : values.doDate,
      })),
    };

    const payload = transformToApiPayload(transformedValues, isSubmitted);
    console.log("Submitting payload:", payload);
    // return;
    const res = await SaveGRN(isEditMode, payload);
    console.log("Save response", res);
    if (res?.status === true) {
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: res.message,
      });

      // Optional: Redirect after success
      history.push('/procurementsgrn');
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: res?.message || 'Something went wrong while saving the GRN.',
      });
    }


    setTimeout(() => {
      setSuccessmsg("GRN successfully submitted.");
      setErrormsg("");
      // setSubmitting(false);
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Procurement" breadcrumbItem="Goods Receipt Note" />
        <Row>
          <Col lg="12">
            <Card>
              <CardBody>
                <Formik
                  initialValues={initialValues}
                  validationSchema={validationSchema}
                  enableReinitialize
                >
                  {({ values, errors, touched, setFieldValue }) => (
                    <Form>
                      <div className="row align-items-center g-3 justify-content-end mb-3">
                        <div className="col-md-12 button-items d-flex gap-2 justify-content-end">

                          <button
                            type="button"
                            className="btn btn-info"
                            onClick={() => handleSubmit(values, 0)}
                            disabled={isSubmitting || isRestrictedUser}
                          >
                            <i className="bx bx-comment-check label-icon font-size-16 align-middle me-2" ></i>{isEditMode ? "Update" : "Save"}

                          </button>
                          <button
                            type="button"
                            className="btn btn-success fa-pull-right"
                            onClick={() => handleSubmit(values, 1)}// Post  
                            disabled={isSubmitting || isRestrictedUser}
                          >
                            <i className="bx bxs-save label-icon font-size-16 align-middle me-2"></i>Post
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                          >
                            <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>
                            Close
                          </button>

                        </div>
                      </div>

                      <Row className="mb-3">
                        <Col md="3">
                          <FormGroup>
                            <Label>GRN No.</Label>
                            <Field
                              name="grnNo"
                              className={`form-control ${errors.grnNo && touched.grnNo ? "is-invalid" : ""
                                }`}
                            />
                            {errors.grnNo && touched.grnNo && (
                              <div className="text-danger">{errors.grnNo}</div>
                            )}
                          </FormGroup>
                        </Col>
                        <Col md="3">
                          <FormGroup>
                            <Label>GRN Date<span className="text-danger">*</span></Label>
                            <Flatpickr
                              name="grnDate"
                              className="form-control"
                              value={values.grnDate || null}
                              onChange={(date) => {
                                const selectedDate = date[0];
                                if (values.poDate && selectedDate) {
                                  const poDt = new Date(values.poDate);
                                  const grnDt = new Date(selectedDate);

                                  // Clear times for accurate comparison
                                  poDt.setHours(0, 0, 0, 0);
                                  grnDt.setHours(0, 0, 0, 0);

                                  if (grnDt < poDt) {
                                    Swal.fire({
                                      icon: "warning",
                                      title: "Invalid Date",
                                      text: "You cannot select a GRN date earlier than the PO date.",
                                      confirmButtonColor: "#3e6e9e"
                                    });
                                    setFieldValue("grnDate", values.poDate); // Default to PO Date
                                    return;
                                  }
                                }
                                setFieldValue("grnDate", selectedDate);
                              }}
                              options={{
                                altInput: true,
                                altFormat: "d-M-Y",
                                dateFormat: "Y-m-d",
                                minDate: values.poDate ? new Date(values.poDate) : null,
                              }}
                            />
                            {errors.grnDate && touched.grnDate && (
                              <div className="text-danger">{errors.grnDate}</div>
                            )}
                          </FormGroup>
                        </Col>
                        <Col md="3">
                          <FormGroup>
                            <Label>Supplier<span className="text-danger">*</span></Label>
                            <Select
                              name="supplier"
                              value={values.supplier}
                              options={suppliers}
                              onChange={async (option) => {
                                setFieldValue("supplier", option);
                                setFieldValue("poNo", []);
                                if (option?.value) {
                                  const sup_Id = option.value;
                                  const orgId = 1;
                                  const branchId = 1;
                                  const grnId = values.grnId || 0;
                                  const poNoList = await GetPOList(sup_Id, orgId, branchId, grnId);
                                  if (poNoList.status) {
                                    const data = Array.isArray(poNoList.data)
                                      ? poNoList.data : [poNoList.data];

                                    const options = data.map(item => ({
                                      value: item.poid,
                                      label: item.pono,
                                      podate: item.podate,
                                    }));
                                    setPoNo(options);
                                  }
                                };

                              }}
                              isClearable
                              menuPortalTarget={document.body}
                            />
                            {errors.supplier && touched.supplier && (
                              <div className="text-danger">{errors.supplier}</div>
                            )}
                          </FormGroup>
                        </Col>
                        <Col md="3">
                          <FormGroup>
                            <Label>
                              PO No.<span className="text-danger">*</span>
                            </Label>
                            <Select
                              name="poNo"
                              value={values.poNo}
                              options={poNo}
                              menuPortalTarget={document.body}
                              onChange={async (selectedOption) => {
                                setFieldValue("poNo", selectedOption || null);

                                // Capture PO Date for validation
                                let finalPoDate = selectedOption?.podate || null;

                                // Fallback: If podate is missing from list, fetch PO details
                                if (selectedOption && !finalPoDate) {
                                  try {
                                    const poRes = await GetByIdPurchaseOrder(selectedOption.value, orgId, branchId);
                                    if (poRes?.status && poRes.data?.Header?.podate) {
                                      finalPoDate = poRes.data.Header.podate;
                                    }
                                  } catch (err) {
                                    console.error("Failed to fetch PO details for date validation", err);
                                  }
                                }
                                setFieldValue("poDate", finalPoDate);

                                if (selectedOption && selectedOption.value) {
                                  const poItems = await loadItemsByPO(selectedOption.value, grnData?.data?.Details || []);
                                  setItems(poItems);
                                  setFieldValue("items", poItems);

                                  // Restore selected items if edit mode
                                  if (isEditMode && grnData?.data?.Details) {
                                    const preselected = grnData.data.Details.map(d => d.porid);
                                    setSelectedItems(preselected);
                                  } else {
                                    setSelectedItems([]);
                                  }
                                } else {
                                  setItems([]);
                                  setFieldValue("items", []);
                                  setSelectedItems([]);
                                }
                              }}
                              isClearable
                            />
                            {errors.poNo && touched.poNo && (
                              <div className="text-danger">{errors.poNo}</div>
                            )}
                          </FormGroup>
                        </Col>
                      </Row>

                      <div className="table-responsive">
                        <table className="table"  >
                          <thead>
                            <tr>
                              <th style={{ width: '20px' }}>
                                <input type="checkbox"
                                  checked={isAllSelected}
                                  onChange={handleSelectAll} />
                              </th>
                              <th>PO No.</th>
                              <th>Item Description</th>
                              {/* <th>Item Code</th> */}
                              {/* <th>Dept</th> */}

                              <th>DO NO.</th>
                              <th>DO DATE</th>
                              <th>PO Qty</th>
                              <th>UOM</th>
                              <th>Recd Qty</th>
                              <th>Bal Qty</th>
                              <th>GRN Qty</th>
                              <th>Contnr No.</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map((item, index) => (
                              <tr key={index}>
                                <td>
                                  <input type="checkbox"
                                    value={item.porid}
                                    checked={selectedItems.includes(item.porid)}
                                    onChange={(e) => handleCheckBoxChange(e, item)} />
                                </td>
                                <td>{item.poNo}</td>
                                <td style={{ width: '250px' }}> {item.itemDescription}</td>
                                {/* <td>{item.itemCode}</td> */}
                                {/*  <td>{item.dept}</td> */}

                                <td style={{ width: '150px' }}>
                                  <Field
                                    name="doNo"
                                    value={item.doNo}
                                    maxLength="20"
                                    placeholder="Do No."
                                    className={`form-control ${errors.doNo && touched.doNo ? "is-invalid" : ""
                                      }`}
                                    onChange={(e) =>
                                      handleInputChange(index, "doNo", e.target.value)
                                    }
                                  />
                                  {errors.doNo && touched.doNo && (
                                    <div className="text-danger">{errors.doNo}</div>
                                  )}
                                </td>
                                <td>
                                  <Flatpickr
                                    name="doDate"
                                    className="form-control"
                                    value={item.doDate || null}
                                    placeholder="DD-MM-YYYY"
                                    // onChange={(date) => setFieldValue("doDate", date[0])}
                                    onChange={(date) =>
                                      handleInputChange(index, "doDate", formatDate(date[0]))
                                    }
                                    options={{
                                      altInput: true,
                                      altFormat: "d-M-Y",
                                      dateFormat: "Y-m-d",
                                    }}
                                  />
                                  {errors.doDate && touched.doDate && (
                                    <div className="text-danger">{errors.doDate}</div>
                                  )}
                                </td>
                                <td>{(item.poQty).toLocaleString()}</td>
                                <td>{item.uom}</td>
                                <td>{(item.alreadyRecQty).toLocaleString()}</td>
                                <td>{(item.balanceQty).toLocaleString()}</td>
                                {/* <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                   
                                    value={item.grnQty !== undefined && item.grnQty !== null ? Number(item.grnQty).toLocaleString() : ""}
                                    style={{ width: '80px' }}
                                    onChange={(e) => {
                                      const numericValue = e.target.value.replace(/,/g, '');
                                      handleInputChange(index, "grnQty", numericValue);
                                       
                                    }
                                    }
                                  />
                                </td> */}

                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.grnQty ?? ""}
                                    style={{ width: "100px", textAlign: "right" }}
                                    onChange={(e) => {
                                      let input = e.target.value.trim();

                                      // ✅ Allow only digits and optional decimal with max 12,2 precision
                                      if (!/^\d{0,12}(\.\d{0,3})?$/.test(input)) {
                                        return;
                                      }

                                      handleInputChange(index, "grnQty", input);
                                    }}
                                    onBlur={(e) => {
                                      // ✅ Format to 2 decimals on blur (optional)
                                      if (e.target.value && !isNaN(e.target.value)) {
                                        handleInputChange(index, "grnQty", parseFloat(e.target.value).toFixed(3));
                                      }
                                    }}
                                  />
                                </td>

                                <td>
                                  <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    value={item.containerNo}
                                    maxLength="20"
                                    style={{ width: '80px' }}
                                    onChange={(e) =>
                                      handleInputChange(index, "containerNo", e.target.value)
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                      </div>
                      {successmsg && (
                        <div className="alert alert-success mt-3">{successmsg}</div>
                      )}
                      {errormsg && (
                        <div className="alert alert-danger mt-3">{errormsg}</div>
                      )}
                    </Form>
                  )}
                </Formik>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default ProcurementsAddGRN;