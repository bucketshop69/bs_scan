/**
 * Format a Unix timestamp to a human-readable date/time string
 * @param unixTimestamp Unix timestamp in seconds
 * @returns Formatted date string
 */
export const formatTimestamp = (unixTimestamp: number): string => {
    const date = new Date(unixTimestamp * 1000); // Convert to milliseconds
    return date.toLocaleString();
};

/**
 * Format a lamports amount to SOL with 9 decimal places
 * @param lamports Amount in lamports
 * @returns Formatted SOL amount string
 */
export const formatSOL = (lamports: number): string => {
    return (lamports / 1_000_000_000).toFixed(9) + " SOL";
}; 