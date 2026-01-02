import { Currency, CurrencyAmount } from '@pancakeswap/sdk';
import { Provider, StableSwapPair } from '../types';
interface Options {
    provider: Provider;
}
export declare function getStableSwapOutputAmount(pair: StableSwapPair, inputAmount: CurrencyAmount<Currency>, { provider }: Options): Promise<CurrencyAmount<Currency>>;
export {};
//# sourceMappingURL=getStableSwapOutputAmount.d.ts.map