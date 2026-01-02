import { Currency, CurrencyAmount, TradeType } from '@pancakeswap/sdk';
import { BestTradeOptions, TradeWithStableSwap } from './types';
export declare function getBestTradeFromStablePools(amount: CurrencyAmount<Currency>, output: Currency, { maxHops, provider }: BestTradeOptions): Promise<TradeWithStableSwap<Currency, Currency, TradeType> | null>;
//# sourceMappingURL=getBestTradeFromStablePools.d.ts.map