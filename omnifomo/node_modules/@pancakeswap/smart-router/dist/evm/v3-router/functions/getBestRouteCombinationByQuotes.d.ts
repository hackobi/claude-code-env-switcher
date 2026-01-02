import { ChainId, Currency, CurrencyAmount, TradeType } from '@pancakeswap/sdk';
import { BestRoutes, RouteWithQuote } from '../types';
interface Config {
    minSplits?: number;
    maxSplits?: number;
}
export declare function getBestRouteCombinationByQuotes(amount: CurrencyAmount<Currency>, quoteCurrency: Currency, routesWithQuote: RouteWithQuote[], tradeType: TradeType, config: Config): BestRoutes | null;
export declare function getBestSwapRouteBy(tradeType: TradeType, percentToQuotes: {
    [percent: number]: RouteWithQuote[];
}, percents: number[], chainId: ChainId, by: (routeQuote: RouteWithQuote) => CurrencyAmount<Currency>, { maxSplits, minSplits }: Config): {
    quote: CurrencyAmount<Currency>;
    quoteGasAdjusted: CurrencyAmount<Currency>;
    estimatedGasUsed: bigint;
    estimatedGasUsedUSD: CurrencyAmount<Currency>;
    estimatedGasUsedQuoteToken: CurrencyAmount<Currency>;
    routes: RouteWithQuote[];
} | null;
export {};
//# sourceMappingURL=getBestRouteCombinationByQuotes.d.ts.map