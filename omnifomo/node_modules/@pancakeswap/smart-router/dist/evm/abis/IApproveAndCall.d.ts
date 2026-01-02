export declare const approveAndCallAbi: readonly [{
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
//# sourceMappingURL=IApproveAndCall.d.ts.map