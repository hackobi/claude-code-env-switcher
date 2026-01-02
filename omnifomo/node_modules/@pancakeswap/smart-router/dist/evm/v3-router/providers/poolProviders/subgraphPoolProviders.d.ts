import { ChainId, Currency } from '@pancakeswap/sdk';
import { SubgraphProvider, V2PoolWithTvl, V3PoolWithTvl } from '../../types';
interface V3PoolSubgraphResult {
    id: string;
    liquidity: string;
    sqrtPrice: string;
    tick: string;
    feeTier: string;
    feeProtocol: string;
    totalValueLockedUSD: string;
}
export declare const getV3PoolSubgraph: ({ provider, pairs, }: {
    provider?: SubgraphProvider | undefined;
    pairs: [Currency, Currency][];
}) => Promise<V3PoolWithTvl[]>;
export declare const getV2PoolSubgraph: ({ provider, pairs, }: {
    provider?: SubgraphProvider | undefined;
    pairs: [Currency, Currency][];
}) => Promise<V2PoolWithTvl[]>;
interface TokenFromSubgraph {
    symbol: string;
    id: string;
    decimals: string;
}
export interface V3DetailedPoolSubgraphResult extends V3PoolSubgraphResult {
    token0: TokenFromSubgraph;
    token1: TokenFromSubgraph;
}
export declare const getAllV3PoolsFromSubgraph: ({ provider, chainId, pageSize, }: {
    chainId?: ChainId | undefined;
    provider?: SubgraphProvider | undefined;
    pageSize?: number | undefined;
}) => Promise<V3PoolWithTvl[]>;
export {};
//# sourceMappingURL=subgraphPoolProviders.d.ts.map