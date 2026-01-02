import { Percent, TradeType, CurrencyAmount } from '@pancakeswap/sdk';
import { SmartRouterTrade } from '../types';
export declare function maximumAmountIn(trade: SmartRouterTrade<TradeType>, slippage: Percent, amountIn?: CurrencyAmount<import("@pancakeswap/sdk").Currency>): CurrencyAmount<import("@pancakeswap/sdk").Currency>;
export declare function minimumAmountOut(trade: SmartRouterTrade<TradeType>, slippage: Percent, amountOut?: CurrencyAmount<import("@pancakeswap/sdk").Currency>): CurrencyAmount<import("@pancakeswap/sdk").Currency>;
//# sourceMappingURL=maximumAmount.d.ts.map