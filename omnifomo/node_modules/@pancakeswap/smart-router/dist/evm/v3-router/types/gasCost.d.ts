import { Currency, CurrencyAmount } from '@pancakeswap/sdk';
export interface GasCost {
    gasEstimate: bigint;
    gasCostInToken: CurrencyAmount<Currency>;
    gasCostInUSD: CurrencyAmount<Currency>;
}
//# sourceMappingURL=gasCost.d.ts.map