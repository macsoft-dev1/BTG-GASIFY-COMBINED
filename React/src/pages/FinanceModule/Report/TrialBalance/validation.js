/**
 * Formats a valid number into a localized string with thousand separators.
 * Safely ignores zeroes and empty values to keep the UI clean.
 * 
 * @param {number} value 
 * @returns {string}
 */
export const formatCurrency = (value) => {
    if (!value || value === 0) return '';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
};

/**
 * Safely parses string inputs to numbers preventing bad NaN states.
 * Replaces commas back to numbers.
 * 
 * @param {string} value 
 * @returns {number}
 */
export const parseNumberInput = (value) => {
    if (!value) return 0;
    const parsed = parseFloat(value.replace(/,/g, ''));
    return isNaN(parsed) || parsed < 0 ? 0 : parsed;
};

/**
 * Validates if the total debits exactly match the total credits.
 * Evaluated at the cent level to prevent IEEE 754 float glitches.
 * 
 * @param {number} debitTotal 
 * @param {number} creditTotal 
 * @returns {boolean}
 */
export const isBalanced = (debitTotal, creditTotal) => {
    return Math.round(debitTotal * 100) === Math.round(creditTotal * 100);
};