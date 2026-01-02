import { ChainId, Currency, CurrencyAmount, Token } from '@pancakeswap/sdk';
export declare function wrappedCurrency(currency: Currency | undefined, chainId: ChainId): Token | undefined;
export declare function wrappedCurrencyAmount(currencyAmount: CurrencyAmount<Currency> | undefined, chainId: ChainId | undefined): CurrencyAmount<Token> | undefined;
export declare function unwrappedToken(token: Currency): Currency;
//# sourceMappingURL=currency.d.ts.map