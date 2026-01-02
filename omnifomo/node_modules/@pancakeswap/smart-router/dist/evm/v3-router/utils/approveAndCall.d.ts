import { Hex } from 'viem';
import { Currency, Percent, Token } from '@pancakeswap/sdk';
import { MintSpecificOptions, IncreaseSpecificOptions, Position } from '@pancakeswap/v3-sdk';
export type CondensedAddLiquidityOptions = Omit<MintSpecificOptions, 'createPool'> | IncreaseSpecificOptions;
export declare enum ApprovalTypes {
    NOT_REQUIRED = 0,
    MAX = 1,
    MAX_MINUS_ONE = 2,
    ZERO_THEN_MAX = 3,
    ZERO_THEN_MAX_MINUS_ONE = 4
}
export declare function isMint(options: CondensedAddLiquidityOptions): options is Omit<MintSpecificOptions, 'createPool'>;
export declare abstract class ApproveAndCall {
    static ABI: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "token";
            readonly type: "address";
        }];
        readonly name: "approveMax";
        readonly outputs: readonly [];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "token";
            readonly type: "address";
        }];
        readonly name: "approveMaxMinusOne";
        readonly outputs: readonly [];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "token";
            readonly type: "address";
        }];
        readonly name: "approveZeroThenMax";
        readonly outputs: readonly [];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "token";
            readonly type: "address";
        }];
        readonly name: "approveZeroThenMaxMinusOne";
        readonly outputs: readonly [];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "data";
            readonly type: "bytes";
        }];
        readonly name: "callPositionManager";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "result";
            readonly type: "bytes";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "address";
            readonly name: "token";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "amount";
            readonly type: "uint256";
        }];
        readonly name: "getApprovalType";
        readonly outputs: readonly [{
            readonly internalType: "enum IApproveAndCall.ApprovalType";
            readonly name: "";
            readonly type: "uint8";
        }];
        readonly stateMutability: "nonpayable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "address";
                readonly name: "token0";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "token1";
                readonly type: "address";
            }, {
                readonly internalType: "uint256";
                readonly name: "tokenId";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "amount0Min";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "amount1Min";
                readonly type: "uint256";
            }];
            readonly internalType: "struct IApproveAndCall.IncreaseLiquidityParams";
            readonly name: "params";
            readonly type: "tuple";
        }];
        readonly name: "increaseLiquidity";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "result";
            readonly type: "bytes";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly components: readonly [{
                readonly internalType: "address";
                readonly name: "token0";
                readonly type: "address";
            }, {
                readonly internalType: "address";
                readonly name: "token1";
                readonly type: "address";
            }, {
                readonly internalType: "uint24";
                readonly name: "fee";
                readonly type: "uint24";
            }, {
                readonly internalType: "int24";
                readonly name: "tickLower";
                readonly type: "int24";
            }, {
                readonly internalType: "int24";
                readonly name: "tickUpper";
                readonly type: "int24";
            }, {
                readonly internalType: "uint256";
                readonly name: "amount0Min";
                readonly type: "uint256";
            }, {
                readonly internalType: "uint256";
                readonly name: "amount1Min";
                readonly type: "uint256";
            }, {
                readonly internalType: "address";
                readonly name: "recipient";
                readonly type: "address";
            }];
            readonly internalType: "struct IApproveAndCall.MintParams";
            readonly name: "params";
            readonly type: "tuple";
        }];
        readonly name: "mint";
        readonly outputs: readonly [{
            readonly internalType: "bytes";
            readonly name: "result";
            readonly type: "bytes";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }];
    /**
     * Cannot be constructed.
     */
    private constructor();
    static encodeApproveMax(token: Token): Hex;
    static encodeApproveMaxMinusOne(token: Token): Hex;
    static encodeApproveZeroThenMax(token: Token): Hex;
    static encodeApproveZeroThenMaxMinusOne(token: Token): Hex;
    static encodeCallPositionManager(calldatas: Hex[]): Hex;
    /**
     * Encode adding liquidity to a position in the nft manager contract
     * @param position Forcasted position with expected amount out from swap
     * @param minimalPosition Forcasted position with custom minimal token amounts
     * @param addLiquidityOptions Options for adding liquidity
     * @param slippageTolerance Defines maximum slippage
     */
    static encodeAddLiquidity(position: Position, minimalPosition: Position, addLiquidityOptions: CondensedAddLiquidityOptions, slippageTolerance: Percent): Hex;
    static encodeApprove(token: Currency, approvalType: ApprovalTypes): Hex;
}
//# sourceMappingURL=approveAndCall.d.ts.map