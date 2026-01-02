import { Currency, BigintIsh } from '@pancakeswap/sdk';
import { OnChainProvider, V2Pool, StablePool, V3Pool } from '../../types';
export declare const getV2PoolsOnChain: (pairs: [Currency, Currency][], provider?: OnChainProvider, blockNumber?: BigintIsh) => Promise<V2Pool[]>;
export declare const getStablePoolsOnChain: (pairs: [Currency, Currency][], provider?: OnChainProvider, blockNumber?: BigintIsh) => Promise<StablePool[]>;
export declare const getV3PoolsWithoutTicksOnChain: (pairs: [Currency, Currency][], provider?: OnChainProvider, blockNumber?: BigintIsh) => Promise<V3Pool[]>;
//# sourceMappingURL=onChainPoolProviders.d.ts.map