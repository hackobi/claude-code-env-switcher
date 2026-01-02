import { Currency, CurrencyAmount } from '@pancakeswap/sdk';
/**
 * The minimum percentage of the input token to use for each route in a split route.
 * All routes will have a multiple of this value. For example is distribution percentage is 5,
 * a potential return swap would be:
 *
 * 5% of input => Route 1
 * 55% of input => Route 2
 * 40% of input => Route 3
 */
export declare function getAmountDistribution(amount: CurrencyAmount<Currency>, distributionPercent: number): [number[], CurrencyAmount<Currency>[]];
//# sourceMappingURL=getAmountDistribution.d.ts.map