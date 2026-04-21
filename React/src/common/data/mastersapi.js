import { get, post, put } from "../../helpers/api_helper";
import axios from "axios";
import { saveAs } from "file-saver";
import Swal from 'sweetalert2';
import { PYTHON_API_URL } from "../pyapiconfig";

const transformData = (data, valueParam, labelParam) => {

    return data.map(item => ({
        ...item,
        value: item[valueParam],
        label: item[labelParam] || "-"
    }));
};
import { toast } from 'react-toastify';
export const fetchGasList = async (branchId, sq_Id, SearchText = "%") => {
    try {

        const response = await get(`/OrderMngMaster/GetGasCode?BranchId=${branchId}&SearchText=${SearchText}&Sqid=${sq_Id}`);
        if (response?.status) {
            return transformData(response.data, "GasCodeId", "GasCode");
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const SaveSalesCommission = async (payload) => {
    try {
        let response;
        if (payload.Header && payload.Header.Id) {
            response = await put("/SalesCommission/update", payload);
        } else {
            response = await post("/SalesCommission/create", payload);
        }
        return response;
    } catch (error) {
        console.error("Error saving sales commission:", error);
        throw error;
    }
};

export const GetAllSalesCommissionListing = async ({ customerId, gasId }) => {
    try {
        const queryParams = new URLSearchParams();
        queryParams.append("branchId", "1");
        queryParams.append("orgId", "1");
        if (customerId) queryParams.append("customerId", customerId);
        if (gasId) queryParams.append("gasId", gasId);

        const baseUrl = "/SalesCommission/get-all";
        const fullUrl = queryParams.toString()
            ? `${baseUrl}?${queryParams.toString()}`
            : baseUrl;

        const response = await get(fullUrl);
        return response;
    } catch (error) {
        console.error("API error fetching sales commissions:", error);
        return { status: false, data: [] };
    }
};

export const GetSalesCommissionById = async (id) => {
    try {
        const response = await get(`/SalesCommission/get-by-id/${id}`);
        return response;
    } catch (error) {
        console.error("API error fetching sales commission by ID:", error);
        throw error;
    }
};

export const UpdateSalesCommissionStatus = async (payload) => {
    try {
        const response = await put("/SalesCommission/toggle-actve-status", payload);
        return response;
    } catch (error) {
        console.error("API error updating sales commission status:", error);
        throw error;
    }
};


// 🟢 NEW: Fetches from Python API -> DB_NAME_USER_NEW
export const fetchGasListDSI = async (branchId, sq_Id, SearchText = "%") => {
    try {
        // 🟢 FIX: Change endpoint from '/GetGasItemFilter' to '/GetGasItems'
        const response = await axios.get(`${PYTHON_API_URL}/pyapi/GetGasItems`);

        if (response.data && response.data.status) {
            // Map the Python response (Id) to the Frontend expectation (GasCodeId)
            return response.data.data.map(item => ({
                GasCodeId: item.Id,   // Maps ID 1928 (Correct) to GasCodeId
                GasName: item.GasName
            }));
        } else {
            console.error("Failed to fetch gas codes from Python API");
            return [];
        }
    } catch (error) {
        console.error("Error fetching gas list:", error);
        return [];
    }
};

export const getchGasList = async (branchId, SearchText = "%") => {
    try {
        const response = await get(`/OrderMngMaster/GetGasCode?BranchId=${branchId}&SearchText=${SearchText}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
//#region GetAllCurrencies
export const GetAllCurrencies = async ({ currencyCode, currencyName }) => {

    try {
        const queryParams = new URLSearchParams();
        if (currencyCode) queryParams.append("curCode", currencyCode);
        if (currencyName) queryParams.append("curName", currencyName);

        const baseUrl = "/Currency";
        const fullUrl = queryParams.toString()
            ? `${baseUrl}?${queryParams.toString()}`
            : baseUrl;

        const response = await get(fullUrl);
        return response;
    } catch (error) {
        console.error("API error:", error);
        return { status: false, data: [] };
    }
};

//#endregion
//#endregion



//#region toggleTab1
export const toggleTab1 = async (Contactstatus) => {
    try {
        const response = await put('/MasterGas/ToogleActiveStatus', Contactstatus);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to toggle gas active status");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
//#endregion

//#region toggleTab2
export const toggleTab2 = async (Addressstatus) => {
    try {
        const response = await put('/MasterGas/ToogleActiveStatus', Addressstatus);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to toggle gas active status");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
//#endregion



//#region GetFilteredCylinders
export const GetFilteredCylinders = async ({ fromDate, toDate, name }) => {

    try {
        const queryParams = new URLSearchParams();

        queryParams.append("fromDate", fromDate || "0000-00-00");
        queryParams.append("toDate", toDate || "9999-12-31");

        queryParams.append("cylinderName", name ?? "");


        const response = await get(`/MasterCylinder/GetAllCylinderListing?${queryParams.toString()}`);
        return response;
    } catch (error) {
        console.error("API error:", error);
        return { status: false, data: [] };
    }
};

//#endregion

//#region  SaveTab2GetById
export const SaveTab2GetById = async (customerId, branchId = 1) => {
    try {
        const response = await get(`/MasterCustomer/GetByID?customerID=${customerId}&branchId=${branchId}`);

        if (response.data) {

            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch customer details");
        }
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};
//#endregion

//#region  SaveTab3GetById
export const SaveTab3GetById = async (customerId, branchId = 1) => {
    try {
        const response = await get(`/MasterCustomer/GetByID?customerID=${customerId}&branchId=${branchId}`);

        if (response.data) {

            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch customer details");
        }
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};
//#endregion

//#region  SaveTab3list
export const SaveTab3list = async (customerId, branchId = 1) => {
    try {
        const response = await get(`/MasterCustomer/GetList?customerID=${customerId}&branchId=${branchId}`);

        if (response.data) {

            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch customer details");
        }
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};
//#endregion

//#region  toggleChangeCustomerStatus
export const ToggleChangeCustomerStatus = async (payload) => {
    try {
        const response = await put("/MasterCustomer/toggle-actve-status", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to toggle status");
        }
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};
//#endregion

//#region  SaveTab3Toggle
export const toggleChangeContactStatus = async (payload) => {
    try {
        const response = await put("/MasterCustomer/toggle-actve-status", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to toggle status");
        }
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};
//#endregion

//#region  SaveTab3Toggle
export const toggleChangeAddressStatus = async (payload) => {
    try {
        const response = await put("/MasterCustomer/toggle-actve-status", payload);

        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to toggle status");
        }
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};
//#endregion

//#region  SaveTab1GetById
//#region  CreateMasterUser

export const SaveTab1GetById = async (customerId, branchId = 1) => {
    try {
        const response = await get(`/MasterCustomer/GetByID?customerID=${customerId}&branchId=${branchId}`);

        if (response.data) {

            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch customer details");
        }
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};

//#region  CreateMasterUser

//#region  SaveTab1List

export const SaveTab1List = async (BranchId = 1) => {

    try {
        const response = await get(`/MasterCustomer/get-list?BranchId=${BranchId}`);
        if (response?.status) {
            console.log(response)
            return transformData(response.data, 'id', 'label', 'code');
        } else {
            throw new Error(response?.message || "Failed to get volume data");
        }
    } catch (error) {
        console.error("Error fetching volume data:", error);
        return null;
    }
};
//#endregion

//#region  fetchTab2ContactList
export const fetchTab2ContactList = async (customerId, contactId) => {

    try {

        const tabId = 2;

        const response = await get(`/MasterCustomer/get-list-tab?tabId=${tabId}&customerId=${customerId}&contactId=${contactId}`);

        if (response?.status) {
            console.log("Contact list fetched:", response);
            return transformData(response.data);
        } else {
            throw new Error(response?.message || "Failed to fetch contact list.");
        }
    } catch (error) {
        console.error("Error fetching contact list:", error);
        return null;
    }
};

//#endregion

//#region
export const fetchTab1CutomerList = async (customerId) => {
    try {
        const tabId = 1;
        const branchId = 1;
        const response = await get(`/MasterCustomer/GetByID?customerID=${customerId}&tabId=${tabId}&branchid=${branchId}`);

        if (response) {
            return response.data;
        } else {
            throw new Error(response?.data?.message || "Failed to fetch customer data.");
        }
    } catch (error) {
        console.error("Error fetching customer data:", error);
        return null;
    }
};


//#endregion

//#region  SaveTab1List

export const fetchTab3AddressList = async (sendCustomerId, sendContactId) => {

    try {
        const tabId = 3;
        // const customerId = contactData.Id;
        // const contactId = contactData.ContactId;
        // const addressId = contactData.AddressId;
        const addressId = 0;

        const response = await get(`/MasterCustomer/get-list-tab?tabId=${tabId}&customerId=${sendCustomerId}&contactId=${sendContactId}&addressId=${addressId}`);

        if (response) {
            console.log("Contact list fetched:", response);
            return transformData(response.data);
        } else {
            throw new Error(response?.message || "Failed to fetch contact list.");
        }
    } catch (error) {
        console.error("Error fetching contact list:", error);
        return null;
    }
};
//#endregion

//#endregion SaveTab1
export const SaveTab1 = async (payload) => {
    try {
        console.log("Sending payload:", payload);
        const response = await post("/MasterCustomer/create-update", payload);

        if (response?.statusCode === 0) {
            return response;
        } else if (response?.statusCode === 1) {
            toast.error(response.message || "An error occurred");
            return null;
        } else {
            throw new Error(response?.message || 'Failed to save customer');
        }

    } catch (error) {
        console.error('SaveTab1 Error:', error);
        throw error;
    }
};

//#endregion
//#region SaveTab1Doc
export const SaveTab1Doc = async (customerId, file, branchId, userId) => {
    try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("CustomerId", String(customerId || ""));
        formData.append("BranchId", String(branchId || ""));
        formData.append("UserId", String(userId || ""));

        const response = await axios.post(
            `${BASE_URL}/MasterCustomer/Upload-doc`,
            formData,
            {
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            }
        );
        return response;
    } catch (err) {
        console.error("Error uploading file:", err.message);
        throw err;
    }
};

//#endregion

//#endregion SaveTab2
export const SaveTab2 = async (payload) => {

    try {
        console.log("Sending payload:", payload);
        const response = await post("/MasterCustomer/create-update", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || 'Failed to save cylinder');
        }
    } catch (error) {
        console.error('CreateMasterUser Error:', error);
        throw error;
    }

};
//#endregion

//#endregion SaveTab3
export const SaveTab3 = async (payload) => {

    try {
        console.log("Sending payload:", payload);
        const response = await post("/MasterCustomer/create-update", payload);

        if (response.status) {
            return response;
        } else if (response.statusCode == 2) {
            toast.error(response.message);
            return;
        } else {
            throw new Error(response?.message || 'Failed to save address');
        }
    } catch (error) {
        console.error('Address Error:', error);
        throw error;
    }

};
//#endregion

//#endregion saveOrUpdateCylinder
export const saveOrUpdateCylinder = async (payload) => {

    try {
        let response;

        if (payload.cylinder?.cylinderid) {
            response = await put('/MasterCylinder/Update', payload);
        } else {
            response = await post('/MasterCylinder/create', payload);
        }
        console.log("add-cyliner response", response);
        if (response?.statusCode === 0) {
            return response;
        } else if (response?.statusCode === 400) {
            return response;
        } else {
            throw new Error(response?.message || 'Failed to create or update cylinder');
        }
    } catch (error) {
        console.error('CreateMasterUser Error:', error);
        throw error;
    }

};
//#endregion
//#region  CylinderSizeList

export const cylinderSizeList = async (BranchId = 1) => {

    try {
        const response = await get(`/OrderMngMaster/get-cylinder-size?BranchId=${BranchId}`);
        if (response?.status) {
            console.log(response)
            return transformData(response.data, 'id', 'label', 'code');
        } else {
            throw new Error(response?.message || "Failed to get volume data");
        }
    } catch (error) {
        console.error("Error fetching volume data:", error);
        return null;
    }
};
//#endregion

//#region  GetContactName

export const GetContactName = async (customerId) => {

    try {
        const response = await get(`/OrderMngMaster/get-contact-name?CustomerId=${customerId}`);

        if (response?.status) {
            console.log(response)
            return transformData(response.data, 'contactId', 'contactName', 'customerId');
        } else {
            throw new Error(response?.message || "Failed to get volume data");
        }
    } catch (error) {
        console.error("Error fetching volume data:", error);
        return null;
    }
};
//#endregion


//#region
export const UpdateCylinderStatus = async (payload) => {
    try {
        let isActive;
        if (payload.isActive) {
            isActive = true;
        } else {
            isActive = false;
        }

        const formattedPayload = {
            id: payload.cylinderid,
            isActive: isActive
        };


        const response = await put("/MasterCylinder/ToogleActiveStatus", formattedPayload);
        return response;
    } catch (error) {
        console.error("Error updating user status:", error);
        throw error;
    }
};
//#end region
//#region  GetCylinderById
export const GetCylinderById = async (cylinderID, branchId = 1) => {
    try {
        const response = await get(`/MasterCylinder/GetByID?cylinderID=${cylinderID}&branchId=${branchId}`);

        if (response.data) {

            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch User details");
        }
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};

//#region  CreateMasterUser
export const CreateMasterUser = async (createUser) => {
    try {
        const response = await post('/MasterUsers/create-update', createUser);
        console.log('API Response:', response);
        if (response?.statusCode === 200) {
            return response;
        } else if (response?.statusCode === 400) {
            console.error('Bad Request: ', response);
            return response;
        } else {
            throw new Error(response?.message || 'Failed to create user');
        }
    } catch (error) {
        console.error('CreateMasterUser Error:', error);
        throw error;
    }
};


//#region  CreateMasterUser
export const Passwordupdate = async (createUser) => {
    try {
        const response = await post('/MasterUsers/update-password', createUser);
        console.log('API Response:', response);

        return response;

    } catch (error) {
        console.error('CreateMasterUser Error:', error);
        throw error;
    }
};

//#endregion Get All Access Right
export const GetAllAccessRight = async (filter) => {
    try {
        const response = await get(`/MasterRoles/getlist?${queryParams}`);

        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch users");
        }
    } catch (error) {
        console.error("Error fetching users:", error);
        return { status: false, data: [], error };
    }
};
//#endregion
//#endregion
//#region  Mater Get All User
export const GetAllUsers = async (filter) => {
    try {
        const queryParams = new URLSearchParams({
            ProdId: filter.ProdId,
            FromDate: filter.FromDate,
            ToDate: filter.ToDate,
            BranchId: filter.BranchId,
            UserName: filter.UserName

        }).toString();

        console.log("Request URL =>", `/MasterUsers/GetList?${queryParams}`);

        const response = await get(`/MasterUsers/getlist?${queryParams}`);

        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch users");
        }
    } catch (error) {
        console.error("Error fetching users:", error);
        return { status: false, data: [], error };
    }
};
//#endregion

//#region  GetUserById
export const GetUserById = async (userId, branchId) => {
    try {
        const response = await get(`/MasterUsers/getbyId?userID=${userId}&branchId=${branchId}`);
        if (response.data?.masterUser) {

            return response.data.masterUser;
        } else {
            throw new Error(response?.message || "Failed to fetch User details");
        }
    } catch (error) {
        console.error("Error:", error);
        throw error;
    }
};



//#endregion
//#region UpdateStatus
export const UpdateStatus = async (payload) => {
    try {

        const formattedPayload = {
            userId: payload.userId,
            remark: payload.remark?.trim() || "",
            isActive: Boolean(payload.isActive),
            branchId: 1
        };


        const response = await post("/MasterUsers/update-status", formattedPayload);
        return response;
    } catch (error) {
        console.error("Error updating user status:", error);
        throw error;
    }
};
//#endregion
//#region MasterUnits - GetAllUnits
export const GetAllUnits = async (filter) => {
    try {
        const queryParams = new URLSearchParams();
        if (filter.UnitsCode?.trim()) {
            queryParams.append("unitsCode", filter.UnitsCode.trim());
        }
        console.log("Request URL =>", `/Units/get-all?${queryParams}`);
        const response = await get(`/Units/get-all?${queryParams}`);
        console.log(response);
        if (response?.status) { return response; }
        else {
            throw new Error(response?.message || "Failed to fetch Users");
        }

    }
    catch (error) {
        console.error("Error fetching Users:", error);
        return { status: false, data: [], error };
    }
}
//#endregion
//#region Create/Update Units
export const SaveUnits = async (unit) => {
    try {

        console.log("unit=", unit);
        let response;
        if (unit.header.UOMId && unit.header.UOMId > 0) {
            console.log("Request URL =>", `/Units/${unit.header.UOMId}`);
            response = await put('/Units/update', unit);
        }
        else {
            response = await post('/Units/create', unit);
        }
        if (response?.status) {
            return response;
        }
        else {
            return response;
            throw new Error(response?.message || "Save Units Failed!");
        }
    }
    catch (error) {
        console.error("Error Saving Units:", error);
        return { status: false, message: error.message || "Unknown error" };
    }
};
//#endregion

//#region MasterPaymentMethod - GetAllPaymentMethod
export const GetAllPaymentMethods = async (filter) => {

    try {
        const queryParams = new URLSearchParams();
        if (filter.PaymentMethodCode?.trim()) {
            queryParams.append("paymethodcode", filter.PaymentMethodCode.trim());
        }
        console.log("Request URL =>", `/PaymentMethod/get-all?${queryParams}`);
        const response = await get(`/PaymentMethod/get-all?${queryParams}`);
        console.log(response);
        if (response?.status) { return response; }
        else {
            throw new Error(response?.message || "Failed to fetch Units", response);
        }

    }
    catch (error) {
        console.error("Error fetching Units:", error);
        return { status: false, data: [], error };
    }
}
//#endregion
//#region Create/Update Methods
export const SaveMethods = async (method) => {
    try {

        console.log("PayMethod =>", method);

        let response;
        const isUpdate = method.header?.PaymentMethodId > 0;

        if (isUpdate) {
            console.log("Request URL =>", `/PaymentMethod/update`);
            response = await put('/PaymentMethod/update', method);
        } else {
            console.log("Request URL =>", '/PaymentMethod/create');
            response = await post('/PaymentMethod/create', method);
        }

        console.log("Save method response:", response);

        if (response?.status === true || response?.status === true || response?.data?.status) {
            return response;
        } else {
            throw new Error(response?.data?.message || "Save Method failed");
        }
    } catch (error) {
        console.error("Error Saving Method:", error);
        return {
            status: false,
            message: error.message || "Unknown error occurred",
        };
    }
};
//#endregion

//#region GetAllPaymentTerm
export const GetAllPaymentTerm = async (filter) => {

    try {
        const queryParams = new URLSearchParams();
        if (filter.PaymentTermCode?.trim()) {
            queryParams.append("paytermcode", filter.PaymentTermCode.trim());
        }
        const response = await get(`/PaymentTerm/get-all?${queryParams}`);
        if (response?.status) {
            return response;
        }
        else {
            throw new error(response?.message || "Error Getting All Pay Terms!");
        }

    }
    catch (error) {
        console.log("GetAllPaymentTerm Error : ", error);
        return { status: false, data: [], error };
    }
};
//#endregion
//#region SaveTerms
export const SaveTerms = async (paymentTerm) => {

    try {
        let response;
        console.log(paymentTerm);
        if (paymentTerm.header.DueDays === null) paymentTerm.header.DueDays = "";

        if (paymentTerm.header.PaymentTermId &&
            paymentTerm.header.PaymentTermId > 0) {
            console.log(`Updating Payment Term: /PaymentTerm/update`, paymentTerm);
            response = await put(`/PaymentTerm/update`, paymentTerm);
            console.log(response);
        }
        else {
            console.log(`Creating Payment Term: api/PaymentTerm/create`, paymentTerm);
            response = await post(`/PaymentTerm/create`, paymentTerm);
            console.log(response);
        }
        if (response?.status)
            return response;
        else
            throw new Error(response?.message || "Save Term Failed!", response);

    }
    catch (error) {
        console.log("SaveTerms Error : ", error);
        return { status: false, data: [], error };
    }
};
//#endregion

//#region
export const GetDriversList = async (branchId) => {
    try {
        const response = await get(`/ordermngmaster/GetDriversName?BranchId=${branchId}`);
        if (response?.status) {
            return transformData(response.data, 'Id', 'DriversName');
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

//#endregion
//#region
export const GetAllSqHistory = async (filter) => {

    try {
        const queryParams = new URLSearchParams({
            BranchId: filter.BranchId,
            sqid: filter.sqid,
            soid: filter.soid,
            GasCodeId: filter.GasCodeId,
        }).toString();

        console.log("Request URL =>", `/MasterUsers/GetList?${queryParams}`);

        const response = await get(`/OrderMngMaster/GetSoHistory?${queryParams}`);

        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch users");
        }
    } catch (error) {
        console.error("Error fetching users:", error);
        return { status: false, data: [], error };
    }
};
//#endregion
//#region GetAllCountries
export const GetAllCountries = async (filter) => {

    try {
        const queryParams = new URLSearchParams();
        filter.CountryCode?.trim() && queryParams.append("countryCode", filter.CountryCode.trim());
        filter.CountryName?.trim() && queryParams.append("countryName", filter.CountryName.trim());
        console.log("queryParams : ", [...queryParams.entries()]);
        const response = await get(`/Country/get-all?${queryParams}`);
        console.log("GetAll Response :", response);
        if (response?.status) {
            return response;
        }
        else {
            throw new Error(response?.message || "Error GetAllCountry export!", response);
        }
    }
    catch (error) {
        console.log("GetAllCountries Error : ", error);
        return { status: false, data: [], error };
    }
};
//#endregion
//#region SaveCountry
export const SaveCountry = async (country) => {

    try {
        let response;
        if (country.header.CountryId && country.header.CountryId > 0) {
            response = await put(`/Country/update`, country);
        }
        else {
            response = await post(`/Country/create`, country);
        }
        console.log("savecountry", response);
        if (response?.status) {
            return response;
        }
        else {
            throw new Error(response?.message || "SaveCountry export response Error", response);
        }
    }
    catch (error) {
        console.log("SaveCountry Error : ", error);
        return { status: false, data: [], error };
    }
};
//#endregion


//#region GetAllProjects
export const GetAllProjects = async (filter) => {

    try {
        debugger
        const queryParams = new URLSearchParams();
        queryParams.append("projectCode", filter.projectCode?.trim() || '');
        queryParams.append("projectName", filter.projectName?.trim() || '');
        queryParams.append("userid", filter.userid);
        queryParams.append("orgid", filter.orgid);
        queryParams.append("branchid", filter.branchid);

        console.log("queryParams : ", [...queryParams.entries()], queryParams);
        const response = await get(`/Project/list?${queryParams}`);
        console.log("GetAllProject Response :", response);
        if (response?.status) {
            return response;
        }
        else {
            throw new Error(response?.message || "Error GetAllProject export!", response);
        }
    }
    catch (error) {
        console.log("GetAllProjects Error : ", error);
        return { status: false, data: [], error };
    }
};
//#endregion
//#region SaveProject
export const SaveProject = async (project) => {

    try {
        debugger
        let response;
        if (project.Project.projectid > 0 || project.Projectid > 0) {
            response = await put(`/Project/update`, project);
        }
        else {
            response = await post(`/Project/create`, project);
        }
        console.log("saveproject", response);
        if (response?.status) {
            return response;
        }
        else {
            throw new Error(response?.message || "SaveProject export response Error", response);
        }
    }
    catch (error) {
        console.log("SaveProject Error : ", error);
        return { status: false, data: [], error };
    }
};
//#endregion


export const GetQuotationType = async (branchId) => {
    try {
        const response = await get(`/OrderMngMaster/GetQuotationType?BranchId=${branchId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

/** */
export const GetPaymentMethods = async (branchId, sq_Id, SearchText = "%") => {
    try {

        const response = await get(`/OrderMngMaster/GetPaymentMethod?BranchId=${branchId}&Sqid=${sq_Id}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch payment methods");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
export const GetCustomer = async (branchId, sq_Id, SearchText = "%") => {
    try {

        const response = await get(`/OrderMngMaster/GetCustomer?BranchId=${branchId}&Sqid=${sq_Id}&SearchText=${SearchText}`);
        console.log("getcustomer :", response);
        if (response?.status) {
            return transformData(response.data, 'CustomerId', 'Customer');
        } else {
            throw new Error(response?.message || "Failed to fetch customer");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
export const GetPackersName = async (branchId) => {
    try {

        const response = await get(`/OrderMngMaster/GetPackersName?BranchId=${branchId}`);
        console.log("getcustomer :", response);
        if (response?.status) {
            return transformData(response.data, 'CustomerId', 'Customer');
        } else {
            throw new Error(response?.message || "Failed to fetch customer");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
export const GetSOGasCodeDetails = async (soid) => {
    try {
        const response = await get(`/OrderMngMaster/GetSOGasCodeDetails?SOID=${soid}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch customer");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
export const GetPaymentTerms = async (branchId, sq_Id, SearchText = "%") => {
    try {

        const response = await get(`OrderMngMaster/GetPaymentTerm?BranchId=${branchId}&Sqid=${sq_Id}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch payment terms");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
export const GetSalesPerson = async (branchId, sq_Id, SearchText = "%") => {
    try {

        const response = await get(`/OrderMngMaster/GetSalesPerson?BranchId=${branchId}&Sqid=${sq_Id}&SearchText=${SearchText}`);
        if (response?.status) {
            return transformData(response.data, 'SalesPersonId', 'SalesPersonName');
        } else {
            throw new Error(response?.message || "Failed to fetch sales person");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
export const GetUoM = async (branchId, sq_Id, SearchText = "%") => {
    try {

        const response = await get(`/OrderMngMaster/GetUoM?BranchId=${branchId}&Sqid=${sq_Id}&SearchText=${SearchText}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetSqseqno = async (branchId, SearchText = "%") => {
    try {
        const response = await get(`/Quotation/GetQuotationSeqNo?BranchId=${branchId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetCurrency = async (branchId, sq_Id, SearchText = "%") => {
    try {

        const response = await get(`/OrderMngMaster/GetCurrency?BranchId=${branchId}&Sqid=${sq_Id}&SearchText=${SearchText}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const AddSQ = async (sqData) => {
    try {
        const response = await post('/Quotation/Create', sqData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return {
            status: false,
            message: error?.message || "Something went wrong while creating sales quotation",
            data: null
        };
    }
};

export const UpdateSQ = async (sqData) => {
    try {
        const response = await put('/Quotation/Update', sqData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetSQ = async (sqid) => {
    try {
        const response = await get(`/Quotation/GetById?id=${sqid}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch quotation details");
        }
    } catch (error) {
        console.error("Failed to fetch quotation details:", error);
        return [];
    }
};

export const GetContactList = async (customerid, sq_Id) => {
    try {

        const response = await get(`/OrderMngMaster/GetCustomerContact?customerid=${customerid}&Sqid=${sq_Id}`);
        if (response?.status) {
            return transformData(response.data, 'CustomerContactId', 'CustomerContact');
            //return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetCurrencyconversion = async (currencyid) => {
    try {
        const response = await get(`/OrderMngMaster/GetCurrencyConversion?currencyid=${currencyid}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetShippingAddress = async (ContactId, sq_Id) => {
    try {

        const response = await get(`/OrderMngMaster/GetCustomerAddress?ContactId=${ContactId}&Sqid=${sq_Id}`);
        console.log("shippingaddr: ", response);
        if (response?.status) {
            return transformData(response.data, "DeliveryAddressId", "DeliveryAddress");
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetCascodedetail = async (gascodeid) => {
    try {
        const response = await get(`/OrderMngMaster/GetGasCodeDetails?GasCodeId=${gascodeid}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const Sqcopy = async (sqid) => {
    try {
        const response = await get(`/Quotation/Copy?id=${sqid}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetSqAll = async (SQID = 0, FromDate, ToDate, BranchId = 1) => {

    try {
        const response = await get(`/Quotation/GetALL?SQID=${SQID}&FromDate=${FromDate}&ToDate=${ToDate}&BranchId=${BranchId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const IsAdminUser = async (UserId = "") => {

    try {
        const response = await get(`/OrderMngMaster/IsAdminUser?UserId=${UserId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
export const GetSqList = async (SQID = 0, BranchId = 1) => {
    try {
        const response = await get(`/OrderMngMaster/GetSQNumber?SearchText=${SQID}&BranchId=${BranchId}`);
        if (response?.status) {
            return transformData(response.data, 'SQID', 'SQNO');
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetSOType = async (BranchId = 1) => {
    try {
        const response = await get(`/OrderMngMaster/GetSOType?BranchId=${BranchId}`);
        if (response?.status) {
            return transformData(response.data, 'Order_TypeId', 'Order_TypeName');
        } else {
            throw new Error(response?.message || "Failed to fetch SO type");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetSQCustomer = async (BranchId = 1) => {
    try {

        const response = await get(`/OrderMngMaster/GetSQCustomer?BranchId=${BranchId}`);
        if (response?.status) {
            return transformData(response.data, 'CustomerId', 'CustomerName');
        } else {
            throw new Error(response?.message || "Failed to fetch SQ Customers");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

// export const GetCustomerSQ = async (customerid) => {
//     try {
//         const response = await get(`/OrderMngMaster/GetCustomerSQ?customerID=${customerid}&BranchId=1`);
//         if (response?.status) {
//             return transformData(response.data, 'id', 'SQ_Nbr');
//         } else {
//             throw new Error(response?.message || "Failed to fetch gas codes");
//         }
//     } catch (error) {
//         console.error("Error :", error);
//         return [];
//     }
// };

export const GetCustomerSQ = async (customerid, soid) => {
    try {
        const response = await get(`/OrderMngMaster/GetCustomerSQ?customerID=${customerid}&BranchId=1&soid=${soid}`);
        if (response?.status) {
            return transformData(response.data, 'id', 'SQ_Nbr');
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetSQGasCode = async (sqid) => {
    try {

        const response = await get(`/OrderMngMaster/GetSQGasCode?sqid=${sqid}&BranchId=1`);
        if (response?.status) {
            return transformData(response.data, 'GasCodeId', 'GasCode');
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const GetCustomerGasCode = async (customerid, GasCodeId, BranchId, soid = 0) => {
    try {
        const response = await get(`/OrderMngMaster/GetCustomerGasCode?customerid=${customerid}&GasCodeId=${GasCodeId}&BranchId=${BranchId}&SOID=${soid}`);
        if (response?.status) {
            return transformData(response.data, 'GasCodeId', 'GasCode');
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

const BASE_URL = process.env.REACT_APP_API_URL;



export const downloadExportExcel = async (CustomerId = 0, FromDate, ToDate, BranchId, FilterType, PO) => {
    try {
        const response = await axios.get(
            `${BASE_URL}/Order/GetAllExportAsync?CustomerId=${CustomerId}&FromDate=${FromDate}&ToDate=${ToDate}&BranchId=${BranchId}&FilterType=${FilterType}&PO=${PO}`,
            { responseType: "blob" }
        );

        if (response.status) {
            const contentDisposition = response.headers["content-disposition"];
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
            let fileName = `BTG-SalesOrders-${day}${month}${year}-${timeStr}.xlsx`;

            if (contentDisposition) {
                const matches = contentDisposition.match(/filename="?(.+)"?/);
                if (matches && matches[1]) {
                    fileName = matches[1];
                }
            }

            saveAs(new Blob([response.data]), fileName);
        }
    } catch (err) {
        console.error("Error downloading file:", err.message);
    }
};
export const printExportExcel = async (CustomerId = 0, FromDate, ToDate, BranchId, FilterType, PO) => {
    try {
        const response = await axios.get(
            `${BASE_URL}/Order/PrintOrder?CustomerId=${CustomerId}&FromDate=${FromDate}&ToDate=${ToDate}&BranchId=${BranchId}&FilterType=${FilterType}&PO=${PO}`,
            { responseType: "blob" }
        );

        if (response.status === 200) {
            return response.data;
        }
    } catch (err) {
        console.error("Error downloading file:", err.message);
        throw err;
    }
};

export const GetAllSO = async (CustomerId = 0, FromDate, ToDate, BranchId, FilterType, PO) => {

    try {
        const response = await get(`/Order/GetALL?CustomerId=${CustomerId}&FromDate=${FromDate}&ToDate=${ToDate}&BranchId=${BranchId}&FilterType=${FilterType}&PO=${PO}`);

        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
export const getCountryDetails = async (CountryCode, CountryName) => {
    try {
        const response = await get(`/Country/getall?conCode=${CountryCode}&conName=${CountryName}`);
        if (response?.status) {
            return response.data;
        }
        else {
            throw new Error(response?.message || "Failed to fetch countrydetails ");
        }
    }
    catch (error) {
        console.error("Error fetching countrydetails :", error);
        return null;

    }
};





export const getCountryCodeDetails = async (customerID, branchId) => {
    try {
        const response = await get(`/Country/getall?conCode=${customerID}&conName=${branchId}`);
        if (response?.status) {
            return response.data;
        }
        else {
            throw new Error(response?.message || "Failed to fetch countrydetails ");
        }
    }
    catch (error) {
        console.error("Error fetching countrycodedetails :", error);
        return null;

    }
};




export const AddCountry = async (CountryData) => {
    try {
        const response = await post('/Country/Create', CountryData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch Country");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const UpdateCountry = async (CountryId, CountryData) => {
    try {
        const response = await put('/Country/' + CountryId, CountryData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch Country");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};


export const GetcountrybyId = async (countryid) => {
    try {
        const response = await get(`/Country/${countryid}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to get Production Order Sequence Number");
        }
    } catch (error) {
        console.error("Error fetching production order sequence number:", error);
        return null;
    }
};

export const GetOrderSeqNo = async (BranchId) => {
    try {
        const response = await get(`/Order/GetOrderSeqNo?BranchId=${BranchId}`);

        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

// export const GetCustomerGasCodeDetail = async (customerid, BranchId = 1) => {
//     try {
//         const response = await get(`/OrderMngMaster/GetCustomerGasCodeDetail?customerid=${customerid}&BranchId=${BranchId}`);
//         if (response?.status) {
//             return transformData(response.data, 'GasCodeId', 'GasCode');
//         } else {
//             throw new Error(response?.message || "Failed to fetch gas codes");
//         }
//     } catch (error) {
//         console.error("Error :", error);
//         return [];
//     }
// };

export const GetCustomerGasCodeDetail = async (customerid, soid, BranchId = 1) => {
    try {
        const response = await get(`/OrderMngMaster/GetCustomerGasCodeDetail?customerid=${customerid}&BranchId=${BranchId}&soid=${soid}`);
        if (response?.status) {
            return transformData(response.data, 'GasCodeId', 'GasCode');
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
export const AddSO = async (SOData) => {

    try {
        const response = await post('/Order/Create', SOData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return {
            status: false,
            message: error?.message || "Something went wrong while creating sales Order",
            data: null
        };
    }
};

export const OrderGetbyid = async (soid) => {
    try {
        const response = await get(`Order/GetById?orderid=${soid}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch order details");
        }
    } catch (error) {
        console.error("Failed to fetch order details:", error);
        return [];
    }
};
export const GetCustomerFilter = async (branchId = 1, searchtext) => {

    try {
        const response = await get(`/ordermngmaster/GetCustomerFilter?branchid=${branchId}&searchtext=${searchtext}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const fetchSalesInvoiceCustomerList = async (branchId) => {
    try {
        const response = await get(`/OrderMngMaster/GetPackingCustomerId?BranchId=${branchId}`);
        if (response?.status) {
            return transformData(response.data, 'customerid', 'CustomerName');
        } else {
            throw new Error(response?.message || "Failed to fetch customer details for packing");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const fetchSalesInvoiceDOList = async (branchId, customerId) => {
    try {
        const response = await get(`/OrderMngMaster/GetCustomerPackingId?customerid=${customerId}&BranchId=${branchId}`);
        if (response?.status) {
            return transformData(response.data, 'id', 'packno');
        } else {
            throw new Error(response?.message || "Failed to fetch delivery orders");
        }
    } catch (error) {
        console.error("Error fetching delivery orders:", error);
        return [];
    }
};

export const UpdateSO = async (soData) => {

    try {
        const response = await put('/Order/Update', soData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};


// Production Order

export const getGasTypes = async (branchId) => {
    try {
        const response = await get(`/OrderMngMaster/GetGasTypes?BranchId=${branchId}`);
        if (response?.status) {
            return transformData(response.data, 'GasTypeId', 'GasTypeName');
        } else {
            throw new Error(response?.message || "Failed to fetch gas types");
        }
    } catch (error) {
        console.error("Error fetching gas types:", error);
        return []; // Return empty array on error
    }
};

export const getGasCodesByGasType = async (gasTypeId, branchId) => {
    try {
        const response = await get(`/OrderMngMaster/GetGasCodeAgGasTypes?GasTypeId=${gasTypeId}&BranchId=${branchId}`);
        if (response?.status) {
            return response.data; // Return gas code data
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error fetching gas codes:", error);
        return []; // Return empty array on error
    }
};

export const getCylinderDetails = async (searchText, branchId, GasCodeId, ProductionId) => {
    try {
        const response = await get(`/OrderMngMaster/GetCylinderDetails?searchtext=${encodeURIComponent(searchText)}&BranchId=${branchId}&GasCodeId=${GasCodeId}&ProductionId=${ProductionId}`);
        if (response?.status) {
            //return response.data; // Return cylinder details data
            return transformData(response.data, 'cylinderid', 'cylindername');
        } else {
            throw new Error(response?.message || "Failed to fetch cylinder details");
        }
    } catch (error) {
        console.error("Error fetching cylinder details:", error);
        return []; // Return empty array on error
    }
};


export const getProductionNo = async ({ SearchText, BranchId }) => {
    try {
        const response = await get(`/OrderMngMaster/GetProductionNo?searchtext=${encodeURIComponent(SearchText)}&BranchId=${BranchId}`);

        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch production orders");
        }
    } catch (error) {
        console.error("Error:", error);
        return { status: false, data: [] };
    }
};

export const CreateProductionOrder = async (orderData) => {

    try {

        const response = await post('/ProductionOrder/Create', orderData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to create production order");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const GetAllProductionOrders = async (filter) => {
    try {
        const queryParams = new URLSearchParams(filter).toString();
        const response = await get(`/ProductionOrder/GetALL?${queryParams}`);

        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch production orders");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const GetProductionOrderById = async (orderId) => {
    try {
        const response = await get(`/ProductionOrder/GetById?id=${orderId}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch production order details");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const UpdateProductionOrder = async (orderData) => {

    try {
        const response = await put('/ProductionOrder/Update', orderData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to create production order");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const getProductionOrderSeqNo = async (branchId) => {
    try {
        const response = await get(`/ProductionOrder/GetProductionOrderSeqNo?BranchId=${branchId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to get Production Order Sequence Number");
        }
    } catch (error) {
        console.error("Error fetching production order sequence number:", error);
        return null;
    }
};

export const getPackingDetails = async (packingid, branchId) => {
    try {
        const response = await get(`/OrderMngMaster/GetPackingDetails?packingid=${packingid}&BranchId=${branchId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to get Production Order Sequence Number");
        }
    } catch (error) {
        console.error("Error fetching production order sequence number:", error);
        return null;
    }
};

export const GetAllGasListing = async (gasName, volume, pressure) => {

    try {

        const response = await get(`${PYTHON_API_URL}/pyapi/MasterGas/GetAllGasListing?gasName=${encodeURIComponent(gasName)}&volume=${volume}&pressure=${pressure}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to get Production Order Sequence Number");
        }
    } catch (error) {
        console.error("Error fetching production order sequence number:", error);
        return null;
    }
};

export const GetAllGasTypes = async () => {
    try {

        const response = await get(`${PYTHON_API_URL}/pyapi/MasterGas/GetAllGasTypes`);
        if (response?.status) {
            console.log(response)
            return transformData(response.data, 'Id', 'TypeName');
        } else {
            throw new Error(response?.message || "Failed to get Production Order Sequence Number");
        }
    } catch (error) {
        console.error("Error fetching production order sequence number:", error);
        return null;
    }
};



export const GetVolume = async (BranchId = 1, SearchText = "") => {
    try {
        const response = await get(`/OrderMngMaster/GetVolume?SearchText="%"&BranchId=${BranchId}`);
        if (response?.status) {
            console.log(response)
            return transformData(response.data, 'id', 'volume');
        } else {
            throw new Error(response?.message || "Failed to get volume data");
        }
    } catch (error) {
        console.error("Error fetching volume data:", error);
        return null;
    }
};


export const GetPressure = async (BranchId = 1, SearchText = "") => {
    try {
        const response = await get(`/OrderMngMaster/GetPressure?SearchText="%"&BranchId=${BranchId}`);
        if (response?.status) {
            console.log(response)
            return transformData(response.data, 'id', 'pressure');
        } else {
            throw new Error(response?.message || "Failed to get pressure data");
        }
    } catch (error) {
        console.error("Error fetching pressure data:", error);
        return null;
    }
};

export const GetgasbyId = async (gasid) => {
    try {
        const response = await get(`${PYTHON_API_URL}/pyapi/MasterGas/GetByID?gasID=${gasid}`);
        if (response?.status) {
            return response.data[0];
        } else {
            throw new Error(response?.message || "Failed to get Production Order Sequence Number");
        }
    } catch (error) {
        console.error("Error fetching production order sequence number:", error);
        return null;
    }
};

export const AddGascode = async (GasCodeData) => {
    try {

        const payload = GasCodeData;
        console.log("payload ->post :", payload);
        const response = await post(`${PYTHON_API_URL}/pyapi/MasterGas/Create`, payload);
        console.log("post response :", response);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to add gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

export const UpdateGascode = async (GasCodeData) => {
    try {

        const payload = GasCodeData;
        const response = await put(`${PYTHON_API_URL}/pyapi/MasterGas/Update`, payload);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to add gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};




export const GetReturnOrderGasCodeList = async (CustomerId, BranchId = "1", SearchText = "%") => {

    try {
        const response = await get(`/OrderMngMaster/GetReturnOrderGasCode?BranchId=${BranchId}&SearchText=${SearchText}&CustomerId=${CustomerId}`);
        if (response?.status) {
            return transformData(response.data, "GasCodeId", "GasCodeName");
        } else {
            throw new Error(response?.message || "Failed to get Production Order Sequence Number");
        }
    } catch (error) {
        console.error("Error fetching production order sequence number:", error);
        return null;
    }
};

export const GetReturnOrderPDLs = async (CustomerID, BranchId = "1") => {

    try {
        const response = await get(`/OrderMngMaster/GetReturnOrderCustomerPackingIdAsync?BranchId=${BranchId}&CustomerID=${CustomerID}`);
        if (response?.status) {
            return transformData(response.data, "id", "packno");
        } else {
            throw new Error(response?.message || "Failed to get Production Order Sequence Number");
        }
    } catch (error) {
        console.error("Error fetching production order sequence number:", error);
        return null;
    }
};

export const GetPDLDetailsByGas = async (GascodeId) => {
    try {
        const response = await get(`/OrderMngMaster/GetDeliveryAgGasDetails?GascodeId=${GascodeId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to get Production Order Sequence Number");
        }
    } catch (error) {
        console.error("Error fetching production order sequence number:", error);
        return null;
    }
};

export const GetPDLDetailsByPD = async (packingid) => {
    try {
        const response = await get(`/OrderMngMaster/GetDeliveryAgDODetails?packingid=${packingid}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to get data");
        }
    } catch (error) {
        console.error("Error fetching production order sequence number:", error);
        return null;
    }
};

export const GetROCylinderDetails = async (searchtext, GasCodeId, BranchId = 1, ReturnId = 0) => {

    try {
        const response = await get(`/OrderMngMaster/GetReturnOrderCylinderDetails?searchtext=${searchtext}&BranchId=${BranchId}&GasCodeId=${GasCodeId}&ReturnId=${ReturnId}`);
        if (response?.status) {
            return transformData(response.data, "cylinderid", "cylindername");
        } else {
            throw new Error(response?.message || "Failed to get cylinder name");
        }
    } catch (error) {
        console.error("Error fetching production order sequence number:", error);
        return null;
    }
};

export const CreateReturnOrder = async (orderData) => {

    try {

        const response = await post('/ReturnOrder/Create', orderData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to create return order");
        }
    } catch (error) {
        console.error("Error:", error);
        return response?.status;
    }
};

export const UpdateReturnOrder = async (orderData) => {

    try {
        const response = await put('/ReturnOrder/Update', orderData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to create return order");
        }
    } catch (error) {
        console.error("Error:", error);
        return response?.status;
    }
};

export const ReturnOrderDetail = async (rtid) => {

    try {
        const response = await get(`/ReturnOrder/GetById?id=${rtid}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to get return orders");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const GetReturnOrderSeqNo = async (BranchId = "1") => {

    try {
        const response = await get(`/ReturnOrder/GetReturnOrderSeqNo?BranchId=${BranchId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to get return orders");
        }
    } catch (error) {
        console.error("Error:", error);
        return [];
    }
};

export const gastoggleactivestatus = async (gasStatusData) => {
    try {
        const response = await put(`${PYTHON_API_URL}/pyapi/MasterGas/ToogleActiveStatus`, gasStatusData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to toggle gas active status");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};
//#endregion LoadCustomerList
export const LoadCustomerList = async params => {
    try {
        console.log("Sending payload:", params);
        const response = await get("/MasterCustomer/get-list-tab-customer", { params });


        if (response) {
            return response.data;
        } else {
            throw new Error(response.data?.message || "Failed to load customer list");
        }
    } catch (error) {
        ;;
        console.error("LoadCustomerList Error:", error);
        throw error;
    }
};
//#region GetDepartment
export const GetDepartment = async (name) => {

    try {
        const response = await get(`/mastercustomer/name/${name}`);
        return response;
    }
    catch (error) {
        console.error("Failed to fetch Department Name", error);
        return { status: false, message: error };
    }
};
//#endregion
//#endregion
export const SQtoggleactivestatus = async (sqStatusData) => {
    try {
        const response = await get(`/Quotation/Delete?Id=${sqStatusData.Id}&IsActive=${sqStatusData.IsActive}&userid=${sqStatusData.userid}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to toggle sq active status");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }


};

//#region Create/Update Department
export const SaveDepartment = async (depart) => {
    try {

        console.log("Department =>", depart);

        let response;
        const isUpdate = depart.header?.DepartmentId > 0;

        if (isUpdate) {
            console.log("Request URL =>", `/Department/update`);
            response = await put('/Department/update', depart);
        } else {
            console.log("Request URL =>", '/Department/create');
            response = await post('/Department/create', depart);
        }

        console.log("Save method response:", response);

        if (response?.status === true || response?.status === true || response?.data?.status) {
            return response;
        } else {
            throw new Error(response?.data?.message || "Save Department failed");
        }
    } catch (error) {
        console.error("Error Saving Department:", error);
        return {
            status: false,
            message: error.message || "Unknown error occurred",
        };
    }
};
//#endregion
//#region GetAllDepartment
export const GetAllDepartments = async (filter) => {

    try {
        const queryParams = new URLSearchParams({
            DeptCode: filter.DepartmentCode?.trim() || '',
            DeptName: filter.DepartmentName?.trim() || ''
        });
        const response = await get(`/Department/get-all?${queryParams}`);
        if (response?.status) {
            return response;
        }
        else {
            throw new error(response?.message || "Error Getting All Departments!");
        }

    }
    catch (error) {
        console.log("GetAllDepartments Error : ", error);
        return { status: false, data: [], error };
    }
};
//#endregion
//#region SaveCurrency
export const SaveCurrency = async (payload) => {

    try {
        let response;
        console.log("Savecurrency payload :", payload);
        if (payload.header.CurrencyId && payload.header.CurrencyId > 0) {
            response = await put(`/Currency/update`, payload);
        }
        else {
            response = await post(`/Currency/create`, payload);
        }
        return response;
    } catch (error) {
        console.error("SaveCurrency API error:", error);
        return { status: false };
    }
};

//#region UpdateStatus
export const UpdateCurrencyStatus = async (payload) => {

    try {
        let response;
        console.log("Statuscurrency payload :", payload);
        if (payload.detail.CurrencyId && payload.detail.CurrencyId > 0) {
            response = await put(`/Currency/update-status`, payload);
            return response;
        }
        else {
            return response;
        }
    }
    catch (error) {
        console.error("Status Update Failed", error);
        return { status: false };
    }
};

//#endregion

//#region
export const GetCurrencyById = async (id) => {
    try {
        const response = await get(`/currency/id/${id}`);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch currency by ID:", error);
        return { status: false, message: "Error fetching data" };
    }
};

//#endregion

//#region
export const GetDepartmentByCode = async (code) => {
    try {
        const response = await get(`/Department/code/${code}`);
        return response.data;
    }
    catch (error) {
        console.error("Failed to get Department Code", error);
        return { status: false, message: error };
    }
};
//#endregion
//#region
export const GetDepartmentByName = async (name) => {
    try {
        const response = await get(`/Department/name/${name}`);
        return response;
    }
    catch (error) {
        console.error("Failed to fetch Department Name", error);
        return { status: false, message: error };
    }
};
//#endregion
//#region
export const GetDepartmentById = async (id) => {
    try {
        const response = await get(`/Department/id/${id}`);
        return response;
    }
    catch (error) {
        console.log("Failed to fetch Department Records", error);
        return { status: false, message: error };
    }
};
//#endregion

//#region GetPalletType
export const GetPalletType = async (branchId) => {
    try {
        const response = await get(`/OrderMngMaster/get-pallet-type?branchId=${branchId}`);
        return response;
    } catch (error) {
        console.error("Failed to fetch Pallet Type ", error);
        return { status: false, message: error };
    }
};
//#endregion

//#region GetPalletList
export const GetPalletList = async ({ orgId, branchId, palletTypeId, gasCodeId }) => {
    try {
        const queryParams = new URLSearchParams();

        queryParams.append("orgId", orgId ?? 0);
        queryParams.append("branchId", branchId ?? 0);
        queryParams.append("palletTypeId", palletTypeId ?? 0);
        queryParams.append("GasCodeId", gasCodeId ?? 0);

        const response = await get(`/MasterPallet/GetAllPalletListing?${queryParams.toString()}`);
        return response;
    } catch (error) {
        console.error("API error:", error);
        return { status: false, data: [] };
    }
};
//#endregion

// add-pallet > Load the grid data based on selected gas code and pallet type.
export const GetGasCodePalletList = async (gasCode, palletTypeId, branchId, palletId) => {
    try {
        const response = await get(
            `/OrderMngMaster/get-gas-code-pallet?gasCodeId=${gasCode}&palletTypeId=${palletTypeId}&branchId=${branchId}&palletId=${palletId}`
        );
        return response;
    } catch (error) {
        console.error("Failed to fetch Gas Code Pallet List", error);
        return { status: false, message: error };
    }
};

export const SaveMasterPallet = async (payload) => {
    try {
        const response = await post(`/MasterPallet/Create`, payload);
        if (response?.status === true) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to save pallet data");
        }
    } catch (error) {
        console.error("SaveMasterPallet Error:", error);
        throw error;
    }
};

export const GetPalletById = async (palletId, orgId, branchId) => {
    try {
        const response = await get(`/MasterPallet/GetByID?palletID=${palletId}&orgId=${orgId}&branchId=${branchId}`);
        return response;
    } catch (error) {
        console.error("Failed to fetch pallet by ID", error);
        return { status: false, message: error };
    }
};

export const togglePalletStatus = async (payload) => {
    try {
        const response = await put('/MasterPallet/ToogleActiveStatus', payload);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to toggle pallet status");
        }
    } catch (error) {
        console.error("Error toggling pallet status:", error);
        throw error;
    }
};
//#end


export const GetClaimCategoryData = async (id, orgId, branchId, SearchText) => {
    try {
        const response = await get(`/CommonClaimAndPaymentData/get-category-type-details?id=${id}&BranchId=${branchId}&SearchText=${encodeURIComponent(SearchText)}&orgid=${orgId}`);
        if (response?.status && Array.isArray(response.data)) {
            return transformData(response.data, "categoryid", "categoryname");
        } else if (Array.isArray(response.data)) {
            return transformData(response.data, "categoryid", "categoryname");
        } else {
            return [];
        }
    } catch (error) {
        console.error("Failed to fetch category data", error);
        return [];
    }
};

export const GetClaimDepartmentData = async (id, orgId, branchId, SearchText) => {
    try {
        const response = await get(`/CommonClaimAndPaymentData/get-department-details?id=${id}&BranchId=${branchId}&SearchText=${encodeURIComponent(SearchText)}&orgid=${orgId}`);
        if (response?.status && Array.isArray(response.data)) {
            return transformData(response.data, "departmentid", "departmentname");
        } else if (Array.isArray(response.data)) {
            return transformData(response.data, "departmentid", "departmentname");
        } else {
            return [];
        }
    } catch (error) {
        console.error("Failed to fetch department data", error);
        return [];
    }
};


export const GetAllClaimAndPayment = async (filterType, filterValue, branchId, orgId, userid) => {
    try {
        const categoryId = filterType === 1 ? filterValue : 0;
        const departmentId = filterType === 2 ? filterValue : 0;
        const currencyId = filterType === 3 ? filterValue : 0;
        const claimtypeid = filterType === 4 ? filterValue : 0;

        // 🟢 MIGRATED: Calling Python API instead of .NET
        const response = await get(`/api/claim/get_all`, {
            usePython: true,
            params: {
                departmentid: departmentId,
                currencyid: currencyId,
                categoryid: categoryId,
                branchId: branchId,
                orgid: orgId,
                user_id: userid,
                claimtypeid: claimtypeid
            }
        });

        return response.data;
    } catch (error) {
        console.error("Failed to fetch Claim and Payment list", error);
        return { status: false, message: error };
    }
};

export const GetClaimAndPaymentSeqNum = async (branchId, orgId, userid) => {
    try {
        // 🟢 MIGRATED: Calling Python API
        const response = await axios.get(`${PYTHON_API_URL}/api/claim/get_seq_num`, {
            params: { branchId, orgid: orgId, userid }
        });
        return response.data;
    } catch (error) {
        console.error('Failed to fetch Seq Num', error);
        return { status: false, message: error.message || 'Server error' };
    }
};

export const GetClaimAndPaymentSupplierList = async (id, branchId, orgId, claimTypeId = 0, searchText = '%') => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/CommonClaimAndPaymentData/get-supplier-list?id=${id}&BranchId=${branchId}&SearchText=${encoded}&orgid=${orgId}&ClaimTypeid=${claimTypeId}`
        );

        if (res?.status) {
            debugger;
            return transformData(res.data, "SupplierId", "SupplierName");
        } else {
            throw new Error(res?.message || "Failed to fetch supplier list");
        }



    } catch (error) {
        console.error('Failed to fetch supplier list', error);
        return [];
    }
};

export const GetClaimAndPaymentApplicantDetails = async (id, branchId, orgId, searchText = '%') => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/CommonClaimAndPaymentData/get-applicant-details?id=${id}&BranchId=${branchId}&SearchText=${encoded}&orgid=${orgId}`
        );

        if (res?.status) {
            debugger;
            return transformData(res.data, "userid", "username");
        } else {
            throw new Error(res?.message || "Failed to fetch applicant details");
        }


    } catch (error) {
        console.error('Failed to fetch applicant details', error);
        return [];
    }
};

export const GetClaimAndPaymentTransactionCurrency = async (id, branchId, orgId, searchText = '%') => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/CommonClaimAndPaymentData/get-transaction-currency?id=${id}&BranchId=${branchId}&SearchText=${encoded}&orgid=${orgId}`
        );
        if (res?.status) {
            debugger;
            return transformData(res.data, "currencyid", "Currency");
        } else {
            throw new Error(res?.message || "Failed to fetch currency");
        }

    } catch (error) {
        console.error('Failed to fetch transaction currency', error);
        return [];
    }
};

export const GetClaimTypeList = async (id, branchId, orgId, claimCategoryId, searchText = "") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/CommonClaimAndPaymentData/get-claim-type?id=${id}&BranchId=${branchId}&SearchText=${encoded}&orgid=${orgId}&Claimcategoryid=${claimCategoryId}`
        );

        if (res?.status) {
            debugger;
            return transformData(res.data, "typeid", "claimtype");
        } else {
            throw new Error(res?.message || "Failed to fetch gas codes");
        }


    } catch (error) {
        console.error("Failed to fetch claim type list", error);
        return { status: false, message: error.message };
    }
};

export const GetAllClaimTypeList = async (id, branchId, orgId, claimCategoryId, searchText = "") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/CommonClaimAndPaymentData/GetAllClaimList?id=${id}&BranchId=${branchId}&SearchText=${encoded}&orgid=${orgId}&Claimcategoryid=0`
        );

        if (res?.status) {
            debugger;
            return transformData(res.data, "typeid", "claimtype");
        } else {
            throw new Error(res?.message || "Failed to fetch gas codes");
        }


    } catch (error) {
        console.error("Failed to fetch claim type list", error);
        return { status: false, message: error.message };
    }
};

export const GetPaymentDescriptionList = async (id, branchId, orgId, claimTypeId, searchText = "") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/CommonClaimAndPaymentData/get-payment-description?id=${id}&BranchId=${branchId}&SearchText=${encoded}&orgid=${orgId}&ClaimTypeid=${claimTypeId}`
        );
        if (res?.status) {
            debugger;
            return transformData(res.data, "PaymentId", "PaymentDescription");
        } else {
            throw new Error(res?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Failed to fetch payment description list", error);
        return { status: false, message: error.message };
    }
};

export const GetClaimPOList = async (id, branchId, orgId, supplier_id, searchText = "") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/CommonClaimAndPaymentData/GetPOList?id=${id}&BranchId=${branchId}&SearchText=${encoded}&orgid=${orgId}&supplierid=${supplier_id}`
        );
        if (res?.status) {
            debugger;
            return transformData(res.data, "poid", "pono");
        } else {
            throw new Error(res?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Failed to fetch payment description list", error);
        return { status: false, message: error.message };
    }
};

export const SaveClaimAndPayment = async (isEditMode, payload) => {
    try {
        const endpoint = isEditMode
            ? `/ClaimAndPayment/update`
            : `/ClaimAndPayment/create`;
        const method = isEditMode ? put : post;

        const response = await method(endpoint, payload);
        if (response?.status === true) {
            return response;
        } else {
            //  throw new Error(response?.message || "Failed to save claim and payment data");
            return response;

        }
    } catch (error) {
        console.error("SaveClaimAndPayment Error:", error);
        throw error;
    }
};

export const DeleteClaimAndPayment = async (payload) => {
    try {
        // 🟢 MIGRATED: Calling Python API
        const response = await axios.post(`${PYTHON_API_URL}/api/claim/delete`, payload);

        if (response.data && response.data.status === true) {
            return response.data;
        } else {
            throw new Error(response.data?.message || "Failed to delete claim and payment data");
        }
    } catch (error) {
        console.error("DeleteClaimAndPayment Error:", error);
        throw error;
    }
};

export const DiscussClaimAndPayment = async (payload) => {
    try {


        const response = await post("/ClaimAndPayment/Discuss", payload);
        if (response?.status === true) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to discuss claim and payment data");
        }
    } catch (error) {
        console.error("DiscussClaimAndPayment Error:", error);
        throw error;
    }
};

export const DeleteMemo = async (payload) => {
    try {
        const response = await axios.post(`${PYTHON_API_URL}/api/procurement_memo/Delete`, payload);
        if (response?.data?.Status === true) {
            return {
                status: response.data.Status,
                message: response.data.Message,
                data: response.data.Data
            };
        } else {
            throw new Error(response?.data?.Message || "Failed to delete memo");
        }
    } catch (error) {
        console.error("DeleteMemo Error:", error);
        throw error;
    }
};

export const ClaimAndPaymentGetById = async (claimId, orgId = 1, branchId = 1) => {
    try {
        const response = await get(
            `/ClaimAndPayment/get-by-id`,
            {
                params: {
                    claimId: claimId,
                    orgId: orgId,
                    branchId: branchId
                }
            }
        );

        if (response?.status === true) {
            return response;
        } else {
            throw new Error(response?.data?.message || "Failed to fetch claim details");
        }
    } catch (error) {
        console.error("ClaimAndPaymentGetById Error:", error);
        throw error;
    }
};

export const uploadFileToServer = async ({ file, claimPaymentId, branchId, userId }) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('claimPaymentId', claimPaymentId);
    formData.append('BranchId', branchId);
    formData.append('UserId', userId);

    try {
        const res = await post('/ClaimAndPayment/upload-doc', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                accept: '*/*',
            },
        });

        return res?.status;
    } catch (err) {
        console.error('File Upload Failed:', err);
        return false;
    }
};
export const AddCustomerFromSQ = async (CustomerData) => {
    try {
        const response = await post('/Quotation/CreateCustomer', CustomerData);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch Country");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};


// The API functions for the Common Procurement Data

export const GetAllProcurementMemos = async (requesterid, orgId, branchId, pmnumber, userid) => {
    try {
        const pmnumberEncoded = encodeURIComponent(pmnumber || "");
        const url = `${PYTHON_API_URL}/api/procurement_memo/get_all?requesterid=${requesterid}&BranchId=${branchId}&OrgId=${orgId}&pmnumber=${pmnumberEncoded}&userid=${userid}`;

        const response = await axios.get(url);

        if (response.data && response.data.status) {
            return response.data;
        } else {
            return { status: false, message: response.data?.message || "Failed to fetch memos", data: [] };
        }
    } catch (error) {
        console.error("GetAllProcurementMemos Error:", error);
        return { status: false, message: error.message, data: [] };
    }
};

export const GetCommonProcurementUserDetails = async (id, orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/CommonProcurementData/GetUserDetails?id=${id}&orgid=${orgId}&BranchId=${branchId}&SearchText=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch user details", error);
        return { status: false, message: error.message };
    }
};

export const GetCommonProcurementPurchaseMemoSeqNo = async (orgId, branchId) => {
    try {
        const res = await axios.get(`${PYTHON_API_URL}/api/procurement_memo/GetPurchaseMemoSeqNo?orgid=${orgId}&BranchId=${branchId}`);
        if (res.data?.Status === true) {
            return {
                status: res.data.Status,
                message: res.data.Message,
                data: res.data.Data
            };
        }
        return res.data;
    } catch (error) {
        console.error("Failed to fetch Purchase Memo Sequence Number", error);
        return { status: false, message: error.message };
    }
};

export const GetCommonProcurementDepartmentDetails = async (id, orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/CommonProcurementData/GetDepartMentDetails?id=${id}&orgid=${orgId}&BranchId=${branchId}&SearchText=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch department details", error);
        return { status: false, message: error.message };
    }
};

export const GetCommonProcurementPurchaseTypeDetails = async (id, orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/CommonProcurementData/GetPurchaseTypeDetails?id=${id}&orgid=${orgId}&BranchId=${branchId}&SearchText=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch purchase type details", error);
        return { status: false, message: error.message };
    }
};

export const GetCommonProcurementUomDetails = async (id, orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/CommonProcurementData/GetUomDetails?id=${id}&orgid=${orgId}&BranchId=${branchId}&SearchText=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch UOM details", error);
        return { status: false, message: error.message };
    }
};

export const GetCommonProcurementItemDetails = async (id, orgId, branchId, searchText, groupid = 0) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/CommonProcurementData/GetItemDetails?id=${id}&orgid=${orgId}&BranchId=${branchId}&SearchText=${encoded}&groupid=${groupid}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch item details", error);
        return { status: false, message: error.message };
    }
};

export const GetCommonProcurementItemGroupDetails = async (id, orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/CommonProcurementData/GetItemGroup?id=${id}&orgid=${orgId}&BranchId=${branchId}&SearchText=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch item details", error);
        return { status: false, message: error.message };
    }
};

export const GetCommonProcurementProjectsDetails = async (orgId, branchId, PR_Id) => {
    try {
        //const encoded = encodeURIComponent(searchText);
        const res = await get(`/PurchaseRequisition/GetProjectsAutoComplete?orgid=${orgId}&branchid=${branchId}&projects=${PR_Id}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch item details", error);
        return { status: false, message: error.message };
    }
};

export const SaveProcurementMemo = async (isEditMode, payload) => {
    try {
        const endpoint = isEditMode
            ? `${PYTHON_API_URL}/api/procurement_memo/Update`
            : `${PYTHON_API_URL}/api/procurement_memo/Create`;

        const method = isEditMode ? axios.put : axios.post;

        const response = await method(endpoint, payload);

        if (response?.data?.Status === true) {
            return {
                status: response.data.Status,
                message: response.data.Message,
                data: response.data.Data
            };
        } else {
            throw new Error(response?.data?.Message || "Failed to save procurement memo");
        }
    } catch (error) {
        console.error("SaveProcurementMemo Error:", error);
        throw error;
    }
};

export const ProcurementMemoGetById = async (memoId, orgId = 1, branchId = 1) => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/api/procurement_memo/GetById`, {
            params: {
                pmid: memoId,
                orgId: orgId,
                // branchId: branchId,
            },
        });

        if (response?.data?.Status === true) {
            const apiResult = response.data;
            // Python returns 'Data' (Capitalized), but frontend expects 'data' (lowercase)
            if (apiResult.Data && !apiResult.data) {
                apiResult.data = apiResult.Data;
            }
            // Normalize Status and Message
            if (apiResult.Status !== undefined && apiResult.status === undefined) {
                apiResult.status = apiResult.Status;
            }
            if (apiResult.Message !== undefined && apiResult.message === undefined) {
                apiResult.message = apiResult.Message;
            }

            return apiResult;
        } else {
            throw new Error(response?.data?.Message || "Failed to fetch procurement memo details");
        }
    } catch (error) {
        console.error("ProcurementMemoGetById Error:", error);
        throw error;
    }
};

export const GetPurchaseMemoList = async (id, branchId, orgId, searchText = '%') => {
    try {
        debugger
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/PurchaseRequisition/GetMemoList?id=${id}&BranchId=${branchId}&OrgId=${orgId}&SearchText=${encoded}`
        );
        if (res?.status) {
            return res;
        }
        else {
            throw new Error(res?.message || "Failed to fetch Memo List");
        }
    }
    catch (err) {
        console.error('Failed to load Memo List', err);
        return { status: false, message: err.message };
    }
};
export const GetSupplierCurrency = async (supId, orgId) => {
    debugger
    try {
        const res = await get(`/PurchaseRequisition/GetSupplierCurrency?supplierid=${supId}&orgid=${orgId}`);
        if (res?.status) {
            return res;
        }
        else {
            throw new Error(res?.message || "Failed to fetch Supplier Currency");
        }
    }
    catch (err) {
        console.error('Failed to load currency list', err);
        return { status: false, message: err.message };
    }
};
// #region GetByIdPurchaseRequisition
export const GetByIdPurchaseRequisition = async (
    prId,
    branchId,
    orgId,
    UserId = 1
) => {
    try {
        debugger;
        const url = `/PurchaseRequisition/GetById?prid=${prId}&branchid=${branchId}&orgid=${orgId}`;
        const response = await get(url);
        debugger;
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch purchase requisition");
        }
    } catch (error) {
        console.error("Error fetching purchase requisition:", error);
        return [];
    }
};
//#endregion
// #region DownloadFileById
// #region
export const DownloadFileById = async (fileId, filePath) => {
    try {
        const encodedPath = encodeURIComponent(filePath);

        const res = await get(
            `/CommonClaimAndPaymentData/download-file?file_id=${fileId}&file_path=${encodedPath}`,
            { responseType: 'blob' }
        );

        const blob = res;

        if (!blob || typeof blob.size !== 'number' || typeof blob.type !== 'string') {
            throw new Error("Invalid file response");
        }

        // Extract filename from content-disposition header
        let filename = 'downloaded-file';
        const disposition = res.headers?.['content-disposition'];
        if (disposition) {
            const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i);
            if (match && match[1]) {
                filename = decodeURIComponent(match[1]);
            }
        }

        // Fallback to file path
        if (!filename.includes('.') && filePath) {
            const fallback = filePath.split('/').pop();
            if (fallback && fallback.includes('.')) filename = fallback;
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("File download failed", error);
        Swal.fire({
            icon: 'error',
            title: 'Download Failed',
            text: 'Could not download the file.',
        });
    }
};


// The API functions for the Purchase Requisition
export const GetPurchaseRequisitionList = async (filterType, filterValue, orgId, branchId, userid) => {
    try {
        const supplierId = filterType === 1 ? filterValue : 0;
        const requesterId = filterType === 2 ? filterValue : 0;
        const res = await get(
            `/PurchaseRequisition/GetALL?PRTypeid=${requesterId}&BranchId=${branchId}&SupplierId=${supplierId}&orgid=${orgId}&userid=${userid}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch purchase requisition list", error);
        return { status: false, message: error.message };
    }
};

export const GetCommonProcurementPurchaseRequisitionSeqNo = async (orgId, branchId) => {
    try {
        const res = await get(`/PurchaseRequisition/GetPurchaseRequitisionSeqNo?orgid=${orgId}&BranchId=${branchId}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch Purchase Memo Sequence Number", error);
        return { status: false, message: error.message };
    }
};

export const GetPurchaseRequisitionSupplierList = async (orgId, branchId, searchText = '%') => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/PurchaseRequisition/GetSupplierAutoComplete?orgid=${orgId}&branchid=${branchId}&suppliername=${encoded}`
        );
        return res;
    } catch (error) {
        console.error('Failed to fetch supplier list', error);
        return { status: false, message: error.message };
    }
};

export const GetInvoiceReceiptAll = async (orgId, branchId, supplierid) => {
    try {

        const res = await get(
            `/InvoiceReceipt/GetAll?org_id=${orgId}&branchid=${branchId}&supplierid=${supplierid}`
        );
        return res;
    } catch (error) {
        console.error('Failed to fetch Invoice receipt all', error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierList = async (orgId = 1, category_id = 1, supplierid) => {
    try {

        const res = await get(
            `/InvoiceReceipt/GetPONoAutoComplete?org_id=${orgId}&category_id=${category_id}&supplier_id=${supplierid}`
        );
        return res;
    } catch (error) {
        console.error('Failed to fetch Invoice receipt all', error);
        return { status: false, message: error.message };
    }
};

export const GetIRList = async (orgId = 1, id, type) => {
    try {

        const res = await get(
            `/InvoiceReceipt/getSupplierPODetailsView?org_id=${orgId}&po_id=${id}&cid=${type}`
        );
        return res;
    } catch (error) {
        console.error('Failed to fetch Invoice receipt all', error);
        return { status: false, message: error.message };
    }
};

export const GetGRNList = async (orgId = 1, category_id = 1, supplierid) => {
    try {

        const res = await get(
            `/InvoiceReceipt/GetSupplierGRNAutoComplete?org_id=${orgId}&category_id=${category_id}&supplier_id=${supplierid}`
        );
        return res;
    } catch (error) {
        console.error('Failed to fetch Invoice receipt all', error);
        return { status: false, message: error.message };
    }
};


export const GetPurchaseRequisitionUserDetails = async (orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/PurchaseRequisition/GetRequstorAutoComplete?orgid=${orgId}&branchid=${branchId}&requestorname=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch user details", error);
        return { status: false, message: error.message };
    }
};

// Get PR Type
export const GetCommonProcurementPRType = async (id, orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/CommonProcurementData/GetPRType?id=${id}&orgid=${orgId}&BranchId=${branchId}&SearchText=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch PR Type", error);
        return { status: false, message: error.message };
    }
};

// Get Supplier Details
export const GetCommonProcurementSupplierDetails = async (id, orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/CommonProcurementData/GetSupplierDetails?id=${id}&orgid=${orgId}&BranchId=${branchId}&SearchText=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch Supplier Details", error);
        return { status: false, message: error.message };
    }
};
// Get Supplier Details
export const GetCommonProcurementPOSupplierDetails = async (id, orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/CommonProcurementData/GetPOSupplierDetails?id=${id}&orgid=${orgId}&BranchId=${branchId}&SearchText=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch Supplier Details", error);
        return { status: false, message: error.message };
    }
};
//Get PR Number List
export const GetCommonProcurementPRNoList = async (id, orgId, branchId) => {
    try {
        const response = await get(`/PurchaseOrder/GetPurchaseRequositionList?supplierid=${id}&orgid=${orgId}&BranchId=${branchId}`);
        return response;
    }
    catch (err) {
        console.error("Failed to load PR No List!", err);
        return { status: false, message: err.message };
    }
};

// Get Payment Terms
export const GetCommonProcurementPaymentTerms = async (id, orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/CommonProcurementData/GetPaymentTermsDetails?id=${id}&orgid=${orgId}&BranchId=${branchId}&SearchText=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch Payment Terms", error);
        return { status: false, message: error.message };
    }
};

// Get Delivery Terms
export const GetCommonProcurementDeliveryTerms = async (id, orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/CommonProcurementData/GetDeliveryTermsDetails?id=${id}&orgid=${orgId}&BranchId=${branchId}&SearchText=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch Delivery Terms", error);
        return { status: false, message: error.message };
    }
};

export const SaveProcurementRequisition = async (isEditMode, payload) => {
    try {
        const endpoint = isEditMode
            ? `/PurchaseRequisition/Update`
            : `/PurchaseRequisition/Create`;

        const method = isEditMode ? put : post;

        const response = await method(endpoint, payload);

        if (response?.status === true) {
            return response;
        } else {
            return {
                status: false,
                message: response?.message || "Failed to save procurement requisition"
            };
            //throw new Error(response?.message || "Failed to save procurement requisition");
        }
    } catch (error) {
        console.error("SaveProcurementRequisition Error:", error);
        throw error;
    }
};



//region GetAllMasterSalesOrder
export const GetAllMasterSalesOrder = async (
    searchBy,
    customerId,
    gasCodeId,
    branchId
) => {
    try {
        const url = `/MasterSalesOrder/GetAll?searchBy=${searchBy}&customerId=${customerId}&gascodeId=${gasCodeId}&branchId=${branchId}`;
        const response = await get(url);
        debugger
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch sales orders");
        }
    } catch (error) {
        console.error("Error fetching sales orders:", error);
        return [];
    }
};

//#region
export const GetTruckList = async (branchId) => {
    debugger
    try {
        const response = await get(`/ordermngmaster/GetTruckName?BranchId=${branchId}`);
        if (response?.status) {
            return transformData(response.data, 'Id', 'DriversName');
        } else {
            throw new Error(response?.message || "Failed");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

//#endregion

export const SaveMasterSalesOrder = async (payload) => {
    try {
        console.log("Sending payload:", payload);
        const response = await post("/MasterSalesOrder/Create", payload);
        debugger
        if (response?.statusCode === 0) {
            return response;
        } else if (response?.statusCode === 1) {
            toast.error(response.message || "An error occurred");
            return null;
        } else {
            throw new Error(response?.message || 'Failed to save customer');
        }

    } catch (error) {
        console.error('SaveTab1 Error:', error);
        throw error;
    }
};

export const UpdateMasterSalesOrder = async (payload) => {
    try {
        console.log("Sending payload:", payload);
        const response = await post("/MasterSalesOrder/Update", payload);
        debugger
        if (response?.statusCode === 0) {
            return response;
        } else if (response?.statusCode === 1) {
            toast.error(response.message || "An error occurred");
            return null;
        } else {
            throw new Error(response?.message || 'Failed to save customer');
        }

    } catch (error) {
        console.error('SaveTab1 Error:', error);
        throw error;
    }
};
//#endregion
// Get claim By supplier or Applicant Id
export const getClaimDetailsById = async (supid = 2, AppId = 96, ModId = 1, bankId = 18, userid = 1, isDirector, PVPaymentId) => {
    debugger
    try {
        const res = await get(`/ClaimApproval/GetSorAByIdClaim?SupId=${supid}&ApplId=${AppId}&MODId=${ModId}&BankId=${bankId}&UserId=${userid}&isDirector=${isDirector}&PVPaymentId=${PVPaymentId}`);
        console.log("getClaimDetailsById-Res", res);
        return res;
    } catch (error) {
        console.error("Failed to fetch claim approval details", error);
        return { status: false, message: error.message };
    }
};


// Get claim approval details
export const Getclaimapprovaldetails = async (id, orgId, branchId, userid) => {
    try {
        const res = await get(`/ClaimApproval/GetAll?Id=${id}&orgid=${orgId}&BranchId=${branchId}&UserId=${userid}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch claim approval details", error);
        return { status: false, message: error.message };
    }
};


// Get claim remarks details
export const Getclaimremarksdetails = async (id) => {
    try {
        const res = await get(`/ClaimApproval/GetRemarksHistory?claimid=${id}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch claim remarks details", error);
        return { status: false, message: error.message };
    }
};

// Get claim GetDiscussionlist details
export const GetDiscussionlist = async (orgId, branchId, userid) => {
    try {
        const res = await get(`/ClaimApproval/GetDiscussion?orgid=${orgId}&BranchId=${branchId}&UserId=${userid}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch claim remarks details", error);
        return { status: false, message: error.message };
    }
};

// update claim Discussion details
export const UpdateDiscussion = async (claimid, remarks, Type, isclaimant, userid) => {
    try {
        const res = await put(`/ClaimApproval/AcceptDiscussion?ClaimId=${claimid}&Comment=${remarks}&Type=${Type}&isclaimant=${isclaimant}&userid=${userid}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch claim remarks details", error);
        return { status: false, message: error.message };
    }
};

export const SavePaymentPlan = async (payload) => {

    try {
        console.log("Sending payload:", payload);
        const response = await post("/PaymentPlan/Create", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || 'Failed to save claim approve');
        }
    } catch (error) {
        console.error('Claim Approve Error:', error);
        throw error;
    }

};


export const UpdateIRN = async (payload) => {

    try {
        console.log("Sending payload:", payload);
        const response = await put("/InvoiceReceipt/updateSupplierPODetailsView", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || 'Failed to save IRN');
        }
    } catch (error) {
        console.error('IRN Save Error:', error);
        throw error;
    }

};

export const SaveIRN = async (payload) => {

    try {
        console.log("Sending payload:", payload);
        const response = await post("/InvoiceReceipt/AddIRN", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || 'Failed to save IRN');
        }
    } catch (error) {
        console.error('IRN Save Error:', error);
        throw error;
    }

};
// Get claim approval details
export const GetPaymentPlandetails = async (id, orgId, branchId, userid) => {
    try {
        const res = await get(`/PaymentPlan/GetAll?Id=${id}&orgid=${orgId}&BranchId=${branchId}&UserId=${userid}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch claim approval details", error);
        return { status: false, message: error.message };
    }
};

// Edit claim approval details
export const EditIRN = async (po_id, orgId) => {
    try {
        const res = await get(`/InvoiceReceipt/getSupplierPODetailsEditView?po_id=${po_id}&org_id=${orgId}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch IRN details", error);
        return { status: false, message: error.message };
    }
};

// Get claim approval details
export const Getclaimhistorydetails = async (id, orgId, branchId, userid, fromdate, todate) => {
    try {
        const res = await get(`/ClaimApproval/GetHistory?Id=${id}&orgid=${orgId}&BranchId=${branchId}&UserId=${userid}&fromdate=${fromdate}&todate=${todate}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch claim approval history details", error);
        return { status: false, message: error.message };
    }
};

export const SaveClaimApprove = async (payload) => {

    try {
        console.log("Sending payload:", payload);
        const response = await post("/ClaimApproval/Approve", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || 'Failed to save claim approve');
        }
    } catch (error) {
        console.error('Claim Approve Error:', error);
        throw error;
    }

};

export const UpdatePaymentSummaryPython = async (payload) => {
    try {
        console.log("Syncing Payment Summary via Python:", payload);
        const response = await post("/api/claim/update_payment_summary_sync", payload, {
            usePython: true
        });
        return response;
    } catch (error) {
        console.error('Python Sync Error:', error);
        // throw error;
    }
};

export const AutoApprove = async (payload) => {

    try {
        console.log("Sending payload:", payload);
        const response = await post("/ClaimApproval/AutoApprove", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || 'Failed to save claim auto approve');
        }
    } catch (error) {
        console.error('Claim auto Approve Error:', error);
        throw error;
    }

};

export const GetMenuDetails = async (userid, orgId, branchId) => {
    try {

        const res = await get(`/AccessRights/GetMenusDetails?userid=${userid}&branchId=${branchId}&orgId=${orgId}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch menu's", error);
        return { status: false, message: error.message };
    }
};
export const GetApprovalSettings = async (userid, orgId, branchId, ScreenId) => {
    try {

        const res = await get(`/AccessRights/GetApprovalSettings?userid=${userid}&branchId=${branchId}&orgId=${orgId}&ScreenId=${ScreenId}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch menu's", error);
        return { status: false, message: error.message };
    }
};
// Get PPP Accordian details
export const GetPaymentPalnAccordianDetails = async (id, orgId, branchId, userid) => {
    try {
        const res = await get(`/PeriodicPaymentPlan/GetAll?Id=${id}&orgid=${orgId}&BranchId=${branchId}&UserId=${userid}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch claim approval details", error);
        return { status: false, message: error.message };
    }
};

export const SaveVoucherAPI = async (payload) => {
    try {
        console.log("Sending payload:", payload);
        const response = await post("/PeriodicPaymentPlan/Create", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || 'Failed to save claim approve');
        }
    } catch (error) {
        console.error('Claim Approve Error:', error);
        throw error;
    }

};

export const GetBankList = async (userId, branchId) => {
    try {
        const response = await get(`/OrderMngMaster/get-bank?UserId=${userId}&BranchId=${branchId}`);
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch bank list");
        }
    } catch (error) {
        console.error("Error fetching bank list:", error);
        return [];
    }
};

export const GetPaymentVoucher = async (voucherid, orgId, branchId) => {
    try {
        const res = await get(`/PeriodicPaymentPlan/GetVoucher?VoucherId=${voucherid}&orgid=${orgId}&BranchId=${branchId}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch payment voucher", error);
        return { status: false, message: error.message };
    }
};


export const SaveBarcodePackingList = async (payload) => {
    debugger
    try {
        const { Barcode, packingdetails, packingId, RackId, isSubmitted, userId, packNo } = payload;

        const url = `/PackingListOrder/Create?Barcode=${encodeURIComponent(Barcode)}&packingdetails=${packingdetails}&packingId=${packingId}&RackId=${RackId}&isSubmitted=${isSubmitted}&userId=${userId}&packNo=${packNo}`;

        console.log("Sending to:", url);

        const response = await post(url);

        if (response) {
            return response;
        } else {
            throw new Error(response?.data?.message || 'Failed to save packing list');
        }
    } catch (error) {
        console.error('SaveBarcodePackingList Error:', error);
        throw error;
    }
};

//#region GetPackingListDetails
export const GetAllPackingList = async (
    searchBy,
    customerId,
    gasCodeId,
    branchId
) => {
    try {
        debugger
        const url = `/PackingListOrder/GetALL?searchBy=${searchBy}&customerId=${customerId}&gascodeId=${gasCodeId}&branchId=${branchId}`;
        const response = await get(url);
        debugger
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch sales orders");
        }
    } catch (error) {
        console.error("Error fetching sales orders:", error);
        return [];
    }
};
//#endregion
//#region GetByIdBarcodepackingList
export const GetByIdBarcodepackingList = async (
    packingId,
    packingDetailsId,
    UserId = 1
) => {
    try {
        debugger
        const url = `/PackingListOrder/GetByIdBarcode?packingId=${packingId}&packingDetailsId=${packingDetailsId}&userId=${UserId}`;
        const response = await get(url);
        debugger
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch sales orders");
        }
    } catch (error) {
        console.error("Error fetching sales orders:", error);
        return [];
    }
};
//#endregion
//#region GetAllPurchaseOrderList
export const GetAllPurchaseOrderList = async (id, branchId, supplierId, orgId, userid, poid = 0) => {
    try {
        debugger
        let url = `/PurchaseOrder/GetALL?BranchId=${branchId}&SupplierId=${supplierId}&OrgId=${orgId}&UserId=${userid}`;

        if (id) {
            // url += `&requestorid=${id}`;
            url += `&POId=${id}`;
        }

        const res = await get(url);

        if (res?.status) {
            return res;
        } else {
            console.error('Purchase Order API returned error:', res);
            throw new Error(res?.message || "Failed to fetch purchase order list");
        }
    } catch (err) {
        console.error('Failed to load purchase order list', err);
        console.error('Error details:', err.response || err);
        return { status: false, message: err.message || "Something went wrong" };
    }
};
export const GetPrIdDetails = async (id, orgId, branchId) => {
    try {
        debugger
        let url = `/PurchaseOrder/GetPurchaseRequisitionItemsList?branchid=${branchId}&orgid=${orgId}&prid=${id}`;
        const res = await get(url);

        if (res?.status) {
            return res;
        } else {
            throw new Error(res?.message || "Failed to fetch purchase order list");
        }
    } catch (err) {
        console.error('Failed to load purchase order list', err);
        return { status: false, message: err.message };
    }
};


//#endregion
const isEditMode = false; // or true when editing
//#region savePurchaseOrder
export const savePurchaseOrder = async (isEditMode, payload) => {
    try {
        const endpoint = isEditMode
            ? `/PurchaseOrder/Update`
            : `/PurchaseOrder/Create`;

        const method = isEditMode ? put : post;
        debugger
        const response = await method(endpoint, payload);

        if (response?.status === true) {
            return response;
        } else {
            return response;
            //throw new Error(response?.message || "Failed to save procurement memo");
        }
    } catch (error) {
        console.error("SaveProcurementMemo Error:", error);
        throw error;
    }
};
//#endregion
//#region GetByIdPurchaseOrder
export const GetByIdPurchaseOrder = async (id, orgId, branchId) => {
    try {
        debugger
        let url = `/PurchaseOrder/GetById?branchid=${branchId}&orgid=${orgId}&poid=${id}`;
        const res = await get(url);
        debugger
        if (res?.status) {
            return res;
        } else {
            throw new Error(res?.message || "Failed to fetch purchase order list");
        }
    } catch (err) {
        console.error('Failed to load purchase order list', err);
        return { status: false, message: err.message };
    }
};
//#endregion
//#region
export const GetCommonPurchaseOrderSeqNo = async (orgid, branchId) => {
    try {
        debugger
        const response = await get(`/PurchaseOrder/GetPurchaseOrderSeqNo?branchid=${branchId}&orgid=${orgid}`);
        debugger
        if (response?.status) {
            return response.data;
        } else {
            throw new Error(response?.message || "Failed to fetch gas codes");
        }
    } catch (error) {
        console.error("Error :", error);
        return [];
    }
};

//#endregion
//#region PurchaseRequisitionuploadFileToServer
export const PurchaseRequisitionuploadFileToServer = async ({ files, PRId, branchId, userId }) => {
    const formData = new FormData();
    files.forEach(file => {
        formData.append('file', file);
    });
    formData.append('prid', PRId);
    formData.append('BranchId', branchId);
    formData.append('UserId', userId);

    try {
        const res = await post('/PurchaseRequisition/upload-attachment', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                accept: '*/*',
            },
        });

        return res?.status;
    } catch (err) {
        console.error('File Upload Failed:', err);
        return false;
    }
};
//#endregion
//#region
export const PurchaseRequisitionDownloadFileById = async (fileId, filePath) => {
    try {
        if (!fileId || !filePath) {
            throw new Error("Missing file ID or file path.");
        }

        const encodedPath = encodeURIComponent(filePath);

        // Call new Python Download API
        const apiUrl = `${PYTHON_API_URL}/api/download_file/download?file_id=${fileId}&file_path=${encodedPath}`;

        const res = await axios.get(apiUrl, { responseType: 'blob' });

        const blob = res.data;



        if (!blob || typeof blob.size !== 'number' || typeof blob.type !== 'string') {
            throw new Error("Invalid file response");
        }
        debugger
        // Try extracting filename from Content-Disposition header
        let filename = 'downloaded-file';
        const disposition = res.headers?.['content-disposition'];
        if (disposition) {
            const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i);
            if (match && match[1]) {
                filename = decodeURIComponent(match[1]);
            }
        }

        // ✅ Cross-platform fallback using both \ and /
        if (!filename || filename === 'downloaded-file') {
            const parts = filePath.split(/[/\\]/); // Handles Windows + Linux/Mac paths
            const fallback = parts[parts.length - 1];
            if (fallback && fallback.match(/\.(pdf|docx?|xlsx?|jpg|png|jpeg|txt)$/i)) {
                filename = fallback;
            }
        }
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("File download failed:", error);
        Swal.fire({
            icon: 'error',
            title: 'Download Failed',
            text: error.message || 'Could not download the file.',
        });
    }
};

//#endregion


//GRN PO Item List

export const GetPOItemDetails = async (id, orgId, branchId, grnid) => {
    try {
        const res = await get(`/GoodsReceiptNote/GetPoItemList?poId=${id}&orgId=${orgId}&branchId=${branchId}&grnid=${grnid}`);
        return res;
    }
    catch (err) {
        console.log("Failed to load PO ItemList Details", err);
        return { status: false, message: err.message };
    }
};
//#region GRN
//All GRN List
export const GetAllGRNList = async (supplierId, grnNo, orgId, branchId, userid, currencyId = 0) => {
    try {
        const res = await get(`/GoodsReceiptNote/GetAll?supplierId=${supplierId}&grnid=${grnNo}&OrgId=${orgId}&BranchId=${branchId}&userid=${userid}&currencyid=${currencyId}`);
        console.log("getallgrnlist", res);
        return res;
    }
    catch (err) {
        console.error("Failed to Fetch GRN records", err);
        return { status: false, message: err.message };
    }
};

// Get PO Supplier Details
export const GetPOSupplierDetails = async (opt, orgId, branchId, searchtext, grnid) => {
    debugger
    try {
        if (orgId === 0) orgId = 1;
        const res = await get(`/GoodsReceiptNote/GetPOSupplierList?orgid=${orgId}&BranchId=${branchId}&grnid=${grnid}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch PO Supplier Details", error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierSearchFilter = async (orgId, branchId, searchText = '%') => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/PurchaseRequisition/GetSupplierSearchFilter?orgid=${orgId}&branchid=${branchId}&suppliername=${encoded}`
        );
        return res;
    } catch (error) {
        console.error('Failed to fetch supplier list', error);
        return { status: false, message: error.message };
    }
};

//Get PO Number List
export const GetPOList = async (id, orgId, branchId, grnid) => {
    debugger
    try {
        const response = await get(`/GoodsReceiptNote/GetPOList?supplierid=${id}&orgid=${orgId}&BranchId=${branchId}&grnid=${grnid}`);
        return response;
    }
    catch (err) {
        console.error("Failed to load PO No List!", err);
        return { status: false, message: err.message };
    }
};

//Get GRN seq NO
export const GetGRNNoSeq = async (branchId, orgId) => {
    debugger
    try {
        const response = await get(`/GoodsReceiptNote/GetGRNSeqNo?orgid=${orgId}&BranchId=${branchId}`);
        return response;
    }
    catch (err) {
        console.error("Failed to load GRN Seq No!", err);
        return { status: false, message: err.message };
    }
};

export const SaveGRN = async (isEditMode, payload) => {
    debugger
    try {
        const endpoint = isEditMode
            ? `/GoodsReceiptNote/Update`
            : `/GoodsReceiptNote/Create`;

        const method = isEditMode ? put : post;
        console.log("savegrn payload", payload);

        const response = await method(endpoint, payload);
        console.log("savegrn response", response);
        if (response?.status === true) {
            return response;
        } else {
            return response;
            //throw new Error(response?.message || "Failed to save GRN");
        }
    } catch (error) {
        console.error("SaveGRN Error:", error);
        throw error;
    }
};
export const GetGRNById = async (id, branchid, orgid) => {
    try {
        debugger
        //let url=`/GoodsReceiptNote/GetById?grnid=${id}&branchid=${branchid}&orgid=${orgid}`;
        const res = await get(`/GoodsReceiptNote/GetById?grnid=${id}&branchid=${branchid}&orgid=${orgid}`);
        console.log("getgrnbyid response", res);

        if (res?.status) {
            return res;
        } else {
            throw new Error(res?.message || "Failed to fetch grn matching record");
        }
    } catch (err) {
        console.error('Failed to GRN record ', err);
        return { status: false, message: err.message };
    }
};

export const ClaimReject = async (payload) => {

    try {
        console.log("Sending payload:", payload);
        const response = await post("/ClaimApproval/Reject", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || 'Failed to reject claim');
        }
    } catch (error) {
        console.error('Claim Reject Error:', error);
        throw error;
    }

};

export const GetPaymentSummaryseqno = async (UserId, orgid, branchId) => {
    try {
        // 🟢 SWAPPED TO PYTHON API (dotnet cannot be touched)
        const url = `/api/claim/get_payment_summary_seq_no?orgid=${orgid}&branchid=${branchId}&userid=${UserId}`;
        const response = await get(url, { usePython: true });

        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch sequence number");
        }
    } catch (error) {
        console.error("Error fetching PPP SeqNo:", error);
        return { status: false, message: error.message };
    }
};
//#endregion

export const GetPurchaseRequisitionItemDetails = async (id, orgId, branchId) => {
    try {
        debugger
        let url = `/PurchaseRequisition/GetMemoItemsList?branchid=${branchId}&orgid=${orgId}&memoid=${id}`;
        const res = await get(url);

        if (res?.status) {
            return res;
        } else {
            throw new Error(res?.message || "Failed to fetch purchase order list");
        }
    } catch (err) {
        console.error('Failed to load purchase order list', err);
        return { status: false, message: err.message };
    }
};


//#endregion
// #region DownloadMemoFileById
// #region
export const DownloadMemoFileById = async (fileId, filePath) => {
    try {
        const encodedPath = encodeURIComponent(filePath);
        // Using Python API for download
        const apiUrl = `${PYTHON_API_URL}/api/procurement_memo/download-file?file_id=${fileId}&file_path=${encodedPath}`;

        console.log("Downloading from:", apiUrl);

        const res = await axios.get(apiUrl, { responseType: 'blob' });

        const blob = res.data;

        if (!blob || typeof blob.size !== 'number' || typeof blob.type !== 'string') {
            throw new Error("Invalid file response");
        }

        // Extract filename from content-disposition header
        let filename = 'downloaded-file';
        const disposition = res.headers?.['content-disposition'];
        if (disposition) {
            const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i);
            if (match && match[1]) {
                filename = decodeURIComponent(match[1]);
            }
        }

        // Fallback to file path
        if (!filename.includes('.') && filePath) {
            const fallback = filePath.split('/').pop();
            if (fallback && fallback.includes('.')) filename = fallback;
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("File download failed", error);
        Swal.fire({
            icon: 'error',
            title: 'Download Failed',
            text: 'Could not download the file. ' + (error.message || ''),
        });
    }
};






export const ProcurementMemouploadFileToServer = async (files, memoId, branchId, userId) => {
    const formData = new FormData();

    // Multiple files, same key name: "file"
    files.forEach(f => {
        formData.append('file', f);
    });

    formData.append('memoid', memoId);
    formData.append('BranchId', branchId);
    formData.append('UserId', userId);

    try {
        const res = await axios.post(`${PYTHON_API_URL}/api/procurement_memo/upload-doc`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                accept: '*/*',
            },
        });

        if (res?.data?.Status) {
            return res.data;
        } else {
            return { status: false, message: res.data?.Message || "File upload failed" };
        }
    } catch (err) {
        console.error('File Upload Failed:', err);
        return false;
    }
};

export const DownloadPurchaseRequisitionFileById = async (fileId, filePath) => {
    console.log("DEBUG: Calling DownloadPurchaseRequisitionFileById", { fileId, filePath, PYTHON_API_URL });
    try {
        const encodedPath = encodeURIComponent(filePath);

        // Call new Python Download API
        const apiUrl = `${PYTHON_API_URL}/api/download_file/download?file_id=${fileId}&file_path=${encodedPath}`;
        console.log("DEBUG: Constructed API URL:", apiUrl);

        const res = await axios.get(apiUrl, { responseType: 'blob' });
        console.log("DEBUG: File download response received:", res);

        const blob = res.data;

        if (!blob || typeof blob.size !== 'number' || typeof blob.type !== 'string') {
            throw new Error("Invalid file response");
        }


        // Extract filename from content-disposition header
        let filename = 'downloaded-file';
        const disposition = res.headers?.['content-disposition'];
        if (disposition) {
            const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i);
            if (match && match[1]) {
                filename = decodeURIComponent(match[1]);
            }
        }

        // Fallback to file path
        if (!filename.includes('.') && filePath) {
            const fallback = filePath.split('/').pop();
            if (fallback && fallback.includes('.')) filename = fallback;
        }

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("File download failed", error);
        Swal.fire({
            icon: 'error',
            title: 'Download Failed',
            text: 'Could not download the file. ' + (error.message || ''),
        });
    }
};

export const GetPOSupplierAutoComplete = async (orgId, branchId, searchText = '%') => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/PurchaseOrder/GetPOSupplierAutoComplete?orgid=${orgId}&branchid=${branchId}&suppliername=${encoded}`
        );
        return res;
    } catch (error) {
        console.error('Failed to fetch supplier list', error);
        return { status: false, message: error.message };
    }
};

export const GetPONOAutoComplete = async (orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/PurchaseOrder/GetPOnoAutoComplete?orgid=${orgId}&branchid=${branchId}&ponumber=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch user details", error);
        return { status: false, message: error.message };
    }
};

export const GetGRNSupplierAutoComplete = async (orgId, branchId, searchText = '%') => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/GoodsReceiptNote/GetGrnSupplierAutocomplete?orgid=${orgId}&branchid=${branchId}&suppliername=${encoded}`
        );
        return res;
    } catch (error) {
        console.error('Failed to fetch supplier list', error);
        return { status: false, message: error.message };
    }
};

export const GetGRNNOAutoComplete = async (orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/GoodsReceiptNote/GetGrnNoAutoComplete?orgid=${orgId}&branchid=${branchId}&grnno=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch user details", error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierMasterAutoComplete = async (orgId, branchId, searchText = "%") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/SupplierMaster/get-all-GetSupplierList?orgid=${orgId}&branchid=${branchId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch supplier list", error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierCityAutoComplete = async (orgId, branchId, searchText = "%") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/SupplierMaster/get-all-GetCityList?orgid=${orgId}&branchid=${branchId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch city list", error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierStateAutoComplete = async (orgId, branchId, searchText = "%") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/SupplierMaster/get-all-GetStateList?orgid=${orgId}&branchid=${branchId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch state list", error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierBankAutoComplete = async (orgId, branchId, searchText = "%") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/SupplierMaster/GetBankAutoComplete?orgid=${orgId}&branchid=${branchId}&bankname=${encoded}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch bank list", error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierCategoryAutoComplete = async (orgId, branchId, searchText = "%") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/SupplierMaster/get-all-GetSupplierCategoryList?orgid=${orgId}&branchid=${branchId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch category list", error);
        return { status: false, message: error.message };
    }
};

// 🔹 Core Supplier APIs
export const GetAllSuppliers = async (
    orgId,
    branchId,
    supplierId = 0,
    cityId = 0,
    stateId = 0,
    categoryId = 0,
    bankId = 0
) => {
    try {
        const res = await get(
            `/SupplierMaster/get-all-supplier?orgid=${orgId}&branchid=${branchId}&supplierid=${supplierId}&cityid=${cityId}&stateid=${stateId}&suppliercategoryid=${categoryId}&bankid=${bankId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch suppliers", error);
        return { status: false, message: error.message };
    }
};

export const ChangeSupplierStatus = async (supplierId, status) => {
    try {
        return await post(`/SupplierMaster/ChangeStatus`, { supplierId, status });
    } catch (error) {
        console.error("Failed to change supplier status", error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierById = async (supplierId, orgId, branchId) => {
    try {
        return await get(
            `/SupplierMaster/get-all-supplier?orgid=${orgId}&branchid=${branchId}&supplierid=${supplierId}&cityid=${0}&stateid=${0}&suppliercategoryid=${0}&bankid=${0}`
        );
    } catch (error) {
        console.error("Failed to fetch supplier by ID", error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierCountries = async (orgId, branchId) => {
    try {
        return await get(`/SupplierMaster/get-all-GetCountryList?orgid=${orgId}&branchid=${branchId}`);
    } catch (error) {
        console.error("Failed to fetch countries", error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierTaxList = async (orgId, branchId) => {
    try {
        return await get(`/SupplierMaster/get-all-GetAllTaxist?orgid=${orgId}&branchid=${branchId}`);
    } catch (error) {
        console.error("Failed to fetch tax list", error);
        return { status: false, message: error.message };
    }
};


export const GetSupplierVATList = async (orgId, branchId) => {
    try {
        return await get(`/SupplierMaster/get-all-GetAllVATist?orgid=${orgId}&branchid=${branchId}`);
    } catch (error) {
        console.error("Failed to fetch vat list", error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierCurrencies = async (orgId, branchId) => {
    try {
        return await get(`/SupplierMaster/get-all-GetCurrencyList?orgid=${orgId}&branchid=${branchId}`);
    } catch (error) {
        console.error("Failed to fetch currencies", error);
        return { status: false, message: error.message };
    }
};

export const SaveSupplierMaster = async (isEditMode, payload) => {
    try {
        const endpoint = isEditMode
            ? `/SupplierMaster/Update`
            : `/SupplierMaster/Create`;

        const method = isEditMode ? put : post;

        const response = await method(endpoint, payload);

        if (response?.status === true) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to save supplier master");
        }
    } catch (error) {
        console.error("SaveSupplierMaster Error:", error);
        throw error;
    }
};

export const GetItemCodeAutoComplete = async (orgId, branchId, searchText = "%") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/ItemMaster/get-all-GetAllitemcode?orgid=${orgId}&branchid=${branchId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch item code list", error);
        return { status: false, message: error.message };
    }
};

export const GetItemGroupAutoComplete = async (orgId, branchId, searchText = "%") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/ItemMaster/get-all-GetAllItemgroup?orgid=${orgId}&branchid=${branchId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch item group list", error);
        return { status: false, message: error.message };
    }
};

export const GetItemNameAutoComplete = async (orgId, branchId, searchText = "%") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/ItemMaster/get-all-GetAllitemname?orgid=${orgId}&branchid=${branchId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch item name list", error);
        return { status: false, message: error.message };
    }
};

export const GetItemCategoryAutoComplete = async (orgId, branchId, searchText = "%") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/ItemMaster/get-all-GetAllItemCategory?orgid=${orgId}&branchid=${branchId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch item category list", error);
        return { status: false, message: error.message };
    }
};

export const GetItemUomList = async (orgId, branchId) => {
    try {
        const res = await get(`/ItemMaster/get-all-GetAllUom?orgid=${orgId}&branchid=${branchId}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch UOM list", error);
        return { status: false, message: error.message };
    }
};

export const GetAllItems = async (
    orgId,
    branchId,
    itemCodeId = 0,
    itemNameId = 0,
    itemGroupId = 0,
    itemCategoryId = 0,
    itemId = 0,
) => {
    try {
        const res = await get(
            `/ItemMaster/get-all-item?orgid=${orgId}&branchid=${branchId}&itemcode=${itemCodeId}&itemname=${itemNameId}&groupid=${itemGroupId}&categoryid=${itemCategoryId}&itemid=${itemId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch items", error);
        return { status: false, message: error.message };
    }
};

export const SaveItemMaster = async (isEditMode, payload) => {
    try {
        const endpoint = isEditMode
            ? `/ItemMaster/Update`
            : `/ItemMaster/Create`;

        const method = isEditMode ? put : post;

        const response = await method(endpoint, payload);

        if (response?.status === true) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to save item master");
        }
    } catch (error) {
        console.error("SaveItemMaster Error:", error);
        throw error;
    }
};


// Claim Category AutoComplete API
export const GetClaimCategoryAutoComplete = async (orgId, branchId, searchText = "%") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/ClaimDescriptionMaster/get-all-category?orgid=${orgId}&branchid=${branchId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch claim category list", error);
        return { status: false, message: error.message };
    }
};

// Claim Type AutoComplete API (based on Claim Category)
export const GetClaimTypeAutoComplete = async (orgId, branchId, claimCategoryId, searchText = "%") => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(
            `/ClaimDescriptionMaster/get-category-types?orgid=${orgId}&branchid=${branchId}&typeid=${claimCategoryId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch claim type list", error);
        return { status: false, message: error.message };
    }
};

export const SaveClaimPaymentDescription = async (isEditMode, payload) => {
    try {
        const endpoint = isEditMode
            ? `/ClaimDescriptionMaster/Update`
            : `/ClaimDescriptionMaster/Create`;

        const method = isEditMode ? put : post;

        const response = await method(endpoint, payload);

        if (response?.status === true) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to save claim payment description");
        }
    } catch (error) {
        console.error("SaveClaimPaymentDescription Error:", error);
        throw error;
    }
};

export const GetAllClaimPaymentDescriptions = async (
    orgId,
    branchId,
    claimCategoryId = 0,
    claimTypeId = 0
) => {
    try {
        const res = await get(
            `/ClaimDescriptionMaster/searchbyCategory?orgid=${orgId}&branchid=${branchId}&categoryid=${claimCategoryId}&claimtypeid=${claimTypeId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch claim payment descriptions", error);
        return { status: false, message: error.message };
    }
};

export const GetClaimPaymentDescriptionById = async (id) => {
    try {
        const res = await get(`/ClaimDescriptionMaster/GetDescriptionEditId?id=${id}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch claim payment description by id", error);
        return { status: false, message: error.message };
    }
};

export const ChangeDescriptionStatus = async (paymentid) => {
    try {
        const res = await put("/ClaimDescriptionMaster/DescriptionstatusChange", { paymentid });
        return res;
    } catch (error) {
        console.error("Failed to change description status", error);
        return { status: false, message: error.message };
    }
};

export const GetSupplierCurrencyList = async (supplierId, branchId, orgId) => {
    try {
        const response = await get(`/PurchaseOrder/GetSupplierCurrencyList?supplierid=${supplierId}&branchid=${branchId}&orgid=${orgId}`);
        return response;
    } catch (err) {
        console.error("Failed to load supplier currency list!", err);
        return { status: false, message: err.message };
    }
};

export const GetPRNoBySupplierAndCurrency = async (supplierId, currencyId, orgId, branchId) => {
    try {
        const response = await get(`/PurchaseOrder/GetPurchaseRequositionList?supplierid=${supplierId}&currencyid=${currencyId}&orgid=${orgId}&BranchId=${branchId}`);
        return response;
    } catch (err) {
        console.error("Failed to load PR No list!", err);
        return { status: false, message: err.message };
    }
};

// Payment Term API
export const GetSupplierPaymentTerms = async (orgId, branchId) => {
    try {
        return await get(`/SupplierMaster/get-all-Paymentterms?orgid=${orgId}&branchid=${branchId}`);
    } catch (error) {
        console.error("Failed to fetch payment terms", error);
        return { status: false, message: error.message };
    }
};

// Delivery Term API
export const GetSupplierDeliveryTerms = async (orgId, branchId) => {
    try {
        return await get(`/SupplierMaster/get-all-Deliveryterms?orgid=${orgId}&branchid=${branchId}`);
    } catch (error) {
        console.error("Failed to fetch delivery terms", error);
        return { status: false, message: error.message };
    }
};

export const GetPurchaseOrderPrint = async (poId, branchId, orgId, opt = 0) => {
    try {
        return await get(
            `/PurchaseOrder/GetPurchaseOrderPrint?opt=${opt}&poid=${poId}&branchid=${branchId}&orgid=${orgId}`
        );
    } catch (error) {
        console.error("Failed to fetch purchase order print", error);
        return { status: false, message: error.message };
    }
};

export const GetPurchaseRequisitionApprovals = async (id, orgId, branchId, userId) => {
    try {
        const res = await get(
            `/RequisitionApproval/GetAll?Id=${id}&orgid=${orgId}&BranchId=${branchId}&UserId=${userId}`
        );
        return res;
    } catch (error) {
        console.error("Failed to fetch purchase requisition approvals", error);
        return { status: false, message: error.message };
    }
};

export const GetPurchaseRequisitionRemarks = async (prid) => {
    try {
        // Call Python API directly, not .NET API
        const response = await axios.get(`${PYTHON_API_URL}/procurement/get_remarks_history?prid=${prid}`);
        console.log("GetPurchaseRequisitionRemarks response:", response.data);
        // Python API returns array directly
        if (Array.isArray(response.data)) {
            return response.data;
        }
        // Fallback
        return [];
    } catch (error) {
        console.error("Failed to fetch purchase requisition remarks", error);
        return [];
    }
};

export const GetPurchaseRequisitionHistory = async (id, userId, branchId, orgId, fromDate, toDate) => {
    try {
        const res = await get(
            `/RequisitionApproval/GetHistory?Id=${id}&UserId=${userId}&BranchId=${branchId}&orgid=${orgId}&fromdate=${fromDate}&todate=${toDate}`
        );

        return res || [];
    } catch (error) {
        console.error("Failed to fetch purchase requisition history", error);
        return { status: false, message: error.message };
    }
};

export const SavePRApprove = async (payload) => {
    try {
        const response = await post("/RequisitionApproval/Approve", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to save PR approval");
        }
    } catch (error) {
        console.error("PR Approve Error:", error);
        throw error;
    }
};

// Invoice Receipt Note API Start
export const GetAllIRNList = async (
    branchId,
    orgId,
    supplierId = 0,
    irnId = 0,
    fromDate,
    toDate, userid,
    currencyId = 0
) => {
    try {
        const res = await get(
            `/IRNList/Get-All-IRN-List?branchid=${branchId}&orgid=${orgId}&supplierid=${supplierId}&irnid=${irnId}&fromdate=${fromDate}&todate=${toDate}&userid=${userid}&currencyid=${currencyId}`
        );

        return res || [];
    } catch (error) {
        console.error("Failed to fetch IRN list", error);
        return { status: false, message: error.message };
    }
};

// Invoice Receipt Note API Start
export const GetPaymentHistory = async (
    branchId,
    orgId,
    supplierId = 0,

    fromDate,
    toDate
) => {
    try {
        const res = await get(
            `/IRNList/PaymentHistory?branchid=${branchId}&orgid=${orgId}&supplierid=${supplierId}&fromdate=${fromDate}&todate=${toDate}`
        );

        return res || [];
    } catch (error) {
        console.error("Failed to fetch IRN list", error);
        return { status: false, message: error.message };
    }
};

export const GetInvoiceReceiptAddDetails = async (branchId, orgId, fromDate, toDate) => {
    try {
        const res = await get(
            `/InvoiceReceipt/getInvoicereceiptAddDetails?branchid=${branchId}&orgid=${orgId}&fromdate=${fromDate}&todate=${toDate}`
        );
        return res || [];
    } catch (error) {
        console.error("Failed to fetch invoice receipt add details", error);
        return { status: false, message: error.message };
    }
};

export const SaveAddIRNGRNDet = async (payload) => {
    try {
        const response = await post("/InvoiceReceipt/AddIRNGRNDet", payload);

        if (response) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to save IRN data");
        }
    } catch (error) {
        console.error("IRN Save Error:", error);
        throw error;
    }
};

export const GenerateSPC = async (payload) => {
    try {
        const response = await put("/InvoiceReceipt/InvoiceReceiptGenerateIRN", payload);
        if (response) return response;
        throw new Error(response?.message || "Failed to generate SPC");
    } catch (error) {
        console.error("SPC Error:", error);
        throw error;
    }
};

export const uploadIRNAttachment = async ({ files, grnId, branchId, userId }) => {
    const formData = new FormData();

    // Append each file
    files.forEach((file) => {
        formData.append('file', file);
    });

    // Append other required fields
    //   formData.append('receiptnote_hdr_id', receiptnote_hdr_id);
    formData.append('grnid', grnId);
    formData.append('BranchId', branchId);
    formData.append('UserId', userId);

    try {
        const res = await post('/InvoiceReceipt/upload-attachment', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
                accept: '*/*',
            },
        });

        return res?.status || false;
    } catch (err) {
        console.error('IRN File Upload Failed:', err);
        return false;
    }
};

export const DownloadInvoiceReceiptFile = async (receiptnoteHdrId, filePath) => {
    try {
        const encodedPath = encodeURIComponent(filePath);

        const res = await get(
            `/InvoiceReceipt/download-invoiceIRN?file_path=${encodedPath}&receiptnote_hdr_id=${receiptnoteHdrId}`,
            { responseType: 'blob' }
        );

        const blob = res;

        if (!blob || typeof blob.size !== 'number' || typeof blob.type !== 'string') {
            throw new Error("Invalid file response");
        }

        // Extract filename from content-disposition header
        let filename = 'downloaded-file';
        const disposition = res.headers?.['content-disposition'];
        if (disposition) {
            const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^;"'\n]+)["']?/i);
            if (match && match[1]) {
                filename = decodeURIComponent(match[1]);
            }
        }

        // Fallback to file path
        if ((!filename || !filename.includes('.')) && filePath) {
            const fallback = filePath.split('/').pop();
            if (fallback && fallback.includes('.')) filename = fallback;
        }

        // Trigger download
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

    } catch (error) {
        console.error("❌ File download failed", error);
        Swal.fire({
            icon: 'error',
            title: 'Download Failed',
            text: 'Could not download the file.',
        });
    }
};

export const IRNGetBy = async (irnid, branchId, orgId) => {
    try {
        const res = await get(`/IRNList/GetByIRNId?irnid=${irnid}&branchid=${branchId}&orgid=${orgId}`);
        return res || {};
    } catch (error) {
        console.error("Failed to fetch IRN by ID", error);
        return { status: false, message: error.message };
    }
};

export const UpdateIsActive = async (itemId, isActive) => {
    try {
        const response = await put(`/ItemMaster/UpdateIsActive?itemid=${itemId}&isactive=${isActive ? true : false}`);
        return response;
    } catch (err) {
        console.error("Failed to load supplier currency list!", err);
        return { status: false, message: err.message };
    }
};

export const GetPurchaseRequisitionPRType = async (orgId, branchId, searchText) => {
    try {
        const encoded = encodeURIComponent(searchText);
        const res = await get(`/PurchaseRequisition/GetPRTypeAutoComplete?orgid=${orgId}&branchid=${branchId}&prtype=${encoded}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch pr type details", error);
        return { status: false, message: error.message };
    }
};

export const GetItemMasterSeqNo = async (orgId, branchId) => {
    try {
        const res = await get(`/ItemMaster/getItemCodeSeqId?orgid=${orgId}&branchid=${branchId}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch Purchase Memo Sequence Number", error);
        return { status: false, message: error.message };
    }
};

export const saveOrUpdatePettyCash = async (payload, isEdit = false, file = null) => {
    try {
        const url = isEdit ? `${PYTHON_API_URL}/pettycash/update` : `${PYTHON_API_URL}/pettycash/create`;

        const formData = new FormData();
        formData.append("payload", JSON.stringify(payload));

        if (file) {
            formData.append("file", file);
        }

        // For Update, the backend explicitly requires PettyCashId as a form field
        if (isEdit && payload.Header?.PettyCashId) {
            formData.append("PettyCashId", payload.Header.PettyCashId);
        }

        const method = isEdit ? 'put' : 'post';

        const response = await axios({
            method: method,
            url: url,
            data: formData,
            headers: { "Content-Type": "multipart/form-data" }
        });

        return response.data;
    } catch (error) {
        console.error("Error saving/updating petty cash:", error);
        throw error;
    }
};

/**
 * Creates one or more cash book entries (Receipts/Payments/Transfers).
 * Calls the Python backend endpoint for Cash Book creation.
 */
export const saveCashReceipt = async (payload) => {
    try {
        const url = `${PYTHON_API_URL}/AR/cash/create`;
        const response = await axios.post(url, payload);
        return response.data;
    } catch (error) {
        console.error("Error creating cash book entry:", error);
        throw error;
    }
};

export const getPettyCashList = async (orgId, branchId, pettycashId = null, expType = null, voucherNo = null, categoryId = null, fromDate = null, toDate = null) => {
    try {
        debugger
        let url = `${PYTHON_API_URL}/pettycash/list?orgid=${orgId}&branchid=${branchId}&pettycashid=${pettycashId ?? 0}&exptype=${expType || 0}&category_id=${categoryId || 0}`;
        if (voucherNo) url += `&voucherno=${encodeURIComponent(voucherNo)}`;
        if (fromDate) url += `&FromDate=${fromDate}`;
        if (toDate) url += `&ToDate=${toDate}`;
        const response = await axios.get(url);
        return response.data.data || [];
    } catch (error) {
        console.error("Failed to fetch expense list", error);
        return [];
    }
};

export const getPettyCashById = async (pettyCashId, branchId = 1, orgId = 1) => {
    try {
        const url = `${PYTHON_API_URL}/pettycash/get-by-id?pettycashid=${pettyCashId}&branchid=${branchId}&orgid=${orgId}`;
        const response = await axios.get(url);
        if (response.data.status) {
            return response.data.data;
        } else {
            throw new Error(response.data.message || "Failed to fetch petty cash data");
        }
    } catch (error) {
        console.error("Failed to fetch petty cash data by ID", error);
        throw error;
    }
};

export const getPettyCashGroupById = async (pettyCashId, branchId = 1, orgId = 1) => {
    try {
        const url = `${PYTHON_API_URL}/pettycash/get-group-by-id?pettycashid=${pettyCashId}&branchid=${branchId}&orgid=${orgId}`;
        const response = await axios.get(url);
        if (response.data.status) {
            return response.data.data;
        } else {
            return [];
        }
    } catch (error) {
        console.error("Failed to fetch petty cash group:", error);
        return [];
    }
};

export const getExpenseDescriptions = async (orgId, branchId) => {
    try {
        debugger
        const url = `${PYTHON_API_URL}/pettycash/expense-descriptions?branchId=${branchId}&orgId=${orgId}`;
        const response = await axios.get(url);
        return response.data.data || [];
    } catch (error) {
        console.error("Failed to fetch expense descriptions", error);
        return [];
    }
};

export const getPettyCashCategories = async (orgId, branchId) => {
    try {
        const url = `${PYTHON_API_URL}/pettycash/master-expense-categories?branchId=${branchId}&orgId=${orgId}`;
        const response = await axios.get(url);
        return response.data.data || [];
    } catch (error) {
        console.error("Failed to fetch expense categories", error);
        return [];
    }
};


export const getPettyCashExpenseTypes = async (orgId, branchId, categoryId = null) => {
    try {
        const url = `${PYTHON_API_URL}/pettycash/master-expense-types?branchId=${branchId}&orgId=${orgId}&category_id=${categoryId || 0}`;
        const response = await axios.get(url);
        return response.data.data || [];
    } catch (error) {
        console.error("Failed to fetch expense types", error);
        return [];
    }
};

export const GetPettyCashSeqNum = async (branchId, orgId, userid) => {
    try {
        debugger
        const url = `${PYTHON_API_URL}/pettycash/get-seq-num?branchId=${branchId}&orgid=${orgId}&userid=${userid}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch Seq Num', error);
        return { status: false, message: error.message || 'Server error' };
    }
};

export const getPettyCashCurrency = async (orgId, branchId) => {
    try {
        const url = `${PYTHON_API_URL}/pettycash/master-currency?branchId=${branchId}&orgId=${orgId}`;
        const response = await axios.get(url);
        return response.data.data || [];
    } catch (error) {
        console.error("Failed to fetch currency", error);
        return [];
    }
};

export const getPettyCashImagePath = async (pettycashid, branchId = 1, orgId = 1) => {
    try {
        const url = `${PYTHON_API_URL}/pettycash/get-image-path?pettycashid=${pettycashid}&branchid=${branchId}&orgid=${orgId}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error("Failed to fetch image path", error);
        return { status: false, message: "Failed to fetch image path" };
    }
};





export const GetAllAccessRights = async (branchId = 1, orgId = 1) => {
    try {
        const response = await get(`/AccessRights/GetAllAccessRights?branchId=${branchId}&orgId=${orgId}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch access rights");
        }
    } catch (error) {
        console.error("Error fetching access rights:", error);
        return { status: false, message: "Failed to fetch access rights" };
    }
};

export const GetAccessRightsById = async (id) => {
    try {
        const response = await get(`/AccessRights/GetAccessRightsById?id=${id}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch access rights by ID");
        }
    } catch (error) {
        console.error("Error fetching access rights by ID:", error);
        return { status: false, message: "Failed to fetch access rights by ID" };
    }
};


export const UpdateUserStatus = async (payload) => {
    try {
        const response = await post(`/AccessRights/UpdateUserStatus`, payload);
        if (response?.statusCode === 200) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to update status");
        }
    } catch (error) {
        console.error("Error updating user status:", error);
        return { statusCode: 500, message: "Failed to update status" };
    }
};


export const GetRolesDropdown = async (branchId = 1, orgId = 1) => {
    try {
        const response = await get(`/AccessRights/GetRolesDropdown?branchId=${branchId}&orgId=${orgId}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch roles");
        }
    } catch (error) {
        console.error("Error fetching roles:", error);
        return { status: false, data: [] };
    }
};


export const GetDepartmentsDropdown = async (branchId = 1, orgId = 1) => {
    try {
        const response = await get(`/AccessRights/GetDepartmentsDropdown?branchId=${branchId}&orgId=${orgId}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch departments");
        }
    } catch (error) {
        console.error("Error fetching departments:", error);
        return { status: false, data: [] };
    }
};

export const GetModuleScreens = async (branchId = 1, orgId = 1) => {
    try {
        const response = await get(`/AccessRights/GetModuleScreens?branchId=${branchId}&orgId=${orgId}`);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to fetch module screens");
        }
    } catch (error) {
        console.error("Error fetching module screens:", error);
        return { status: false, data: [] };
    }
};

export const SaveAccessRights = async (payload) => {
    try {
        const response = await post(`/AccessRights/SaveAccessRights`, payload);



        if (response.status) {
            return {
                status: true,
                data: response.data,
                message: response.message || 'Access rights saved successfully',
                statusCode: response.status || response.statusCode
            };
        } else {
            throw new Error(response?.message || 'Failed to save access rights');
        }
    } catch (error) {
        console.error('Error saving access rights:', {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data
        });
        return {
            status: false,
            message: error.message || 'Failed to save access rights',
            statusCode: error.response?.status
        };
    }
};
export const GetGLDetailsById = async (id) => {
    try {
        const res = await get(`/GLCodeMaster/GetAccountTypeDetailsById/${id}`);
        return res || {};
    } catch (error) {
        console.error("Failed to fetch GL details by Id", error);
        return {};
    }
};
export const UpdateAccessRights = async (headerId, payload) => {
    try {
        const response = await put(`/AccessRights/UpdateAccessRights/${headerId}`, payload);
        if (response?.status) {
            return response;
        } else {
            throw new Error(response?.message || "Failed to update access rights");
        }
    } catch (error) {
        console.error("Error updating access rights:", error);
        return { status: false, message: "Failed to update access rights" };
    }
};


export const saveOrUpdateRevenue = async (payload, isEdit = false) => {
    try {
        debugger
        const url = isEdit ? "/Revenue/update" : "/Revenue/create";
        const requestFn = isEdit ? put : post;
        const response = await requestFn(url, payload);
        return response.data;
    } catch (error) {
        console.error("Error saving/updating Revenue:", error);
        throw error;
    }
};

export const getRevenueList = async (orgId, branchId, revenueId = null, revType = null, voucherNo = null) => {
    try {
        debugger
        const response = await get('/Revenue/list', {
            params: {
                orgid: orgId,
                branchid: branchId,
                revenueid: revenueId ?? 0,
                revtype: revType ?? null,
                voucherno: voucherNo ?? null,
            }
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch Revenue Type list", error);
        return [];
    }
};

export const getRevenueType = async (orgId, branchId) => {
    try {
        debugger
        const response = await get('/Revenue/revenuetype-list', {
            params: {
                branchId: branchId,
                orgId: orgId
            }
        });
        return response.data;
    } catch (error) {
        console.error("Failed to fetch revenue type list", error);
        return [];
    }
};

export const GetRevenueSeqNum = async (branchId, orgId, userid) => {
    try {
        debugger
        const response = await get(`/Revenue/get-seq-num?branchId=${branchId}&orgid=${orgId}&userid=${userid}`);
        return response;
    } catch (error) {
        console.error('Failed to fetch Seq Num', error);
        return { status: false, message: error.message || 'Server error' };
    }
};

export const getCashBookList = async ({ orgid, branchid, fromDate, toDate }) => {
    debugger
    const params = new URLSearchParams();
    params.append("orgid", orgid);
    params.append("branchid", branchid);
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);

    const response = await get(`/CashBook/list?${params.toString()}`);
    return response;
};

export const getBankBookList = async ({ orgid, branchid, fromDate, toDate, bankid }) => {
    debugger
    const params = new URLSearchParams();
    params.append("orgid", orgid);
    params.append("branchid", branchid);
    params.append("bankid", bankid);
    if (fromDate) params.append("fromDate", fromDate);
    if (toDate) params.append("toDate", toDate);

    const response = await get(`/BankBook/list?${params.toString()}`);
    return response;
};



export const getOverDraftList = async (overdraftId = null, overdraftType = null, voucherNo = null, orgId, branchId) => {
    try {
        const params = new URLSearchParams({
            orgid: orgId,
            branchid: branchId,
            overdraftid: overdraftId ?? 0,
        });
        if (overdraftType) params.append('overdrafttype', overdraftType);
        if (voucherNo) params.append('voucherno', voucherNo);

        const response = await axios.get(`${PYTHON_API_URL}/overdraft/list?${params.toString()}`);
        return response.data.data;
    } catch (error) {
        console.error("Failed to fetch OverDraft list", error);
        return [];
    }
};

export const saveOrUpdateOverDraft = async (payload, isEdit = false) => {
    try {
        const url = isEdit ? `${PYTHON_API_URL}/overdraft/update` : `${PYTHON_API_URL}/overdraft/create`;
        const method = isEdit ? 'put' : 'post';
        const response = await axios({ method, url, data: payload });
        return response.data;
    } catch (error) {
        console.error("Error saving/updating OverDraft:", error);
        throw error;
    }
};

export const GetOverDraftSeqNum = async (branchId, orgId, userid) => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/overdraft/get-seq-num?branchId=${branchId}&orgid=${orgId}&userid=${userid}`);
        return response.data;
    } catch (error) {
        console.error('Failed to fetch Seq Num', error);
        return { status: false, message: error.message || 'Server error' };
    }
};

export const GetUserAccess = async (userId) => {
    try {
        const response = await get(
            `/AccessRights/GetUserAccess?userId=${userId}&branchId=1&orgId=1`
        );

        return response;
    } catch (error) {
        console.error("Failed to fetch User Access:", error);
        return { status: false, message: error.message || "Server error" };
    }
};

export const GetAllPO = async (branchId, orgId, PRId) => {
    try {
        debugger
        const response = await get(`/PurchaseRequisition/GetAllPO?branchId=${branchId}&orgid=${orgId}&PRId=${PRId}`);
        return response;
    } catch (error) {
        console.error('Failed to fetch PO Num', error);
        return { status: false, message: error.message || 'Server error' };
    }
};

export const GetAllAccountCategory = async (orgId, branchId) => {
    try {
        const res = await get(`/AccountCategory/GetAllAccountCategory`);
        return res;
    } catch (error) {
        console.error("Failed to fetch AccountCategory list", error);
        return { status: false, message: error.message };
    }
};

export const GetAllAccountType = async (orgId, branchId) => {
    try {
        const res = await get(`/AccountType/GetAllAccountType`);
        return res;
    } catch (error) {
        console.error("Failed to fetch account type list", error);
        return { status: false, message: error.message };
    }
};
export const GenerateGLSequence = async (categoryId, id) => {
    try {
        const res = await get(
            `/GLCodeMaster/GenerateSequence?categoryId=${categoryId}&id=${id}`
        );
        return res || {};
    } catch (error) {
        console.error("Failed to generate GL sequence", error);
        return { status: false, message: error.message };
    }
};

export const SaveGlCodeMaster = async (isEditMode, payload) => {
    try {
        const endpoint = isEditMode
            ? `/GLCodeMaster/UpdateGlCodeMaster`
            : `/GLCodeMaster/CreateGlCodeMaster`;
        const method = isEditMode ? put : post;
        const response = await method(endpoint, payload);
        return response;
    } catch (error) {
        console.error("SaveGlCodeMaster Error:", error);
        throw error;
    }
};
export const GetAllGlCodeMaster = async (orgId, branchId) => {
    try {
        const res = await get(`/GLCodeMaster/GetAllAccountTypeDetails`);
        return res;
    } catch (error) {
        console.error("Failed to fetch glcodemaster list", error);
        return { status: false, message: error.message };
    }
};

export const SavePRReply = async (pr_id, reply, name, sender) => {
    console.log("SAVE PR REPLY PAYLOAD", {
        pr_id,
        reply,
        name,
        sender
    });
    try {
        const res = await axios.post(`${PYTHON_API_URL}/procurement/save_pr_reply`, {
            pr_id,
            reply,
            name,
            sender
        }, {
            headers: {
                "Content-Type": "application/json"
            }
        });
        return res.data;
    } catch (error) {
        console.error("Failed to save PR reply", error);
        return { status: false, message: error.message };
    }
};

//#region DeletePrAttachment
export const DeletePrAttachment = async (prattachid) => {
    try {
        const response = await axios.delete(`${PYTHON_API_URL}/pr/attachment/${prattachid}`);
        if (response.data && response.data.status) {
            return response.data;
        } else {
            throw new Error(response.data?.detail || "Failed to delete attachment");
        }
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return { status: true, message: "Attachment already deleted" };
        }
        console.error("Error deleting attachment:", error);
        throw error;
    }
};
//#region Claim Discussion Logic
export const SaveHodDiscussion = async (payload) => {
    try {
        const response = await axios.post(`${PYTHON_API_URL}/api/claim/save_hod_discussion`, payload);
        return response.data;
    } catch (error) {
        console.error("Error saving HOD discussion:", error);
        return { status: false, message: error.message };
    }
};

export const SaveApplicantReply = async (payload) => {
    try {
        const response = await axios.post(`${PYTHON_API_URL}/api/claim/save_applicant_reply`, payload);
        return response.data;
    } catch (error) {
        console.error("Error saving applicant reply:", error);
        return { status: false, message: error.message };
    }
};

export const GetClaimHistory = async (claimId) => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/api/claim/get_history/${claimId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching claim history:", error);
        return { status: false, message: error.message };
    }
};
//#endregion
//#endregion

export const SaveHodGmDiscussion = async (payload) => {
    try {
        const response = await axios.post(`${PYTHON_API_URL}/api/claim/save_hod_gm_discussion`, payload);
        return response.data;
    } catch (error) {
        console.error("Error saving HOD-GM discussion:", error);
        const errMsg = error.response?.data?.detail || error.message;
        return { status: false, message: errMsg };
    }
};

export const GetHodGmHistory = async (claimId) => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/api/claim/get_hod_gm_history/${claimId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching HOD-GM history:", error);
        return { status: false, message: error.message };
    }
};

export const SaveGmDirectorDiscussion = async (payload) => {
    try {
        const response = await axios.post(`${PYTHON_API_URL}/api/claim/save_gm_director_discussion`, payload);
        return response.data;
    } catch (error) {
        console.error("Error saving GM-Director discussion:", error);
        const errMsg = error.response?.data?.detail || error.message;
        return { status: false, message: errMsg };
    }
};

export const GetGmDirectorHistory = async (claimId) => {
    try {
        const response = await axios.get(`${PYTHON_API_URL}/api/claim/get_gm_director_history/${claimId}`);
        return response.data;
    } catch (error) {
        console.error("Error fetching GM-Director history:", error);
        return { status: false, message: error.message };
    }
};
//#region GetApprovalDiscussionList
export const GetApprovalDiscussionList = async (orgId, branchId, userId) => {
    try {
        const response = await get(`/ClaimApproval/GetDiscussion?orgid=${orgId}&BranchId=${branchId}&UserId=${userId}`);
        if (response?.status) {
            return response;
        } else {
            // If api returns status:false (e.g. no discussions), return empty structure rather than throwing
            return { status: true, data: [] };
        }
    } catch (error) {
        console.log("Error in GetApprovalDiscussionList:", error); // Log silently, don't break app
        return { status: false, data: [] };
    }
};

export const getAllCreditNotes = async () => {
    try {
        const response = await get(`${PYTHON_API_URL}/dn_cn/get-all-credit-notes`);
        if (response?.status === "success") {
            return response;
        } else {
            console.error(response?.message || "Failed to fetch credit notes");
            return { status: "error", message: response?.message };
        }
    } catch (error) {
        console.error("Error fetching credit notes:", error);
        return { status: "error", message: error.message };
    }
};

export const getAllDebitNotes = async () => {
    try {
        const response = await get(`${PYTHON_API_URL}/dn_cn/get-all-debit-notes`);
        if (response?.status === "success") {
            return response;
        } else {
            console.error(response?.message || "Failed to fetch debit notes");
            return { status: "error", message: response?.message };
        }
    } catch (error) {
        console.error("Error fetching debit notes:", error);
        return { status: "error", message: error.message };
    }
};

export const getCustomersDNCN = async () => {
    try {
        const response = await get(`${PYTHON_API_URL}/dn_cn/get-customers`);
        if (response?.status === "success") {
            return response;
        } else {
            console.error(response?.message || "Failed to fetch customers");
            return { status: "error", message: response?.message };
        }
    } catch (error) {
        console.error("Error fetching customers:", error);
        return { status: "error", message: error.message };
    }
};

export const getOutstandingInvoices = async (customerId, receiptId = null, fromDate = null, toDate = null, onlyAllocated = false) => {
    try {
        let url = `${PYTHON_API_URL}/AR/get-outstanding-invoices/${customerId}`;
        const params = [];
        if (receiptId) params.push(`receipt_id=${receiptId}`);
        if (fromDate) params.push(`from_date=${fromDate}`);
        if (toDate) params.push(`to_date=${toDate}`);
        if (onlyAllocated) params.push(`only_allocated=true`);

        if (params.length > 0) {
            url += `?${params.join('&')}`;
        }
        const response = await get(url);
        if (response?.status) {
            return response;
        } else {
            return response;
        }
    } catch (error) {
        console.error("Error fetching invoices:", error);
        return { status: false, message: error.message };
    }
};

export const createCreditNote = async (payload) => {
    try {
        const response = await post(`${PYTHON_API_URL}/dn_cn/create-credit-note`, payload);
        if (response?.status === "success") {
            return response;
        } else {
            throw new Error(response?.message || "Failed to create credit note");
        }
    } catch (error) {
        console.error("Error creating credit note:", error);
        throw error;
    }
};

export const createDebitNote = async (payload) => {
    try {
        const response = await post(`${PYTHON_API_URL}/dn_cn/create-debit-note`, payload);
        if (response?.status === "success") {
            return response;
        } else {
            throw new Error(response?.message || "Failed to create debit note");
        }
    } catch (error) {
        console.error("Error creating debit note:", error);
        throw error;
    }
};

export const updateCreditNote = async (payload) => {
    try {
        const response = await put(`${PYTHON_API_URL}/dn_cn/update-credit-note`, payload);
        if (response?.status === "success") {
            return response;
        } else {
            throw new Error(response?.message || "Failed to update credit note");
        }
    } catch (error) {
        console.error("Error updating credit note:", error);
        throw error;
    }
};

export const updateDebitNote = async (payload) => {
    try {
        const response = await put(`${PYTHON_API_URL}/dn_cn/update-debit-note`, payload);
        if (response?.status === "success") {
            return response;
        } else {
            throw new Error(response?.message || "Failed to update debit note");
        }
    } catch (error) {
        console.error("Error updating debit note:", error);
        throw error;
    }
};

export const getCreditNoteById = async (id) => {
    try {
        const response = await get(`${PYTHON_API_URL}/dn_cn/get-credit-note/${id}`);
        if (response?.status === "success") {
            return response;
        } else {
            console.error(response?.message || "Failed to fetch credit note");
            return { status: "error", message: response?.message };
        }
    } catch (error) {
        console.error("Error fetching credit note:", error);
        return { status: "error", message: error.message };
    }
};

export const getDebitNoteById = async (id) => {
    try {
        const response = await get(`${PYTHON_API_URL}/dn_cn/get-debit-note/${id}`);
        if (response?.status === "success") {
            return response;
        } else {
            console.error(response?.message || "Failed to fetch debit note");
            return { status: "error", message: response?.message };
        }
    } catch (error) {
        console.error("Error fetching debit note:", error);
        return { status: "error", message: error.message };
    }
};
//#endregion

export const getLedgerCurrencies = async () => {
    try {
        const response = await get(`${PYTHON_API_URL}/ledger/get-currencies`);
        if (response?.status === "success") {
            return response;
        } else {
            console.error(response?.message || "Failed to fetch currencies");
            return { status: "error", message: response?.message };
        }
    } catch (error) {
        console.error("Error fetching currencies:", error);
        return { status: "error", message: error.message };
    }
};
//#endregion

export const FetchAPLedger = async (supplierId, currencyId, fromDate, toDate) => {
    try {
        const response = await get(`${PYTHON_API_URL}/AR/get-ap-ledger?supplier_id=${supplierId}&currency_id=${currencyId}&from_date=${fromDate}&to_date=${toDate}`);
        return response;
    } catch (error) {
        console.error("Error fetching AP ledger:", error);
        return { status: false, message: error.message };
    }
};


// New functions

// GetPVHistoryDetails
export const GetPVHistoryDetails = async (summaryId, branchId, orgId) => {
    try {
        const res = await get(`/ClaimApproval/GetPVHistory?SummaryId=${summaryId}&BranchId=${branchId}&orgid=${orgId}`);
        return res;
    } catch (error) {
        console.error("Failed to fetch PV history details", error);
        return { status: false, message: error.message };
    }
};

// GetAllPayment
export const GetAllPayment = async (orgId, poid) => {
    try {
        const response = await get(
            `/CommonClaimAndPaymentData/GetPaymentdetails?poid=${poid}&orgid=${orgId}`
        );
        return response;
    } catch (error) {
        console.error("Failed to fetch Payment list", error);
        return { status: false, message: error };
    }
};