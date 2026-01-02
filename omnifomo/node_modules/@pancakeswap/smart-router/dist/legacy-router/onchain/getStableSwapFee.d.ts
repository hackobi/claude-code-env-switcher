import { Currency, CurrencyAmount } from '@pancakeswap/sdk';
import { StableSwapPair, Provider, StableSwapFeeRaw } from '../types';
export declare function getStableSwapFeeCall(pair: StableSwapPair, inputAmount: CurrencyAmount<Currency>): {
    readonly abi: readonly [{
        readonly inputs: readonly [];
        readonly name: "FEE_DENOMINATOR";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "N_COINS";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [];
        readonly name: "PRECISION";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }];
        readonly name: "PRECISION_MUL";
        readonly outputs: readonly [{
            readonly internalType: "uint256[2]";
            readonly name: "swapPRECISION_MUL";
            readonly type: "uint256[2]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }];
        readonly name: "RATES";
        readonly outputs: readonly [{
            readonly internalType: "uint256[2]";
            readonly name: "swapRATES";
            readonly type: "uint256[2]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }, {
            readonly internalType: "uint256[2]";
            readonly name: "_balances";
            readonly type: "uint256[2]";
        }];
        readonly name: "_xp_mem";
        readonly outputs: readonly [{
            readonly internalType: "uint256[2]";
            readonly name: "result";
            readonly type: "uint256[2]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }];
        readonly name: "balances";
        readonly outputs: readonly [{
            readonly internalType: "uint256[2]";
            readonly name: "swapBalances";
            readonly type: "uint256[2]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "_amount";
            readonly type: "uint256";
        }];
        readonly name: "calc_coins_amount";
        readonly outputs: readonly [{
            readonly internalType: "uint256[2]";
            readonly name: "";
            readonly type: "uint256[2]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }, {
            readonly internalType: "uint256[2]";
            readonly name: "_balances";
            readonly type: "uint256[2]";
        }, {
            readonly internalType: "uint256";
            readonly name: "amp";
            readonly type: "uint256";
        }];
        readonly name: "get_D_mem";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }, {
            readonly internalType: "uint256[2]";
            readonly name: "amounts";
            readonly type: "uint256[2]";
        }];
        readonly name: "get_add_liquidity_fee";
        readonly outputs: readonly [{
            readonly internalType: "uint256[2]";
            readonly name: "liquidityFee";
            readonly type: "uint256[2]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }, {
            readonly internalType: "uint256[2]";
            readonly name: "amounts";
            readonly type: "uint256[2]";
        }];
        readonly name: "get_add_liquidity_mint_amount";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "i";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "j";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "dx";
            readonly type: "uint256";
        }];
        readonly name: "get_exchange_fee";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "exFee";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "exAdminFee";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }, {
            readonly internalType: "uint256[2]";
            readonly name: "amounts";
            readonly type: "uint256[2]";
        }];
        readonly name: "get_remove_liquidity_imbalance_fee";
        readonly outputs: readonly [{
            readonly internalType: "uint256[2]";
            readonly name: "liquidityFee";
            readonly type: "uint256[2]";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "_token_amount";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint256";
            readonly name: "i";
            readonly type: "uint256";
        }];
        readonly name: "get_remove_liquidity_one_coin_fee";
        readonly outputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "adminFee";
            readonly type: "uint256";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "_swap";
            readonly type: "address";
        }];
        readonly name: "token";
        readonly outputs: readonly [{
            readonly internalType: "contract IERC20";
            readonly name: "";
            readonly type: "address";
        }];
        readonly stateMutability: "view";
        readonly type: "function";
    }];
    readonly address: `0x${string}`;
    readonly functionName: "get_exchange_fee";
    readonly args: readonly [`0x${string}`, 1n, 0n, bigint] | readonly [`0x${string}`, 0n, 1n, bigint];
};
interface Options {
    provider: Provider;
}
export declare function getStableSwapFee(pair: StableSwapPair, inputAmount: CurrencyAmount<Currency>, { provider }: Options): Promise<StableSwapFeeRaw>;
export {};
//# sourceMappingURL=getStableSwapFee.d.ts.map