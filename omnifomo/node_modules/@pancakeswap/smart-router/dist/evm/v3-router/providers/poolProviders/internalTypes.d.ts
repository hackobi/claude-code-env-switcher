import { Currency } from '@pancakeswap/sdk';
import { FeeAmount } from '@pancakeswap/v3-sdk';
import { Address } from 'viem';
export interface PoolMeta {
    currencyA: Currency;
    currencyB: Currency;
    address: Address;
}
export interface V3PoolMeta extends PoolMeta {
    fee: FeeAmount;
}
//# sourceMappingURL=internalTypes.d.ts.map