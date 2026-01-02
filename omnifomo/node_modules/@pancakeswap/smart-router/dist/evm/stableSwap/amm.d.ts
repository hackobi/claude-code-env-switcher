import { BigintIsh } from '@pancakeswap/sdk';
interface Params {
    amplifier: BigintIsh;
    balances: BigintIsh[];
}
/**
 * Calculate the constant D of Curve AMM formula
 * @see https://classic.curve.fi/files/stableswap-paper.pdf
 */
export declare function getD({ amplifier, balances }: Params): bigint;
interface GetYParams {
    amplifier: BigintIsh;
    balances: BigintIsh[];
    i: number;
    j: number;
    x: BigintIsh;
}
/**
 * Calculate the expected token amount y after user deposit
 * @see https://classic.curve.fi/files/stableswap-paper.pdf
 */
export declare function getY({ amplifier, balances, i, j, x }: GetYParams): bigint;
export {};
//# sourceMappingURL=amm.d.ts.map