/**
 * Constants used throughout the application
 */

/**
 * List of known spam addresses to filter out from transaction history
 */
export const SPAM_ADDRESSES = [
    '5Hr7wZg7oBpVhH5nngRqzr5W7ZFUfCsfEhbziZJak7fr',
    'FLiPGqowc82LLR173hKiFYBq2fCxLZEST5iHbHwj8xKb',
    'FLiPgGTXtBtEJoytikaywvWgbz5a56DdHKZU72HSYMFF'
];

/**
 * Transaction types that are considered spam
 * Could be expanded based on user feedback
 */
export const SPAM_TRANSACTION_TYPES = [
    // Add any specific transaction types considered spam here
];

/**
 * Helper function to check if a transaction is spam based on our criteria
 */
export const isSpamTransaction = (transaction: any): boolean => {
    // Check if any participants are in our spam list
    const involvesSuspectedSpammer = SPAM_ADDRESSES.some(address => {
        // Check native transfers
        const nativeTransfersInvolveSpam = transaction.nativeTransfers?.some(
            (transfer: any) =>
                transfer.fromUserAccount === address ||
                transfer.toUserAccount === address
        ) || false;

        // Check token transfers 
        const tokenTransfersInvolveSpam = transaction.tokenTransfers?.some(
            (transfer: any) =>
                transfer.fromUserAccount === address ||
                transfer.toUserAccount === address
        ) || false;

        // Check feePayer
        const feePayerIsSpam = transaction.feePayer === address;

        return nativeTransfersInvolveSpam || tokenTransfersInvolveSpam || feePayerIsSpam;
    });

    // Add more spam detection logic here as needed

    return involvesSuspectedSpammer;
}; 