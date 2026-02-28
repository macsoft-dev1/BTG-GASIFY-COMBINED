import React from "react";
import { Redirect } from "react-router-dom";

// Pages Component
import Chat from "../pages/Chat/Chat";

// Warehouse Pages
import WarehouseDashboard from "pages/Warehouse/Dashboard";
import WarehouseOpening from "pages/Warehouse/Opening/opening-allocation";
import AddOpeningAllocation from "pages/Warehouse/Opening/add-opening-allocation";
import EditOpeningAllocation from "pages/Warehouse/Opening/edit-opening-allocation";
import WarehouseGRN from "pages/Warehouse/GRN";
import InStockAllocation from "pages/Warehouse/InStock/in-stock-allocation";
import AddInStockAllocation from "pages/Warehouse/InStock/add-in-stock-allocation";
import EditInStockAllocation from "pages/Warehouse/InStock/edit-in-stock-allocation";
import RequestAllocation from "pages/Warehouse/Request/request-allocation";
import AddRequestAllocation from "pages/Warehouse/Request/add-request-allocation";
import EditRequestAllocation from "pages/Warehouse/Request/edit-request-allocation";
import WarehouseDirect from "pages/Warehouse/Direct/warehouse-direct";
import AddWarehouseDirect from "pages/Warehouse/Direct/add-warehouse-direct";
import EditWarehouseDirect from "pages/Warehouse/Direct/edit-warehouse-direct";
import WarehouseProject from "pages/Warehouse/Project/warehouse-project";
import AddWarehouseProject from "pages/Warehouse/Project/add-warehouse-project";
import EditWarehouseProject from "pages/Warehouse/Project/edit-warehouse-project";
import WarehouseIssue from "pages/Warehouse/Issue";
import DirectIssueAllocation from "pages/Warehouse/DirectIssue/direct-issue-allocation";
import AddDirectIssueAllocation from "pages/Warehouse/DirectIssue/add-direct-issue-allocation";
import EditDirectIssueAllocation from "pages/Warehouse/DirectIssue/edit-direct-issue-allocation";
import WarehouseReport from "pages/Warehouse/Report";


// Pages File Manager
import FileManager from "../pages/FileManager/index";

// Pages Calendar
import Calendar from "../pages/Calendar/index";

// User profile
import UserProfile from "../pages/Authentication/UserProfile";

//Tasks
import TasksList from "../pages/Tasks/tasks-list";
import TasksKanban from "../pages/Tasks/tasks-kanban";
import TasksCreate from "../pages/Tasks/tasks-create";

//Projects
import ProjectsGrid from "../pages/Projects/projects-grid";
import ProjectsList from "../pages/Projects/projects-list";
import ProjectsOverview from "../pages/Projects/ProjectOverview/projects-overview";
import ProjectsCreate from "../pages/Projects/projects-create";

//Ecommerce Pages
import EcommerceProducts from "../pages/Ecommerce/EcommerceProducts/index";
import EcommerceProductDetail from "../pages/Ecommerce/EcommerceProducts/EcommerceProductDetail";
import EcommerceOrders from "../pages/Ecommerce/EcommerceOrders/index";
import EcommerceCustomers from "../pages/Ecommerce/EcommerceCustomers/index";
import EcommerceCart from "../pages/Ecommerce/EcommerceCart";
import EcommerceCheckout from "../pages/Ecommerce/EcommerceCheckout";
import EcommerceShops from "../pages/Ecommerce/EcommerceShops/index";
import EcommerceAddProduct from "../pages/Ecommerce/EcommerceAddProduct";

//Email
import EmailInbox from "../pages/Email/email-inbox";
import EmailRead from "../pages/Email/email-read";
import EmailBasicTemplte from "../pages/Email/email-basic-templte";
import EmailAlertTemplte from "../pages/Email/email-template-alert";
import EmailTemplateBilling from "../pages/Email/email-template-billing";

//Invoices
import InvoicesList from "../pages/Invoices/invoices-list";
import InvoiceDetail from "../pages/Invoices/invoices-detail";

// Authentication related pages
import Login from "../pages/Authentication/Login";
import Logout from "../pages/Authentication/Logout";
import Register from "../pages/Authentication/Register";
import ForgetPwd from "../pages/Authentication/ForgetPassword";

// Inner Authentication
import Login1 from "../pages/AuthenticationInner/Login";
import Login2 from "../pages/AuthenticationInner/Login2";
import Register1 from "../pages/AuthenticationInner/Register";
import Register2 from "../pages/AuthenticationInner/Register2";
import Recoverpw from "../pages/AuthenticationInner/Recoverpw";
import Recoverpw2 from "../pages/AuthenticationInner/Recoverpw2";
import ForgetPwd1 from "../pages/AuthenticationInner/ForgetPassword";
import ForgetPwd2 from "../pages/AuthenticationInner/ForgetPwd2";
import LockScreen from "../pages/AuthenticationInner/auth-lock-screen";
import LockScreen2 from "../pages/AuthenticationInner/auth-lock-screen-2";
import ConfirmMail from "../pages/AuthenticationInner/page-confirm-mail";
import ConfirmMail2 from "../pages/AuthenticationInner/page-confirm-mail-2";
import EmailVerification from "../pages/AuthenticationInner/auth-email-verification";
import EmailVerification2 from "../pages/AuthenticationInner/auth-email-verification-2";
import TwostepVerification from "../pages/AuthenticationInner/auth-two-step-verification";
import TwostepVerification2 from "../pages/AuthenticationInner/auth-two-step-verification-2";

// Dashboard
import Dashboard from "../pages/Dashboard/index";
import DashboardSaas from "../pages/Dashboard-saas/index";
import DashboardCrypto from "../pages/Dashboard-crypto/index";
import DashboardBlog from "../pages/Dashboard-blog/index";

//Crypto
import CryptoWallet from "../pages/Crypto/CryptoWallet/crypto-wallet";
import CryptoBuySell from "../pages/Crypto/crypto-buy-sell";
import CryptoExchange from "../pages/Crypto/crypto-exchange";
import CryptoLending from "../pages/Crypto/crypto-lending";
import CryptoOrders from "../pages/Crypto/CryptoOrders/crypto-orders";
import CryptoKYCApplication from "../pages/Crypto/crypto-kyc-application";
import CryptoIcoLanding from "../pages/Crypto/CryptoIcoLanding/index";

// Charts
import ChartApex from "../pages/Charts/Apexcharts";
import ChartistChart from "../pages/Charts/ChartistChart";
import ChartjsChart from "../pages/Charts/ChartjsChart";
import EChart from "../pages/Charts/EChart";
import SparklineChart from "../pages/Charts/SparklineChart";
import ChartsKnob from "../pages/Charts/charts-knob";
import ReCharts from "../pages/Charts/ReCharts";

// Maps
import MapsGoogle from "../pages/Maps/MapsGoogle";
import MapsVector from "../pages/Maps/MapsVector";
import MapsLeaflet from "../pages/Maps/MapsLeaflet";

//Icons
import IconBoxicons from "../pages/Icons/IconBoxicons";
import IconDripicons from "../pages/Icons/IconDripicons";
import IconMaterialdesign from "../pages/Icons/IconMaterialdesign";
import IconFontawesome from "../pages/Icons/IconFontawesome";

//Tables
import BasicTables from "../pages/Tables/BasicTables";
import DatatableTables from "../pages/Tables/DatatableTables";
import ResponsiveTables from "../pages/Tables/ResponsiveTables";
import EditableTables from "../pages/Tables/EditableTables";
import DragDropTables from "../pages/Tables/DragDropTables";

// Forms
import FormElements from "../pages/Forms/FormElements/index";
import FormLayouts from "../pages/Forms/FormLayouts";
import FormAdvanced from "../pages/Forms/FormAdvanced";
import FormEditors from "../pages/Forms/FormEditors";
import FormValidations from "../pages/Forms/FormValidations";
import FormMask from "../pages/Forms/FormMask";
import FormRepeater from "../pages/Forms/FormRepeater";
import FormUpload from "../pages/Forms/FormUpload";
import FormWizard from "../pages/Forms/FormWizard";
import FormXeditable from "../pages/Forms/FormXeditable";
import DualListbox from "../pages/Forms/DualListbox";

//Ui
import UiAlert from "../pages/Ui/UiAlert";
import UiButtons from "../pages/Ui/UiButtons";
import UiCards from "../pages/Ui/UiCards";
import UiCarousel from "../pages/Ui/UiCarousel";
import UiColors from "../pages/Ui/UiColors";
import UiDropdown from "../pages/Ui/UiDropdown";
import UiGeneral from "../pages/Ui/UiGeneral";
import UiGrid from "../pages/Ui/UiGrid";
import UiImages from "../pages/Ui/UiImages";
import UiLightbox from "../pages/Ui/UiLightbox";
import UiModal from "../pages/Ui/UiModal";
import UiProgressbar from "../pages/Ui/UiProgressbar";
import UiTabsAccordions from "../pages/Ui/UiTabsAccordions";
import UiTypography from "../pages/Ui/UiTypography";
import UiVideo from "../pages/Ui/UiVideo";
import UiSessionTimeout from "../pages/Ui/UiSessionTimeout";
import UiRating from "../pages/Ui/UiRating";
import UiRangeSlider from "../pages/Ui/UiRangeSlider";
import UiNotifications from "../pages/Ui/ui-notifications";
import UiToast from "../pages/Ui/UiToast";
import UiOffCanvas from "../pages/Ui/UiOffCanvas";
import Breadcrumb from "../pages/Ui/UiBreadcrumb";
import UiPlaceholders from "../pages/Ui/UiPlaceholders";

//Pages
import PagesStarter from "../pages/Utility/pages-starter";
import PagesMaintenance from "../pages/Utility/pages-maintenance";
import PagesComingsoon from "../pages/Utility/pages-comingsoon";
import PagesTimeline from "../pages/Utility/pages-timeline";
import PagesFaqs from "../pages/Utility/pages-faqs";
import PagesPricing from "../pages/Utility/pages-pricing";
import Pages404 from "../pages/Utility/pages-404";
import Pages500 from "../pages/Utility/pages-500";
import ManageCustomer from '../pages/Masters/manage-customers';
import ManageOrders from "pages/Order-Management/Order/manage-orders";
import AddCustomers from '../pages/Masters/add-customers';
import ManageQuotations from "pages/Order-Management/Quotation/manage-quotations";
import PriceQuotation from "pages/Order-Management/Quotation/price-quotation";
import AddQuotation from "pages/Order-Management/Quotation/add-quotation";
import ManageGas from '../pages/Masters/manage-gas';
import ManagePallet from '../pages/Masters/manage-pallet';
import AddPallet from '../pages/Masters/add-pallet';
import ManageCylinder from '../pages/Masters/manage-cylinder';
import ManageSuppliers from '../pages/Masters/manage-suppliers';
import AddOrdernew from "pages/Order-Management/Order/add-ordernew";
import RoleAccessRight from "../pages/RolesAccessRights/index";
import ManageRole from "../pages/Masters/manage-roles";
import ManageUser from "../pages/Masters/manage-user";
import ManageUnit from "../pages/Masters/manage-unit";

//Contacts
import ContactsGrid from "../pages/Contacts/contacts-grid";
import ContactsList from "../pages/Contacts/ContactList/contacts-list";
import ContactsProfile from "../pages/Contacts/ContactsProfile/contacts-profile";

//Blog
import BlogList from "../pages/Blog/BlogList/index";
import BlogGrid from "../pages/Blog/BlogGrid/index";
import BlogDetails from "../pages/Blog/BlogDetails";
import AddSupplier from "pages/Masters/add-supplier";
import ManagePaymentMethods from "pages/Masters/manage-payment-method";
import ManagePaymentTerms from "pages/Masters/manage-payment-term";
import AddUser from "pages/Masters/add-user";
import AddUnit from "pages/Masters/add-unit";
import AddPaymentTerm from "pages/Masters/add-payment-term";
import AddPaymentMethod from "pages/Masters/add-payment-method";
import AddCylinder from "pages/Masters/add-cylinder";
import ManageCountry from "pages/Masters/manage-country";
import ManageCurrency from "pages/Masters/manage-currency";
import ManageDepartment from "pages/Masters/manage-department";
import ManageProjects from "pages/Masters/manage-projects";
import ManagePacking from "pages/Order-Management/Packing/manage-packing";
import ManagePackingDemo from "pages/Order-Management/Packing/manage-packing-Demo";
import AddPacking from "pages/Order-Management/Packing/add-packing";
import AddDeliveryorder from "pages/Order-Management/Packing/add-deliveryorder";
import EditQuotation from "pages/Order-Management/Quotation/edit-quotation";
import AddInvoice from "pages/Order-Management/Invoice/add-invoice";
import ManageInvocie from "pages/Order-Management/Invoice/manage-invoice";
import ManageReturn from "pages/Order-Management/Return/manage-return";
import ProductOrder from "pages/Order-Management/Productorder/productorder";
import CopySq from "pages/Order-Management/Quotation/edit-copysq";
import AddReturn from "pages/Order-Management/Return/add-return";
import AddPo from "pages/Order-Management/Productorder/add-po";
import EditOrder from "pages/Order-Management/Order/edit-order";
import AddOrders from "pages/Order-Management/Order/add-orders";
import EditOrders from "pages/Order-Management/Order/edit-orders";
import ManagePurchaseRequistion from '../pages/Procurement/purchase-requisition';
import ProcurementManagePurchaseRequistion from '../pages/Procurements/procurementspurchase-requisition';

import ManagePurchaseMemo from '../pages/Procurement/Purchase-memo/managepurchasememo';

import ManagePurchaseOrder from '../pages/Procurement/purchase-order';
import ProcurementsManagePurchaseOrder from '../pages/Procurements/procurementspurchase-order';
import ProcurementsAddPurchaseOrder from '../pages/Procurements/procurementsadd-purchaseorder';

import AddInvoiceReceipt from '../pages/Procurement/Invoice-Receipt/AddInvoiceReceipt';
import InvoiceReceipt from '../pages/Procurement/Invoice-Receipt/InvoiceReceipt';

import ManageGRN from '../pages/Procurement/grn';
import ManageProcurementsGRN from '../pages/Procurements/procurementsgrn';
import ProcurementsAddGRN from '../pages/Procurements/procurementsadd-grn';
import ManageItemsIssue from '../pages/Procurement/items-issue';
import ManageItemsRequest from '../pages/Procurement/items-request';
import ManageProcurmentReturn from '../pages/Procurement/items-return';
import AddPurchaseRequisition from '../pages/Procurement/add-purchaserequisition';


import AddPurchaseMemo from '../pages/Procurement/Purchase-memo/add-purchasememo';

import ProcurementsAddPurchaseRequisition from '../pages/Procurements/procurementsadd-purchaserequisition';
import AddPurchaseOrder from '../pages/Procurement/add-purchaseorder';
import AddGRN from '../pages/Procurement/add-grn'
import ManageCompany from '../pages/Admin/company'
import ManagePoApproval from '../pages/Procurement/po-approval';
import ManagePrApproval from '../pages/Procurement/pr-approval';
import ManageClaimsPayment from '../pages/Finance/Manageclaim&Payment';
import Addclaimpayment from '../pages/Finance/add-claim&payment';

import Copyclaimpayment from '../pages/Finance/copy-claim&payment';

import Manageduebills from '../pages/Finance/Manageduebills';
import Managepaymentplan from '../pages/Finance/Managepaymentplan';
import Manageapproval from '../pages/Finance/Manageapproval';
import Paymentplanapproval from '../pages/Finance/Paymentplanapproval';
import PPP from '../pages/Finance/PPP';
import PPPApproval from '../pages/Finance/PPPApproval';
import ClaimApproval from '../pages/Finance/ClaimApproval';
import TransportPlanner from '../pages/Order-Management/Planning/TransportPlanner';
import PackingList from '../pages/Order-Management/Planning/PackingList';

import EditDirectSalesForm from "pages/Order-Management/Order/EditDirectSalesForm";
import PurchaseRequisitionApproval from "pages/Procurements/procurementspurchase-requisition-approval";
import AddItems from "pages/Masters/add-item";
import ManageItems from "pages/Masters/manage-items";

import AddManualInvoice from "pages/Order-Management/Invoice/add-manual-invoice";
import ManualInvoice from "pages/Order-Management/Invoice/manual-invoice";
import AddClaimPaymentDesc from "pages/Masters/add-claim-payment-desc";
import ManageClaimPaymentDesc from "pages/Masters/manage-claim-payment-desc";

import DiscussionList from '../pages/Finance/DiscussionList';
import AccessRights from "pages/RolesAccessRights/AccessRights";
import CopyPurchaseRequisition from "pages/Procurements/procurementscopy-purchaserequisition";

import CashBook from "../pages/FinanceModule/Report/CashBook";
import BankBook from "../pages/FinanceModule/Report/BankBook";

import AccountsReceivable from '../pages/FinanceModule/AccountsReceivable';
import OverDraft from '../pages/FinanceModule/OverDraft';
import ManageOverDraft from '../pages/FinanceModule/ManageOverDraft';
import AssetRegister from '../pages/FinanceModule/AssetRegister';
import AddExpense from '../pages/FinanceModule/AddExpense';
import EditExpense from '../pages/FinanceModule/EditExpense';
import OtherRevenues from '../pages/FinanceModule/OtherRevenues';
import ManageRevenues from '../pages/FinanceModule/ManageRevenue';
import TaxReport from '../pages/FinanceModule/TaxReport';
import ManageExpense from '../pages/FinanceModule/ManageExpense';

// import ManagePettyCash from '../pages/FinanceModule/PettyCash/ManagePettyCash';
// import AddPettyCash from '../pages/FinanceModule/AddExpense/PettyCash/AddPettyCash';

import AssetType from '../pages/FinanceModule/Master/AssetType';
import BankMaster from '../pages/FinanceModule/Master/BankMaster';
import GLCode from '../pages/FinanceModule/Master/GLCode';
import RevenueType from '../pages/FinanceModule/Master/RevenueType';


import ManageAssetType from '../pages/FinanceModule/Master/ManageAssetType';
import ManageBankMaster from '../pages/FinanceModule/Master/ManageBankMaster';
import ManageGLCode from '../pages/FinanceModule/Master/ManageGLCode';
import ManageRevenueType from '../pages/FinanceModule/Master/ManageRevenueType';
import VerifyCustomer from "pages/Marketing/VerifyCustomer";
import ManageGl from "../pages/Masters/manage-gl";
import AddGLMaster from "../pages/Masters/add-glmaster"
import SalesReport from '../pages/FinanceModule/Reports/SalesReport';
import ProfitLoss from '../pages/FinanceModule/Report/ProfitLoss';

import LedgerReport from '../pages/FinanceModule/Reports/LedgerReport';
import TrialBalanceReport from '../pages/FinanceModule/Reports/TrialBalanceReport';
import BalanceSheetReport from '../pages/FinanceModule/Reports/BalanceSheetReport';
import ARBookReport from '../pages/FinanceModule/Reports/ARBookReport';
import ARBookDOReport from "../pages/FinanceModule/Reports/ARBookDOReport";
import PCBookReport from "../pages/FinanceModule/Report/PCBookReport";
import AP from "../pages/FinanceModule/AP";

// --- ADDED NEW REPORT IMPORTS HERE ---
import SalesItemWise from "../pages/FinanceModule/Reports/SalesItemWise";
import SalesCustomerWise from "../pages/FinanceModule/Reports/SalesCustomerWise";

import Pendingpo from '../pages/FinanceModule/Reports/Pendingpo';
import AddBankBook from "../pages/FinanceModule/Report/AddBankBook";
import AddCashBook from "../pages/FinanceModule/Report/AddCashBook";
import BankReconciliation from "../pages/FinanceModule/Reports/BankReconciliation";
import DnCn from "../pages/FinanceModule/DnCn";
import AddDnCn from "../pages/FinanceModule/add_dn_cn";
import EditDnCn from "../pages/FinanceModule/edit_dn_cn";
import JournalCt from "../pages/FinanceModule/JournalCt";
import AddJournal from "../pages/FinanceModule/add_journal";

const authProtectedRoutes = [

    { path: "/manage-gl", exact: true, component: ManageGl },
    { path: "/add-glmaster", component: AddGLMaster },
    { path: "/edit-glmaster/:id", component: AddGLMaster },
    { path: "/bankreconciliation", component: BankReconciliation },
    { path: "/Pendingpo", component: Pendingpo },
    { path: "/AccountsReceivable", component: AccountsReceivable },
    { path: "/ManageOverDraft", component: ManageOverDraft },
    { path: "/OverDraft/add", component: OverDraft },
    { path: "/OverDraft/edit/:id", component: OverDraft },
    { path: "/BankBook", component: BankBook },
    { path: "/AddBankBook", component: AddBankBook },
    { path: "/cash-book-entry", component: AddCashBook },
    { path: "/verify-customer", component: VerifyCustomer },
    { path: "/bank-book-entries", component: AddBankBook },


    { path: "/AssetRegister", component: AssetRegister },
    { path: "/AddExpense", component: AddExpense },

    // {path:"/AddPettyCash",component:AddPettyCash},
    // {path:"/ManagePettyCash",component:ManagePettyCash},
    { path: "/pettyCash", component: ManageExpense },
    { path: "/pettyCash/add", component: AddExpense },
    { path: "/pettyCash/edit/:id", component: AddExpense },
    { path: "/ManageRevenues", component: ManageRevenues },
    { path: "/TaxReport", component: TaxReport },
    { path: "/ManageExpense", component: ManageExpense },



    { path: "/revenue/add", component: OtherRevenues },
    { path: "/revenue/edit/:id", component: OtherRevenues },

    { path: "/journal-ct", component: JournalCt },
    { path: "/add-journal", component: AddJournal },


    // Warehouse Routes
    { path: "/warehouse-dashboard", component: WarehouseDashboard },
    { path: "/warehouse-opening", component: WarehouseOpening },
    { path: "/warehouse/opening/add", component: AddOpeningAllocation },
    { path: "/warehouse/opening/edit/:id", component: EditOpeningAllocation },
    { path: "/warehouse-grn", component: WarehouseGRN },
    { path: "/warehouse-in-stock", component: InStockAllocation },
    { path: "/warehouse/in-stock/add", component: AddInStockAllocation },
    { path: "/warehouse/in-stock/edit/:id", component: EditInStockAllocation },
    { path: "/warehouse-request", component: RequestAllocation },
    { path: "/warehouse/request/add", component: AddRequestAllocation },
    { path: "/warehouse/request/edit/:id", component: EditRequestAllocation },
    { path: "/warehouse-direct", component: WarehouseDirect },
    { path: "/warehouse-direct/add", component: AddWarehouseDirect },
    { path: "/warehouse-direct/edit/:id", component: EditWarehouseDirect },
    { path: "/warehouse-project", component: WarehouseProject },
    { path: "/warehouse-project/add", component: AddWarehouseProject },
    { path: "/warehouse-project/edit/:id", component: EditWarehouseProject },
    { path: "/warehouse-issue", component: WarehouseIssue },
    { path: "/warehouse-direct-issue", component: DirectIssueAllocation },
    { path: "/warehouse-direct-issue/add", component: AddDirectIssueAllocation },
    { path: "/warehouse-direct-issue/edit/:id", component: EditDirectIssueAllocation },
    { path: "/warehouse-report", component: WarehouseReport },



    { path: "/ManageRevenueType", component: ManageRevenueType },
    { path: "/ManageGLCode", component: ManageGLCode },
    { path: "/ManageBankMaster", component: ManageBankMaster },
    { path: "/ManageAssetType", component: ManageAssetType },

    { path: "/RevenueType", component: RevenueType },
    { path: "/GLCode", component: GLCode },
    { path: "/BankMaster", component: BankMaster },
    { path: "/AssetType", component: AssetType },
    { path: "/SalesReport", component: SalesReport },
    { path: "/ProfitAndLoss", component: ProfitLoss },

    { path: "/LedgerReport", component: LedgerReport },
    { path: "/TrialBalanceReport", component: TrialBalanceReport },
    { path: "/BalanceSheetReport", component: BalanceSheetReport },
    { path: "/ARBookReport", component: ARBookReport },
    { path: "/ar-book-do", component: ARBookDOReport },
    { path: "/PCBookReport", component: PCBookReport },
    { path: "/AP", component: AP },



    { path: "/pettyCash", component: ManageExpense },
    { path: "/pettyCash/add", component: AddExpense },
    { path: "/pettyCash/edit/:id", component: EditExpense },



    // --- ADDED NEW REPORT ROUTES HERE ---
    { path: "/sales-item-wise", component: SalesItemWise },
    { path: "/sales-customer-wise", component: SalesCustomerWise },

    { path: "/dashboard", component: Dashboard },
    { path: "/dashboard-saas", component: DashboardSaas },
    { path: "/dashboard-crypto", component: DashboardCrypto },
    { path: "/dashboard-blog", component: DashboardBlog },

    //Crypto
    { path: "/crypto-wallet", component: CryptoWallet },
    { path: "/crypto-buy-sell", component: CryptoBuySell },
    { path: "/crypto-exchange", component: CryptoExchange },
    { path: "/crypto-lending", component: CryptoLending },
    { path: "/crypto-orders", component: CryptoOrders },
    { path: "/crypto-kyc-application", component: CryptoKYCApplication },

    //profile
    { path: "/profile", component: UserProfile },

    //chat
    { path: "/chat", component: Chat },

    //File Manager
    { path: "/apps-filemanager", component: FileManager },

    //calendar
    { path: "/calendar", component: Calendar },

    //Ecommerce
    // { path: "/ecommerce-products/:id", component: EcommerceProducts },
    { path: "/ecommerce-products", component: EcommerceProducts },
    { path: "/ecommerce-product-details/:id", component: EcommerceProductDetail },

    { path: "/ecommerce-orders", component: EcommerceOrders },
    { path: "/ecommerce-customers", component: EcommerceCustomers },
    { path: "/ecommerce-cart", component: EcommerceCart },
    { path: "/ecommerce-checkout", component: EcommerceCheckout },
    { path: "/ecommerce-shops", component: EcommerceShops },
    { path: "/ecommerce-add-product", component: EcommerceAddProduct },

    //Email
    { path: "/email-inbox", component: EmailInbox },
    { path: "/email-read", component: EmailRead },
    { path: "/email-template-basic", component: EmailBasicTemplte },
    { path: "/email-template-alert", component: EmailAlertTemplte },
    { path: "/email-template-billing", component: EmailTemplateBilling },

    //Invoices
    { path: "/invoices-list", component: InvoicesList },
    { path: "/invoices-detail", component: InvoiceDetail },
    { path: "/invoices-detail/:id", component: InvoiceDetail },

    // Tasks
    { path: "/tasks-list", component: TasksList },
    { path: "/tasks-kanban", component: TasksKanban },
    { path: "/tasks-create", component: TasksCreate },

    //Projects
    { path: "/projects-grid", component: ProjectsGrid },
    { path: "/projects-list", component: ProjectsList },
    { path: "/projects-overview", component: ProjectsOverview },
    { path: "/projects-overview/:id", component: ProjectsOverview },
    { path: "/projects-create", component: ProjectsCreate },

    // Contacts
    { path: "/contacts-grid", component: ContactsGrid },
    { path: "/contacts-list", component: ContactsList },
    { path: "/contacts-profile", component: ContactsProfile },

    //Blog
    { path: "/blog-list", component: BlogList },
    { path: "/blog-grid", component: BlogGrid },
    { path: "/blog-details", component: BlogDetails },

    //Charts
    { path: "/apex-charts", component: ChartApex },
    { path: "/chartist-charts", component: ChartistChart },
    { path: "/chartjs-charts", component: ChartjsChart },
    { path: "/e-charts", component: EChart },
    { path: "/sparkline-charts", component: SparklineChart },
    { path: "/charts-knob", component: ChartsKnob },
    { path: "/re-charts", component: ReCharts },

    // Icons
    { path: "/icons-boxicons", component: IconBoxicons },
    { path: "/icons-dripicons", component: IconDripicons },
    { path: "/icons-materialdesign", component: IconMaterialdesign },
    { path: "/icons-fontawesome", component: IconFontawesome },

    // Tables
    { path: "/tables-basic", component: BasicTables },
    { path: "/tables-datatable", component: DatatableTables },
    { path: "/tables-responsive", component: ResponsiveTables },
    { path: "/tables-editable", component: EditableTables },
    { path: "/tables-dragndrop", component: DragDropTables },

    // Maps
    { path: "/maps-google", component: MapsGoogle },
    { path: "/maps-vector", component: MapsVector },
    { path: "/maps-leaflet", component: MapsLeaflet },

    // Forms
    { path: "/form-elements", component: FormElements },
    { path: "/form-layouts", component: FormLayouts },
    { path: "/form-advanced", component: FormAdvanced },
    { path: "/form-editors", component: FormEditors },
    { path: "/form-mask", component: FormMask },
    { path: "/form-repeater", component: FormRepeater },
    { path: "/form-uploads", component: FormUpload },
    { path: "/form-wizard", component: FormWizard },
    { path: "/form-validation", component: FormValidations },
    { path: "/form-xeditable", component: FormXeditable },
    { path: "/dual-listbox", component: DualListbox },

    // Ui
    { path: "/ui-alerts", component: UiAlert },
    { path: "/ui-buttons", component: UiButtons },
    { path: "/ui-cards", component: UiCards },
    { path: "/ui-carousel", component: UiCarousel },
    { path: "/ui-colors", component: UiColors },
    { path: "/ui-dropdowns", component: UiDropdown },
    { path: "/ui-general", component: UiGeneral },
    { path: "/ui-grid", component: UiGrid },
    { path: "/ui-images", component: UiImages },
    { path: "/ui-lightbox", component: UiLightbox },
    { path: "/ui-modals", component: UiModal },
    { path: "/ui-progressbars", component: UiProgressbar },
    { path: "/ui-tabs-accordions", component: UiTabsAccordions },
    { path: "/ui-typography", component: UiTypography },
    { path: "/ui-video", component: UiVideo },
    { path: "/ui-session-timeout", component: UiSessionTimeout },
    { path: "/ui-rating", component: UiRating },
    { path: "/ui-rangeslider", component: UiRangeSlider },
    { path: "/ui-notifications", component: UiNotifications },
    { path: "/ui-toasts", component: UiToast },
    { path: "/ui-offcanvas", component: UiOffCanvas },
    { path: "/ui-breadcrumb", component: Breadcrumb },
    { path: "/ui-placeholders", component: UiPlaceholders },
    //Utility
    { path: "/pages-starter", component: PagesStarter },
    { path: "/pages-timeline", component: PagesTimeline },
    { path: "/pages-faqs", component: PagesFaqs },
    { path: "/pages-pricing", component: PagesPricing },

    // this route should be at the end of all other routes
    // eslint-disable-next-line react/display-name
    { path: "/", exact: true, component: () => <Redirect to="/manage-quotation" /> },
    { path: "/manage-customer", component: ManageCustomer },
    { path: "/manage-order", component: ManageOrders },

    { path: "/TransportPlanner", component: TransportPlanner },
    { path: "/PackingList", component: PackingList },

    { path: "/manage-quotation", component: ManageQuotations },
    { path: "/add-customer", component: AddCustomers },
    { path: "/add-quotation", component: AddQuotation },
    { path: "/edit-quotation/:id", component: EditQuotation },
    { path: "/price-quotation/:id", component: PriceQuotation },

    { path: "/copy-quotation/:id", component: CopySq },
    { path: "/manage-gas", component: ManageGas },
    { path: "/manage-pallet", component: ManagePallet },
    { path: "/add-pallet", component: AddPallet },
    { path: "/edit-pallet/:id", component: AddPallet },
    { path: "/manage-cylinder", component: ManageCylinder },
    { path: "/manage-suppliers", component: ManageSuppliers },
    { path: "/add-supplier", component: AddSupplier },
    { path: "/edit-supplier/:id", component: AddSupplier },
    { path: "/sales-order", component: AddOrdernew },
    { path: "/add-order", component: AddOrders },
    { path: "/edit-order/:id", component: EditOrders },
    { path: "/edit-orders/:id", component: EditOrders },
    { path: "/access-rights", component: RoleAccessRight },
    { path: "/admin-roles", component: ManageRole },
    { path: "/manage-users", component: ManageUser },
    { path: "/manage-units", component: ManageUnit },
    { path: "/manage-payment-terms", component: ManagePaymentTerms },
    { path: "/manage-payment-methods", component: ManagePaymentMethods },
    { path: "/add-user", component: AddUser },
    { path: "/add-cylinder", component: AddCylinder },
    { path: "/add-unit", component: AddUnit },
    { path: "/add-payment-term", component: AddPaymentTerm },
    { path: "/add-payment-method", component: AddPaymentMethod },
    { path: "/country", component: ManageCountry },
    { path: "/currency", component: ManageCurrency },
    { path: "/department", component: ManageDepartment },
    { path: "/projects", component: ManageProjects },
    { path: "/manage-packing", component: ManagePacking },
    { path: "/manage-packing-demo", component: ManagePackingDemo },
    { path: "/add-packing", component: AddPacking },
    { path: "/edit-packing/:id", component: AddPacking },
    { path: "/delivery-order", component: AddDeliveryorder },
    { path: "/add-invoice", component: AddInvoice },
    { path: "/sales-invoices", component: ManageInvocie },
    { path: "/edit-invoices/:id", component: AddInvoice },

    { path: "/approval-discussions", component: DiscussionList },


    { path: "/add-manual-invoice", component: AddManualInvoice },
    { path: "/edit-manual-invoice/:id", component: AddManualInvoice },
    { path: "/manual-invoices", component: ManualInvoice },

    { path: "/sales-return", component: ManageReturn },
    { path: "/add-return-order", component: AddReturn },
    { path: "/edit-return-order/:id", component: AddReturn },
    { path: "/production-order", component: ProductOrder },
    { path: "/add-production-order", component: AddPo },
    { path: "/update-production-order/:id", component: AddPo },
    { path: "/manage-suppliers", component: ManageSuppliers },
    { path: "/purchase-requisition", component: ManagePurchaseRequistion },

    { path: "/item-request", component: ManageItemsRequest },
    { path: "/item-issue", component: ManageItemsIssue },
    { path: "/grn", component: ManageGRN },
    { path: "/purchase-order", component: ManagePurchaseOrder },
    { path: "/item-return", component: ManageProcurmentReturn },
    { path: "/add-purchaserequisition", component: AddPurchaseRequisition },
    { path: "/procurementsadd-purchaserequisition", component: ProcurementsAddPurchaseRequisition },
    { path: "/procurementscopy-purchaserequisition", component: CopyPurchaseRequisition },

    { path: "/procurementsadd-memo", component: AddPurchaseMemo },
    { path: "/edit-procurements-memo/:id", component: AddPurchaseMemo },
    { path: "/Manageclaim&Payment", component: ManageClaimsPayment },
    { path: "/add-claim&payment", component: Addclaimpayment },
    { path: "/edit-claim&payment/:id", component: Addclaimpayment },

    { path: "/copy-claim&payment/:id", component: Copyclaimpayment },

    { path: "/add-purchaseorder", component: AddPurchaseOrder },
    { path: "/add-grn", component: AddGRN },
    { path: "/company", component: ManageCompany },
    { path: "/pr-approval", component: ManagePrApproval },
    { path: "/po-approval", component: ManagePoApproval },
    { path: "/procurementspurchase-requisition", component: ProcurementManagePurchaseRequistion },
    { path: "/purchase-requisition-approval", component: PurchaseRequisitionApproval },

    { path: "/procurementspurchase-memo", component: ManagePurchaseMemo },

    { path: "/procurementspurchase-order", component: ProcurementsManagePurchaseOrder },
    { path: "/procurementsadd-purchaseorder", component: ProcurementsAddPurchaseOrder },
    { path: "/AddInvoiceReceipt/:irnid", component: AddInvoiceReceipt },
    { path: "/InvoiceReceipt", component: InvoiceReceipt },


    { path: "/procurementsadd-grn", component: ProcurementsAddGRN },
    { path: "/procurementsadd-grn/:id", component: ProcurementsAddGRN },
    { path: "/procurementsgrn", component: ManageProcurementsGRN },
    { path: "/Manageduebills", component: Manageduebills },
    { path: "/Managepaymentplan", component: Managepaymentplan },
    { path: "/Manageapproval", component: Manageapproval },
    { path: "/Paymentplanapproval", component: Paymentplanapproval },
    { path: "/PPP", component: PPP },
    { path: "/PPPApproval", component: PPPApproval },
    { path: "/ClaimApproval", component: ClaimApproval },
    { path: "/pettyCash", component: ManageExpense },
    { path: "/pettyCash/add", component: AddExpense },
    { path: "/pettyCash/edit/:id", component: AddExpense },

    { path: "/revenue/add", component: OtherRevenues },
    { path: "/revenue/edit/:id", component: OtherRevenues },
    { path: "/OverDraft", component: ManageOverDraft },
    { path: "/OverDraft/add", component: OverDraft },
    { path: "/OverDraft/edit/:id", component: OverDraft },

    { path: "/CashBook", component: CashBook },
    { path: "/BankBook", component: BankBook },

    { path: "/add-item", component: AddItems },
    { path: "/edit-item/:id", component: AddItems },
    { path: "/manage-items", component: ManageItems },

    { path: "/add-claim-payment-desc", component: AddClaimPaymentDesc },
    { path: "/edit-claim-payment-desc/:id", component: AddClaimPaymentDesc },
    { path: "/manage-claim-payment-desc", component: ManageClaimPaymentDesc },

    { path: "/EditDirectSalesForm", component: EditDirectSalesForm },
    { path: "/roles-access-rights", component: AccessRights },

    { path: "/dn-cn", component: DnCn },
    { path: "/add-dn-cn", component: AddDnCn },
    { path: "/edit-dn-cn/:id", component: EditDnCn },
];

const publicRoutes = [

    { path: "/logout", component: Logout },
    { path: "/login", component: Login },
    { path: "/forgot-password", component: ForgetPwd },
    { path: "/register", component: Register },

    { path: "/pages-maintenance", component: PagesMaintenance },
    { path: "/pages-comingsoon", component: PagesComingsoon },
    { path: "/pages-404", component: Pages404 },
    { path: "/pages-500", component: Pages500 },
    { path: "/crypto-ico-landing", component: CryptoIcoLanding },

    // Authentication Inner
    { path: "/pages-login", component: Login1 },
    { path: "/pages-login-2", component: Login2 },

    { path: "/pages-register", component: Register1 },
    { path: "/pages-register-2", component: Register2 },

    { path: "/page-recoverpw", component: Recoverpw },
    { path: "/pages-recoverpw-2", component: Recoverpw2 },

    { path: "/pages-forgot-pwd", component: ForgetPwd1 },
    { path: "/pages-forgot-pwd-2", component: ForgetPwd2 },

    { path: "/auth-lock-screen", component: LockScreen },
    { path: "/auth-lock-screen-2", component: LockScreen2 },
    { path: "/page-confirm-mail", component: ConfirmMail },
    { path: "/page-confirm-mail-2", component: ConfirmMail2 },
    { path: "/auth-email-verification", component: EmailVerification },
    { path: "/auth-email-verification-2", component: EmailVerification2 },
    { path: "/auth-two-step-verification", component: TwostepVerification },
    { path: "/auth-two-step-verification-2", component: TwostepVerification2 },
];

export { authProtectedRoutes, publicRoutes };