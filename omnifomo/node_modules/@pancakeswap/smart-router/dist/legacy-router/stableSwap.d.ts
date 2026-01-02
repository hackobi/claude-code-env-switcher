import { Currency, CurrencyAmount, Pair, Trade, TradeType } from '@pancakeswap/sdk';
import { Address } from 'viem';
import { RouteType, RouteWithStableSwap, StableSwapFeeRaw, StableSwapPair, StableSwapFeePercent } from './types';
import { BasePair } from './types/pair';
export declare function createStableSwapPair(pair: Omit<BasePair, 'involvesToken'>, stableSwapAddress?: Address, lpAddress?: Address, infoStableSwapAddress?: Address, stableLpFee?: number, stableLpFeeRateOfTotalFee?: number): StableSwapPair;
export declare function isStableSwapPair(pair: any): pair is StableSwapPair;
export declare function createRouteWithStableSwap<TInput extends Currency, TOutput extends Currency>({ routeType, input, pairs, output, }: {
    routeType: RouteType;
    pairs: (Pair | StableSwapPair)[];
    input: TInput;
    output: TOutput;
}): RouteWithStableSwap<TInput, TOutput>;
interface Options<TInput extends Currency, TOutput extends Currency, TTradeType extends TradeType> {
    routeType: RouteType;
    pairs: (Pair | StableSwapPair)[];
    inputAmount: CurrencyAmount<TInput>;
    outputAmount: CurrencyAmount<TOutput>;
    tradeType: TTradeType;
}
export declare function createTradeWithStableSwap<TInput extends Currency, TOutput extends Currency>({ routeType, pairs, inputAmount, outputAmount, tradeType, }: Options<TInput, TOutput, TradeType>): {
    tradeType: TradeType;
    inputAmount: CurrencyAmount<TInput>;
    outputAmount: CurrencyAmount<TOutput>;
    route: RouteWithStableSwap<TInput, TOutput>;
};
export declare function createTradeWithStableSwapFromV2Trade<TIn extends Currency, TOut extends Currency>({ tradeType, inputAmount, outputAmount, route: { pairs }, }: Trade<TIn, TOut, TradeType>): {
    tradeType: TradeType;
    inputAmount: CurrencyAmount<TIn>;
    outputAmount: CurrencyAmount<TOut>;
    route: RouteWithStableSwap<TIn, TOut>;
};
export declare function getFeePercent(inputAmount: CurrencyAmount<Currency>, outputAmount: CurrencyAmount<Currency>, { fee, adminFee }: StableSwapFeeRaw): StableSwapFeePercent;
export {};
//# sourceMappingURL=stableSwap.d.ts.map