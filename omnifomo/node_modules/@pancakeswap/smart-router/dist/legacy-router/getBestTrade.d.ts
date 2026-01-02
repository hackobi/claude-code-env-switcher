import { Currency, CurrencyAmount, TradeType } from '@pancakeswap/sdk';
import { BestTradeOptions, TradeWithStableSwap } from './types';
export declare const getBestTradeExactIn: (amountIn: CurrencyAmount<Currency>, output: Currency, options: BestTradeOptions) => Promise<TradeWithStableSwap<Currency, Currency, TradeType> | null>;
export declare const getBestTradeExactOut: (amountIn: CurrencyAmount<Currency>, output: Currency, options: BestTradeOptions) => Promise<TradeWithStableSwap<Currency, Currency, TradeType> | null>;
//# sourceMappingURL=getBestTrade.d.ts.map