import { ChainId, Token } from '@pancakeswap/sdk';
export type ChainMap<T> = {
    readonly [chainId in ChainId]: T;
};
export type ChainTokenList = ChainMap<Token[]>;
//# sourceMappingURL=chain.d.ts.map