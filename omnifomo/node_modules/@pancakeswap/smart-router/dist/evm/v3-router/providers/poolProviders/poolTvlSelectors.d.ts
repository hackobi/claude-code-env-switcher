import { Currency } from '@pancakeswap/sdk';
import { V2PoolWithTvl, V3PoolWithTvl } from '../../types';
export declare const v3PoolTvlSelector: (currencyA: Currency | undefined, currencyB: Currency | undefined, unorderedPoolsWithTvl: V3PoolWithTvl[]) => Omit<V3PoolWithTvl, "tvlUSD">[];
export declare const v2PoolTvlSelector: (currencyA: Currency | undefined, currencyB: Currency | undefined, unorderedPoolsWithTvl: V2PoolWithTvl[]) => Omit<V2PoolWithTvl, "tvlUSD">[];
//# sourceMappingURL=poolTvlSelectors.d.ts.map