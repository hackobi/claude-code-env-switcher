import { UnifiedChainId } from './chainId';
export interface Chain {
    id: UnifiedChainId;
    name: string;
    fullName: string;
    isEVM: boolean;
    testnet?: boolean;
}
export declare const Chains: Chain[];
//# sourceMappingURL=chains.d.ts.map