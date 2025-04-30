export interface HeliusParsedTransaction {
    signature: string;
    timestamp: number;
    slot: number;
    type?: string;
    description?: string;
    source?: string;
    programId?: string;
    transactionError?: any;
    events?: Array<{
        type: string;
        data?: any;
        accounts?: string[];
    }>;
    accountData?: Array<{
        pubkey: string;
        [key: string]: any;
    }>;
    instructions?: Array<any>;
    nativeTransfers?: Array<any>;
    tokenTransfers?: Array<any>;
    fee?: number;
    feePayer?: string;
} 