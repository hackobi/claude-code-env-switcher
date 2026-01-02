import { BigintIsh, Currency } from '@pancakeswap/sdk';
import { GasModel, PoolProvider } from './types';
interface GasModelConfig {
    gasPriceWei: BigintIsh | (() => Promise<BigintIsh>);
    blockNumber?: BigintIsh;
    poolProvider: PoolProvider;
    quoteCurrency: Currency;
}
export declare function createGasModel({ gasPriceWei, poolProvider, quoteCurrency, blockNumber, }: GasModelConfig): Promise<GasModel>;
export {};
//# sourceMappingURL=gasModel.d.ts.map