import { Currency } from '@pancakeswap/sdk';
import { Pool } from '../types';
/**
 * Simple utility function to get the output of an array of Pools or Pairs
 * @param pools
 * @param firstInputToken
 * @returns the output token of the last pool in the array
 */
export declare const getOutputOfPools: (pools: Pool[], firstInputToken: Currency) => Currency;
//# sourceMappingURL=getOutputOfPools.d.ts.map