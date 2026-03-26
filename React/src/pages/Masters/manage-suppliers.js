import React, { useState, useEffect } from "react";
import { Card, CardBody, Col, Container, Row, Modal, ModalHeader, ModalBody, Label, FormGroup, Input, InputGroup } from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { classNames } from 'primereact/utils';
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { IconField } from 'primereact/iconfield';
import { InputIcon } from 'primereact/inputicon';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { ProgressBar } from 'primereact/progressbar';
import { Calendar } from 'primereact/calendar';
import { MultiSelect } from 'primereact/multiselect';
import { Slider } from 'primereact/slider';
import { Tag } from 'primereact/tag';
import { TriStateCheckbox } from 'primereact/tristatecheckbox';
import "primereact/resources/themes/lara-light-blue/theme.css";
import { useHistory } from "react-router-dom";
import Flatpickr from "react-flatpickr"
import Select from "react-select";
import Swal from 'sweetalert2';
import { ChangeSupplierStatus, GetAllSuppliers, GetSupplierBankAutoComplete, GetSupplierCategoryAutoComplete, GetSupplierCityAutoComplete, GetSupplierMasterAutoComplete, GetSupplierStateAutoComplete } from "common/data/mastersapi";
// Move the initFilters function definition above
const initFilters = () => ({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    SupplierCode: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
    SupplierName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
    CategoryName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
    cityname: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
});

const Managesuppliers = () => {
    const history = useHistory();
    const FilterTypes = [
        { name: "Supplier Name", value: 1 },
        { name: "City", value: 2 },
        { name: "State", value: 3 },
        // { name: "Bank Name", value: 4 },
        { name: "Category", value: 5 },
    ];

    const [suppliers, setSuppliers] = useState([]);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState(initFilters());

    const [loading, setLoading] = useState(false);
    const [switchStates, setSwitchStates] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [txtStatus, setTxtStatus] = useState(null);
    const [selectedFilterType, setSelectedFilterType] = useState(null);
    const [selectedAutoItem, setSelectedAutoItem] = useState(null);
    const [autoOptions, setAutoOptions] = useState([]);
    const [branchId, setBranchId] = useState(1);
    const [orgId, setOrgId] = useState(1);
    const getDynamicLabel = () => {
        if (selectedFilterType?.value === 1) return "Supplier Name";
        if (selectedFilterType?.value === 2) return "City";
        if (selectedFilterType?.value === 3) return "State";
        if (selectedFilterType?.value === 4) return "Bank Name";
        if (selectedFilterType?.value === 5) return "Category";
        return "";
    };

    useEffect(() => {
        const fetchSuppliers = async () => {
            setLoading(true);
            try {
                const response = await GetAllSuppliers(orgId, branchId); // supplierId, cityId, etc. default to 0
                setSuppliers(response?.data || []);
                const initialSwitchStates = {};
                response?.data.forEach(item => {
                    // Standardize status check to handle number 1 or boolean true
                    initialSwitchStates[item.SupplierCode] = item.IsActive == 1 || item.IsActive === true;
                });
                setSwitchStates(initialSwitchStates);
            } catch (error) {
                console.error("Error fetching suppliers:", error);
            } finally {
                setLoading(false);
            }
        };

        if (orgId && branchId) {
            fetchSuppliers();
        }
    }, [orgId, branchId]);

    useEffect(() => {
        const loadOptions = async () => {
            if (!selectedFilterType) {
                setAutoOptions([]);
                return;
            }

            let result = [];
            switch (selectedFilterType.value) {
                case 1: {
                    // Supplier Name
                    result = await GetSupplierMasterAutoComplete(orgId, branchId, "%");
                    setAutoOptions(
                        (result?.data || []).map(item => ({
                            label: item.suppliername,
                            value: item.supplierid,
                        }))
                    );
                    break;
                }

                case 2: {
                    // City
                    result = await GetSupplierCityAutoComplete(orgId, branchId, "%");
                    setAutoOptions(
                        (result?.data || []).map(item => ({
                            label: item.CityName,
                            value: item.Cityid,
                        }))
                    );
                    break;
                }

                case 3: {
                    // State
                    result = await GetSupplierStateAutoComplete(orgId, branchId, "%");
                    setAutoOptions(
                        (result?.data || []).map(item => ({
                            label: item.StateName,
                            value: item.StateID,
                        }))
                    );
                    break;
                }

                case 4: {
                    // Bank Name
                    result = await GetSupplierBankAutoComplete(orgId, branchId, "%");
                    setAutoOptions(
                        (result?.data || []).map(item => ({
                            label: item.BankName,
                            value: item.BankId,
                        }))
                    );
                    break;
                }

                case 5: {
                    // Category
                    result = await GetSupplierCategoryAutoComplete(orgId, branchId, "%");
                    setAutoOptions(
                        (result?.data || []).map(item => ({
                            label: item.categoryName,
                            value: item.id,
                        }))
                    );
                    break;
                }

                default:
                    setAutoOptions([]);
            }
        };

        loadOptions();
    }, [selectedFilterType, orgId, branchId]);

    // useEffect(() => {
    //     const customerData = getCustomers();
    //     setCustomers(customerData);

    //     const initialSwitchStates = {};
    //     customerData.forEach(customer => {
    //         initialSwitchStates[customer.SupplierCode] = customer.Active === 1;
    //     });
    //     setSwitchStates(initialSwitchStates);
    // }, []);

    const [isModalOpen2, setIsModalOpen2] = useState(false);
    const toggleModal2 = () => {
        setIsModalOpen2(!isModalOpen2);
    };

    // useEffect(() => {
    //     setCustomers(getCustomers());
    // }, []);

    // const getCustomers = () => {
    //     return [
    //         { Code: "SUP000491", Name: "PT HALO HALO BANDUNG", Country: "Indonesia", Contactperson: "Muthu" },
    //         { Code: "SUP000500", Name: "RAVIKUMAR", Country: "China", Contactperson: "Kevin" },
    //         { Code: "SUP000492", Name: "SASIKALA", Country: "Indonesia", Contactperson: "Mark" },
    //         { Code: "SUP000498", Name: "Jane", Country: "Indonesia", Contactperson: "Sophia" },
    //     ];
    // };

    const searchData = async () => {
        try {
            const filterType = selectedFilterType?.value || 0;
            const filterValue = selectedAutoItem?.value || 0;

            let result;

            if (filterType === 1) {
                // Search by Supplier Name
                result = await GetAllSuppliers(orgId, branchId, filterValue, 0, 0, 0, 0);
            } else if (filterType === 2) {
                // Search by City
                result = await GetAllSuppliers(orgId, branchId, 0, filterValue, 0, 0, 0);
            } else if (filterType === 3) {
                // Search by State
                result = await GetAllSuppliers(orgId, branchId, 0, 0, filterValue, 0, 0);
            } else if (filterType === 5) {
                // Search by Category
                result = await GetAllSuppliers(orgId, branchId, 0, 0, 0, filterValue, 0);
            } else {
                // Default – load all
                result = await GetAllSuppliers(orgId, branchId, 0, 0, 0, 0, 0);
            }

            setSuppliers(Array.isArray(result.data) ? result.data : []);
        } catch (error) {
            console.error("Error while fetching suppliers:", error);
        }
    };

    const cancelFilter = async () => {
        setSelectedFilterType(null);
        setSelectedAutoItem(null);
        const res = await GetAllSuppliers(orgId, branchId);
        if (res.status) {
            setSuppliers(Array.isArray(res.data) ? res.data : []);
        }
    };

    // Clear filters
    const clearFilter = () => {
        setSelectedFilterType(null);
        setSelectedAutoItem(null);
        setFilters(initFilters());
        setGlobalFilterValue('');
    };

    const onGlobalFilterChange = (e) => {
        const value = e.target.value;
        setFilters((prevFilters) => ({
            ...prevFilters,
            global: { ...prevFilters.global, value },
        }));
        setGlobalFilterValue(value);
    };

    const renderHeader = () => {
        return (
            <div className="row align-items-center g-3 clear-spa">
                <div className="col-12 col-lg-3">
                    <Button className="btn btn-danger btn-label" onClick={clearFilter} outlined >
                        <i className="mdi mdi-filter-off label-icon" />
                        Clear
                    </Button>
                </div>
                <div className="col-12 col-lg-3">
                    <input className="form-control" type="text" value={globalFilterValue} onChange={onGlobalFilterChange} placeholder="Keyword Search" />
                </div>
            </div>
        );
    };

    const header = renderHeader();

    const filterClearTemplate = (options) => {
        return <Button type="button" icon="pi pi-times" onClick={options.filterClearCallback} severity="secondary"></Button>;
    };

    const filterApplyTemplate = (options) => {
        return <Button type="button" icon="pi pi-check" onClick={options.filterApplyCallback} severity="success"></Button>;
    };

    const filterFooterTemplate = () => {
        return <div className="px-3 pt-0 pb-3 text-center">Filter by Country</div>;
    };

    const linkAddsupplier = () => {
        history.push("/add-supplier");
    };

    const editRow = (rowData) => {
        console.log('Edit row:', rowData);
        history.push(`/edit-supplier/${rowData.SupplierId}`);
    };

    const actionBodyTemplate = (rowData) => {
        return (
            <div className="actions">
                <span onClick={() => editRow(rowData)} title="Edit">
                    <i className="mdi mdi-square-edit-outline" style={{ fontSize: '1.5rem' }}></i>
                </span>
            </div>
        )
    };

    const openModal = (rowData) => {
        // Standardize IsActive check
        const isActive = rowData.IsActive == 1 || rowData.IsActive === true;
        const value = isActive ? "deactivate" : "activate";
        setTxtStatus(value);
        setSelectedRow(rowData);
        setIsModalOpen(true);
    };

    const handleConfirmStatusChange = async () => {
        if (!selectedRow) return;

        try {
            const currentStatus = selectedRow.IsActive == 1 || selectedRow.IsActive === true;
            const newStatus = currentStatus ? 0 : 1;

            // Get userId from authUser
            const authUser = JSON.parse(localStorage.getItem("authUser") || "{}");
            const userId = authUser.u_id || authUser.uid || 1;

            const res = await ChangeSupplierStatus(branchId, orgId, selectedRow.SupplierId, newStatus === 1, userId);

            if (res?.status) {
                // Update UI states properly
                setSwitchStates((prev) => ({
                    ...prev,
                    [selectedRow.SupplierCode]: newStatus === 1
                }));

                setSuppliers(prevSuppliers =>
                    prevSuppliers.map(s =>
                        s.SupplierId === selectedRow.SupplierId ? { ...s, IsActive: newStatus } : s
                    )
                );

                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: `Supplier status updated to ${newStatus === 1 ? 'Active' : 'Deactive'} successfully.`,
                    timer: 1500,
                    showConfirmButton: false
                });

                console.log("Status updated successfully");
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Update Failed',
                    text: res?.message || 'Failed to update supplier status'
                });
                console.error("Status update failed:", res?.message);
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An unexpected error occurred while updating status.'
            });
            console.error("Error updating status:", error);
        } finally {
            setIsModalOpen(false);
        }
    };

    const actionBodyTemplate2 = (rowData) => {
        return (
            <div className="square-switch">
                <Input
                    type="checkbox"
                    id={`square-switch-${rowData.SupplierCode}`}
                    switch="bool"
                    onChange={() => openModal(rowData)}  // open modal first
                    checked={switchStates[rowData.SupplierCode] || false}
                />
                <label
                    htmlFor={`square-switch-${rowData.SupplierCode}`}
                    data-on-label="Yes"
                    data-off-label="No"
                    style={{ margin: 0 }}
                />
            </div>
        );
    };

    return (
        <React.Fragment>
            <div className="page-content">
                <Container fluid>
                    <Breadcrumbs title="Master" breadcrumbItem="Suppliers" />
                    <Row>
                        <Card className="search-top">
                            <div className="row align-items-end g-3 quotation-mid p-3">
                                {/* User Name */}
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
                                                <Select
                                                    name="dynamicSelect"
                                                    options={autoOptions}
                                                    placeholder={`Search ${selectedFilterType.label}`}
                                                    classNamePrefix="select"
                                                    isClearable
                                                    isSearchable
                                                    value={selectedAutoItem}
                                                    onChange={(selected) => setSelectedAutoItem(selected)}
                                                />

                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className={`col-12 ${selectedFilterType ? 'col-lg-5' : 'col-lg-9'} d-flex justify-content-end flex-wrap gap-2`} >
                                    <button type="button" className="btn btn-info" onClick={searchData}> <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search</button>
                                    <button type="button" className="btn btn-danger" onClick={cancelFilter}><i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Cancel</button>
                                    <button type="button" className="btn btn-success" onClick={linkAddsupplier}><i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i>New</button>
                                </div>
                            </div>
                        </Card>
                    </Row>
                    <Row>
                        <Col lg="12">
                            <Card>
                                <DataTable value={suppliers} paginator showGridlines rows={10} loading={loading} dataKey="SupplierCode" filters={filters} globalFilterFields={["SupplierCode", "SupplierName", "CategoryName", "cityname"]} header={header} emptyMessage="No suppliers found." onFilter={(e) => setFilters(e.filters)}>
                                    {/* <Column field="SupplierCode" header="Supplier Code" filter filterPlaceholder="Search by code" filterClear={filterClearTemplate} filterApply={filterApplyTemplate} filterFooter={filterFooterTemplate} style={{ width: '10%' }} className="text-center"/> */}
                                    <Column field="SupplierCode" header="Supplier Code" filter filterPlaceholder="Search by Code" style={{ width: '10%' }} />
                                    <Column field="SupplierName" header="Supplier Name" filter filterPlaceholder="Search by name" />
                                    <Column field="CategoryName" header="Category" filter filterPlaceholder="Search by category" />
                                    <Column field="cityname" filter header="City" />
                                    <Column field="IsActive" header="Active" showFilterMatchModes={false} body={actionBodyTemplate2} className="text-center" headerClassName="text-center" style={{ width: '8%' }} />
                                    <Column field="actions" header="Action" showFilterMatchModes={false} body={actionBodyTemplate} className="text-center" headerClassName="text-center" style={{ width: '8%' }} />
                                </DataTable>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
            {/* Confirmation Modal */}
            <Modal isOpen={isModalOpen} toggle={() => setIsModalOpen(false)} centered>
                <ModalBody className="py-3 px-5">
                    <Row>
                        <Col lg={12}>
                            <div className="text-center">
                                <i className="mdi mdi-alert-circle-outline" style={{ fontSize: "9em", color: "orange" }} />
                                <h2>Are you sure?</h2>
                                <h4>Do you want to {txtStatus} this account?</h4>
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <div className="text-center mt-3 button-items">
                                {/* <Button className="btn btn-info" color="success" size="lg" onClick={onSwitchChange}> */}
                                <Button className="btn btn-info" color="success" size="lg" onClick={handleConfirmStatusChange}>
                                    Yes
                                </Button>
                                <Button color="danger" size="lg" className="btn btn-danger" onClick={() => setIsModalOpen(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </Col>
                    </Row>
                </ModalBody>
            </Modal>
        </React.Fragment>
    );
};

export default Managesuppliers;