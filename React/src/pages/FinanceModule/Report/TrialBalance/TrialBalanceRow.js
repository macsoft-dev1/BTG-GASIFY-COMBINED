import React from 'react';
import { parseNumberInput, formatCurrency } from './validation';

/**
 * Isolated Row Component, Memoized.
 * Re-renders ONLY if `row` props change or `index` changes.
 */
const TrialBalanceRow = React.memo(({ row, index, dispatch }) => {

    const handleChange = (field, val) => {
        const isNumeric = !['accountCode', 'accountName'].includes(field);
        const value = isNumeric ? parseNumberInput(val) : val;
        dispatch({ type: 'UPDATE_FIELD', payload: { id: row.id, field, value } });
    };

    const inputStyle = {
        textAlign: 'right'
    };
    const textInputStyle = { textAlign: 'left' };

    return (
        <tr>
            <td className="text-center align-middle">{index + 1}</td>
            <td>
                <input className="form-control form-control-sm" style={textInputStyle} value={row.accountCode} onChange={(e) => handleChange('accountCode', e.target.value)} />
            </td>
            <td>
                <input className="form-control form-control-sm" style={textInputStyle} value={row.accountName} onChange={(e) => handleChange('accountName', e.target.value)} />
            </td>
            <td>
                <input className="form-control form-control-sm" style={inputStyle} type="number" min="0" step="0.01" value={row.openingDebit || ''} onChange={(e) => handleChange('openingDebit', e.target.value)} />
            </td>
            <td>
                <input className="form-control form-control-sm" style={inputStyle} type="number" min="0" step="0.01" value={row.openingCredit || ''} onChange={(e) => handleChange('openingCredit', e.target.value)} />
            </td>
            <td>
                <input className="form-control form-control-sm" style={inputStyle} type="number" min="0" step="0.01" value={row.debitTransactions || ''} onChange={(e) => handleChange('debitTransactions', e.target.value)} />
            </td>
            <td>
                <input className="form-control form-control-sm" style={inputStyle} type="number" min="0" step="0.01" value={row.creditTransactions || ''} onChange={(e) => handleChange('creditTransactions', e.target.value)} />
            </td>
            <td className="text-end align-middle bg-light">{formatCurrency(row.closingDebit)}</td>
            <td className="text-end align-middle bg-light">{formatCurrency(row.closingCredit)}</td>
            <td className="text-center align-middle">
                <button
                    className="btn btn-link text-danger p-0"
                    onClick={() => dispatch({ type: 'DELETE_ROW', payload: row.id })}>
                    <i className="bx bx-trash font-size-18"></i>
                </button>
            </td>
        </tr>
    );
});

TrialBalanceRow.displayName = 'TrialBalanceRow';

export default TrialBalanceRow;