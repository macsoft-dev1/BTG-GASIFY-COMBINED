import React, { useReducer, useMemo } from 'react';
import { Container, Row, Col, Card, CardBody } from "reactstrap";
import Breadcrumbs from "../../../../components/Common/Breadcrumb";
import TrialBalanceRow from './TrialBalanceRow';
import { calculateClosingBalances, calculateTotals } from './utils';
import { isBalanced, formatCurrency } from './validation';

// Use a simple ID generator since crypto.randomUUID might not be polyfilled in older environments 
// or simpler to just use Date.now() + random
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const createEmptyRow = () => ({
    id: generateId(),
    accountCode: '',
    accountName: '',
    openingDebit: 0,
    openingCredit: 0,
    debitTransactions: 0,
    creditTransactions: 0,
    closingDebit: 0,
    closingCredit: 0,
});

const reducer = (state, action) => {
    switch (action.type) {
        case 'ADD_ROW':
            return [...state, createEmptyRow()];

        case 'DELETE_ROW':
            // Prevent deleting the very last row to maintain an empty state
            if (state.length === 1) return [createEmptyRow()];
            return state.filter(row => row.id !== action.payload);

        case 'UPDATE_FIELD': {
            let updatedRowIndex = state.findIndex((row) => row.id === action.payload.id);
            if (updatedRowIndex === -1) return state;

            const row = state[updatedRowIndex];
            const updatedRow = { ...row, [action.payload.field]: action.payload.value };

            // Handle Mutually Exclusive Opening Balances (Rule 2.1)
            if (action.payload.field === 'openingDebit' && action.payload.value > 0) {
                updatedRow.openingCredit = 0;
            }
            if (action.payload.field === 'openingCredit' && action.payload.value > 0) {
                updatedRow.openingDebit = 0;
            }

            // Recalculate Closing Balances instantly (Rule 2.3)
            const balances = calculateClosingBalances(
                updatedRow.openingDebit,
                updatedRow.openingCredit,
                updatedRow.debitTransactions,
                updatedRow.creditTransactions
            );

            updatedRow.closingDebit = balances.closingDebit;
            updatedRow.closingCredit = balances.closingCredit;

            const newState = [...state];
            newState[updatedRowIndex] = updatedRow;
            return newState;
        }

        default:
            return state;
    }
};

const TrialBalanceDetailed = () => {
    const [rows, dispatch] = useReducer(reducer, [createEmptyRow()]);

    // Totals computed using useMemo so it only fires when `rows` actually change
    const totals = useMemo(() => calculateTotals(rows), [rows]);

    const balanced = isBalanced(totals.closingDebit, totals.closingCredit);
    const hasData = totals.closingDebit > 0 || totals.closingCredit > 0;

    const thStyle = {
        position: 'sticky', top: 0, zIndex: 10,
        textAlign: 'center', verticalAlign: 'middle', whiteSpace: 'nowrap'
    };

    return (
        <div className="page-content">
            <Container fluid>
                <Breadcrumbs title="Reports" breadcrumbItem="Trial Balance (Detailed)" />
                <Row>
                    <Col lg="12">
                        <Card>
                            <CardBody>
                                {(!balanced && hasData) && (
                                    <div className="alert alert-danger fw-bold">
                                        ⚠️ Trial Balance is not balanced. (Difference: {formatCurrency(Math.abs(totals.closingDebit - totals.closingCredit))})
                                    </div>
                                )}

                                <div className="table-responsive mt-3" style={{ maxHeight: '70vh' }}>
                                    <table className="table table-bordered table-hover mb-0" style={{ fontSize: '13px', minWidth: '1000px' }}>
                                        <thead className="table-light">
                                            <tr>
                                                <th style={thStyle} rowSpan={2}>No</th>
                                                <th style={thStyle} rowSpan={2}>Account Code</th>
                                                <th style={thStyle} rowSpan={2}>Account Name</th>
                                                <th style={thStyle} colSpan={2}>Opening Balance</th>
                                                <th style={thStyle} colSpan={2}>Transactions</th>
                                                <th style={thStyle} colSpan={2}>Closing Balance</th>
                                                <th style={thStyle} rowSpan={2}>Act</th>
                                            </tr>
                                            <tr>
                                                <th style={{ ...thStyle, top: '44px' }}>Debit</th>
                                                <th style={{ ...thStyle, top: '44px' }}>Credit</th>
                                                <th style={{ ...thStyle, top: '44px' }}>Debit</th>
                                                <th style={{ ...thStyle, top: '44px' }}>Credit</th>
                                                <th style={{ ...thStyle, top: '44px' }}>Debit</th>
                                                <th style={{ ...thStyle, top: '44px' }}>Credit</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {rows.map((row, index) => (
                                                <TrialBalanceRow key={row.id} row={row} index={index} dispatch={dispatch} />
                                            ))}
                                        </tbody>
                                        <tfoot style={{ position: 'sticky', bottom: 0, zIndex: 10 }}>
                                            <tr className="table-light fw-bold">
                                                <td colSpan={3} className="text-end p-2">TOTAL:</td>
                                                <td className="text-end p-2">{formatCurrency(totals.openingDebit)}</td>
                                                <td className="text-end p-2">{formatCurrency(totals.openingCredit)}</td>
                                                <td className="text-end p-2">{formatCurrency(totals.debitTransactions)}</td>
                                                <td className="text-end p-2">{formatCurrency(totals.creditTransactions)}</td>
                                                <td className={`text-end p-2 ${!balanced ? 'text-danger' : ''}`}>
                                                    {formatCurrency(totals.closingDebit)}
                                                </td>
                                                <td className={`text-end p-2 ${!balanced ? 'text-danger' : ''}`}>
                                                    {formatCurrency(totals.closingCredit)}
                                                </td>
                                                <td></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                <div className="mt-3 d-flex justify-content-between">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => dispatch({ type: 'ADD_ROW' })}>
                                        <i className="bx bx-plus me-1"></i> Add Row
                                    </button>
                                    <button
                                        className="btn btn-success"
                                        disabled={!balanced || !hasData}>
                                        <i className="bx bx-save me-1"></i> Save Trial Balance
                                    </button>
                                </div>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </div>
    );
};

export default TrialBalanceDetailed;