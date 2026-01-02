import { Currency, Price } from '@pancakeswap/sdk';
import { BaseRoute, Pool, Route } from '../types';
export declare function buildBaseRoute(pools: Pool[], currencyIn: Currency, currencyOut: Currency): BaseRoute;
export declare function getQuoteCurrency({ input, output }: BaseRoute, baseCurrency: Currency): Currency;
export declare function getMidPrice({ path, pools }: Route): Price<Currency, Currency>;
//# sourceMappingURL=route.d.ts.map