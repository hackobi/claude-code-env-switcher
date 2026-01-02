/// <reference types="lodash" />
import { Currency, Pair, Price } from '@pancakeswap/sdk';
import { computePoolAddress } from '@pancakeswap/v3-sdk';
import { Address } from 'viem';
import { Pool, StablePool, V2Pool, V3Pool } from '../types';
export declare function isV2Pool(pool: Pool): pool is V2Pool;
export declare function isV3Pool(pool: Pool): pool is V3Pool;
export declare function isStablePool(pool: Pool): pool is StablePool;
export declare function involvesCurrency(pool: Pool, currency: Currency): boolean;
export declare function getOutputCurrency(pool: Pool, currencyIn: Currency): Currency;
export declare const computeV3PoolAddress: typeof computePoolAddress & import("lodash").MemoizedFunction;
export declare const computeV2PoolAddress: typeof Pair.getAddress & import("lodash").MemoizedFunction;
export declare const getPoolAddress: ((pool: Pool) => Address | '') & import("lodash").MemoizedFunction;
export declare function getTokenPrice(pool: Pool, base: Currency, quote: Currency): Price<Currency, Currency>;
//# sourceMappingURL=pool.d.ts.map