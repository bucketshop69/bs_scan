// Utility function to identify the type of Solana input

export type InputTypeResult =
    | { type: 'tx'; value: string }
    | { type: 'address'; value: string }
    | { type: 'invalid'; value: string };

/**
 * Identifies the type of Solana input based on string length
 * @param input The user input string
 * @returns Object containing the type and cleaned value
 */
export function identifySolanaInput(input: string): InputTypeResult {
    const cleanedInput = input.trim();

    // If empty input, return invalid
    if (!cleanedInput) {
        return { type: 'invalid', value: '' };
    }

    const len = cleanedInput.length;

    // Check if the input is a transaction signature (typically between 60-90 characters)
    if (len >= 60 && len <= 90) {
        return { type: 'tx', value: cleanedInput };
    }

    // Check if the input is a Solana address or program ID (typically between 30-45 characters)
    if (len >= 30 && len <= 45) {
        return { type: 'address', value: cleanedInput };
    }

    // If none of the above, return invalid
    return { type: 'invalid', value: cleanedInput };
} 