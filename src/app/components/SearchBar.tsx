"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { identifySolanaInput } from "../utils/solana";

export default function SearchBar() {
    const router = useRouter();
    const [searchInput, setSearchInput] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchInput(e.target.value);
        // Clear error message when input changes
        if (errorMsg) setErrorMsg(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        // Use the utility function to identify the input type
        const result = identifySolanaInput(searchInput);

        // If invalid, show error message and stop
        if (result.type === 'invalid') {
            setErrorMsg("Invalid input. Please enter a valid Solana address or transaction signature.");
            setIsLoading(false);
            return;
        }

        // Route to the appropriate page based on the input type
        try {
            if (result.type === 'tx') {
                router.push(`/tx/${result.value}`);
            } else if (result.type === 'address') {
                router.push(`/address/${result.value}`);
            }

            // Clear error message after successful routing
            setErrorMsg(null);
        } catch (error) {
            console.error("Navigation error:", error);
            setErrorMsg("An error occurred while navigating. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <form onSubmit={handleSubmit} className="my-8 relative">
                <div className="flex">
                    <input
                        type="text"
                        placeholder="Search Address / Tx Signature / Program ID..."
                        value={searchInput}
                        onChange={handleInputChange}
                        className="w-full p-4 bg-bio-surface text-bio-text-primary focus:outline-none border-2 border-bio-border rounded-lg"
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-bio-base text-white rounded-md transition-colors"
                        disabled={isLoading}
                    >
                        {isLoading ? "Searching..." : "Search"}
                    </button>
                </div>
            </form>

            {/* Error message display */}
            {errorMsg && (
                <p className="text-bio-secondary mt-2">{errorMsg}</p>
            )}
        </div>
    );
} 