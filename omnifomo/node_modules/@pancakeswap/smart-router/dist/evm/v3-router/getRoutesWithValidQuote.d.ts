import { BigintIsh, Currency, CurrencyAmount, TradeType } from '@pancakeswap/sdk';
import { BaseRoute, GasModel, QuoteProvider, RouteWithQuote } from './types';
interface Params {
    blockNumber?: BigintIsh;
    amount: CurrencyAmount<Currency>;
    baseRoutes: BaseRoute[];
    distributionPercent: number;
    quoteProvider: QuoteProvider;
    tradeType: TradeType;
    gasModel: GasModel;
    quoterOptimization?: boolean;
}
export declare function getRoutesWithValidQuote({ amount, baseRoutes, distributionPercent, quoteProvider, tradeType, blockNumber, gasModel, quoterOptimization, }: Params): Promise<RouteWithQuote[]>;
export {};
//# sourceMappingURL=getRoutesWithValidQuote.d.ts.map