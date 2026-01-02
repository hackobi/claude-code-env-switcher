import { Currency, TradeType, Percent, CurrencyAmount, Price } from '@pancakeswap/sdk';
import { TradeWithStableSwap } from './types';
export declare const Trade: {
    maximumAmountIn: typeof maximumAmountIn;
    minimumAmountOut: typeof minimumAmountOut;
    executionPrice: typeof executionPrice;
    priceImpact: typeof priceImpact;
};
/**
 * Get the maximum amount in that can be spent via this trade for the given slippage tolerance
 */
declare function maximumAmountIn<TIn extends Currency, TOut extends Currency, TTradeType extends TradeType>(trade: TradeWithStableSwap<TIn, TOut, TTradeType>, slippageTolerance: Percent): CurrencyAmount<TIn>;
/**
 * Get the minimum amount that must be received from this trade for the given slippage tolerance
 */
declare function minimumAmountOut<TIn extends Currency, TOut extends Currency, TTradeType extends TradeType>(trade: TradeWithStableSwap<TIn, TOut, TTradeType>, slippageTolerance: Percent): CurrencyAmount<TOut>;
declare function executionPrice<TIn extends Currency, TOut extends Currency, TTradeType extends TradeType>({ inputAmount, outputAmount, }: TradeWithStableSwap<TIn, TOut, TTradeType>): Price<TIn, TOut>;
declare function priceImpact<TIn extends Currency, TOut extends Currency, TTradeType extends TradeType>({ route, inputAmount, outputAmount, }: TradeWithStableSwap<TIn, TOut, TTradeType>): Percent;
export {};
//# sourceMappingURL=trade.d.ts.map