import { BigintIsh, CurrencyAmount, Currency, Percent } from '@pancakeswap/sdk';
export interface GetLPOutputParams {
    amplifier: BigintIsh;
    balances: CurrencyAmount<Currency>[];
    amounts: CurrencyAmount<Currency>[];
    totalSupply: CurrencyAmount<Currency>;
    fee: Percent;
}
export declare function getLPOutput({ amplifier, balances, totalSupply, amounts, fee, }: GetLPOutputParams): CurrencyAmount<Currency>;
//# sourceMappingURL=getLPOutput.d.ts.map