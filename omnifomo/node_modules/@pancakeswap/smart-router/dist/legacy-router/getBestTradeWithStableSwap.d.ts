import { Currency, CurrencyAmount, Trade, TradeType } from '@pancakeswap/sdk';
import { BestTradeOptions, StableSwapPair } from './types';
export declare function getBestTradeWithStableSwap(baseTrade: Trade<Currency, Currency, TradeType>, stableSwapPairs: StableSwapPair[], options: BestTradeOptions): Promise<{
    tradeType: TradeType;
    inputAmount: CurrencyAmount<Currency>;
    outputAmount: CurrencyAmount<Currency>;
    route: import("./types").RouteWithStableSwap<Currency, Currency>;
}>;
//# sourceMappingURL=getBestTradeWithStableSwap.d.ts.map