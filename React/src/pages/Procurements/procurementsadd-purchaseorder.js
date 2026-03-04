import React, { useState, useEffect, useRef } from "react";
import Select from "react-select";
import {
    Container,
    Row,
    Col,
    Card,
    CardBody,
    Button,
    FormGroup,
    Label,
    Input,
    Table,
    InputGroup,
    UncontrolledAlert,
} from "reactstrap";
import { toast } from 'react-toastify';
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { useHistory, useParams } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage, FieldArray } from "formik";
import * as Yup from "yup";
import { AutoComplete } from "primereact/autocomplete";
import { Dropdown } from "primereact/dropdown";
import { useLocation } from "react-router-dom";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/themes/material_blue.css";
import "react-datepicker/dist/react-datepicker.css";
import {
    GetCommonProcurementPOSupplierDetails, GetCommonPurchaseOrderSeqNo,
    GetCommonProcurementPRNoList, GetCommonProcurementItemDetails, GetPrIdDetails, GetCommonProcurementUomDetails, savePurchaseOrder, GetByIdPurchaseOrder,
    GetCommonProcurementItemGroupDetails,
    GetSupplierCurrencyList,
    GetPRNoBySupplierAndCurrency
} from "common/data/mastersapi";
import Swal from 'sweetalert2';

const initialValues = {
    prNo: [],
    poNo: "PO0001",
    poDate: new Date(),
    supplier: 0,

    /*prtype: "General PR",
     paymentTerm: "30 Days",    
    address: "Jl. Example No. 123, Jakarta",
    deliveryTerm: "FOB",
    contact: "+62 812-3456-7890",
    requestor: "Anwar",
    deliveryAddress: "Warehouse A, Jakarta",
    department: "Purchase",
    email: "rina.kartikad@example.com",
    name: "Patrik",
    remarks:
   "Item 1 : Stock Valve for production pallet on cylinder - Request by Bu Himelda.\nItem 2-4 : Project Ethylene Oxide.",*/

};
const getUserDetails = () => {
    if (localStorage.getItem("authUser")) {
        const obj = JSON.parse(localStorage.getItem("authUser"))
        return obj;
    }
}
const validationSchema = Yup.object({
    poNo: Yup.string()
        .required("PO No is required"),

    poDate: Yup.date()
        .typeError("Invalid date")
        .required("PO Date is required"),

    supplier: Yup.number()
        .typeError("Supplier is required")
        .required("Supplier is required"),
    currency: Yup.number()
        .typeError("Currency is required")
        .required("Currency is required"),
    prNo: Yup.array()
        .of(
            Yup.object().shape({
                value: Yup.string().required(),
                label: Yup.string().required()
            })
        )
        .nullable()
        .min(1, "Please select at least one PR No")
        .required("PR No is required"),
});


const ProcurementsAddPurchaseOrder = () => {
    const isFirstRender = useRef(true);
    const history = useHistory();
    const [isClearable, setIsClearable] = useState(true);
    const [isSearchable, setIsSearchable] = useState(true);
    const [isDisabled, setIsDisabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isRtl, setIsRtl] = useState(false);
    const [cylinderTableData, setCylinderTableData] = useState([]);
    const { id } = useParams();
    const [itemNameSuggestions, setItemNameSuggestions] = useState({});
    const [prNo, setPrNo] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [paymentTerms, setPaymentTerms] = useState([]);
    const [deliveryTerms, setDeliveryTerms] = useState([]);
    const [requestors, setRequestors] = useState([]);
    const [currency, setCurrency] = useState([]);
    const [poNo, setPoNo] = useState([]);
    const [uomOptions, setUomOptions] = useState([]);
    const [subTotal, setSubTotal] = useState("0.00");
    const [totalDiscount, setTotalDiscount] = useState("0.00");
    const [totalTax, setTotalTax] = useState("0.00");
    const [totalVAT, setTotalVAT] = useState("0.00");
    const [netTotal, setNetTotal] = useState("0.00");
    const [selected, setSelected] = useState([]);
    const [isMulti, setIsMulti] = useState(true);
    const [prTypes, setPrTypes] = useState([]);
    const [branchId, setBranchId] = useState(1);
    const [orgId, setOrgId] = useState(1);
    const [currencies, setCurrencies] = useState([]);
    const prId = 0;
    const location = useLocation();
    const PurchaseOrderDetails = location.state?.PurchaseOrderDetails || null;
    const purchase_order_id = PurchaseOrderDetails?.poid || 0;
    const isEditMode = PurchaseOrderDetails?.poid;
    const [UserData, setUserData] = useState(null);
    const [owershiplist] = useState([
        { label: "BTG (BTG Owned Property)", value: "1" },
        { label: "COP (Customer Owned Property)", value: "2" },
        { label: "SOP (Supplier Owned Property)", value: "3" },
    ]);
    const [isPostButtonDisabled, setIsPostButtonDisabled] = useState(false); // New state for Save button
    const [isSubmitting, setIsSubmitting] = useState(false); // New state to track submission status
    const handleContainerTypeChange = (option) => {
        if (option) {
            const rows = Array.from({ length: 18 }, (_, index) => ({
                id: index + 1,
                cylinderName: "",
                ownership: "",
                barCode: "",
            }));
            setCylinderTableData(rows);
        } else {
            setCylinderTableData([]);
        }
    };

    useEffect(() => {

        const userData = getUserDetails();

        setUserData(userData);

        loadItemGroupOptions();
        setIsPostButtonDisabled(false);
    }, [orgId, branchId]);

    const [itemOptions, setItemOptions] = useState([]);
    const [itemGroupOptions, setItemGroupOptions] = useState([]);
    const loadItemGroupOptions = async () => {
        const res = await GetCommonProcurementItemGroupDetails(0, orgId, branchId, '%');
        if (res.status) {
            const options = Array.isArray(res.data) ? res.data.map(x => ({
                label: x.groupname,
                value: x.groupid,
            })) : [];

            setItemGroupOptions(options);
        }
    };

    const loadItemNameOptions = async (itemGroupId, index) => {
        const res = await GetCommonProcurementItemDetails(0, orgId, branchId, "%", itemGroupId);
        const options = Array.isArray(res.data) ? res.data.map(x => ({
            label: x.itemname,
            value: x.itemid,
            stock: x.stock,
            uom: x.uom,
            taxperc: x.taxperc,
            vatPerc: x.vatPerc,
        })) : [];

        setItemOptions(prev => ({ ...prev, [index]: options }));
    };
    const getUOMLabelById = (id) => {
        const found = uomOptions.find(uom => uom.value === id);
        return found ? found.label : `Unknown UOM (${id})`;
    };

    useEffect(() => {
        debugger
        if (PurchaseOrderDetails?.poid == null) {
            const fetchSeqNoData = async () => {
                try {
                    const branchId = 1;
                    const orgId = 1;
                    debugger
                    const res = await GetCommonPurchaseOrderSeqNo(orgId, branchId);
                    debugger
                    const generatedPONo = res.pono || '';
                    setInitialValues(prev => ({
                        ...prev,
                        poNo: generatedPONo,
                    }));

                } catch (error) {
                    console.error("Error fetching PO sequence number:", error);
                }
            };

            fetchSeqNoData();
        }
    }, [PurchaseOrderDetails]);

    useEffect(() => {
        const fetchData = async () => {
            if (PurchaseOrderDetails?.poid != null) {
                if (PurchaseOrderDetails) {
                    try {
                        const branchId = 1;
                        const orgId = 1;
                        const poid = PurchaseOrderDetails?.poid;
                        debugger
                        const data = await GetByIdPurchaseOrder(poid, branchId, orgId);
                        debugger
                        if (data?.status && data.data) {
                            const mappedValues = mapApiDataToForm(data.data);
                            setInitialValues(mappedValues);
                        }
                    } catch (error) {
                        console.error("Error fetching PO details:", error);

                    }
                }
            }
        };

        fetchData();
    }, [PurchaseOrderDetails]);

    const mapApiDataToForm = (apiData) => {
        const header = apiData?.Header || {};
        const requisitions = apiData?.Requisition || [];
        const details = apiData?.Details || [];

        return {
            // Main Header Fields
            poId: header.poid || null,
            poNo: header.pono || '',
            poDate: header.podate ? new Date(header.podate) : null,
            supplier: header.supplierid || null,
            supplierCode: header.suppliercode || '',
            supplierName: header.suppliername || '',
            requestor: header.requestorid || null,
            requestorName: header.requestorname || '',
            department: header.departmentid || null,
            departmentName: header.departmentname || '',
            paymentTerm: header.paymenttermid || null,
            paymentTermName: header.paymentterm || '',
            deliveryTerm: header.deliverytermid || null,
            deliveryTermName: header.deliveryTerm || '',
            currency: header.currencyid || null,
            currencyCode: header.currencycode || '',
            exchangeRate: header.exchangerate || '',
            prTypeId: header.prtypeid || null,
            prType: header.prtype || '',
            prNo: header.prid
                ? [{ value: header.prid.toString(), label: header.pr_number || `PR-${header.prid}` }]
                : [],
            prId: header.prid || null,
            remarks: header.remarks || '',
            deliveryAddress: header.deliveryaddress || '',
            isSaved: header.issaved || 0,
            isActive: header.isactive || 1,
            orgId: header.orgid || null,
            branchId: header.branchid || null,
            createdBy: header.createdby || null,
            createdDate: header.createddt || null,
            createdIp: header.createdip || '',
            modifiedBy: header.modifiedby || null,
            modifiedDate: header.modifieddt || null,
            modifiedIp: header.modifiedip || '',
            subTotal: header?.headersubtotal || 0.00,
            discountValue: header?.headerdiscountvalue || 0.00,
            taxValue: header?.headertaxvalue || 0.00,
            vatValue: header?.headervatvalue || 0.00,
            netTotal: header?.headernetvalue || 0.00,

            // Details Section
            details: details.map(d => ({
                podId: d.podid || null,
                poId: d.poid || null,
                prid: d.prid || null,
                isActive: d.isactive || 1,
                createdBy: d.createdby || null,
                branchId: d.branchid || null,
                orgId: d.orgid || null,
            })),

            // Line Items (Requisitions)
            items: requisitions.map((req) => ({
                poId: req.poid || null,
                podId: req.podid || null,
                porId: req.porid || null,
                prid: req.prid || null,
                prNo: header.prid ? { value: header.prid, label: header.pr_number || `PR-${header.prid}` } : null,
                itemId: req.itemid || null,
                itemName: req.itemname || '',
                uomId: req.uomid || null,
                uom: req.uom || '',
                qty: req.qty || 0,
                unitPrice: req.unitprice || 0,
                subtotal: req.subtotal || 0,
                discountPercent: req.discountperc || 0,
                discount: req.discountvalue || 0,
                taxPercent: req.taxperc || 0,
                taxAmount: req.taxvalue || 0,
                amount: req.nettotal || 0,
                isActive: req.isactive || 1,
                createdBy: req.createdby || null,
                branchId: req.branchid || null,
                orgId: req.orgid || null
            }))
        };
    };



    const [initialValues, setInitialValues] = useState({
        poNo: "",
        poDate: new Date(),
        supplier: 0,
        currency: 0,
        prNo: null,
        remarks: "",
        requestor: 0,
        department: 0,
        paymentTerm: 0,
        deliveryTerm: 0,
        deliveryAddress: "",
        currency: 0,
        exchangeRate: 0,
        prType: 0,
        createdDate: null,
        createdBy: null,
        createdIp: "",
        subTotal: 0.00,
        discountValue: 0.00,
        taxValue: 0.00,
        vatValue: 0.00,
        netTotal: 0.00,
        items: []
    });


    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const po_Id = 0;
                const orgId = 1;
                const branchId = 1;
                console.log("Fetching suppliers with po_Id:", po_Id);
                const supplierdata = await GetCommonProcurementPOSupplierDetails(po_Id, orgId, branchId, '%');
                console.log("Supplier data:", supplierdata);
                if (supplierdata.status) {
                    const options = supplierdata.data.map(item => ({
                        value: item.supplier,
                        label: item.suppliername,
                    }));
                    setSuppliers(options);
                }
            } catch (error) {
                console.error("Error fetching suppliers:", error);
            }
        };

        const fetchUOMData = async () => {
            try {
                const po_Id = 0;
                const orgId = 1;
                const branchId = 1;
                console.log("Fetching UOMs with po_Id:", po_Id);
                const uomRes = await GetCommonProcurementUomDetails(po_Id, orgId, branchId, '%');
                if (uomRes.status) {
                    const options = uomRes.data.map(item => ({
                        value: item.uomid,
                        label: item.UOMName
                    }));
                    setUomOptions(options);
                }
            } catch (error) {
                console.error("Error fetching UOMs:", error);
            }
        };

        fetchSuppliers();
        fetchUOMData();
    }, []);

    useEffect(() => {
        const fetchItems = async () => {
            try {
                const res = await GetCommonProcurementItemDetails(prId, orgId, branchId, '%');
                if (res?.status) {
                    const options = res.data.map(item => ({
                        value: item.itemid,
                        label: item.itemname,
                        stock: item.stockqty
                    }));
                    setItemOptions(options);
                }
            } catch (err) {
                console.error("Failed to load item options", err);
            }
        };

        fetchItems();
    }, [prId, orgId, branchId]);
    const getItemNameById = (id) => {
        const found = itemOptions.find(item => item.value === id);
        return found ? found.label : `Unknown Item (${id})`;
    };

    const [successMsg, setSuccessMsg] = useState(false);
    // const handleSubmit = (values, { setSubmitting, resetForm }) => {
    //     debugger

    //     setSuccessMsg(true);
    //     setSubmitting(false);
    //     setTimeout(() => {
    //         setSuccessMsg(false);
    //         resetForm();
    //     }, 2000);
    // };
    function formatDateToMySQL(dateString) {
        const date = new Date(dateString);
        const pad = (n) => n.toString().padStart(2, '0');
        return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
            `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    }
    const markAllTouched = (val) => {
        if (Array.isArray(val)) {
            return val.map((v) => markAllTouched(v));
        }
        if (val !== null && typeof val === 'object') {
            const out = {};
            for (const k in val) out[k] = markAllTouched(val[k]);
            return out;
        }
        return true;
    };

    function formatDateTime(dateInput) {
        const d = (dateInput instanceof Date) ? dateInput : new Date(dateInput);

        if (isNaN(d.getTime())) {
            return null; // invalid date
        }

        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const hours = String(d.getHours()).padStart(2, "0");
        const minutes = String(d.getMinutes()).padStart(2, "0");
        const seconds = String(d.getSeconds()).padStart(2, "0");

        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }


    const buildPayload = (values, userContext = {}) => {
        const podate = values?.poDate ? formatDateTime(values.poDate) : null;
        return {
            header: {
                poid: 0,
                pono: values.poNo,
                // podate: formatDateTime(values.podate),
                podate: podate,
                supplierid: values.supplier,
                issaved: 2, // you can set based on draft/final
                userid: userContext.userId ?? 0,
                isactive: 1,
                branchid: userContext.branchId ?? 0,
                orgid: userContext.orgId ?? 0,
                createdip: values.createdIp ?? "0.0.0.0",
                modifiedip: values.modifiedIp ?? "0.0.0.0",
                requestorid: values.requestor,
                departmentid: values.department,
                paymenttermid: values.paymentTerm,
                deliverytermid: values.deliveryTerm,
                remarks: values.remarks,
                prid: 0, // usually comes from PR, but you’re handling multiple PRs in requisition
                prtypeid: values.prType,
                deliveryaddress: values.deliveryAddress,
                currencyid: values.currency || 0,
                exchangerate: values.exchangeRate,
                subTotal: values?.subTotal ? parseFloat(values.subTotal).toFixed(2) : "0.00",
                discountValue: values?.discountValue ? parseFloat(values.discountValue).toFixed(2) : "0.00",
                taxValue: values?.taxValue ? parseFloat(values.taxValue).toFixed(2) : "0.00",
                vatValue: values?.vatValue ? parseFloat(values.vatValue).toFixed(2) : "0.00",
                netTotal: values?.netTotal ? parseFloat(values.netTotal).toFixed(2) : "0.00",
            },

            details: (values.prNo || []).map(pr => ({
                podid: 0,
                poid: 0,
                prid: pr.value ?? 0,
                isactive: 1,
                userid: userContext.userId ?? 0,
                createdip: values.createdIp ?? "0.0.0.0",
                modifiedip: values.modifiedIp ?? "0.0.0.0",
            })),

            requisition: values.items.map(item => ({
                porid: 0,
                podid: 0,
                poid: 0,
                prmid: 0,
                prid: item.prNo?.value ?? 0,
                prdid: item.PRDId ?? 0,
                itemid: item.itemName?.value ?? 0,
                uomid: item.uom_id ?? 0,
                qty: parseFloat(item.qty) || 0,
                unitprice: parseFloat(item.unitPrice) || 0,
                totalvalue: parseFloat(item.amount) || 0,
                taxperc: parseFloat(item.taxPercent) || 0,
                taxvalue: parseFloat(item.taxAmount) || 0,
                subtotal: parseFloat(item.amount) || 0,
                discountperc: 0,
                discountvalue: parseFloat(item.discount) || 0,
                nettotal: parseFloat(item.netTotal) || 0,
                isactive: 1,
                userid: userContext.userId ?? 0,
                createdip: values.createdIp ?? "0.0.0.0",
                modifiedip: values.modifiedIp ?? "0.0.0.0",
                vatperc: parseFloat(item.vatPercent) || 0,
                vatvalue: parseFloat(item.vatAmount) || 0,
                itemgroupid: item.itemGroupId?.value ?? 0,
            })),
        };
    };

    const handleSubmit = async (values, issubmit) => {
        // console.log('values > ',values)
        // return;
        setIsSubmitting(true);
        try {

            const userId = UserData?.u_id ?? 0;
            const branchId = 1;
            const orgId = 1;
            const ipAddress = "127.0.0.1";

            const poDate = values.poDate;
            const supplierId = values.supplier || 0;

            const poId = values.poId || 0;

            // const prNoId = Array.isArray(values.prNo) && values.prNo.length > 0
            //     ? parseInt(values.prNo[0].value)
            //     : 0;

            // const toFixedNum = (num, decimals = 4) =>
            //     parseFloat(parseFloat(num || 0).toFixed(decimals));

            // const calculateValues = (qty, unitPrice, discountPerc, taxPerc) => {
            //     const total = qty * unitPrice;
            //     const discountVal = total * (discountPerc / 100);
            //     const subtotal = total - discountVal;
            //     const taxVal = subtotal * (taxPerc / 100);
            //     const net = subtotal + taxVal;

            //     return {
            //         totalValue: toFixedNum(total),
            //         discountValue: toFixedNum(discountVal),
            //         subTotal: toFixedNum(subtotal),
            //         taxValue: toFixedNum(taxVal),
            //         netTotal: toFixedNum(net)
            //     };
            // };

            // const payload = {
            //     header: {
            //         poid: poId,
            //         pono: values.poNo || "",
            //         podate: poDate ? formatDateToMySQL(poDate) : "",
            //         supplierid: supplierId,
            //         issaved: issubmit,
            //         userid: userId,
            //         isactive: 1,
            //         branchid: branchId,
            //         orgid: orgId,
            //         createdip: ipAddress,
            //         modifiedip: ipAddress,
            //         requestorid: values.requestor || 0,
            //         departmentid: values.department || 0,
            //         paymenttermid: values.paymentTerm || 0,
            //         deliverytermid: values.deliveryTerm || 0,
            //         remarks: values.remarks || "",
            //         prid: prNoId,
            //         prtypeid: values.prTypeId || 1,
            //         deliveryaddress: values.deliveryAddress || "",
            //         currencyid: values.currency || 1,
            //         exchangerate: parseFloat(values.exchangeRate) || 1
            //     },

            //     details: [
            //         {
            //             podid: values.details?.[0]?.podId || 0,
            //             poid: poId,
            //             prid: prNoId,
            //             isactive: 1,
            //             userid: userId,
            //             createdip: ipAddress,
            //             modifiedip: ipAddress
            //         }
            //     ],

            //     requisition: values.items?.map((item) => {
            //         const qty = parseFloat(item.qty) || 0;
            //         const unitPrice = parseFloat(item.unitPrice) || 0;
            //         const discountPerc = parseFloat(item.discountPercent || item.discount || 0);
            //         const taxPerc = parseFloat(item.taxPercent || 0);

            //         const {
            //             totalValue,
            //             discountValue,
            //             subTotal,
            //             taxValue,
            //             netTotal
            //         } = calculateValues(qty, unitPrice, discountPerc, taxPerc);

            //         return {
            //             porid: item.porId || 0,
            //             podid: item.podId || 0,
            //             poid: poId,
            //             prmid: 0,
            //             prid: item.prid || prNoId,
            //             prdid: item.prdid || 0,
            //             itemid: item.itemId || item.itemName?.value || 0,
            //             uomid: item.uomId || item.uom?.value || 0,
            //             qty,
            //             unitprice: unitPrice,
            //             totalvalue: totalValue,
            //             taxperc: taxPerc,
            //             taxvalue: taxValue,
            //             subtotal: subTotal,
            //             discountperc: discountPerc,
            //             discountvalue: discountValue,
            //             nettotal: netTotal,
            //             isactive: item.isActive || 1,
            //             userid: userId,
            //             createdip: ipAddress,
            //             modifiedip: ipAddress
            //         };
            //     }) || []
            // };
            // 📨 Send to API


            const payload = buildPayload(values, {
                userId: userId,
                branchId: branchId,
                orgId: orgId,
            });

            //             console.log('payload > ',payload)
            // return;
            const response = await savePurchaseOrder(!!poId, payload);

            if (response.status) {
                toast.success(response.message || "Purchase Order Saved");
                if (issubmit === 1) {
                    setIsPostButtonDisabled(true); // Disable Post button
                }
                // setTimeout(() => {
                history.push("/procurementspurchase-order");
                // }, 1000);
            } else {
                toast.error("Failed to save purchase order: " + response.message);
                setIsSubmitting(false);
            }

        } catch (error) {
            toast.error("Error submitting purchase order: " + error.message);
            setIsSubmitting(false);
        } finally {
            if (typeof setSubmitting === 'function') {
                setSubmitting(false);
            }
        }
    };

    const handleCancel = () => {
        history.push('/procurementspurchase-order');
    };


    // const handleSubmit = async (values, { setSubmitting, resetForm }) => {
    //     debugger
    //     try {
    //         const userId = 1;
    //         const branchId = 1;
    //         const orgId = 1;
    //         const ipAddress = "127.0.0.1";

    //         const poDate = values.poDate;
    //         const supplierId = values.supplier;
    //         const prNoId = Array.isArray(values.prNo) && values.prNo.length > 0
    //             ? values.prNo[0].value
    //             : 0;

    //         const payload = {
    //             header: {
    //                 poid: 0,
    //                 pono: values.poNo || "",
    //                 podate: formatDateToMySQL(poDate) || "",  // ✅ fixed line
    //                 supplierid: supplierId,
    //                 issaved: 0,
    //                 userid: userId,
    //                 isactive: 1,
    //                 branchid: branchId,
    //                 orgid: orgId,
    //                 createdip: ipAddress,
    //                 modifiedip: ipAddress,
    //                 requestorid: userId,
    //                 departmentid: 0,
    //                 paymenttermid: 0,
    //                 deliverytermid: 0,
    //                 remarks: values.remarks || "",
    //                 prid: prNoId,
    //                 prtypeid: 1,
    //                 deliveryaddress: values.deliveryAddress || "",
    //                 currencyid: 1,
    //                 exchangerate: 1,
    //             },
    //             details: values.items.map(item => ({
    //                 podid: 0,
    //                 poid: 0,
    //                 prid: prNoId,
    //                 isactive: 1,
    //                 userid: userId,
    //                 createdip: ipAddress,
    //                 modifiedip: ipAddress,
    //                 itemid: item.itemName?.value || item.itemId || 0,
    //                 qty: item.qty || 0,
    //                 unitprice: item.unitPrice || 0,
    //                 discount: item.discount || 0,
    //                 taxperc: item.taxPercent || 0,
    //                 taxvalue: item.taxAmount || 0,
    //                 nettotal: item.amount || 0,
    //                 uomid: item.uom?.value || 0
    //             })),
    //             requisition: [
    //                 {
    //                     prid: prNoId,
    //                     isactive: 1,
    //                     userid: userId,
    //                     createdip: ipAddress,
    //                     modifiedip: ipAddress,
    //                 }
    //             ]
    //         };
    //         debugger
    //         const response = await savePurchaseOrder(isEditMode, payload);
    //         debugger
    //         if (response.status) {
    //             toast.success(response.message || "Purchase Order Saved");
    //             setTimeout(() => {
    //                 history.push("/procurementspurchase-order");
    //             }, 1000);
    //         } else {
    //             toast.error("Failed to save purchase order:", response.message);
    //         }

    //     } catch (error) {
    //         toast.error("Error submitting purchase order:", error);
    //     } finally {
    //         if (typeof setSubmitting === 'function') {
    //             setSubmitting(false);
    //         }
    //     }
    // };


    const calculateLineTotals = (item) => {
        const qty = parseFloat(item.qty) || 0;
        const unitPrice = parseFloat(item.unitPrice) || 0;
        const discount = parseFloat(item.discount) || 0;
        const taxPercent = parseFloat(item.taxPercent) || 0;
        const vatPercent = parseFloat(item.vatPercent) || 0;

        const lineTotal = qty * unitPrice;
        const lineAfterDiscount = lineTotal - discount;

        const taxAmount = (lineAfterDiscount * taxPercent) / 100;
        const vatAmount = (lineAfterDiscount * vatPercent) / 100;

        // ❌ VAT as deduction (not added to total)
        const totalAmount = lineAfterDiscount + taxAmount - vatAmount;

        return {
            taxAmount: taxAmount.toFixed(2),
            vatAmount: vatAmount.toFixed(2),
            amount: totalAmount.toFixed(2),
            lineTotal,
            lineAfterDiscount
        };
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Procurement" breadcrumbItem="Purchase Order" />
                    <Row>
                        <Col lg="12">
                            <Card>
                                <CardBody>
                                    <Formik enableReinitialize initialValues={initialValues} validationSchema={validationSchema} validateOnMount={false} validateOnChange={false} validateOnBlur={true}>
                                        {({ values, errors, touched, setFieldValue, setTouched, validateForm, setFieldTouched }) => {
                                            useEffect(() => {
                                                if (isFirstRender.current) {
                                                    isFirstRender.current = false; // skip first render
                                                    return;
                                                }

                                                let subtotal = 0;
                                                let totalDiscount = 0;
                                                let totalTax = 0;
                                                let totalVAT = 0;
                                                let netTotal = 0;

                                                values.items.forEach((item) => {
                                                    netTotal += parseFloat(item.netTotal) || 0;
                                                    subtotal += parseFloat(item.amount) || 0;
                                                    totalDiscount += parseFloat(item.discount) || 0;
                                                    totalTax += parseFloat(item.taxAmount) || 0;
                                                    totalVAT += parseFloat(item.vatAmount) || 0;
                                                });

                                                // const netTotal = subtotal - totalDiscount + totalTax + totalVAT;
                                                // const roundedNetTotal = Math.round(netTotal).toFixed(3);

                                                // setInitialValues((prev) => ({
                                                //     ...prev,
                                                //     subTotal: subtotal.toFixed(3),
                                                //     discountValue: totalDiscount.toFixed(3),
                                                //     taxValue: totalTax.toFixed(3),
                                                //     vatValue: totalVAT.toFixed(3),
                                                //     netTotal: roundedNetTotal
                                                // }));
                                                setFieldValue("subTotal", subtotal.toFixed(2));
                                                setFieldValue("discountValue", totalDiscount.toFixed(2));
                                                setFieldValue("taxValue", totalTax.toFixed(2));
                                                setFieldValue("vatValue", Math.abs(totalVAT).toFixed(2));
                                                setFieldValue("netTotal", netTotal.toFixed(2));
                                            }, [values.items]);

                                            return (
                                                <Form>
                                                    <div className="row align-items-center g-3 justify-content-end">
                                                        <div className="col-12 col-lg-8 col-md-8 col-sm-8">
                                                            {Object.keys(errors).length > 0 && (
                                                                <div className="alert alert-danger alert-new">
                                                                    <ul className="mb-0">
                                                                        {(() => {
                                                                            const flatten = (err, path = []) => {
                                                                                const msgs = [];
                                                                                if (!err) return msgs;

                                                                                if (typeof err === 'string') {
                                                                                    msgs.push({ path: path.join('.'), message: err });
                                                                                } else if (Array.isArray(err)) {
                                                                                    err.forEach((e, idx) => {
                                                                                        msgs.push(...flatten(e, [...path, idx]));
                                                                                    });
                                                                                } else if (typeof err === 'object') {
                                                                                    for (const [k, v] of Object.entries(err)) {
                                                                                        msgs.push(...flatten(v, [...path, k]));
                                                                                    }
                                                                                }
                                                                                return msgs;
                                                                            };

                                                                            const all = flatten(errors);

                                                                            if (all.length > 0) {
                                                                                const e = all[0]; // 👈 pick the first error only
                                                                                const rowMatch = e.path.match(/^items\.(\d+)\./);
                                                                                if (rowMatch) {
                                                                                    const rowNum = Number(rowMatch[1]) + 1;
                                                                                    return <li><strong>Row {rowNum}:</strong> {e.message}</li>;
                                                                                }
                                                                                return <li>{e.message}</li>;
                                                                            }

                                                                            return null;
                                                                        })()}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-12 col-lg-4 col-md-4 col-sm-4 button-items">
                                                            <button type="button" className="btn btn-danger fa-pull-right" onClick={handleCancel} disabled={isPostButtonDisabled || isSubmitting}><i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Close</button>
                                                            <button
                                                                type="button"
                                                                className="btn btn-success fa-pull-right"
                                                                // onClick={async () => {
                                                                //     setTouched(markAllTouched(values), true);
                                                                //     const validationErrors = await validateForm();

                                                                //     if (Object.keys(validationErrors).length === 0) {
                                                                //         handleSubmit(values, 1); // Post
                                                                //     }
                                                                // }}
                                                                onClick={async () => {
                                                                    setTouched(markAllTouched(values));
                                                                    const errors = await validateForm();

                                                                    if (Object.keys(errors).length > 0) {
                                                                        // toast.error("Please fix all errors before posting.");
                                                                        return;
                                                                    }
                                                                    const result = await Swal.fire({
                                                                        title: "Are you sure you want to Post?",
                                                                        text: "This will post the Purchase Order.",
                                                                        icon: "warning",
                                                                        showCancelButton: true,
                                                                        confirmButtonText: "Post",
                                                                        cancelButtonText: "Cancel"
                                                                    });

                                                                    if (result.isConfirmed) {
                                                                        handleSubmit(values, 1);
                                                                    }
                                                                }}
                                                                disabled={isPostButtonDisabled || isSubmitting} // Disable button if already submitted or submitting
                                                            >
                                                                <i className="bx bxs-save label-icon font-size-16 align-middle me-2"></i>Post
                                                            </button>

                                                            {/* {isEditMode ? (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-warning fa-pull-right"
                                                                    onClick={async () => {
                                                                        setTouched(markAllTouched(values), true);
                                                                        const validationErrors = await validateForm();

                                                                        if (Object.keys(validationErrors).length === 0) {
                                                                            handleSubmit(values, 1); // Update
                                                                        }
                                                                    }}
                                                                >
                                                                    Update
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-info fa-pull-right"
                                                                    onClick={async () => {
                                                                        setTouched(markAllTouched(values), true);
                                                                        const validationErrors = await validateForm();

                                                                        if (Object.keys(validationErrors).length === 0) {
                                                                            handleSubmit(values, 0); // Save
                                                                        }
                                                                    }}
                                                                >
                                                                    Save
                                                                </button>
                                                            )} */}


                                                        </div>
                                                    </div>
                                                    <Row>
                                                        {/* PO No */}
                                                        <Col md={2}>
                                                            <FormGroup>
                                                                <Label>PO No.<span className="text-danger">*</span></Label>
                                                                <Field name="poNo" as={Input} disabled />
                                                            </FormGroup>
                                                        </Col>

                                                        {/* PO Date */}
                                                        <Col md={2}>
                                                            <FormGroup>
                                                                <Label>PO Date<span className="text-danger">*</span></Label>
                                                                <Flatpickr
                                                                    className="form-control"
                                                                    name="poDate"
                                                                    value={values.poDate}
                                                                    onChange={([date]) => {
                                                                        setFieldValue("poDate", date);
                                                                        setFieldTouched("poDate", true);
                                                                    }}
                                                                    options={{ dateFormat: "Y-m-d" }}
                                                                />
                                                            </FormGroup>
                                                        </Col>

                                                        {/* Supplier Dropdown */}
                                                        <Col md={3}>
                                                            <FormGroup>
                                                                <Label>Supplier<span className="text-danger">*</span></Label>
                                                                <Select
                                                                    name="supplier"
                                                                    value={suppliers.find(opt => opt.value === values.supplier) || null}
                                                                    options={suppliers}
                                                                    onChange={async (option) => {
                                                                        const supplierId = option ? Number(option.value) : null;
                                                                        setFieldValue("supplier", supplierId);
                                                                        setFieldTouched("supplier", true);

                                                                        if (supplierId) {
                                                                            const orgId = 1;
                                                                            const branchId = 1;

                                                                            // Fetch currencies for this supplier
                                                                            const currencyRes = await GetSupplierCurrencyList(supplierId, branchId, orgId);
                                                                            if (currencyRes.status) {
                                                                                const currencyOptions = currencyRes.data.map(c => ({
                                                                                    value: c.CurrencyId,
                                                                                    label: c.CurrencyCode
                                                                                }));
                                                                                setCurrencies(currencyOptions);

                                                                                // Reset currency, PR No, items
                                                                                setFieldValue("currency", null);
                                                                                setFieldValue("prNo", []);
                                                                                setFieldValue("items", []);
                                                                            }
                                                                        } else {
                                                                            setCurrencies([]);
                                                                            setFieldValue("currency", null);
                                                                            setFieldValue("prNo", []);
                                                                            setFieldValue("items", []);
                                                                        }
                                                                    }}
                                                                    isClearable
                                                                />
                                                            </FormGroup>
                                                        </Col>

                                                        {/* Currency Dropdown */}
                                                        <Col md={2}>
                                                            <FormGroup>
                                                                <Label>Currency<span className="text-danger">*</span></Label>
                                                                <Select
                                                                    name="currency"
                                                                    value={currencies.find(c => c.value === values.currency) || null}
                                                                    options={currencies}
                                                                    onChange={async (option) => {
                                                                        const currencyId = option ? Number(option.value) : null;
                                                                        setFieldValue("currency", currencyId);
                                                                        setFieldTouched("currency", true);

                                                                        if (values.supplier && currencyId) {
                                                                            const orgId = 1;
                                                                            const branchId = 1;

                                                                            // Fetch PR No based on supplier + currency
                                                                            const prRes = await GetPRNoBySupplierAndCurrency(values.supplier, currencyId, orgId, branchId);
                                                                            if (prRes.status) {
                                                                                const prOptions = prRes.data.map(item => ({
                                                                                    value: item.prid,
                                                                                    label: item.pr_number,
                                                                                    currencyid: item.currencyid,
                                                                                    currencyCode: item.currencyCode
                                                                                }));
                                                                                setPrNo(prOptions);

                                                                                // Reset selected PR and items
                                                                                setFieldValue("prNo", []);
                                                                                setFieldValue("items", []);
                                                                            }
                                                                        } else {
                                                                            setPrNo([]);
                                                                            setFieldValue("prNo", []);
                                                                            setFieldValue("items", []);
                                                                        }
                                                                    }}
                                                                    isClearable
                                                                />
                                                            </FormGroup>
                                                        </Col>

                                                        {/* PR No Dropdown */}
                                                        <Col md={3}>
                                                            <FormGroup>
                                                                <Label>PR No.<span className="text-danger">*</span></Label>
                                                                <Select
                                                                    name="prNo"
                                                                    value={values.prNo || []}
                                                                    options={prNo}
                                                                    isClearable
                                                                    menuPortalTarget={document.body}
                                                                    isMulti={!values.prNo?.some(opt => opt.value === "NA")}
                                                                    isOptionDisabled={(option) => {
                                                                        if (!values.prNo || values.prNo.length === 0 || option.value === "NA") return false;
                                                                        const firstCurrency = values.prNo[0]?.currencyid;
                                                                        return option.currencyid !== firstCurrency;
                                                                    }}
                                                                    onChange={async (selectedOptions) => {
                                                                        setFieldTouched("prNo", true);
                                                                        setFieldTouched("__touched.prNo", true);

                                                                        // Normalize selection
                                                                        const selected = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions].filter(Boolean);
                                                                        const isNASelected = selected.some(opt => opt.value === "NA");
                                                                        const finalSelection = isNASelected
                                                                            ? [{ label: "NA", value: "NA" }]
                                                                            : selected.filter(opt => opt.value !== "NA");

                                                                        // Currency validation across multiple PRs
                                                                        if (finalSelection.length > 1) {
                                                                            const firstCurrency = finalSelection[0]?.currencyid;
                                                                            const invalidPR = finalSelection.find(opt => opt.currencyid !== firstCurrency);

                                                                            if (invalidPR) {
                                                                                await Swal.fire({
                                                                                    icon: "warning",
                                                                                    title: "Currency Mismatch",
                                                                                    text: `PR ${invalidPR.label} has a different currency and cannot be selected.`,
                                                                                });

                                                                                setFieldValue(
                                                                                    "prNo",
                                                                                    finalSelection.filter(opt => opt.currencyid === firstCurrency)
                                                                                );
                                                                                return;
                                                                            }
                                                                        }

                                                                        // ✅ Update selected PR numbers
                                                                        setFieldValue("prNo", finalSelection);

                                                                        // Default row template
                                                                        const defaultRow = {
                                                                            prNo: null,
                                                                            itemName: "",
                                                                            uom: "",
                                                                            qty: 0,
                                                                            unitPrice: 0,
                                                                            discount: 0,
                                                                            taxPercent: 0,
                                                                            taxAmount: 0,
                                                                            amount: 0,
                                                                            vatPercent: 0,
                                                                            netTotal: 0,
                                                                            vatAmount: 0,
                                                                        };

                                                                        // Handle "NA" selection
                                                                        if (isNASelected) {
                                                                            setFieldValue("items", [
                                                                                {
                                                                                    prNo: { label: "NA", value: "NA" },
                                                                                    ...defaultRow,
                                                                                },
                                                                            ]);
                                                                            return;
                                                                        }

                                                                        // 🔹 Otherwise load rows for each selected PR
                                                                        const rows = [];
                                                                        try {
                                                                            const branchid = 1;
                                                                            const orgid = 1;

                                                                            for (const pr of finalSelection) {
                                                                                const response = await GetPrIdDetails(pr.value, orgid, branchid);
                                                                                const data = response;

                                                                                if (data.status && data.data && Array.isArray(data.data.Details)) {
                                                                                    const details = data.data.Details.map(detail => ({
                                                                                        PRDId: detail.PRDId,
                                                                                        prNo: pr,
                                                                                        itemGroupId: {
                                                                                            value: detail.ItemGroupId,
                                                                                            label: detail.groupname
                                                                                        },
                                                                                        itemName: {
                                                                                            value: detail.ItemId,
                                                                                            label: detail.itemname
                                                                                        },
                                                                                        uom: getUOMLabelById(detail.UOM),
                                                                                        uom_id: detail.UOM,
                                                                                        qty: detail.Qty,
                                                                                        unitPrice: detail.UnitPrice ?? 0,
                                                                                        discount: detail.DiscountValue ?? 0,
                                                                                        taxPercent: detail.TaxPerc ?? 0,
                                                                                        taxAmount: detail.TaxValue ?? 0,
                                                                                        amount: detail.SubTotal ?? 0,
                                                                                        netTotal: detail.NetTotal ?? 0,
                                                                                        vatPercent: detail.VatPerc ?? 0,
                                                                                        vatAmount: detail.VatValue ?? 0,
                                                                                        taxSign: detail.Taxcalctype === 0 ? '+' : '-',
                                                                                    }));

                                                                                    rows.push(...details);
                                                                                }
                                                                            }

                                                                            // ✅ Set PR items
                                                                            setFieldValue("items", rows);
                                                                        } catch (error) {
                                                                            console.error("Error fetching PR items:", error);
                                                                            setFieldValue("items", []);
                                                                        }
                                                                    }}
                                                                    onBlur={() => {
                                                                        setFieldTouched("prNo", true);
                                                                        setFieldTouched("__touched.prNo", true);
                                                                    }}
                                                                />
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>

                                                    {/* <Row>
                                                        <Col md={2}>
                                                            <FormGroup>
                                                                <Label>PO No.<span className="text-danger">*</span></Label>
                                                                <Field name="poNo" as={Input} disabled />
                                                            </FormGroup>
                                                        </Col>

                                                        <Col md={2}>
                                                            <FormGroup>
                                                                <Label>PO Date<span className="text-danger">*</span></Label>
                                                                <Flatpickr
                                                                    className="form-control"
                                                                    name="poDate"
                                                                    value={values.poDate}
                                                                    onChange={([date]) => setFieldValue("poDate", date)}
                                                                />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>Supplier<span className="text-danger">*</span></Label>
                                                                <Select
                                                                    name="supplier"
                                                                    value={suppliers.find(opt => opt.value === values.supplier) || null}
                                                                    options={suppliers}
                                                                    onChange={async (option) => {
                                                                        const supplierId = option ? Number(option.value) : null;
                                                                        setFieldValue("supplier", supplierId);

                                                                        if (supplierId) {
                                                                            const orgId = 1;
                                                                            const branchId = 1;
                                                                            const prNoList = await GetCommonProcurementPRNoList(supplierId, orgId, branchId);
                                                                            if (prNoList.status) {
                                                                                const options = prNoList.data.map(item => ({
                                                                                    value: item.prid,
                                                                                    label: item.pr_number,
                                                                                }));
                                                                                setPrNo(options);
                                                                            }
                                                                        }
                                                                    }}
                                                                    isClearable
                                                                />

                                                            </FormGroup>
                                                        </Col>

                                                        <Col md={4}>
                                                            <FormGroup>
                                                                <Label>PR No.<span className="text-danger">*</span></Label>
                                                                <Select
                                                                    name="prNo"
                                                                    value={values.prNo}
                                                                    options={[
                                                                        { label: "NA", value: "0" },
                                                                        ...prNo
                                                                    ]}
                                                                    onChange={async (selectedOptions) => {
                                                                        const selected = Array.isArray(selectedOptions) ? selectedOptions : [selectedOptions];
                                                                        const isNA = selected.some(opt => opt.value === "NA");
                                                                        const finalSelect = isNA
                                                                            ? [{ label: "NA", value: "NA" }]
                                                                            : selected.filter(opt => opt.value !== "NA");

                                                                        setFieldValue("prNo", finalSelect);

                                                                        if (isNA) {
                                                                            setFieldValue("items", [{
                                                                                prNo: { label: "NA", value: "NA" },
                                                                                itemName: "",
                                                                                uom: "",
                                                                                qty: 0,
                                                                                unitPrice: 0,
                                                                                discount: 0,
                                                                                taxPercent: 0,
                                                                                taxAmount: 0,
                                                                                amount: 0,
                                                                            }]);
                                                                            return;
                                                                        }
                                                                        const prid = finalSelect[0]?.value;
                                                                        if (prid) {
                                                                            try {
                                                                                const branchid = 1;
                                                                                const orgid = 1;
                                                                                const response = await GetPrIdDetails(prid, orgid, branchid);
                                                                                const data = response;

                                                                                if (data.status && data.data && Array.isArray(data.data.Details) && data.data.Details.length > 0) {
                                                                                    const rows = data.data.Details.map(detail => ({
                                                                                        prNo: finalSelect[0],           // selected PR No object
                                                                                        itemName: getItemNameById(detail.ItemId),
                                                                                        uom: getUOMLabelById(detail.UOM),
                                                                                        qty: detail.Qty,
                                                                                        unitPrice: detail.UnitPrice,
                                                                                        discount: detail.DiscountValue,
                                                                                        taxPercent: detail.TaxPerc,
                                                                                        taxAmount: detail.TaxValue,
                                                                                        amount: detail.NetTotal,
                                                                                    }));

                                                                                    setFieldValue("items", rows);
                                                                                } else {
                                                                                    setFieldValue("items", []);
                                                                                }
                                                                            } catch (error) {
                                                                                console.error("Error fetching PR items:", error);
                                                                                setFieldValue("items", []);
                                                                            }
                                                                        }
                                                                    }}
                                                                />
                                                            </FormGroup>
                                                        </Col>
                                                    </Row> */}
                                                    <div style={{ overflowX: "auto" }}>
                                                        <Table className="table mb-0" style={{ minWidth: "1800px" }}>
                                                            <thead style={{ backgroundColor: "#3e90e2" }}>
                                                                <tr>
                                                                    <th className="text-center" style={{ width: "10%" }}>PR No.</th>
                                                                    <th className="text-center" style={{ width: "13%" }}>Item Group</th>
                                                                    <th className="text-center" style={{ width: "15%" }}>Item Name</th>

                                                                    <th className="text-center" style={{ width: "6%" }}>Qty</th>
                                                                    <th className="text-center" style={{ width: "6%" }}>UOM</th>
                                                                    <th className="text-center" style={{ width: "6%" }}>Unit Price</th>
                                                                    <th className="text-center" style={{ width: "6%" }}>Discount</th>
                                                                    <th className="text-center" style={{ width: "6%" }}>Tax %</th>
                                                                    {/* <th className="text-center" style={{ width: "6%" }}>Tax (+/-)</th> */}
                                                                    <th className="text-center" style={{ width: "6%" }}>Tax Amt</th>
                                                                    <th className="text-center" style={{ width: "6%" }}>VAT %</th>
                                                                    <th className="text-center" style={{ width: "6%" }}>VAT Amt</th>
                                                                    <th className="text-center" style={{ width: "8%" }}>Total Amt</th>
                                                                </tr>
                                                            </thead>
                                                            <FieldArray name="items">
                                                                {({ push, remove }) => (
                                                                    <>
                                                                        <tbody>
                                                                            {values.items.map((item, i) => (
                                                                                <tr key={i}>

                                                                                    {/* Memo No */}
                                                                                    <td className="text-center align-middle">
                                                                                        {item.prNo?.label || ""}
                                                                                    </td>

                                                                                    {/* Item Group */}
                                                                                    <td className="align-middle">
                                                                                        {item.itemGroupId?.label || "-"}
                                                                                    </td>

                                                                                    {/* Item Name */}
                                                                                    <td className="align-middle">
                                                                                        {item.itemName?.label || "-"}
                                                                                    </td>



                                                                                    {/* Qty */}
                                                                                    <td className="text-center align-middle">
                                                                                        {(item.qty || 0).toLocaleString()}
                                                                                    </td>
                                                                                    {/* UOM */}
                                                                                    <td className="text-center align-middle">
                                                                                        {item.uom?.label || item.uom || "-"}
                                                                                    </td>
                                                                                    {/* Unit Price */}
                                                                                    <td className="text-end align-middle">
                                                                                        {parseFloat(item.unitPrice)?.toLocaleString('en-US', {
                                                                                            style: 'decimal',
                                                                                            minimumFractionDigits: 2
                                                                                        }) || "0.00"}
                                                                                    </td>

                                                                                    {/* Discount */}
                                                                                    <td className="text-end align-middle">
                                                                                        {/* {item.discount || "0.00"} */}
                                                                                        {parseFloat(item.discount || 0).toLocaleString("en-US", {
                                                                                            style: "decimal",
                                                                                            minimumFractionDigits: 2,
                                                                                        })}
                                                                                    </td>

                                                                                    {/* Tax % */}
                                                                                    <td className="text-end align-middle">
                                                                                        {item.taxPercent || "0"}
                                                                                    </td>

                                                                                    {/* Tax Sign */}
                                                                                    {/* <td className="text-center align-middle">
                                                                                        {item.taxSign || "+"}
                                                                                    </td> */}

                                                                                    {/* Tax Amount */}
                                                                                    <td className="text-end align-middle">
                                                                                        {parseFloat(item.taxAmount)?.toLocaleString('en-US', {
                                                                                            style: 'decimal',
                                                                                            minimumFractionDigits: 2
                                                                                        }) || "0.00"}
                                                                                    </td>

                                                                                    {/* VAT % */}
                                                                                    <td className="text-end align-middle">
                                                                                        {item.vatPercent || "0"}
                                                                                    </td>

                                                                                    {/* VAT Amount */}
                                                                                    <td className="text-end align-middle">
                                                                                        {parseFloat(item.vatAmount)?.toLocaleString('en-US', {
                                                                                            style: 'decimal',
                                                                                            minimumFractionDigits: 2
                                                                                        }) || "0.00"}
                                                                                    </td>

                                                                                    {/* Total Amount */}
                                                                                    <td className="text-end align-middle">
                                                                                        {parseFloat(item.netTotal)?.toLocaleString('en-US', {
                                                                                            style: 'decimal',
                                                                                            minimumFractionDigits: 2
                                                                                        }) || "0.00"}
                                                                                    </td>
                                                                                </tr>
                                                                            ))}
                                                                        </tbody>

                                                                        <tfoot>
                                                                            <tr>
                                                                                <td colSpan={8} rowSpan={5}>
                                                                                </td>
                                                                                <td colSpan={2} className="align-middle text-end">
                                                                                    <strong>Sub Total</strong>
                                                                                </td>
                                                                                {/* <td className="align-middle text-end">SGD</td> */}
                                                                                <td className="align-middle text-end">
                                                                                    {Array.isArray(values?.prNo) && values.prNo.length > 0
                                                                                        ? values.prNo[0].currencyCode
                                                                                        : "—"}
                                                                                </td>

                                                                                <td className="align-middle text-end">{parseFloat(values.subTotal)?.toLocaleString('en-US', {
                                                                                    style: 'decimal',
                                                                                    minimumFractionDigits: 2
                                                                                })}</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td colSpan={2} className="align-middle text-end">
                                                                                    <strong>Discount</strong>
                                                                                </td>
                                                                                <td className="align-middle text-end">
                                                                                    {Array.isArray(values?.prNo) && values.prNo.length > 0
                                                                                        ? values.prNo[0].currencyCode
                                                                                        : "—"}
                                                                                </td>
                                                                                <td className="align-middle text-end">{parseFloat(values.discountValue)?.toLocaleString('en-US', {
                                                                                    style: 'decimal',
                                                                                    minimumFractionDigits: 2
                                                                                })}</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td colSpan={2} className="align-middle text-end">
                                                                                    {/* <strong>Tax (+/-)</strong> */}
                                                                                    <strong>Tax</strong>
                                                                                </td>
                                                                                <td className="align-middle text-end">
                                                                                    {Array.isArray(values?.prNo) && values.prNo.length > 0
                                                                                        ? values.prNo[0].currencyCode
                                                                                        : "—"}
                                                                                </td>
                                                                                <td className="align-middle text-end">{parseFloat(values.taxValue)?.toLocaleString('en-US', {
                                                                                    style: 'decimal',
                                                                                    minimumFractionDigits: 2
                                                                                })}</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td colSpan={2} className="align-middle text-end">
                                                                                    <strong>VAT</strong>
                                                                                </td>
                                                                                <td className="align-middle text-end">
                                                                                    {Array.isArray(values?.prNo) && values.prNo.length > 0
                                                                                        ? values.prNo[0].currencyCode
                                                                                        : "—"}
                                                                                </td>
                                                                                <td className="align-middle text-end">{parseFloat(values.vatValue)?.toLocaleString('en-US', {
                                                                                    style: 'decimal',
                                                                                    minimumFractionDigits: 2
                                                                                })}</td>
                                                                            </tr>
                                                                            <tr>
                                                                                <td colSpan={2} className="align-middle text-end">
                                                                                    <strong>Net Total</strong>
                                                                                </td>
                                                                                <td className="align-middle text-end">
                                                                                    {Array.isArray(values?.prNo) && values.prNo.length > 0
                                                                                        ? values.prNo[0].currencyCode
                                                                                        : "—"}
                                                                                </td>
                                                                                <td className="align-middle text-end">{parseFloat(values.netTotal)?.toLocaleString('en-US', {
                                                                                    style: 'decimal',
                                                                                    minimumFractionDigits: 2
                                                                                })}</td>
                                                                            </tr>
                                                                        </tfoot>
                                                                    </>
                                                                )}
                                                            </FieldArray>
                                                        </Table>
                                                    </div>
                                                </Form>
                                            );
                                        }}
                                    </Formik>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default ProcurementsAddPurchaseOrder;