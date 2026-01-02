import { BigintIsh, CurrencyAmount, Currency, Percent } from '@pancakeswap/sdk';
export interface GetSwapOutputParams {
    amplifier: BigintIsh;
    balances: CurrencyAmount<Currency>[];
    amount: CurrencyAmount<Currency>;
    outputCurrency: Currency;
    fee: Percent;
}
export declare function getSwapOutput({ amplifier, balances: balanceAmounts, outputCurrency, amount, fee, }: GetSwapOutputParams): CurrencyAmount<Currency>;
export declare function getSwapOutputWithoutFee(params: Omit<GetSwapOutputParams, 'fee'>): CurrencyAmount<Currency>;
export declare function getSwapInput({ amount, ...rest }: GetSwapOutputParams): CurrencyAmount<Currency>;
export declare function getSwapInputWithtouFee(params: Omit<GetSwapOutputParams, 'fee'>): CurrencyAmount<Currency>;
//# sourceMappingURL=getSwapOutput.d.ts.map