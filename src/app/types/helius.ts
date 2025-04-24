// TypeScript interfaces for Helius API responses
export interface TokenAmount {
    tokenAmount: string;
    decimals: number;
}

export interface TokenBalanceChange {
    userAccount: string;
    tokenAccount: string;
    mint: string;
    rawTokenAmount: TokenAmount;
}

export interface AccountData {
    account: string;
    nativeBalanceChange: number;
    tokenBalanceChanges: TokenBalanceChange[];
}

export interface NativeTransfer {
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
}

export interface TokenTransfer {
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
}

export interface Instruction {
    accounts: string[];
    data: string;
    programId: string;
    innerInstructions?: Instruction[];
}

export interface NFT {
    mint: string;
    tokenStandard: string;
}

export interface NFTEvent {
    description: string;
    type: string;
    source: string;
    amount: number;
    fee: number;
    feePayer: string;
    signature: string;
    slot: number;
    timestamp: number;
    saleType: string;
    buyer?: string;
    seller?: string;
    staker?: string;
    nfts: NFT[];
}

export interface TokenInfo {
    userAccount: string;
    tokenAccount: string;
    mint: string;
    rawTokenAmount: TokenAmount;
}

export interface NativeFee {
    account: string;
    amount: string;
}

export interface InnerSwapTokenInfo {
    fromUserAccount: string;
    toUserAccount: string;
    fromTokenAccount: string;
    toTokenAccount: string;
    tokenAmount: number;
    mint: string;
}

export interface InnerSwapNativeFee {
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
}

export interface ProgramInfo {
    source: string;
    account: string;
    programName: string;
    instructionName: string;
}

export interface InnerSwap {
    tokenInputs: InnerSwapTokenInfo[];
    tokenOutputs: InnerSwapTokenInfo[];
    tokenFees: InnerSwapTokenInfo[];
    nativeFees: InnerSwapNativeFee[];
    programInfo: ProgramInfo;
}

export interface SwapEvent {
    nativeInput?: {
        account: string;
        amount: string;
    };
    nativeOutput?: {
        account: string;
        amount: string;
    };
    tokenInputs: TokenInfo[];
    tokenOutputs: TokenInfo[];
    tokenFees: TokenInfo[];
    nativeFees: NativeFee[];
    innerSwaps: InnerSwap[];
}

export interface CompressedNFTEvent {
    type: string;
    treeId: string;
    assetId: string;
    leafIndex: number;
    instructionIndex: number;
    innerInstructionIndex: number;
    newLeafOwner: string;
    oldLeafOwner: string;
}

export interface SetAuthorityEvent {
    account: string;
    from: string;
    to: string;
    instructionIndex: number;
    innerInstructionIndex: number;
}

export interface Events {
    nft?: NFTEvent;
    swap?: SwapEvent;
    compressed?: CompressedNFTEvent;
    distributeCompressionRewards?: {
        amount: number;
    };
    setAuthority?: SetAuthorityEvent;
}

export interface HeliusParsedTransaction {
    description: string;
    type: string;
    source: string;
    fee: number;
    feePayer: string;
    signature: string;
    slot: number;
    timestamp: number;
    nativeTransfers: NativeTransfer[];
    tokenTransfers: TokenTransfer[];
    accountData: AccountData[];
    transactionError?: {
        error: string;
    };
    instructions: Instruction[];
    events: Events;
} 