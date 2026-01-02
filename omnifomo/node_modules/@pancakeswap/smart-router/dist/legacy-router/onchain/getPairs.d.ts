import { ChainId, Currency, Pair } from '@pancakeswap/sdk';
import { Provider } from '../types';
type CurrencyPair = [Currency, Currency];
export declare enum PairState {
    LOADING = 0,
    NOT_EXISTS = 1,
    EXISTS = 2,
    INVALID = 3
}
interface Options {
    provider: Provider;
    chainId: ChainId;
}
export declare function getPairs(currencyPairs: CurrencyPair[], { provider, chainId }: Options): Promise<Pair[]>;
export {};
//# sourceMappingURL=getPairs.d.ts.map