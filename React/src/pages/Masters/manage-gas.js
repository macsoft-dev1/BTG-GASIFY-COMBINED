import React, { useState, useEffect } from "react";
import { Card, CardBody, Col, Container, Row, Modal, ModalHeader, ModalBody, Label, FormGroup, InputGroup, Input } from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import Select from "react-select";
import { FilterMatchMode, FilterOperator } from 'primereact/api';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import "primereact/resources/themes/lara-light-blue/theme.css";
import { useHistory } from "react-router-dom";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import "flatpickr/dist/themes/material_blue.css";
import Flatpickr from "react-flatpickr";
import { AutoComplete } from 'primereact/autocomplete';

import { GetAllGasListing, GetAllGasTypes, GetgasbyId, UpdateGascode, AddGascode, gastoggleactivestatus, GetVolume, GetPressure } from "../../common/data/mastersapi";

const initFilters = () => ({
    global: { value: null, matchMode: FilterMatchMode.CONTAINS },
    Id: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.EQUALS }] },
    GasCode: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    GasName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.CONTAINS }] },
    Descriptions: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
    Volume: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
    Pressure: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
    TypeName: { operator: FilterOperator.AND, constraints: [{ value: null, matchMode: FilterMatchMode.STARTS_WITH }] },
});

const ManageGas = () => {
    const history = useHistory();
    const [fullGasList, setFullGasList] = useState([]);
    const [isfilter, setIsfilter] = useState(false);
    const [gastypeOptions, setGastypeOptions] = useState([]);
    const [gasSuggestions, setGasSuggestions] = useState([]);
    const [selectedGas, setSelectedGas] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    const [volumeOptions, setVolumeOptions] = useState([]);
    const [pressureOptions, setPressureOptions] = useState([]);

    const [gas, setGas] = useState([]);
    const [globalFilterValue, setGlobalFilterValue] = useState("");
    const [filters, setFilters] = useState(initFilters());
    const [loading, setLoading] = useState(false);
    const [successmsg, setSuccessmsg] = useState();
    const [errormsg, setErrormsg] = useState();
    const currentYear = new Date().getFullYear();
    const formatDate = (date) => date.toISOString().split('T')[0];
    const [gasfilter, setGasfilter] = useState({
        gasname: "",
        pressure: "",
        volume: "",
        BranchId: 1,
    });
    useEffect(() => {
        getAllList();
        loadgasTypeList();
        loadPressureList();
        loadVolumeList();
    }, []);
    const [gasid, setGasid] = useState();
    const [gasDetails, setGasDetails] = useState({
        gasid: 0,
        gasCode: "",
        gasName: "",
        volume: "",
        pressure: "",
        volumeid: 0,
        pressureid: 0,
        gasTypeId: 0,
        descriptions: ""
    });

    const loadGasSuggestions = async (e) => {
        debugger
        try {
            setIsLoading(true);
            const query = e.query.trim();
            if (!query) return;

            const res = await GetAllGasListing(query, "", "");

            if (res && res.data) {
                const filteredGases = res.data.map(
                    item => ({
                        label: item.GasName,
                        value: item.Id,
                        volume: item.Volume,
                        pressure: item.Pressure
                    })
                );
                setGasSuggestions(filteredGases);

                const uniqueVolumes = [...new Set(res.data.map(item => item.Volume))]
                    .map(vol => ({
                        label: vol,
                        value: vol
                    }));
                setVolumeOptions(uniqueVolumes);

                const uniquePressures = [...new Set(res.data.map(item => item.Pressure))]
                    .map(pres => ({
                        label: pres,
                        value: pres
                    }));
                setPressureOptions(uniquePressures);
                setIsLoading(false);
            }
        }
        catch (err) {
            console.error("Suggestion fetch error:", err);
            setIsLoading(false);
        }
    };

    const handleGasSelect = (selectgas) => {
        debugger
        const selectedGasData = gasSuggestions.find(g => g.value === selectgas.value);
        console.log("selectedGasData >", selectedGasData, "selectgas >", selectgas)
        if (selectedGasData) {
            setSelectedGas(selectedGasData);
            setGasfilter({
                ...gasfilter,
                gasid: selectedGasData.id || 0,
                gasname: selectedGasData.label || "",
                volume: selectedGasData.volume || "",
                pressure: selectedGasData.pressure || "",
            });
        }
    };

    const loadgasTypeList = async () => {
        try {
            debugger
            const data = await GetAllGasTypes();
            console.log(data)
            if (data) {
                setGastypeOptions(data);
            } else {
                setGastypeOptions([]);
                console.log("Failed to fetch gas types");
            }
        } catch (err) {
            console.log('err > ', err)
            setGastypeOptions([]);
        } finally {
            setLoading(false);
        }
    };
    const loadVolumeList = async () => {
        try {
            debugger
            const data = await GetVolume();
            console.log(data)
            if (data) {

                console.log("Volume Options:", volumeOptions);

                setVolumeOptions(data || []);
            } else {
                console.log("Failed to fetch Volume");
            }
        } catch (err) {
            console.log('err > ', err)
        } finally {
            setLoading(false);
        }
    };

    const loadPressureList = async () => {
        try {
            debugger
            const data = await GetPressure();
            console.log(data)
            if (data) {
                console.log("Pressure Options:", pressureOptions);
                setPressureOptions(data || []);
            } else {
                console.log("Failed to fetch Pressure");
            }
        } catch (err) {
            console.log('err > ', err)
        } finally {
            setLoading(false);
        }
    };

    const getgasid = async (gasid) => {
        try {
            debugger
            const data = await GetgasbyId(gasid);
            console.log(data)
            if (data) {
                setGastypeOptions(data || []);
            } else {
                console.log("Failed to fetch gas types");
            }
        } catch (err) {
            console.log('err > ', err)
        } finally {
            setLoading(false);
        }
    };

    const [isModalOpen2, setIsModalOpen2] = useState(false);
    const toggleModal2 = () => {
        setIsModalOpen2(!isModalOpen2);
    };

    const validationSchema = Yup.object().shape({

        gasCode: Yup.string()
            .trim()
            .required('Gas Code is required')
            .max(10, "Gas Code must be atmost 10 Characters")
            .test("unique-gas-code", "Gas Code Should Be Unique", async function (value) {
                debugger
                if (!value) return true;
                try {
                    const existGCode = gas.find(
                        gc => gc.GasCode &&
                            gc.GasCode.toLowerCase() === value.toLowerCase() &&
                            gc.Id !== (this.parent.gasid || 0)
                    );
                    return !existGCode;
                }
                catch (error) {
                    console.error("Error validating gas code:", error);
                    return true;
                }
            }),
        gasName: Yup.string()
            .trim()
            .required('Gas Name is required')
            .max(50, "Gas Name must be atmost 50 Characters")
            .test("unique-gas-name", "Gas Name Should Be Unique", async function (value) {
                debugger
                if (!value) return true;
                try {
                    const existGCode = gas.find(
                        gc => gc.GasName &&
                            gc.GasName.toLowerCase() === value.toLowerCase() &&
                            gc.Id !== (this.parent.gasid || 0)
                    );
                    return !existGCode;
                }
                catch (error) {
                    console.error("Error validating gas code:", error);
                    return true;
                }
            }),
        volumeid: Yup.string().required('Volume is required'),
        pressureid: Yup.string().required('Pressure is required'),
        // unitPrice: Yup.string().required('Unit price is required'),
        // effectivefromdate: Yup.date().required('From date is required').typeError('Invalid date format'),
        // effectivetodate: Yup.date().required('To date is required').typeError('Invalid date format').min(Yup.ref('effectivefromdate'), 'To date must be greater than From date'),
        gasTypeId: Yup.string().required('Gas Type is required'),
        descriptions: Yup.string()
            .trim()
            .required('Gas description is required')
            .max(100, "Descriptions must be atmost 100 Characters")
    });

    const getAllList = async () => {
        setLoading(true);
        console.log("gasfilter", gasfilter)
        try {
            debugger
            const response = await GetAllGasListing(gasfilter.gasname, gasfilter.volume, gasfilter.pressure);
            if (response?.status) {
                console.log("Selected Gas:", gas);
                console.log("full data:", response.data);
                setFullGasList(response.data || []);
                setGas(response?.data || []);
            } else {
                console.log("Failed to fetch gas codes");
            }
        } catch (err) {
            console.log('err > ', err)
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const initialSwitchStates = {};
        gas.forEach(gas => {
            initialSwitchStates[gas.Id] = gas.IsActive === 1;
        });
        setSwitchStates(initialSwitchStates);
    }, [gas]);

    useEffect(() => {
        if (successmsg || errormsg) {
            const timer = setTimeout(() => {
                setSuccessmsg(null);
                setErrormsg(null);
            }, 6000);
        }
    }, [successmsg, errormsg]);

    const [switchStates, setSwitchStates] = useState({});
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);
    const [txtStatus, setTxtStatus] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const clearFilter = () => {
        //setFilters(initFilters());
        debugger
        const resetFilter = {
            gasname: "",
            volume: "",
            pressure: "",
            BranchId: 1,
        };
        setFilters(initFilters());
        setGlobalFilterValue("");

        setGasfilter(resetFilter);
        setGas(fullGasList);
        setSearchTerm("");
        setIsfilter(!isfilter)
        setSelectedGas(null);
        setVolumeOptions([]);
        setPressureOptions([]);

    };

    const onGlobalFilterChange = (e) => {
        debugger
        const value = e.target.value.toLowerCase().trim();
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
        return <div className="px-3 pt-0 pb-3 text-center">Filter by Volume</div>;
    };

    const linkAddgas = async () => {
        debugger
        await Promise.all([loadVolumeList(), loadPressureList()]);
        setGasDetails({
            gasCode: "",
            gasName: "",
            volumeid: "",
            volume: "",
            pressureid: "",
            pressure: "",
            gasTypeId: "",
            descriptions: ""
        });
        toggleModal2()
    };

    const editRow = (rowData) => {
        debugger
        if (rowData && rowData.Id > 0) {
            setGasid(rowData.Id);
            getGasDetails(rowData.Id);
        } else {
            console.error("Invalid rowData: ", rowData);
        }
    };

    const getGasDetails = async (gid) => {
        try {
            debugger
            if (gid > 0) {
                const data = await GetgasbyId(gid);
                if (data) {
                    setGasDetails({
                        gasid: data.id || 0,
                        gasCode: data.gasCode || "",
                        gasName: data.gasName || "",
                        volumeid: data.volumeid || data.volumeId || "",
                        pressureid: data.pressureid || data.pressureId || "",
                        pressure: data.pressure || data.Pressure || "",
                        volume: data.volume || data.Volume || "",
                        gasTypeId: data.gasTypeId || "",
                        descriptions: data.descriptions || ""
                    });
                    setIsModalOpen2(true);
                }
                else {
                    console.error("Error: No data found for the provided gas ID");
                }

            }
        } catch (error) {
            console.error("Submission error:", error);
        } finally {
            //setSubmitting(false);
        }
    };

    const actionBodyTemplate = (rowData) => {
        console.log(selectedRow, "rowData :", rowData);
        if (rowData.IsActive == 1) {
            return (
                <div className="actions">
                    <span onClick={() => {
                        editRow(rowData);
                        console.log("onClick :", rowData);
                    }}

                        title={"Edit"}>
                        <i className="mdi mdi-square-edit-outline" style={{ fontSize: '1.5rem' }}></i>
                    </span>
                </div>
            )
        }
        else {
            return (
                <div className="actions">

                    <span
                        style={{
                            cursor: 'not-allowed',
                            opacity: 0.5,
                            pointerEvents: 'none'
                        }}
                        title={"Disabled"}>
                        <i className="mdi mdi-square-edit-outline" style={{ fontSize: '1.5rem' }}></i>
                    </span>
                    {/* <span onClick={() => deleteRow(rowData)} title="Delete">
                <i className="mdi mdi-trash-can-outline label-icon" style={{ fontSize: '1.5rem' }}></i> </span> */}
                </div>
            )
        }

    };

    const onSwitchChange = async () => {
        debugger
        if (!selectedRow) return;
        const newStatus = !switchStates[selectedRow.Id];
        // setSwitchStates(prevStates => ({
        //     ...prevStates,
        //     [selectedRow.Id]: newStatus,
        // })); 
        // setGas(prevGas =>
        //     prevGas.map(gas =>
        //         gas.Id === selectedRow.Id ? { ...gas, IsActive: newStatus ? 1 : 0 } : gas
        //     )
        // ); 
        const payload = {
            id: selectedRow.Id,
            isActive: newStatus
        };
        try {
            const response = await gastoggleactivestatus(payload);
            if (response?.status) {

                console.log('Status updated successfully');
                debugger
                getAllList();
                setSuccessmsg(`Gas ${newStatus === true ? 'Activated' : 'Deactivated'} successfully!`);
                loadgasTypeList();

            } else {
                console.warn('Failed to update status');
            }
        } catch (error) {
            console.error('API Error:', error);
            // Optionally revert UI changes on failure
        }
        setIsModalOpen(false);
    };

    const openModal = (rowData) => {
        const value = rowData.IsActive === 1 ? "deactive" : "active";
        setTxtStatus(value);
        setSelectedRow(rowData);
        setIsModalOpen(true);
    };
    const handleDateChange = (selectedDates, dateStr, instance) => {
        const fieldName = instance.element.getAttribute("id");
        const newDate = dateStr;
        setGasfilter(prevState => {
            let updatedFilter = { ...prevState, [fieldName]: newDate };
            if (updatedFilter.FromDate && updatedFilter.ToDate && updatedFilter.FromDate > updatedFilter.ToDate) {
                return prevState;
            }
            return updatedFilter;
        });
    };

    const actionBodyTemplate2 = (rowData) => {
        return (
            <div className="square-switch">
                <Input
                    type="checkbox"
                    id={`square-switch-${rowData.Id}`}
                    switch="bool"
                    onChange={() => openModal(rowData)}
                    checked={switchStates[rowData.Id] || false}
                />
                <label htmlFor={`square-switch-${rowData.Id}`} data-on-label="Yes" data-off-label="No" style={{ margin: 0 }} />
            </div>
        );
    };

    const handleSubmit = async (values, { setSubmitting, resetForm }) => {
        try {
            debugger;
            const payload = {
                Id: values.gasid || 0,
                GasCode: values.gasCode,
                GasName: values.gasName,
                Volume: values.volume,
                VolumeId: parseInt(values.volumeid) || 0,
                Pressure: values.pressure,
                PressureId: parseInt(values.pressureid) || 0,
                Descriptions: values.descriptions,
                GasTypeId: parseInt(values.gasTypeId) || 0,
                IsActive: true,
                UserId: 1,
                UserIp: "127.0.0.1",
                OrgId: 1,
                BranchId: 1,
            };
            if (values.gasid > 0) {
                const response = await UpdateGascode(payload);
                setSuccessmsg(response.message);
            }
            else {
                const response = await AddGascode(payload);
                setSuccessmsg(response.message);
            }
            getAllList();
            setIsModalOpen2(false);

            // setTimeout(() => {
            //     setIsModalOpen2(!isModalOpen2);
            // }, 300);            
            resetForm();
        }
        catch (error) {
            console.error("Update status error:", error);
            setErrormsg("Error Saving Gas Record.");
        } finally {
            setSubmitting(false);
        }
    };

    const cancelFilter = () => {

        debugger
        const resetFilter = {
            gasname: "",
            volume: "",
            pressure: "",
            BranchId: 1,
        };

        setGasfilter(resetFilter);
        setGas(fullGasList);
        setSearchTerm("");
        setIsfilter(!isfilter)
        setSelectedGas(null);
        setVolumeOptions([]);
        setPressureOptions([]);

    };


    useEffect(() => {
        getAllList();
    }, [isfilter]);

    return (
        <React.Fragment>
            <div className="page-content">
                {successmsg && <div className="alert alert-success">{successmsg}</div>}
                {errormsg && <div className="alert alert-danger">{errormsg}</div>}
                <Container fluid>
                    <Breadcrumbs title="Utility" breadcrumbItem=" Gas " />
                    <Row>
                        <Card className="search-top">
                            <div className="row align-items-center g-2 quotation-mid">

                                {/* Gas Name */}
                                <div className="col-lg-4 mt-1">
                                    <div className="d-flex align-items-center gap-2">
                                        <label htmlFor="gas_name" className="form-label mb-0" style={{ whiteSpace: 'nowrap', minWidth: '80px' }}>Gas Name</label>
                                        <div className="flex-grow-1">
                                            <AutoComplete
                                                id="gas_name"
                                                value={searchTerm}
                                                suggestions={gasSuggestions}
                                                completeMethod={loadGasSuggestions}
                                                field="label"
                                                onChange={(e) => {
                                                    debugger
                                                    const inputvalue = e.value || "";
                                                    setSearchTerm(inputvalue);
                                                    if (!e.value) {
                                                        setSelectedGas(null);
                                                        setGasfilter(prev => ({
                                                            ...prev,
                                                            volume: "",
                                                            pressure: ""
                                                        }));
                                                    } else {
                                                        setGasfilter(prev => ({
                                                            ...prev,
                                                            gasname: e.value,
                                                            volume: "",
                                                            pressure: ""
                                                        }));
                                                        setSelectedGas(null);
                                                    }
                                                }}
                                                onSelect={(e) => {
                                                    setSelectedGas(e.value);
                                                    setSearchTerm(e.value.label);
                                                    handleGasSelect(e.value);
                                                }}
                                                placeholder=""
                                                className="w-100"
                                                inputClassName="form-control w-100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Volume Dropdown */}
                                <div className="col-lg-2 mt-1">
                                    <div className="d-flex align-items-center gap-2">
                                        <label className="form-label mb-0" style={{ whiteSpace: 'nowrap', minWidth: '60px' }}>Volume</label>
                                        <div className="flex-grow-1">
                                            <Select
                                                name="volume"
                                                options={volumeOptions}
                                                value={gasfilter.volume ? volumeOptions.find(option => option.label === String(gasfilter.volume)) : null}
                                                onChange={(selectedOption) => setGasfilter({ ...gasfilter, volume: selectedOption.value })}
                                                isDisabled={!selectedGas || isLoading}
                                                placeholder="Select"
                                                className="w-100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Pressure Dropdown */}
                                <div className="col-lg-2 mt-1">
                                    <div className="d-flex align-items-center gap-2">
                                        <label className="form-label mb-0" style={{ whiteSpace: 'nowrap', minWidth: '70px' }}>Pressure</label>
                                        <div className="flex-grow-1">
                                            <Select
                                                name="pressure"
                                                options={pressureOptions}
                                                value={gasfilter.pressure ? pressureOptions.find(option => option.label === gasfilter.pressure) : null}
                                                onChange={(selectedOption) => setGasfilter({ ...gasfilter, pressure: selectedOption.value })}
                                                isDisabled={!selectedGas || isLoading}
                                                placeholder="Select"
                                                className="w-100"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Buttons (Search, Cancel, New) */}
                                <div className="col-lg-4 d-flex justify-content-end mt-1">
                                    <div className="d-flex gap-2">
                                        <button type="button" className="btn btn-info" onClick={getAllList}>
                                            <i className="bx bx-search-alt label-icon font-size-16 align-middle me-2"></i> Search
                                        </button>
                                        <button type="button" className="btn btn-danger" onClick={cancelFilter}>
                                            <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i> Cancel
                                        </button>
                                        <button type="button" className="btn btn-success" onClick={linkAddgas}>
                                            <i className="bx bx-plus label-icon font-size-16 align-middle me-2"></i> New
                                        </button>
                                    </div>
                                </div>

                            </div>
                        </Card>
                    </Row>

                    <Row>
                        <Col lg="12">
                            <Card>
                                <DataTable value={fullGasList} paginator showGridlines rows={15} loading={loading} dataKey="Id" filters={filters} globalFilterFields={["GasCode", "GasName", "Descriptions", "Volume", "Pressure"]} header={header} emptyMessage="No gas found." onFilter={(e) => setFilters(e.filters)}  >
                                    <Column field="GasCode" header="Gas Code" filter filterPlaceholder="Search by code" />
                                    <Column field="GasName" header="Gas Name" filter filterPlaceholder="Search by name" />
                                    <Column field="Volume" header="Gas Volume" filter filterPlaceholder="Search by volume" />
                                    <Column field="Pressure" header="Gas Pressure" filter filterPlaceholder="Search by pressure" />
                                    {/* <Column field="UnitPrice" header="Gas Unit Price" filter filterPlaceholder="Search by unit price" /> */}
                                    <Column field="TypeName" header="Gas Type" filter filterPlaceholder="Search by type" />
                                    <Column field="Descriptions" header="Gas Descriptions" filter filterPlaceholder="Search by description" />
                                    <Column field="Actionstatus" header="IsActive" showFilterMatchModes={false} body={actionBodyTemplate2} className="text-center" headerClassName="text-center" style={{ width: '8%' }} />
                                    <Column field="Systemseqno" header="Action" showFilterMatchModes={false} body={actionBodyTemplate} />
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

                                <h4>Do you want to {txtStatus} this account?</h4>
                            </div>
                        </Col>
                    </Row>
                    <Row>
                        <Col>
                            <div className="text-center mt-3 button-items">
                                <Button className="btn btn-info" color="success" size="lg" onClick={onSwitchChange}>
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

            <Modal isOpen={isModalOpen2} role="dialog" autoFocus={true} centered={true} className="exampleModal" tabIndex="-1" toggle={toggleModal2} size="lg">
                <div className="modal-content">
                    <ModalHeader toggle={toggleModal2} className="bg-model-hd">Gas Master</ModalHeader>
                    <ModalBody>
                        <Row>
                            <Col lg="12">
                                <Card>
                                    <CardBody>
                                        <Formik initialValues={gasDetails} validationSchema={validationSchema} onSubmit={handleSubmit} >
                                            {({ errors, touched, setFieldValue, setFieldTouched, values }) => (
                                                <Form>
                                                    <Row>
                                                        <Col md="6">
                                                            <FormGroup>
                                                                <Label htmlFor="gasCode" className="required-label">Gas Code</Label>
                                                                <Field name="gasCode" className={`form-control ${errors.gasCode && touched.gasCode ? "is-invalid" : ""}`} />
                                                                <ErrorMessage name="gasCode" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md="6">
                                                            <FormGroup>
                                                                <Label htmlFor="gasName" className="required-label">Gas Name</Label>
                                                                <Field name="gasName" className={`form-control ${errors.gasName && touched.gasName ? "is-invalid" : ""}`} />
                                                                <ErrorMessage name="gasName" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md="6">
                                                            <FormGroup>
                                                                <Label htmlFor="volumeid" className="required-label">Gas Volume</Label>

                                                                <Field name="volumeid">
                                                                    {({ field, form }) => (
                                                                        <Select
                                                                            id="volumeid"
                                                                            name="volumeid"
                                                                            options={volumeOptions}
                                                                            value={volumeOptions.find(option => option.value === form.values.volumeid)}
                                                                            onChange={(option) => {
                                                                                form.setFieldValue("volumeid", option ? option.value : "");
                                                                                form.setFieldValue("volume", option ? option.label : "");
                                                                            }}
                                                                            onBlur={() => form.setFieldTouched("volumeid", true)}
                                                                            className={form.errors.volumeid && form.touched.volumeid ? "select-invalid" : ""}
                                                                        />
                                                                    )}
                                                                </Field>
                                                                <ErrorMessage name="volumeid" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>
                                                        <Col md="6">
                                                            <FormGroup>
                                                                <Label htmlFor="pressureid" className="required-label">Gas Pressure</Label>

                                                                <Select
                                                                    name="pressureid"
                                                                    options={pressureOptions}
                                                                    value={pressureOptions.find(l => l.value === values.pressureid)}
                                                                    onChange={l => {
                                                                        setFieldValue("pressureid", l ? l.value : "");
                                                                        setFieldValue("pressure", l ? l.label : 0);
                                                                    }
                                                                    }
                                                                    onBlur={() => setFieldTouched("pressureid", true)}
                                                                    className={errors.pressureid && touched.pressureid ? "select-invalid" : ""}
                                                                />
                                                                <ErrorMessage name="pressureid" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>
                                                        {/* <Col md="6">
                                                        <FormGroup>
                                                            <Label htmlFor="unitPrice" className="required-label">GAS Unit Price</Label>
                                                            <Field name="unitPrice" className="form-control" />
                                                            <ErrorMessage name="unitPrice" component="div" className="text-danger" />
                                                        </FormGroup>
                                                    </Col> */}
                                                        <Col md="6">
                                                            <FormGroup>
                                                                <Label htmlFor="gasTypeId" className="required-label">Gas Type</Label>
                                                                <Select
                                                                    name="gasTypeId"
                                                                    options={gastypeOptions}
                                                                    value={gastypeOptions.find(option => option.value === values.gasTypeId)}
                                                                    onChange={option => setFieldValue("gasTypeId", option ? option.value : "")}
                                                                    onBlur={() => setFieldTouched("gasTypeId", true)}
                                                                    className={errors.gasTypeId && touched.gasTypeId ? "select-invalid" : ""}
                                                                />
                                                                <ErrorMessage name="gasTypeId" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>
                                                        {/* <Col md="6">
                                                        <FormGroup>
                                                            <Label htmlFor="effectivefromdate" className="required-label">Effective From Date</Label>
                                                            <InputGroup>
                                                                <Flatpickr
                                                                    name="effectivefromdate"
                                                                    className="form-control d-block"
                                                                    placeholder="dd-mm-yyyy"
                                                                    options={{
                                                                        altInput: true,
                                                                        altFormat: "d-M-Y",
                                                                        dateFormat: "Y-m-d"
                                                                    }}
                                                                    value={values.effectivefromdate}
                                                                    onChange={([date]) => setFieldValue("effectivefromdate", date)}
                                                                />
                                                            </InputGroup>
                                                            <ErrorMessage name="effectivefromdate" component="div" className="text-danger" />
                                                        </FormGroup>
                                                    </Col> */}
                                                        {/* <Col md="6">
                                                        <FormGroup>
                                                            <Label htmlFor="effectivetodate" className="required-label">Effective To Date</Label>
                                                            <InputGroup>
                                                                <Flatpickr
                                                                    name="effectivetodate"
                                                                    className="form-control d-block"
                                                                    placeholder="dd-mm-yyyy"
                                                                    options={{
                                                                        altInput: true,
                                                                        altFormat: "d-M-Y",
                                                                        dateFormat: "Y-m-d"
                                                                    }}
                                                                    value={values.effectivetodate}
                                                                    onChange={([date]) => setFieldValue("effectivetodate", date)}
                                                                />
                                                            </InputGroup>
                                                            <ErrorMessage name="effectivetodate" component="div" className="text-danger" /> 
                                                        </FormGroup>
                                                    </Col> */}

                                                        <Col md="6">
                                                            <FormGroup>
                                                                <Label className="required-label">Description</Label>
                                                                <Field name="descriptions" as="textarea" className="form-control" />
                                                                <ErrorMessage name="descriptions" component="div" className="text-danger" />
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <div className="row align-items-center g-3 justify-content-end">
                                                        <div className="col-md-12 text-end button-items">
                                                            <Button type="submit" className="btn btn-info">
                                                                <i className="bx bxs-save label-icon font-size-16 align-middle me-2"></i>
                                                                {values?.gasid && values.gasid > 0 ? "Update" : "Save"}
                                                            </Button>
                                                            <Button type="button" className="btn btn-danger" onClick={toggleModal2}>
                                                                <i className="bx bx-window-close label-icon font-size-14 align-middle me-2"></i>Cancel
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </Form>
                                            )}
                                        </Formik>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    </ModalBody>
                </div>
            </Modal>
        </React.Fragment>
    );
};

export default ManageGas;