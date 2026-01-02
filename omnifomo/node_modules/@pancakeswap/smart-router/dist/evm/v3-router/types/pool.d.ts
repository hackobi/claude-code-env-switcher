import { Currency, CurrencyAmount, Percent } from '@pancakeswap/sdk';
import { FeeAmount, Tick } from '@pancakeswap/v3-sdk';
import { Address } from 'viem';
export declare enum PoolType {
    V2 = 0,
    V3 = 1,
    STABLE = 2
}
export interface BasePool {
    type: PoolType;
}
export interface V2Pool extends BasePool {
    type: PoolType.V2;
    reserve0: CurrencyAmount<Currency>;
    reserve1: CurrencyAmount<Currency>;
}
export interface StablePool extends BasePool {
    address: Address;
    type: PoolType.STABLE;
    balances: CurrencyAmount<Currency>[];
    amplifier: bigint;
    fee: Percent;
}
export interface V3Pool extends BasePool {
    type: PoolType.V3;
    token0: Currency;
    token1: Currency;
    fee: FeeAmount;
    liquidity: bigint;
    sqrtRatioX96: bigint;
    tick: number;
    address: Address;
    token0ProtocolFee: Percent;
    token1ProtocolFee: Percent;
    ticks?: Tick[];
}
export type Pool = V2Pool | V3Pool | StablePool;
export interface WithTvl {
    tvlUSD: bigint;
}
export type V3PoolWithTvl = V3Pool & WithTvl;
export type V2PoolWithTvl = V2Pool & WithTvl;
export type StablePoolWithTvl = StablePool & WithTvl;
//# sourceMappingURL=pool.d.ts.map