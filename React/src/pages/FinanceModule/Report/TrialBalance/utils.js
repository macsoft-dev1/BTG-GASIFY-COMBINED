/**
 * @typedef {Object} TrialBalanceRow
 * @property {string} id
 * @property {string} accountCode
 * @property {string} accountName
 * @property {number} openingDebit
 * @property {number} openingCredit
 * @property {number} debitTransactions
 * @property {number} creditTransactions
 * @property {number} closingDebit
 * @property {number} closingCredit
 */

/**
 * Calculates the closing balances for a single row based on exact accounting rules.
 * Handles floating point precision by rounding to 2 decimal places.
 * 
 * @param {number} openingDebit 
 * @param {number} openingCredit 
 * @param {number} debitTransactions 
 * @param {number} creditTransactions 
 * @returns {{ closingDebit: number, closingCredit: number }}
 */
export const calculateClosingBalances = (
    openingDebit,
    openingCredit,
    debitTransactions,
    creditTransactions
) => {
    const od = openingDebit || 0;
    const oc = openingCredit || 0;
    const dt = debitTransactions || 0;
    const ct = creditTransactions || 0;

    // Net = (OD - OC) + (DT - CT)
    const net = (od - oc) + (dt - ct);

    // Round to 2 decimals to prevent floating point logic anomalies
    const roundedNet = Math.round(net * 100) / 100;

    if (roundedNet > 0) {
        return { closingDebit: roundedNet, closingCredit: 0 };
    } else if (roundedNet < 0) {
        return { closingDebit: 0, closingCredit: Math.abs(roundedNet) };
    } else {
        return { closingDebit: 0, closingCredit: 0 };
    }
};

/**
 * Aggregates totals across all rows.
 * 
 * @param {TrialBalanceRow[]} rows 
 * @returns {Object} Totals
 */
export const calculateTotals = (rows) => {
    return rows.reduce(
        (acc, row) => ({
            openingDebit: acc.openingDebit + (row.openingDebit || 0),
            openingCredit: acc.openingCredit + (row.openingCredit || 0),
            debitTransactions: acc.debitTransactions + (row.debitTransactions || 0),
            creditTransactions: acc.creditTransactions + (row.creditTransactions || 0),
            closingDebit: acc.closingDebit + (row.closingDebit || 0),
            closingCredit: acc.closingCredit + (row.closingCredit || 0),
        }),
        {
            openingDebit: 0,
            openingCredit: 0,
            debitTransactions: 0,
            creditTransactions: 0,
            closingDebit: 0,
            closingCredit: 0,
        }
    );
};