import { Currency, CurrencyAmount, TradeType } from '@pancakeswap/sdk';
import { TradeConfig, SmartRouterTrade } from './types';
export declare function getBestTrade(amount: CurrencyAmount<Currency>, currency: Currency, tradeType: TradeType, config: TradeConfig): Promise<SmartRouterTrade<TradeType> | null>;
//# sourceMappingURL=getBestTrade.d.ts.map