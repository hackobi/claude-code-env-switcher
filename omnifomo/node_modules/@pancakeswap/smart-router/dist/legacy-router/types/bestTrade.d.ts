import { BestTradeOptions as BaseBestTradeOptions, ChainId, Currency, Pair } from '@pancakeswap/sdk';
import { PublicClient } from 'viem';
export type Provider = ({ chainId }: {
    chainId?: ChainId;
}) => PublicClient;
export interface BestTradeOptions extends BaseBestTradeOptions {
    provider: Provider;
    allCommonPairs?: Pair[] | ((one: Currency, another: Currency) => Promise<Pair[]> | Pair[]);
}
export declare enum RouteType {
    V2 = 0,
    STABLE_SWAP = 1,
    MIXED = 2
}
//# sourceMappingURL=bestTrade.d.ts.map