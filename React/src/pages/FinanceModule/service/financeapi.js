import { get, post, put } from "../../../helpers/api_helper";
import axios from "axios";
import { saveAs } from "file-saver";
import Swal from 'sweetalert2';
import { toast } from 'react-toastify';
import { PYTHON_API_URL } from "../../../common/pyapiconfig";

const transformData = (data, valueParam, labelParam) => {
    return data.map(item => ({
        ...item,
        value: item[valueParam],
        label: item[labelParam] || "-"
    }));
};

//#region GetFilteredCylinders
export const getARByCustomer = async ({ customerId, orgId, branchId }) => {
    try {
        const response = await get(`/AR/get-by-id?customerid=${customerId}&orgId=${orgId}&branchId=${branchId}`);
        return response;
    } catch (error) {
        console.error("API error:", error);
        return { status: false, data: [] };
    }
};

export const getARBook = async (customerId, orgId, branchId, fromdate, todate) => {
    try {
        const response = await get(`${PYTHON_API_URL}/AR/getARBook?customer_id=${customerId}&orgid=${orgId}&branchid=${branchId}&from_date=${fromdate}&to_date=${todate}`);
        return response;
    } catch (error) {
        console.error("API error:", error);
        return { status: false, data: [] };
    }
};

export const getCustomerAddress = async (customerId) => {
    try {
        const response = await get(`${PYTHON_API_URL}/AR/getCustomerAddress?customer_id=${customerId}`);
        return response?.data || {};
    } catch (error) {
        console.error("getCustomerAddress error:", error);
        return {};
    }
};

export const createAR = async (payload) => {
    try {
        console.log("Sending payload:", payload);

        // --- SAFETY NET: Redirect to Invoice Posting if invoiceId exists ---
        if (payload.invoiceId) {
            return await postInvoiceToAR(payload);
        }

        // Use PYTHON_API_URL for Python backend
        const response = await axios.post(`${PYTHON_API_URL}/AR/create`, payload);

        if (response.data?.status === "success" || response.data?.status === true) {
            return response.data;
        } else {
            if (response.data?.statusCode === 1) {
                toast.error(response.data.message || "An error occurred");
                return null;
            }
            return response.data;
        }

    } catch (error) {
        console.error('createAR Error:', error);
        throw error;
    }
};

// --- NEW FUNCTION FOR POSTING INVOICES TO AR BOOK ---
export const postInvoiceToAR = async (payload) => {
    try {
        console.log("Posting Invoice to AR:", payload);
        // Ensure this endpoint matches your Python router prefix
        const response = await axios.post(`${PYTHON_API_URL}/AR/post-invoice`, payload);

        if (response.data?.status === "success") {
            return response.data;
        } else {
            throw new Error(response.data?.detail || "Failed to post invoice");
        }
    } catch (error) {
        console.error("postInvoiceToAR Error:", error);
        toast.error(error.response?.data?.detail || "Failed to post invoice to AR Book");
        throw error;
    }
};

export const GetCustomerFilter = async (branchId = 1, searchtext) => {
    try {
        const response = await get(`/ordermngmaster/GetCustomerFilter?branchid=${branchId}&searchtext=${searchtext}`);
        if (response?.status) {
            return transformData(response.data, "CustomerID", "CustomerName");
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const getBankReconciliation = async ({ orgid, branchid, fromDate, toDate }) => {
    const params = new URLSearchParams();
    params.append("orgid", orgid);
    params.append("branchid", branchid);
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);

    const response = await get(`/BankReconciliation/list?${params.toString()}`);
    return response;
};

export const getsalesreport = async (orgid, customerid, fromDate, toDate, gasid) => {
    const params = new URLSearchParams();
    params.append("orgid", orgid);
    params.append("customerid", customerid);
    params.append("gasid", gasid);
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);

    const response = await get(`/FinanceReport/SalesReport?${params.toString()}`);
    return response;
};

export const getProfitLoss = async (orgid, currencyid, fromDate, toDate) => {
    const params = new URLSearchParams();
    params.append("orgid", orgid);
    params.append("currencyid", currencyid);

    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);

    const response = await get(`/FinanceReport/ProfitAndLossReport?${params.toString()}`);
    return response;
};

export const updateAR = async (payload) => {
    try {
        let response;
        response = await axios.put(`${PYTHON_API_URL}/AR/update`, payload);

        console.log("updateAR response", response);
        if (response.data?.status === "success" || response.data?.status === true) {
            return response.data;
        } else if (response.data?.statusCode === 400) {
            return response.data;
        } else {
            throw new Error(response.data?.message || 'Failed to updateAR');
        }
    } catch (error) {
        console.error('updateAR Error:', error);
        throw error;
    }
};