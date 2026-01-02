import { BigintIsh, Currency } from '@pancakeswap/sdk';
import { OnChainProvider } from '../../types';
interface Params {
    currencyA?: Currency;
    currencyB?: Currency;
    onChainProvider?: OnChainProvider;
    blockNumber?: BigintIsh;
    pairs?: [Currency, Currency][];
}
export declare function getStableCandidatePools(params: Params): Promise<import("../../types").StablePool[]>;
export {};
//# sourceMappingURL=getStableCandidatePools.d.ts.map