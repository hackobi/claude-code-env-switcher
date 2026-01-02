import { Currency, Pair } from '@pancakeswap/sdk';
import { Provider } from './types';
export declare enum PairState {
    LOADING = 0,
    NOT_EXISTS = 1,
    EXISTS = 2,
    INVALID = 3
}
interface Options {
    provider: Provider;
}
export declare function getAllCommonPairs(currencyA: Currency, currencyB: Currency, { provider }: Options): Promise<Pair[]>;
export {};
//# sourceMappingURL=getAllCommonPairs.d.ts.map