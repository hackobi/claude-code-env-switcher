/// <reference types="lodash" />
import { Currency, Token } from '@pancakeswap/sdk';
export declare const getCheckAgainstBaseTokens: ((currencyA?: Currency, currencyB?: Currency) => Token[]) & import("lodash").MemoizedFunction;
export declare const getPairCombinations: ((currencyA?: Currency, currencyB?: Currency) => [Currency, Currency][]) & import("lodash").MemoizedFunction;
//# sourceMappingURL=getPairCombinations.d.ts.map