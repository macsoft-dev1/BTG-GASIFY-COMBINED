import PropTypes from "prop-types";
import React, { Component } from "react";
import SimpleBar from "simplebar-react";
import MetisMenu from "metismenujs";
import { withRouter } from "react-router-dom";
import { Link } from "react-router-dom";
import { withTranslation } from "react-i18next";
import { Modules } from "../../common/data/constants";

class SidebarContent extends Component {
    constructor(props) {
        super(props);
        this.refDiv = React.createRef();
    }

    componentDidMount = async () => {
        this.loadMenuDetails();
    }

    state = {
        dynamicMenu: { menus: [] }
    };

    loadMenuDetails = async () => {
        // 1. Load existing data
        let menuData = JSON.parse(localStorage.getItem("userMenu"));

        if (!menuData) {
            menuData = { menus: [] };
        }

        // ---------------------------------------------------------
        // 2. INJECT ENTRIES INTO FINANCE
        // ---------------------------------------------------------
        if (!menuData.menus) menuData.menus = [];

        let financeModule = menuData.menus.find(m => m.moduleName === "Finance");

        // Force Create Finance Module if it's missing
        if (!financeModule) {
            financeModule = {
                moduleId: 99990,
                moduleName: "Finance",
                icon: "bx bx-money",
                screen: [],
                menuOrder: 99
            };
            menuData.menus.push(financeModule);
        }

        if (financeModule) {
            const missingScreens = [
                { screenId: 99902, screenName: "Bank Book Entries", url: "/bank-book-entries", icon: "bx bx-book" },
                { screenId: 99908, screenName: "Cash Book Entry", url: "/cash-book-entry", icon: "bx bx-money" },
                { screenId: 99910, screenName: "AR Book", url: "/ARBookReport", icon: "bx bx-file" },
                { screenId: 99903, screenName: "AR Book DO", url: "/ar-book-do", icon: "bx bx-file" },
                //{ screenId: 99911, screenName: "Asset Register", url: "/AssetRegister", icon: "bx bx-building" },
                { screenId: 99912, screenName: "Bank Book", url: "/BankBook", icon: "bx bx-book-open" },
                { screenId: 99913, screenName: "Cash Book", url: "/CashBook", icon: "bx bx-wallet" },
                //{ screenId: 99914, screenName: "Other Revenues", url: "/ManageRevenues", icon: "bx bx-chart" },
                //{ screenId: 99915, screenName: "Outstanding Pos", url: "/Pendingpo", icon: "bx bx-list-check" },
                { screenId: 99916, screenName: "Overdraft", url: "/ManageOverDraft", icon: "bx bx-transfer" },
                { screenId: 99917, screenName: "Petty Cash", url: "/pettyCash", icon: "bx bx-coin-stack" },
                // --- NEW AP SCREEN ADDED HERE ---
                { screenId: 99919, screenName: "AP BOOK", url: "/AP", icon: "bx bx-file" }
            ];

            missingScreens.forEach(item => {
                if (!financeModule.screen.find(s => s.screenName === item.screenName)) {
                    financeModule.screen.push({
                        screenId: item.screenId,
                        screenName: item.screenName,
                        url: item.url,
                        icon: item.icon,
                        module: []
                    });
                }
            });

            // DEBUG: Log Finance screens BEFORE override
            console.log(`[DEBUG FINANCE] Screens after injection (before override):`, financeModule.screen.map(s => s.screenName));

            // SPECIAL: Force ALL Finance screens for users 160, 161, 162, 163, 165, 191
            const authUserFinance = JSON.parse(localStorage.getItem("authUser"));
            const financeFullAccessUsers = [160, 161, 162, 163, 165, 191];
            const currentUserIdFinance = authUserFinance ? (parseInt(authUserFinance.u_id) || 0) : 0;

            console.log(`[DEBUG FINANCE] Current User ID: ${currentUserIdFinance}`);
            console.log(`[DEBUG FINANCE] Is in financeFullAccessUsers? ${financeFullAccessUsers.includes(currentUserIdFinance)}`);

            if (financeFullAccessUsers.includes(currentUserIdFinance)) {
                console.log(`[FINANCE OVERRIDE] Forcing all Finance screens for user ${currentUserIdFinance}`);
                console.log(`[FINANCE OVERRIDE] Screens BEFORE clear:`, financeModule.screen.map(s => s.screenName));

                // Clear existing screens and add ALL screens
                financeModule.screen = [];
                missingScreens.forEach(item => {
                    financeModule.screen.push({
                        screenId: item.screenId,
                        screenName: item.screenName,
                        url: item.url,
                        icon: item.icon,
                        module: []
                    });
                });

                console.log(`[FINANCE OVERRIDE] Screens AFTER rebuild:`, financeModule.screen.map(s => s.screenName));
            }

            // Sort them alphabetically to look nice
            financeModule.screen.sort((a, b) => a.screenName.localeCompare(b.screenName));

            console.log(`[DEBUG FINANCE] Final screens after sort:`, financeModule.screen.map(s => s.screenName));
        }

        // ---------------------------------------------------------
        // 3. INJECT NEW REPORTS (AR BOOK DO, SALES ITEM WISE, SALES CUSTOMER WISE)
        // ---------------------------------------------------------
        const reportsModule = menuData.menus.find(m => m.moduleName === "Reports");

        if (reportsModule) {
            // A. AR Book DO
            const arBookDoExists = reportsModule.screen.find(s => s.screenName === "AR Book DO");
            if (!arBookDoExists) {
                const arBookIndex = reportsModule.screen.findIndex(s => s.screenName === "AR Book");
                const newArBookDo = {
                    screenId: 99903,
                    screenName: "AR Book DO",
                    url: "/ar-book-do",
                    icon: "bx bx-file",
                    module: []
                };

                if (arBookIndex !== -1) {
                    reportsModule.screen.splice(arBookIndex + 1, 0, newArBookDo);
                } else {
                    reportsModule.screen.push(newArBookDo);
                }
            }

            // B. Inject Sales Item Wise & Sales Customer Wise
            const newReports = [
                {
                    screenId: 99905,
                    screenName: "Sales Item Wise",
                    url: "/sales-item-wise",
                    icon: "bx bx-list-ul",
                    module: []
                },
                {
                    screenId: 99906,
                    screenName: "Sales Customer Wise",
                    url: "/sales-customer-wise",
                    icon: "bx bx-user",
                    module: []
                },
                {
                    screenId: 99922,
                    screenName: "Ledger Report",
                    url: "/LedgerReport",
                    icon: "bx bx-spreadsheet",
                    module: []
                }
            ];

            newReports.forEach(report => {
                if (!reportsModule.screen.find(s => s.screenName === report.screenName)) {
                    reportsModule.screen.push(report);
                }
            });
        }

        // ---------------------------------------------------------
        // 4. Mktg Verify Logic (User-Specific)
        // ---------------------------------------------------------
        // Only show Mktg Verify menu for specific users
        const authUserMktg = JSON.parse(localStorage.getItem("authUser"));
        const currentUserIdMktg = authUserMktg ? (parseInt(authUserMktg.u_id) || 0) : 0;
        const mktgVerifyUsers = [142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 188, 190, 158, 159, 162, 163, 191];

        if (mktgVerifyUsers.includes(currentUserIdMktg)) {
            const testMenu = {
                moduleId: 9999,
                moduleName: "Mktg Verify",
                icon: "bx bx-test-tube",
                screen: [
                    {
                        screenId: 99901,
                        screenName: "Verify Customer",
                        url: "/verify-customer",
                        icon: "bx bx-file",
                        module: []
                    }
                ]
            };

            if (!menuData.menus.find(m => m.moduleId === 9999)) {
                menuData.menus.push(testMenu);
                console.log(`[MKTG VERIFY] Added Mktg Verify menu for user ${currentUserIdMktg}`);
            }
        }

        // ---------------------------------------------------------
        // 5. RESTRUCTURE: MOVE REPORTS -> FINANCE
        // ---------------------------------------------------------
        const reportsMod = menuData.menus.find(m => m.moduleName === "Reports");
        const financeMod = menuData.menus.find(m => m.moduleName === "Finance");

        if (reportsMod && financeMod) {
            const keepInReports = [
                "Ledger",
                "TrialBalance",
                "Profit & Loss",
                "Balance Sheet",
                "Sales Item Wise",
                "Sales Customer Wise",
                "Ledger Report"
            ];

            const removeFromReports = ["Bank Reconciliation"];
            const newReportsScreens = [];

            reportsMod.screen.forEach(item => {
                if (keepInReports.includes(item.screenName)) {
                    newReportsScreens.push(item);
                } else if (removeFromReports.includes(item.screenName)) {
                    // Remove
                } else {
                    // Move to Finance
                    const existsInFinance = financeMod.screen.find(s => s.screenName === item.screenName);
                    if (!existsInFinance) {
                        financeMod.screen.push(item);
                    }
                }
            });

            reportsMod.screen = newReportsScreens;
        }

        // ---------------------------------------------------------
        // 6. REMOVE 'TAX REPORT' AND 'SALES' FROM FINANCE
        // ---------------------------------------------------------
        if (financeMod) {
            financeMod.screen = financeMod.screen.filter(item =>
                item.screenName !== "Tax Report" &&
                item.screenName !== "Sales"
            );
        }

        // ---------------------------------------------------------
        // 7. SORT FINANCE AND REPORTS ALPHABETICALLY
        // ---------------------------------------------------------
        if (financeMod && financeMod.screen) {
            financeMod.screen.sort((a, b) => a.screenName.localeCompare(b.screenName));
        }

        if (reportsMod && reportsMod.screen) {
            reportsMod.screen.sort((a, b) => a.screenName.localeCompare(b.screenName));
        }

        // ---------------------------------------------------------
        // 8. INJECT DIRECT SALES INVOICE (CREATE MODULE IF MISSING)
        // ---------------------------------------------------------
        let invoiceMenu = menuData.menus.find(m =>
            m.moduleName === "Invoice" ||
            m.moduleName === "Invoices" ||
            m.moduleName === "Sales" ||
            m.moduleName === "Order Management" ||
            m.moduleName === "Invoicing"
        );

        if (!invoiceMenu) {
            invoiceMenu = {
                moduleId: 99995,
                moduleName: "Invoices",
                icon: "bx bx-file",
                screen: [],
                menuOrder: 5
            };
            menuData.menus.push(invoiceMenu);
        }

        const dsInvoiceScreen = {
            screenId: 99920,
            screenName: "Direct Sales Invoice",
            url: "/manual-invoices",
            icon: "bx bx-file-blank",
            module: []
        };

        if (!invoiceMenu.screen.find(s => s.screenName === "Direct Sales Invoice")) {
            invoiceMenu.screen.push(dsInvoiceScreen);
            invoiceMenu.screen.sort((a, b) => a.screenName.localeCompare(b.screenName));
        }

        // INJECT DN/CN (Moved from Finance)
        const dnCnScreen = {
            screenId: 99921,
            screenName: "DN/CN",
            url: "/dn-cn",
            icon: "bx bx-file",
            module: []
        };

        if (!invoiceMenu.screen.find(s => s.screenName === "DN/CN")) {
            invoiceMenu.screen.push(dnCnScreen);
            invoiceMenu.screen.sort((a, b) => a.screenName.localeCompare(b.screenName));
        }

        // INJECT JOURNAL CT
        const journalCtScreen = {
            screenId: 99923,
            screenName: "Journal Ct",
            url: "/journal-ct",
            icon: "bx bx-receipt",
            module: []
        };

        if (!invoiceMenu.screen.find(s => s.screenName === "Journal Ct")) {
            invoiceMenu.screen.push(journalCtScreen);
            invoiceMenu.screen.sort((a, b) => a.screenName.localeCompare(b.screenName));
        }

        // ---------------------------------------------------------
        // 9. INJECT REPORTS MENU (CREATE IF MISSING)
        // ---------------------------------------------------------
        let reportsMenu = menuData.menus.find(m => m.moduleName === "Reports" || m.moduleName === "Report");

        if (!reportsMenu) {
            reportsMenu = {
                moduleId: 99996,
                moduleName: "Reports",
                icon: "bx bx-bar-chart-alt-2",
                screen: [],
                menuOrder: 10
            };
            menuData.menus.push(reportsMenu);
        }

        const salesReports = [
            {
                screenId: 99905,
                screenName: "Sales Item Wise",
                url: "/sales-item-wise",
                icon: "bx bx-list-ul",
                module: []
            },
            {
                screenId: 99906,
                screenName: "Sales Customer Wise",
                url: "/sales-customer-wise",
                icon: "bx bx-user",
                module: []
            },
            {
                screenId: 99922,
                screenName: "Ledger Report",
                url: "/LedgerReport",
                icon: "bx bx-spreadsheet",
                module: []
            }
        ];

        salesReports.forEach(report => {
            if (!reportsMenu.screen.find(s => s.screenName === report.screenName)) {
                reportsMenu.screen.push(report);
            }
        });

        reportsMenu.screen.sort((a, b) => a.screenName.localeCompare(b.screenName));

        // ---------------------------------------------------------
        // 10. INJECT MISSING MENUS (LOCAL DEV ONLY - MATCHING BETA UI)
        // ---------------------------------------------------------

        // A. Inject "Masters" Matches User Screenshot
        let mastersModule = menuData.menus.find(m => m.moduleName === "Masters");
        if (!mastersModule) {
            mastersModule = {
                moduleId: 99990,
                moduleName: "Masters",
                icon: "bx bx-customize",
                screen: [],
                menuOrder: 1
            };
            menuData.menus.push(mastersModule);
        }

        // FORCE RESET screens to ensure permission logic is applied
        mastersModule.screen = [];

        // Custom Masters Logic for Specific Users
        const masterAuthUser = JSON.parse(localStorage.getItem("authUser"));
        const currentUserId = masterAuthUser ? (parseInt(masterAuthUser.u_id) || 0) : 0;
        const accessForUsers = [137, 168, 169, 170, 184];

        let masterItems = [];

        // IF USER is in the restricted list (137, 168, etc) -> SHOW ONLY 4 ITEMS
        if (accessForUsers.includes(currentUserId)) {
            masterItems = [
                { name: "Payment Terms", url: "/manage-payment-terms", icon: "bx bx-calendar" },
                { name: "Suppliers", url: "/manage-suppliers", icon: "bx bx-user-check" },
                { name: "Items", url: "/manage-items", icon: "bx bx-list-ul" },
                { name: "UOM", url: "/manage-units", icon: "bx bx-ruler" }
            ];
        }
        // ELSE -> SHOW FULL LIST (Standard Behavior for Admin/Others)
        else {
            masterItems = [
                { name: "Access Rights", url: "/access-rights", icon: "bx bx-user-voice" },
                { name: "Country", url: "/country", icon: "bx bx-flag" },
                { name: "Currency", url: "/currency", icon: "bx bx-money" },
                { name: "Customers", url: "/manage-customer", icon: "bx bx-user" },
                { name: "Departments", url: "/department", icon: "bx bx-building" },
                { name: "Gas", url: "/manage-gas", icon: "bx bx-wind" },
                { name: "Payment Methods", url: "/manage-payment-methods", icon: "bx bx-credit-card" },
                { name: "Cylinder", url: "/manage-cylinder", icon: "bx bx-cylinder" },
                { name: "Pallet", url: "/manage-pallet", icon: "bx bx-box" },
                { name: "Claim & Payment Description", url: "/manage-claim-payment-desc", icon: "bx bx-detail" },
                { name: "Users", url: "/manage-users", icon: "bx bx-user-circle" },
                // Full Access includes these too:
                { name: "Payment Terms", url: "/manage-payment-terms", icon: "bx bx-calendar" },
                { name: "Suppliers", url: "/manage-suppliers", icon: "bx bx-user-check" },
                { name: "Items", url: "/manage-items", icon: "bx bx-list-ul" },
                { name: "UOM", url: "/manage-units", icon: "bx bx-ruler" }
            ];
        }

        // Re-sort alphabetically
        masterItems.sort((a, b) => a.name.localeCompare(b.name));

        masterItems.forEach((item, index) => {
            mastersModule.screen.push({
                screenId: 99940 + index,
                screenName: item.name,
                url: item.url,
                icon: item.icon,
                module: []
            });
        });

        // B. Inject "Sales"
        let salesModule = menuData.menus.find(m => m.moduleName === "Sales");
        if (!salesModule) {
            salesModule = {
                moduleId: 99991,
                moduleName: "Sales",
                icon: "bx bx-cart",
                screen: [],
                menuOrder: 2
            };
            // Add Sales Quotation, Sales Order, etc.
            salesModule.screen.push({ screenId: 99980, screenName: "Sales Quotation", url: "/manage-quotation", icon: "bx bx-file", module: [] });
            salesModule.screen.push({ screenId: 99981, screenName: "Sales Order", url: "/manage-order", icon: "bx bx-cart-alt", module: [] });

            menuData.menus.push(salesModule);
        }

        // C. Inject "Procurement" (Restored to User's Previous Config)
        let procurementModule = menuData.menus.find(m => m.moduleName === "Procurement");
        if (!procurementModule) {
            procurementModule = {
                moduleId: 99992,
                moduleName: "Procurement",
                icon: "bx bx-shopping-bag",
                screen: [],
                menuOrder: 3
            };

            // specific items from previous correct state
            const procurementItems = [
                { name: "Purchase Memo", url: "/procurementspurchase-memo", icon: "bx bx-file" },
                { name: "Purchase Requisition", url: "/procurementspurchase-requisition", icon: "bx bx-file" },
                { name: "Approval", url: "/purchase-requisition-approval", icon: "bx bx-check-circle" },
                { name: "Purchase Order", url: "/procurementspurchase-order", icon: "bx bx-cart" },
                { name: "GRN", url: "/procurementsgrn", icon: "bx bx-box" },
                // IRN is already here, ensuring it shows in Procurement
                { name: "IRN", url: "/InvoiceReceipt", icon: "bx bx-receipt" }
            ];

            procurementItems.forEach((item, index) => {
                procurementModule.screen.push({
                    screenId: 99970 + index,
                    screenName: item.name,
                    url: item.url,
                    icon: item.icon,
                    module: []
                });
            });

            menuData.menus.push(procurementModule);
        }

        // D. Inject "Claim"
        let claimModule = menuData.menus.find(m => m.moduleName === "Claim" || m.moduleName === "Claims");
        if (!claimModule) {
            claimModule = {
                moduleId: 99993,
                moduleName: "Claim",
                icon: "bx bx-briefcase-alt-2",
                screen: [],
                menuOrder: 4
            };

            claimModule.screen.push({
                screenId: 99930,
                screenName: "Claim & Payment",
                url: "/Manageclaim&Payment",
                icon: "bx bx-detail",
                module: []
            });

            claimModule.screen.push({
                screenId: 99931,
                screenName: "Master Payment Plan",
                url: "/paymentplanapproval", // Verified URL from user edits
                icon: "bx bx-calendar-check",
                module: []
            });

            // Hide PPP for specific users
            const authUserPPP = JSON.parse(localStorage.getItem("authUser"));
            const restrictedPPPUsers = [136, 137, 184, 170, 169];
            const currentUserId = authUserPPP ? (parseInt(authUserPPP.u_id) || 0) : 0;

            if (!restrictedPPPUsers.includes(currentUserId)) {
                claimModule.screen.push({
                    screenId: 99932,
                    screenName: "PPP",
                    url: "/PPP", // Verified URL
                    icon: "bx bx-file",
                    module: []
                });
            }

            // -- NEW INJECTION from Step 463 --
            // Restored Approval for GM/Director
            claimModule.screen.push({
                screenId: 99933,
                screenName: "Approval",
                url: "/Manageapproval",
                icon: "bx bx-check-square",
                module: []
            });

            claimModule.screen.push({
                screenId: 99934,
                screenName: "Approval Discussions",
                url: "/approval-discussions",
                icon: "bx bx-chat",
                module: []
            });

            menuData.menus.push(claimModule);
        }

        // ---------------------------------------------------------
        // D.1. ENSURE MPP IS ADDED TO CLAIM MODULE (for specific users)
        // ---------------------------------------------------------
        // This runs AFTER Claim module creation/retrieval to ensure MPP is available
        if (claimModule) {
            const authUserMPP = JSON.parse(localStorage.getItem("authUser"));
            const currentUserId = authUserMPP ? (parseInt(authUserMPP.u_id) || 0) : 0;

            // Users who MUST have MPP
            const mppRequiredUsers = [157];

            // Check if MPP already exists in the Claim module
            const mppExists = claimModule.screen.find(s => s.screenName === "Master Payment Plan" || s.url === "/paymentplanapproval");

            console.log(`[MPP DEBUG] MPP exists: ${!!mppExists}, User in required list: ${mppRequiredUsers.includes(currentUserId)}`);

            // Add MPP if it doesn't exist and user should have it
            if (!mppExists && mppRequiredUsers.includes(currentUserId)) {
                console.log(`[MPP INJECTION] Adding Master Payment Plan for user ${currentUserId}`);
                claimModule.screen.push({
                    screenId: 99931,
                    screenName: "Master Payment Plan",
                    url: "/paymentplanapproval",
                    icon: "bx bx-calendar-check",
                    module: []
                });
            }
        }


        // ---------------------------------------------------------
        // 4.1. Warehouse Menu
        // ---------------------------------------------------------
        const warehouseMenu = {
            moduleId: 10000,
            moduleName: "Warehouse",
            icon: "bx bx-building",
            screen: [
                {
                    screenId: 100001,
                    screenName: "Dashboard",
                    url: "/warehouse-dashboard",
                    icon: "bx bx-bar-chart",
                    module: []
                },
                {
                    screenId: 100002,
                    screenName: "Opening",
                    url: "/warehouse-opening",
                    icon: "bx bx-folder-open",
                    module: []
                },
                {
                    screenId: 100003,
                    screenName: "GRN",
                    url: "/warehouse-grn",
                    icon: "bx bx-receipt",
                    module: []
                },
                {
                    screenId: 100004,
                    screenName: "In Stock",
                    url: "/warehouse-in-stock",
                    icon: "bx bx-package",
                    module: []
                },
                {
                    screenId: 100005,
                    screenName: "Direct Use",
                    url: "/warehouse-direct",
                    icon: "bx bx-send",
                    module: []
                },
                {
                    screenId: 100006,
                    screenName: "Project",
                    url: "/warehouse-project",
                    icon: "bx bx-folder",
                    module: []
                },
                {
                    screenId: 100007,
                    screenName: "Direct Issue",
                    url: "/warehouse-direct-issue",
                    icon: "bx bx-export",
                    module: []
                },
                {
                    screenId: 100008,
                    screenName: "Report",
                    url: "/warehouse-report",
                    icon: "bx bx-file-blank",
                    module: []
                }
            ]
        };

        if (!menuData.menus.find(m => m.moduleId === 10000)) {
            menuData.menus.push(warehouseMenu);
        }

        // Remove old "Employee" or "Procurement & Claims" if they exist from previous injection
        menuData.menus = menuData.menus.filter(m => m.moduleName !== "Employee" && m.moduleName !== "Procurement & Claims");

        // ---------------------------------------------------------
        // 11. SORT MENUS BY menuOrder AND LOG FOR DEBUGGING
        // ---------------------------------------------------------
        menuData.menus.sort((a, b) => (a.menuOrder || 999) - (b.menuOrder || 999));

        console.log("=== SIDEBAR MENU DEBUG ===");
        console.log("Total Menus:", menuData.menus.length);
        console.log("Invoices Menu:", invoiceMenu);
        console.log("Reports Menu:", reportsMenu);
        console.log("All Menus:", menuData.menus.map(m => ({ name: m.moduleName, order: m.menuOrder, screens: m.screen.length })));

        // ---------------------------------------------------------
        // 12. SECURITY FILTER: PROCUREMENT DEPARTMENT
        // ---------------------------------------------------------
        let authUser = JSON.parse(localStorage.getItem("authUser"));

        // Apply restriction ONLY if user is NOT a Super Admin
        // "Role Super Admin should see everything"
        if (authUser) {
            console.log("=== SECURITY DEBUG START ===");
            console.log("Department:", authUser.department);
            console.log("Department ID:", authUser.departmentId);
            console.log("Role Name:", authUser.roleName);
            console.log("Is Admin:", authUser.IsAdmin);
            console.log("Super Admin:", authUser.superAdmin);
            console.log("=== SECURITY DEBUG END ===");
        }


        // ---------------------------------------------------------
        // UNIVERSAL SECURITY FILTERS
        // ---------------------------------------------------------

        // Declare variables needed for all security filters
        const role = authUser && authUser.roleName ? authUser.roleName.trim().toLowerCase() : "";
        const restrictedApprovalUsers = [138, 139, 140];
        const currentUserIdFilter = authUser ? (parseInt(authUser.u_id) || 0) : 0;

        // PRIORITY FILTER: FINANCE/INVOICE/REPORTS USERS (160, 161, 162, 163, 165, 191)
        // This runs FIRST to bypass default restrictions
        const financeInvoiceReportsUsers = [160, 161, 162, 163, 165, 191];

        // CUSTOM USERS WITH FULL INITIAL ACCESS (158, 159)
        // These users bypass universal filters and use final override blocks for configuration
        const customFullAccessUsers = [158, 159];

        let skipUniversalFilters = false;

        if (financeInvoiceReportsUsers.includes(currentUserIdFilter)) {
            console.log(`--- FINANCE/INVOICE/REPORTS USER (${currentUserIdFilter}): Full Finance/Invoice/Reports Access, Claim & Payment Only ---`);

            // DEBUG: Log Finance screens BEFORE filtering
            const financeModDebug = menuData.menus.find(m => m.moduleName === "Finance");
            if (financeModDebug) {
                console.log(`[DEBUG] Finance screens BEFORE filtering:`, financeModDebug.screen.map(s => s.screenName));
            } else {
                console.log(`[DEBUG] Finance module NOT FOUND before filtering`);
            }

            // 1. Filter menus to show ONLY Finance, Invoice, Reports, and Claim
            const allowedModules = ["Finance", "Invoice", "Invoices", "Reports", "Report", "Claim", "Claims", "Mktg Verify"];
            menuData.menus = menuData.menus.filter(m => allowedModules.includes(m.moduleName));
            console.log(`[RESTRICTION APPLIED] Filtered to Finance/Invoice/Reports/Claim for user ${currentUserIdFilter}`);

            // DEBUG: Log Finance screens AFTER module filtering
            const financeModDebug2 = menuData.menus.find(m => m.moduleName === "Finance");
            if (financeModDebug2) {
                console.log(`[DEBUG] Finance screens AFTER module filtering:`, financeModDebug2.screen.map(s => s.screenName));
            } else {
                console.log(`[DEBUG] Finance module NOT FOUND after module filtering`);
            }

            // 2. Filter Claim module to show ONLY "Claim & Payment" (and PPP for specific users)
            const claimMod = menuData.menus.find(m => m.moduleName === "Claim" || m.moduleName === "Claims");
            if (claimMod && claimMod.screen) {
                const originalScreenCount = claimMod.screen.length;

                // Users who get PPP in addition to Claim & Payment
                const pppUsers = [161, 160, 165, 163];

                claimMod.screen = claimMod.screen.filter(s => {
                    const isClaimAndPayment = s.screenName === "Claim & Payment" || s.url === "/Manageclaim&Payment";
                    const isPPP = s.screenName === "PPP" || s.url === "/PPP";

                    // For PPP users: Allow both Claim & Payment AND PPP
                    if (pppUsers.includes(currentUserIdFilter)) {
                        return isClaimAndPayment || isPPP;
                    }

                    // For others: Only Claim & Payment
                    return isClaimAndPayment;
                });
                console.log(`[RESTRICTION APPLIED] Claim screens filtered from ${originalScreenCount} to ${claimMod.screen.length} for user ${currentUserIdFilter}`);
            }

            // 3. Finance, Invoice, and Reports modules keep ALL their screens (no filtering needed)
            console.log(`[INFO] Finance, Invoice, and Reports modules retain all screens for user ${currentUserIdFilter}`);

            // Skip the universal security filters below
            skipUniversalFilters = true;
        }
        // CUSTOM FULL ACCESS USERS (158, 159) - Skip universal filters, use final override instead
        else if (customFullAccessUsers.includes(currentUserIdFilter)) {
            console.log(`--- CUSTOM FULL ACCESS USER (${currentUserIdFilter}): Bypassing universal filters, using final override ---`);
            skipUniversalFilters = true;
        }

        // Universal Security Filters (Skip if already handled above)

        // 1. GM, Director, CEO & Restricted Users: ONLY APPROVAL PAGES (Strict Priority)


        // DEBUGGING FOR USER 158
        if (currentUserIdFilter === 158) {
            console.log("=== DEBUG 158: Checking Security Blocks ===");
            console.log("Is 158 in restrictedApprovalUsers?", restrictedApprovalUsers.includes(158));
            console.log("Is 158 a Director/GM/CEO?", role === "gm" || role === "director" || role === "ceo" || role === "general manager");
        }

        if (!skipUniversalFilters && (role === "gm" || role === "director" || role === "ceo" || role === "general manager" || restrictedApprovalUsers.includes(currentUserIdFilter))) {
            if (currentUserIdFilter === 158) console.log("=== DEBUG 158: Entered GM/Director Block (Line 518) ===");
            console.log("--- GM/DIRECTOR/CEO: Approval Pages Only (Restriction Applied) ---");

            const allowedModules = ["Procurement", "Claim", "Claims"];
            // Special Case: User 135 gets Masters
            if (currentUserIdFilter === 135) {
                allowedModules.push("Masters");
            }
            // Special Case: User 138 NOT allowed Procurement
            if (currentUserIdFilter === 138) {
                const procIndex = allowedModules.indexOf("Procurement");
                if (procIndex > -1) allowedModules.splice(procIndex, 1);
            }
            // Special Case: Mktg Verify users get Mktg Verify menu
            const mktgVerifyUsers = [142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 188, 190];
            if (mktgVerifyUsers.includes(currentUserIdFilter)) {
                allowedModules.push("Mktg Verify");
            }

            menuData.menus = menuData.menus.filter(m => allowedModules.includes(m.moduleName));

            // Keep ONLY approval pages
            menuData.menus.forEach(menu => {
                if (menu.screen && menu.screen.length > 0) {
                    menu.screen = menu.screen.filter(item => {
                        // Special Case: Masters screens should be visible for 135
                        if (currentUserIdFilter === 135 && menu.moduleName === "Masters") {
                            return true;
                        }

                        // Special Case: User 156 gets Approval Discussions and Master Payment Plan
                        if (currentUserIdFilter === 156) {
                            if (item.screenName === "Approval Discussions" || item.url === "/approval-discussions") return true;
                            if (item.screenName === "Master Payment Plan" || item.url === "/paymentplanapproval") return true;
                        }

                        const isApprovalLink = item.url && item.url.toLowerCase().includes("approval");

                        // For restricted users (138, 139, 140), exclude specific pages even if they are approval pages
                        if (restrictedApprovalUsers.includes(currentUserIdFilter)) {
                            // EXCEPTION: Explicitly ALLOW "PPP" page
                            if (item.url === "/PPP" || item.screenName === "PPP") {
                                return true;
                            }

                            // EXCEPTION: User 140 also gets "Claim & Payment" page
                            if (currentUserIdFilter === 140 && (item.screenName === "Claim & Payment" || item.url === "/Manageclaim&Payment")) {
                                return true;
                            }

                            const excludedUrls = ["/paymentplanapproval", "/approval-discussions"];
                            if (excludedUrls.includes(item.url)) {
                                return false;
                            }
                        }

                        return isApprovalLink;
                    });
                }
            });
        }
        // 2. SuperAdmin: Full Access
        else if (authUser && authUser.superAdmin) {
            if (currentUserIdFilter === 158) console.log("=== DEBUG 158: Entered SUPER ADMIN Block (Line 564) ===");
            console.log("--- SUPER ADMIN: Full Access ---");
        }

        // EVERYONE ELSE: Procurement + Claim WITHOUT approvals
        else if (!skipUniversalFilters && authUser) {
            if (currentUserIdFilter === 158) console.log("=== DEBUG 158: Entered DEFAULT USER Block (Line 569) ===");
            console.log("--- DEFAULT USER: Procurement + Claim (No Approvals) ---");

            // Check if 158 bypasses the filter
            if (currentUserIdFilter === 158) {
                console.log("=== DEBUG 158: Default Modules BEFORE filter: ", menuData.menus.map(m => m.moduleName));
            }

            const allowedModules = ["Procurement", "Claim", "Claims"];
            if (currentUserIdFilter === 135) {
                allowedModules.push("Warehouse");
            }
            // Special Case: User 135 gets Masters + New Users 137,168,169,170,184
            const masterAccessUsers = [135, 137, 168, 169, 170, 184];
            if (masterAccessUsers.includes(currentUserIdFilter) || currentUserIdFilter === 1) {
                allowedModules.push("Masters");
            }
            if (currentUserIdFilter === 158 || currentUserIdFilter === 159) {
                allowedModules.push("Reports");
            }
            // Special Case: Mktg Verify users get Mktg Verify menu
            //const mktgVerifyUsers = [142, 143, 144, 145, 146, 147, 148, 149, 150, 151, 152, 153, 154, 155, 188, 190];
            //if (mktgVerifyUsers.includes(currentUserIdFilter)) {
            //  allowedModules.push("Mktg Verify");
            // }

            menuData.menus = menuData.menus.filter(m => allowedModules.includes(m.moduleName));

            if (currentUserIdFilter === 158) {
                console.log("=== DEBUG 158: Default Modules AFTER filter: ", menuData.menus.map(m => m.moduleName));
            }

            // HIDE all approval pages
            menuData.menus.forEach(menu => {
                if (menu.screen && menu.screen.length > 0) {
                    menu.screen = menu.screen.filter(item => {
                        // Special Case: Masters screens should be visible for 135
                        if (currentUserIdFilter === 135 && menu.moduleName === "Masters") {
                            return true;
                        }

                        // Special Case: User 156 gets Approval Discussions and Master Payment Plan
                        if (currentUserIdFilter === 156) {
                            if (item.screenName === "Approval Discussions" || item.url === "/approval-discussions") return true;
                            if (item.screenName === "Master Payment Plan" || item.url === "/paymentplanapproval") return true;
                        }

                        // Special Case: User 157 gets Master Payment Plan
                        if (currentUserIdFilter === 157) {
                            if (item.screenName === "Master Payment Plan" || item.url === "/paymentplanapproval") return true;
                        }

                        // Special Case: Users 142 & 145 get Approval
                        if ([142, 145].includes(currentUserIdFilter) && (item.screenName === "Approval" || item.url === "/Manageapproval")) {
                            return true;
                        }

                        return !item.url || !item.url.toLowerCase().includes("approval");
                    });
                }
            });
        }

        // Hide Finance from non-SuperAdmin (except financeInvoiceReportsUsers)
        if (!skipUniversalFilters && authUser && !authUser.superAdmin) {
            menuData.menus = menuData.menus.filter(m => m.moduleName !== "Finance");
        }

        // ---------------------------------------------------------
        // DEFINE RESTRICTED USER LIST (New Group)
        // ---------------------------------------------------------
        // Users: 172, 145, 171, 152, 154, 174, 147, 151, 185, 133, 168, 150, 143, 186, 155, 166, 164, 142, 148, 146, 153, 141, 157, 144, 149, 173, 167, 190
        // NOTE: Removed 160, 161, 162, 163, 165, 191 as they are handled by financeInvoiceReportsUsers
        // NOTE: Removed 159 as it has custom configuration matching user 158
        const claimOnlyUsers = [172, 145, 171, 152, 154, 174, 147, 151, 133, 168, 150, 143, 155, 166, 164, 142, 148, 146, 153, 141, 157, 144, 149, 173, 167, 190];



        // ---------------------------------------------------------
        // 13. SPECIAL RESTRICTION: USERS 175 & 176
        // ---------------------------------------------------------
        // Requirement:
        // 1. Procurement: Show ONLY "Purchase Memo" and "GRN"
        // 2. Hide "Claim" menu completely
        // NOTE: If user is in claimOnlyUsers, SKIP this block (let the new block handle it)
        const restrictedMenuUsers = [175, 176];
        if (restrictedMenuUsers.includes(currentUserIdFilter) && !claimOnlyUsers.includes(currentUserIdFilter)) {
            console.log("--- RESTRICTED USER (175/176): Procurement Limited, Claims Hidden ---");

            // 1. Filter Procurement
            const procurementMod = menuData.menus.find(m => m.moduleName === "Procurement");
            if (procurementMod && procurementMod.screen) {
                const allowedProcurementScreens = ["Purchase Memo", "GRN"];
                procurementMod.screen = procurementMod.screen.filter(s =>
                    allowedProcurementScreens.includes(s.screenName)
                );
            }

            // 2. Hide Claim
            menuData.menus = menuData.menus.filter(m => m.moduleName !== "Claim" && m.moduleName !== "Claims");
        }

        // ---------------------------------------------------------
        // 14. SPECIAL RESTRICTION: GROUP 2 (177, 178, 179, 180, 181, 182, 183)
        // ---------------------------------------------------------
        // Requirement:
        // 1. Procurement: Show ONLY "Purchase Memo"
        // 2. Hide "Claim" menu completely
        // NOTE: If user is in claimOnlyUsers, SKIP this block
        const restrictedGroup2Users = [177, 178, 179, 180, 181, 182, 183];
        if (restrictedGroup2Users.includes(currentUserIdFilter) && !claimOnlyUsers.includes(currentUserIdFilter)) {
            console.log("--- RESTRICTED GROUP 2 (177-183): Procurement Limited, Claims Hidden ---");

            // 1. Filter Procurement
            const procurementMod = menuData.menus.find(m => m.moduleName === "Procurement");
            if (procurementMod && procurementMod.screen) {
                const allowedProcurementScreens = ["Purchase Memo"];
                procurementMod.screen = procurementMod.screen.filter(s =>
                    allowedProcurementScreens.includes(s.screenName)
                );
            }

            // 2. Hide Claim
            menuData.menus = menuData.menus.filter(m => m.moduleName !== "Claim" && m.moduleName !== "Claims");
        }

        // ---------------------------------------------------------
        // 15. SPECIAL RESTRICTION: GROUP 3 (185, 186, 187)
        // ---------------------------------------------------------
        // Requirement:
        // 1. Procurement: Show ONLY "Purchase Memo"
        // 2. Claim: Show ONLY "Claim & Payment"
        const restrictedGroup3Users = [185, 186, 187];
        if (restrictedGroup3Users.includes(currentUserIdFilter)) {
            console.log("--- RESTRICTED GROUP 3 (185-187): Purchase Memo Only + Claim & Payment Only ---");

            // 1. Filter Procurement to show ONLY "Purchase Memo"
            const procurementMod = menuData.menus.find(m => m.moduleName === "Procurement");
            if (procurementMod && procurementMod.screen) {
                const allowedProcurementScreens = ["Purchase Memo"];
                procurementMod.screen = procurementMod.screen.filter(s =>
                    allowedProcurementScreens.includes(s.screenName)
                );
            }

            // 2. Filter Claim to show ONLY "Claim & Payment"
            const claimMod = menuData.menus.find(m => m.moduleName === "Claim" || m.moduleName === "Claims");
            if (claimMod && claimMod.screen) {
                claimMod.screen = claimMod.screen.filter(s =>
                    s.screenName === "Claim & Payment" || s.url === "/Manageclaim&Payment"
                );
            }
        }

        // ---------------------------------------------------------
        // 16. SPECIAL RESTRICTION: CLAIM ONLY USERS
        // ---------------------------------------------------------
        // Requirement:
        // 1. Hide Procurement module completely
        // 2. Claim: Show ONLY "Claim & Payment" page
        if (claimOnlyUsers.includes(currentUserIdFilter)) {
            console.log(`--- CLAIM ONLY USER (${currentUserIdFilter}): Procurement Hidden, Claim & Payment Only ---`);

            // 1. Remove Procurement module entirely
            menuData.menus = menuData.menus.filter(m => m.moduleName !== "Procurement");
            console.log(`[RESTRICTION APPLIED] Procurement module removed for user ${currentUserIdFilter}`);

            // 2. Filter Claim module to show ONLY "Claim & Payment" (Exception: 142 & 145 get Approval too)
            const claimMod = menuData.menus.find(m => m.moduleName === "Claim" || m.moduleName === "Claims");
            if (claimMod && claimMod.screen) {
                const originalScreenCount = claimMod.screen.length;

                // Debug for user 157
                if (currentUserIdFilter === 157) {
                    console.log(`[USER 157 DEBUG] Claim screens BEFORE filter:`, claimMod.screen.map(s => `${s.screenName} (${s.url})`));
                }

                claimMod.screen = claimMod.screen.filter(s => {
                    const isClaimAndPayment = s.screenName === "Claim & Payment" || s.url === "/Manageclaim&Payment";
                    const isApproval = s.screenName === "Approval" || s.url === "/Manageapproval";
                    const isPPP = s.screenName === "PPP" || s.url === "/PPP";
                    const isMPP = s.screenName === "Master Payment Plan" || s.url === "/paymentplanapproval";

                    // User 157: Allow Claim & Payment, MPP, AND PPP
                    if (currentUserIdFilter === 157) {
                        return isClaimAndPayment || isMPP || isPPP;
                    }

                    // Users 161, 160, 165, 163: Allow Claim & Payment AND PPP
                    if ([161, 160, 165, 163].includes(currentUserIdFilter)) {
                        return isClaimAndPayment || isPPP;
                    }

                    // Users 142 & 145: Allow Claim & Payment AND Approval
                    if ([142, 145].includes(currentUserIdFilter)) {
                        return isClaimAndPayment || isApproval;
                    }

                    // Others: Strictly Claim & Payment
                    return isClaimAndPayment;
                });
                console.log(`[RESTRICTION APPLIED] Claim screens filtered from ${originalScreenCount} to ${claimMod.screen.length} for user ${currentUserIdFilter}`);
            }

            // 3. SPECIAL EXTRA RESTRICTION FOR USER 158
            if (currentUserIdFilter === 158) {
                console.log("--- RESTRICTED USER (158): Aggressive Cleanup ---");

                // A. Remove Sales, Invoices, Reports, Employee, Attendance, and Procurement
                const modulesToRemove = ["Sales", "Invoices", "Invoice", "Reports", "Employee", "Attendance", "Leaves", "Procurement"];
                menuData.menus = menuData.menus.filter(m => !modulesToRemove.includes(m.moduleName));

                // B. STRICTLY Enforce Claim to be ONLY "Claim & Payment"
                // (This overrides any previous logic that might have let approvals slip in)
                const claimMod = menuData.menus.find(m => m.moduleName === "Claim" || m.moduleName === "Claims");
                if (claimMod) {
                    claimMod.screen = claimMod.screen.filter(s =>
                        s.screenName === "Claim & Payment" ||
                        s.url === "/Manageclaim&Payment"
                    );
                }
            }
        }

        // ---------------------------------------------------------
        // FINAL OVERRIDE FOR USER 158 (Guaranteed Fix)
        // ---------------------------------------------------------
        // This block runs AFTER all other logic to ensure no other rule overrides it.
        if (currentUserIdFilter === 158) {
            console.log("=== FINAL OVERRIDE (158): Custom Configuration ===");

            // 1. Remove Forbidden Modules (Allow Procurement & Invoices now)
            // User requested: Remove Sales, Employee, Attendance, Leaves, Warehouse. Allow Reports.
            const modulesToRemove = ["Sales", "Employee", "Attendance", "Leaves", "Warehouse"];
            menuData.menus = menuData.menus.filter(m => !modulesToRemove.includes(m.moduleName));

            // 2. Configure Procurement: Show ALL except "Approval"
            const procurementMod = menuData.menus.find(m => m.moduleName === "Procurement");
            if (procurementMod) {
                procurementMod.screen = procurementMod.screen.filter(s =>
                    s.screenName !== "Approval" &&
                    !s.url.includes("approval")
                );
            }

            // 3. Configure Claim: Strictly "MasterPaymentPlan", "PPP", "GRN", "IRN"
            const claimMod = menuData.menus.find(m => m.moduleName === "Claim" || m.moduleName === "Claims");
            if (claimMod) {
                // Define the 3 specifics
                const specificScreens = [
                    { screenName: "Claim & Payment", url: "/Manageclaim&Payment", icon: "bx bx-detail" },
                    { screenName: "Master Payment Plan", url: "/paymentplanapproval", icon: "bx bx-calendar-check" },
                    { screenName: "PPP", url: "/PPP", icon: "bx bx-file" }
                ];

                // Rebuild Claim Screens
                claimMod.screen = specificScreens.map((item, idx) => ({
                    screenId: 99950 + idx, // arbitrary unique ID for this session
                    screenName: item.screenName,
                    url: item.url,
                    icon: item.icon,
                    module: []
                }));
            }
        }

        // ---------------------------------------------------------
        // FINAL OVERRIDE FOR USER 159 (Custom Fix - Same as User 158)
        // ---------------------------------------------------------
        if (currentUserIdFilter === 159) {
            console.log("=== FINAL OVERRIDE (159): Custom Configuration (Same as 158) ===");

            // 1. Remove Forbidden Modules (Same as User 158)
            // Keep: Masters, Finance, Invoices, Mktg Verify, Procurement, Claim, Reports
            const modulesToRemove = ["Sales", "Employee", "Attendance", "Leaves", "Warehouse"];
            menuData.menus = menuData.menus.filter(m => !modulesToRemove.includes(m.moduleName));

            // 2. Configure Procurement: Show ALL except "Approval"
            const procurementMod = menuData.menus.find(m => m.moduleName === "Procurement");
            if (procurementMod) {
                procurementMod.screen = procurementMod.screen.filter(s =>
                    s.screenName !== "Approval" &&
                    !s.url.includes("approval")
                );
            }

            // 3. Configure Claim: Strictly "Claim & Payment", "Master Payment Plan", "PPP"
            const claimMod = menuData.menus.find(m => m.moduleName === "Claim" || m.moduleName === "Claims");
            if (claimMod) {
                // Define the 3 specifics
                const specificScreens = [
                    { screenName: "Claim & Payment", url: "/Manageclaim&Payment", icon: "bx bx-detail" },
                    { screenName: "Master Payment Plan", url: "/paymentplanapproval", icon: "bx bx-calendar-check" },
                    { screenName: "PPP", url: "/PPP", icon: "bx bx-file" }
                ];

                // Rebuild Claim Screens
                claimMod.screen = specificScreens.map((item, idx) => ({
                    screenId: 99960 + idx, // arbitrary unique ID for this session
                    screenName: item.screenName,
                    url: item.url,
                    icon: item.icon,
                    module: []
                }));
            }
        }

        // 11. Update State
        this.setState({ dynamicMenu: menuData || [] }, () => {
            this.initMenu();
        });
    };

    componentDidUpdate(prevProps, prevState, ss) {
        if (this.props.type !== prevProps.type) {
            this.initMenu();
        }
    }

    initMenu() {
        new MetisMenu("#side-menu");
        let matchingMenuItem = null;
        const ul = document.getElementById("side-menu");
        if (ul) {
            const items = ul.getElementsByTagName("a");
            for (let i = 0; i < items.length; ++i) {
                if (this.props.location.pathname === items[i].pathname) {
                    matchingMenuItem = items[i];
                    break;
                }
            }
            if (matchingMenuItem) {
                this.activateParentDropdown(matchingMenuItem);
            }
        }
    }

    scrollElement = item => {
        setTimeout(() => {
            if (this.refDiv.current !== null) {
                if (item) {
                    const currentPosition = item.offsetTop;
                    if (currentPosition > window.innerHeight) {
                        if (this.refDiv.current)
                            this.refDiv.current.getScrollElement().scrollTop =
                                currentPosition - 300;
                    }
                }
            }
        }, 300);
    };

    activateParentDropdown = item => {
        item.classList.add("active");
        const parent = item.parentElement;
        const parent2El = parent.childNodes[1];
        if (parent2El && parent2El.id !== "side-menu") {
            parent2El.classList.add("mm-show");
        }
        if (parent) {
            parent.classList.add("mm-active");
            const parent2 = parent.parentElement;
            if (parent2) {
                parent2.classList.add("mm-show");
                const parent3 = parent2.parentElement;
                if (parent3) {
                    parent3.classList.add("mm-active");
                    parent3.childNodes[0].classList.add("mm-active");
                    const parent4 = parent3.parentElement;
                    if (parent4) {
                        parent4.classList.add("mm-show");
                        const parent5 = parent4.parentElement;
                        if (parent5) {
                            parent5.classList.add("mm-show");
                            parent5.childNodes[0].classList.add("mm-active");
                        }
                    }
                }
            }
        }
        this.scrollElement(item);
        return false;
    };

    renderDynamicMenu = (menus) => {
        return menus.map((menu) => (
            <li key={menu.moduleId}>
                <Link to="/#" className="has-arrow">
                    <i className={menu.icon}></i>
                    <span>{menu.moduleName}</span>
                </Link>
                <ul className="sub-menu" aria-expanded="false">
                    {menu.screen.map((screen) => (
                        <React.Fragment key={screen.screenId}>
                            <li>
                                <Link to={screen.url}>
                                    <i className={screen.icon}></i>
                                    {screen.screenName}
                                </Link>
                            </li>
                            {screen.module && screen.module.length > 0 && screen.module.map((subModule) => (
                                <li key={subModule.moduleId}>
                                    <Link to="/#" className="has-arrow">
                                        <i className={subModule.icon}></i>
                                        {subModule.moduleName}
                                    </Link>
                                    <ul className="sub-menu" aria-expanded="false">
                                        {subModule.screen.map((nestedScreen) => (
                                            <li key={nestedScreen.screenId}>
                                                <Link to={nestedScreen.url}>
                                                    <i className={nestedScreen.icon}></i>
                                                    {nestedScreen.screenName}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </li>
                            ))}
                        </React.Fragment>
                    ))}
                </ul>
            </li>
        ));
    };

    render() {
        return (
            <React.Fragment>
                <SimpleBar className="h-100" ref={this.refDiv}>
                    <div id="sidebar-menu">
                        <ul className="metismenu list-unstyled" id="side-menu">
                            <li className="menu-title"></li>
                            {this.state.dynamicMenu && this.state.dynamicMenu.menus && this.renderDynamicMenu(this.state.dynamicMenu.menus)}
                        </ul>
                    </div>
                </SimpleBar>
            </React.Fragment>
        );
    }
}

SidebarContent.propTypes = {
    location: PropTypes.object,
    t: PropTypes.any,
    type: PropTypes.string,
};

export default withRouter(withTranslation()(SidebarContent))