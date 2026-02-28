import React, { useState, useEffect } from "react";
import {
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Button,
  FormGroup,
  Label,
  Input,
  Modal,
  ModalBody,
  ModalHeader,
} from "reactstrap";
import Select from "react-select";
import Flatpickr from "react-flatpickr";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useHistory, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import "flatpickr/dist/themes/material_blue.css";
import "react-toastify/dist/ReactToastify.css";

import { GetOverDraftSeqNum, saveOrUpdateOverDraft } from "../../../src/common/data/mastersapi";
import { GetClaimAndPaymentTransactionCurrency } from "../../../src/common/data/mastersapi";
import { GetBankList } from "common/data/mastersapi";

const Breadcrumbs = ({ title, breadcrumbItem }) => (
  <div className="page-title-box d-sm-flex align-items-center justify-content-between">
    <h4 className="mb-sm-0 font-size-18">{breadcrumbItem}</h4>
    <div className="page-title-right">
      <ol className="breadcrumb m-0">
        <li className="breadcrumb-item"><a href="/#">{title}</a></li>
        <li className="breadcrumb-item active"><a href="/#">{breadcrumbItem}</a></li>
      </ol>
    </div>
  </div>
);

const AddOverDraft = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitType, setSubmitType] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generatedVoucherNo, setGeneratedVoucherNo] = useState("");
  const history = useHistory();
  const location = useLocation();
  const overDraftData = location.state?.overDraftData || null;
  const [currencySuggestions, setCurrencySuggestions] = useState([]);
  const [btgBankOptions, setbtgBankOptions] = useState([]);
  const [accountOptionsMap, setaccountOptionsMap] = useState({});
  useEffect(() => {
    fetchSeqNo();
  }, []);

  const fetchSeqNo = async () => {
    try {
      const res = await GetOverDraftSeqNum(1, 1, 1);
      if (res?.data?.VoucherNo) {
        setGeneratedVoucherNo(res.data.VoucherNo);
      }
    } catch (err) {
      console.error("Failed to fetch voucher number", err);
    }
  };

  const validationSchema = Yup.object().shape({
    voucherNo: Yup.string().required("Voucher No is required"),
    overDraftDate: Yup.date().required("OverDraft Date is required"),
    bank: Yup.string().required("Bank is required"),
    odInterest: Yup.number().typeError("Enter valid interest").required("Interest is required"),
    odAmount: Yup.number().typeError("Enter valid amount").required("Amount is required"),
    repayInMonths: Yup.number().typeError("Enter valid number").required("Repay months required"),
  });
  const formatDisplay = (val) => {
    debugger;
    if (val === undefined || val === null) return "";
    const strVal = String(val); // Convert number to string
    const [integer, decimal] = strVal.split(".");
    const withCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return decimal !== undefined ? `${withCommas}.${decimal}` : withCommas;
  };


  useEffect(() => {
    fetchCurrencyList();
    loadBankList();
  }, []);

  const fetchCurrencyList = async () => {
    const data = await GetClaimAndPaymentTransactionCurrency(0, 1, 1, "%");
    setCurrencySuggestions(data);
  };

  const loadBankList = async () => {
    const data = await GetBankList(1, 1);

    const bankOpts = data.map(item => ({
      value: item.value,
      label: item.BankName
    }));

    setbtgBankOptions(bankOpts);

    const accMap = data.reduce((acc, item) => {
      if (!acc[item.value]) acc[item.value] = [];
      acc[item.value].push({
        value: item.AccountNumber,
        label: item.AccountNumber
      });
      return acc;
    }, {});

    setaccountOptionsMap(accMap);
  };


  const handleSaveOrUpdate = async (values, resetForm, type) => {
    try {
      setIsSubmitting(true);



      const isEdit = !!overDraftData?.OverDraftId;

      const payload = {
        OverDraftId: isEdit ? overDraftData.OverDraftId : 0,
        VoucherNo: values.voucherNo,
        OverDraftDate: values.overDraftDate,
        OverDraftType: values.overDraftType,
        Bank: values.bank,
        InterestType: values.interestType,
        ODInterest: parseFloat(values.odInterest),
        ODAmountIDR: parseFloat(values.odAmountIDR),
        ODAmount: parseFloat(values.odAmount),
        RepayInMonths: parseInt(values.repayInMonths),
        FinalSettlementAmount: parseFloat(values.finalSettlementAmount || 0),
        FinalSettlementAmountIDR: parseFloat(values.finalSettlementAmountIDR || 0),
        FinalSettlementDate: values.finalSettlementDate,
        bankid: values.payment_method === 2 ? values.bankid : 0,
        payment_method: values.payment_method === 1 ? 1 : 2,

        currencyid: values.currencyid,
        IsActive: true,
        userid: 1,
        CreatedIP: "127.0.0.1",
        ModifiedIP: "127.0.0.1",
        BranchId: 1,
        OrgId: 1,
        IsSubmitted: type === 1 ? true : false,
      };

      const body = {
        command: isEdit ? "Update" : "Insert",
        Header: payload,
      };

      await saveOrUpdateOverDraft(body, isEdit);

      toast.success(`OverDraft ${isEdit ? "updated" : "saved"} successfully`);
      resetForm();
      history.push("/ManageOverDraft");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save or update OverDraft");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Finance" breadcrumbItem="OverDraft" />
          <Row>
            <Col lg="12">
              <Card>
                <CardBody>
                  <Formik
                    initialValues={{
                      voucherNo: overDraftData?.VoucherNo || generatedVoucherNo,
                      overDraftDate: overDraftData?.OverDraftDate
                        ? new Date(overDraftData.OverDraftDate)
                        : new Date(),
                      overDraftType: overDraftData?.OverDraftType || "Request",
                      bank: overDraftData?.Bank || "",
                      interestType: overDraftData?.InterestType || "Fixed",
                      odInterest: overDraftData?.ODInterest || "",
                      odAmountIDR: overDraftData?.ODAmountIDR || "",
                      odAmount: overDraftData?.ODAmount || "",
                      repayInMonths: overDraftData?.RepayInMonths || "",
                      finalSettlementAmount: overDraftData?.FinalSettlementAmount || "",
                      finalSettlementAmountIDR: overDraftData?.FinalSettlementAmountIDR || "",

                      currencyid: overDraftData?.currencyid || "",
                      payment_method: overDraftData?.payment_method || 2,
                      bankid: overDraftData?.bankid || 0,


                      finalSettlementDate: overDraftData?.FinalSettlementDate
                        ? new Date(overDraftData.FinalSettlementDate)
                        : new Date(),
                    }}
                    enableReinitialize={true}
                    validationSchema={validationSchema}
                  >
                    {({ errors, touched, setFieldValue, values, resetForm }) => (
                      <Form>
                        <Row>
                          <Col md="8"></Col>
                          <Col md="4" className="text-end mb-3">
                            <div className="button-items">
                              <button
                                type="submit"
                                className="btn btn-info me-2"
                                onClick={() => handleSaveOrUpdate(values, resetForm, 0)}
                              >
                                <i className="bx bx-save label-icon font-size-16 align-middle me-2"></i>
                                {overDraftData ? "Update" : "Save"}
                              </button>
                              <button
                                type="submit"
                                className="btn btn-success me-2"
                                onClick={() => handleSaveOrUpdate(values, resetForm, 1)}
                              >
                                Post
                              </button>
                              <button
                                type="button"
                                className="btn btn-danger"
                                onClick={() => history.push("/ManageOverDraft")}
                                disabled={isSubmitting}
                              >
                                Cancel
                              </button>
                            </div>
                          </Col>

                          <Col md="4">
                            <FormGroup>
                              <Label>Voucher No</Label>
                              <Input
                                type="text"
                                name="voucherNo"
                                value={values.voucherNo}
                                readOnly
                              />
                              {errors.voucherNo && touched.voucherNo && (
                                <div className="text-danger small mt-1">{errors.voucherNo}</div>
                              )}
                            </FormGroup>
                          </Col>

                          <Col md="4">
                            <FormGroup>
                              <Label>OverDraft Date</Label>
                              <Flatpickr
                                className="form-control"
                                name="overDraftDate"
                                value={values.overDraftDate}
                                onChange={([date]) => setFieldValue("overDraftDate", date)}
                              />
                              {errors.overDraftDate && touched.overDraftDate && (
                                <div className="text-danger small mt-1">{errors.overDraftDate}</div>
                              )}
                            </FormGroup>
                          </Col>

                          {/* <Col md="4">
                            <FormGroup>
                              <Label>Bank</Label>
                              <Input
                                type="text"
                                name="bank"
                                value={values.bank}
                                onChange={(e) => setFieldValue("bank", e.target.value)}
                              />
                              {errors.bank && touched.bank && (
                                <div className="text-danger small mt-1">{errors.bank}</div>
                              )}
                            </FormGroup>
                          </Col> */}

                          <Col md="4">
                            <FormGroup>
                              <Label>OverDraft Type</Label>
                              <div className="d-flex gap-3">
                                <FormGroup check inline>
                                  <Input
                                    type="radio"
                                    name="overDraftType"
                                    value="Request"
                                    checked={values.overDraftType === "Request"}
                                    onChange={() => setFieldValue("overDraftType", "Request")}
                                  />
                                  <Label check>Request</Label>
                                </FormGroup>
                                <FormGroup check inline>
                                  <Input
                                    type="radio"
                                    name="overDraftType"
                                    value="Provided"
                                    checked={values.overDraftType === "Provided"}
                                    onChange={() => setFieldValue("overDraftType", "Provided")}
                                  />
                                  <Label check>Provided</Label>
                                </FormGroup>
                              </div>
                            </FormGroup>
                          </Col>

                          <Col md="4">
                            <FormGroup>
                              <Label>Interest Type</Label>
                              <div className="d-flex gap-3">
                                <FormGroup check inline>
                                  <Input
                                    type="radio"
                                    name="interestType"
                                    value="Fixed"
                                    checked={values.interestType === "Fixed"}
                                    onChange={() => setFieldValue("interestType", "Fixed")}
                                  />
                                  <Label check>Fixed</Label>
                                </FormGroup>
                                <FormGroup check inline>
                                  <Input
                                    type="radio"
                                    name="interestType"
                                    value="Variable"
                                    checked={values.interestType === "Variable"}
                                    onChange={() => setFieldValue("interestType", "Variable")}
                                  />
                                  <Label check>Variable</Label>
                                </FormGroup>
                              </div>
                            </FormGroup>
                          </Col>

                          <Col md="4">
                            <FormGroup>
                              <Label>OverDraft Interest (%)</Label>
                              <Input
                                type="text"
                                maxLength={3}
                                name="odInterest"
                                // value={values.odInterest}
                                value={values.odInterest ? formatDisplay(values.odInterest) : ""}

                                // onChange={(e) => setFieldValue("odInterest", e.target.value)}
                                onChange={(e) => {
                                  let value = e.target.value;
                                  debugger;
                                  // Remove commas
                                  value = value.replace(/,/g, "");

                                  // Allow empty value
                                  if (value === "") {
                                    setFieldValue("odInterest", "");
                                    return;
                                  }

                                  // Allow only numbers with up to 2 decimal places (12,2 range)
                                  const regex = /^\d{0,12}(\.\d{0,2})?$/; // 10 before decimal + 2 after
                                  if (!regex.test(value)) return;

                                  // Temporarily parse for numeric comparison if needed
                                  const numericValue = parseFloat(value || "0");

                                  // Optional: add validation logic here if you want
                                  // if (numericValue > someLimit) return;

                                  // Keep as string to preserve decimal and trailing zero
                                  setFieldValue("odInterest", value);
                                }}
                              />
                            </FormGroup>
                          </Col>

                          <Col md="4">

                            <FormGroup >
                              <Label className="required-label">Payment Method</Label><br />
                              <div className="d-flex gap-3">
                                {/* <FormGroup check inline> */}
                                {/* <Input
      type="radio"
      name="payment_method"
      value="1"
      checked={values.payment_method === 1}
      onChange={() => {
        setFieldValue("payment_method", 1);
        setFieldValue("bankid", 0);
        setFieldValue("currencyid", 0);
        setFieldValue("amountIDR", values.amount);   // amount = IDR (no conversion)
      }}
    /> Cash   */}
                                {/* </FormGroup> */}
                                &nbsp;&nbsp;&nbsp;&nbsp;
                                <FormGroup check inline>
                                  <Input
                                    type="radio"
                                    name="payment_method"
                                    value="2"
                                    checked={values.payment_method === 2}
                                    onChange={() => setFieldValue("payment_method", 2)}
                                  /> Bank
                                </FormGroup>
                              </div>
                            </FormGroup>

                          </Col>
                          {values.payment_method === 2 && (
                            <>
                              <Col md="4">
                                <FormGroup>
                                  <Label className="required-label">BTG Bank</Label>
                                  <Select
                                    name="bankid"
                                    options={btgBankOptions}
                                    value={btgBankOptions.find(o => o.value === values.bankid) || null}
                                    onChange={(option) => {
                                      setFieldValue("bankid", option?.value || "");
                                      setFieldValue("bank", option?.label || "");
                                      setFieldValue("accountNumber", "");
                                    }}
                                    placeholder="Select Bank"
                                  />
                                </FormGroup>
                              </Col>
                            </>
                          )}
                          <Col md="4">
                            <FormGroup>
                              <Label className="required-label">Currency</Label>
                              <Select
                                name="currencyid"
                                options={currencySuggestions.map(c => ({
                                  value: c.currencyid,
                                  label: c.Currency,
                                  ExchangeRate: c.ExchangeRate
                                }))}
                                value={
                                  currencySuggestions.find(c => c.currencyid === values.currencyid) || null
                                }
                                onChange={(option) => {
                                  const ex = option?.ExchangeRate || 1;

                                  setFieldValue("currencyid", option?.value || 0);

                                  const idr = (parseFloat(values.odAmount || 0) * ex);


                                  // Update OverDraft Amount (IDR)
                                  setFieldValue("odAmountIDR", idr);

                                  // Update Final Settlement also in IDR
                                  const finalSettle = (parseFloat(values.finalSettlementAmount || 0) * ex);
                                  setFieldValue("finalSettlementAmountIDR", finalSettle);


                                }}
                                placeholder="Select Currency"
                              />
                            </FormGroup>
                          </Col>


                          <Col md="4">
                            <FormGroup>
                              <Label>OverDraft Amount</Label>
                              <Input
                                type="text"
                                name="odAmount"
                                // value={values.odAmountIDR}
                                value={values.odAmount ? formatDisplay(values.odAmount) : ""}
                                onChange={(e) => {
                                  let val = e.target.value;

                                  // Remove all characters except digits and dot
                                  val = val.replace(/[^0-9.]/g, "");

                                  // Only allow the first dot
                                  const firstDotIndex = val.indexOf(".");
                                  if (firstDotIndex !== -1) {
                                    // Keep only the first dot
                                    val = val.substring(0, firstDotIndex + 1) + val.substring(firstDotIndex + 1).replace(/\./g, "");
                                  }

                                  // Split integer and decimal parts
                                  const [integerPart, decimalPart] = val.split(".");

                                  // Limit integer to 12 digits
                                  const limitedInteger = integerPart.slice(0, 12);

                                  // decimalPart can be "" if user typed a dot but no digits yet
                                  const limitedDecimal =
                                    decimalPart !== undefined ? decimalPart.slice(0, 2) : undefined;

                                  // Combine
                                  let cleanNumber;
                                  if (decimalPart !== undefined) {
                                    // user typed dot, even if empty
                                    cleanNumber = `${limitedInteger}${decimalPart !== "" ? "." + limitedDecimal : "."}`;
                                  } else {
                                    // no dot typed yet
                                    cleanNumber = limitedInteger;
                                  }

                                  setFieldValue("odAmount", cleanNumber);

                                  const rate = currencySuggestions.find(x => x.currencyid === values.currencyid)?.ExchangeRate || 1;

                                  const idr = cleanNumber * rate;
                                  setFieldValue("odAmountIDR", idr);


                                }
                                }

                              // onChange={(e) => setFieldValue("odAmountIDR", e.target.value)}
                              />
                            </FormGroup>
                          </Col>


                          <Col md="4">
                            <FormGroup>
                              <Label>OverDraft Amount (IDR)</Label>
                              <Input type="text" value={values.odAmountIDR ? formatDisplay(values.odAmountIDR) : ""}
                                disabled />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>Repay In Months</Label>
                              <Input
                                type="number"
                                name="repayInMonths"
                                value={values.repayInMonths}
                                onChange={(e) => setFieldValue("repayInMonths", e.target.value)}
                              />
                            </FormGroup>
                          </Col>

                          <Col md="4">
                            <FormGroup>
                              <Label>Final Settlement Amount</Label>
                              <Input
                                type="text"
                                name="finalSettlementAmount"
                                // value={values.finalSettlementAmount}
                                value={values.finalSettlementAmount ? formatDisplay(values.finalSettlementAmount) : ""}

                                // onChange={(e) => setFieldValue("finalSettlementAmount", e.target.value)}
                                onChange={(e) => {
                                  let val = e.target.value;

                                  // Remove all characters except digits and dot
                                  val = val.replace(/[^0-9.]/g, "");

                                  // Only allow the first dot
                                  const firstDotIndex = val.indexOf(".");
                                  if (firstDotIndex !== -1) {
                                    // Keep only the first dot
                                    val = val.substring(0, firstDotIndex + 1) + val.substring(firstDotIndex + 1).replace(/\./g, "");
                                  }

                                  // Split integer and decimal parts
                                  const [integerPart, decimalPart] = val.split(".");

                                  // Limit integer to 12 digits
                                  const limitedInteger = integerPart.slice(0, 12);

                                  // decimalPart can be "" if user typed a dot but no digits yet
                                  const limitedDecimal =
                                    decimalPart !== undefined ? decimalPart.slice(0, 2) : undefined;

                                  // Combine
                                  let cleanNumber;
                                  if (decimalPart !== undefined) {
                                    // user typed dot, even if empty
                                    cleanNumber = `${limitedInteger}${decimalPart !== "" ? "." + limitedDecimal : "."}`;
                                  } else {
                                    // no dot typed yet
                                    cleanNumber = limitedInteger;
                                  }

                                  setFieldValue("finalSettlementAmount", cleanNumber);

                                  const rate = currencySuggestions.find(x => x.currencyid === values.currencyid)?.ExchangeRate || 1;

                                  const idr = cleanNumber * rate;
                                  setFieldValue("finalSettlementAmountIDR", idr);


                                }
                                }
                              />
                            </FormGroup>
                          </Col>
                          <Col md="4">
                            <FormGroup>
                              <Label>Final Settlement Amount (IDR)</Label>
                              <Input type="text" value={values.finalSettlementAmountIDR ? formatDisplay(values.finalSettlementAmountIDR) : ""}
                                disabled />
                            </FormGroup>
                          </Col>



                          <Col md="4">
                            <FormGroup>
                              <Label>Final Settlement Date</Label>
                              <Flatpickr
                                className="form-control"
                                name="finalSettlementDate"
                                value={values.finalSettlementDate}
                                onChange={([date]) => setFieldValue("finalSettlementDate", date)}
                              />
                            </FormGroup>
                          </Col>
                        </Row>
                      </Form>
                    )}
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

export default AddOverDraft;