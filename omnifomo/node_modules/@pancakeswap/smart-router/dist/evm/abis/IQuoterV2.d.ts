export declare const quoterV2ABI: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "path";
        readonly type: "bytes";
    }, {
        readonly internalType: "uint256";
        readonly name: "amountIn";
        readonly type: "uint256";
    }];
    readonly name: "quoteExactInput";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "amountOut";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint160[]";
        readonly name: "sqrtPriceX96AfterList";
        readonly type: "uint160[]";
    }, {
        readonly internalType: "uint32[]";
        readonly name: "initializedTicksCrossedList";
        readonly type: "uint32[]";
    }, {
        readonly internalType: "uint256";
        readonly name: "gasEstimate";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly components: readonly [{
            readonly internalType: "address";
            readonly name: "tokenIn";
            readonly type: "address";
        }, {
            readonly internalType: "address";
            readonly name: "tokenOut";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "amountIn";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint24";
            readonly name: "fee";
            readonly type: "uint24";
        }, {
            readonly internalType: "uint160";
            readonly name: "sqrtPriceLimitX96";
            readonly type: "uint160";
        }];
        readonly internalType: "struct IQuoterV2.QuoteExactInputSingleParams";
        readonly name: "params";
        readonly type: "tuple";
    }];
    readonly name: "quoteExactInputSingle";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "amountOut";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint160";
        readonly name: "sqrtPriceX96After";
        readonly type: "uint160";
    }, {
        readonly internalType: "uint32";
        readonly name: "initializedTicksCrossed";
        readonly type: "uint32";
    }, {
        readonly internalType: "uint256";
        readonly name: "gasEstimate";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "path";
        readonly type: "bytes";
    }, {
        readonly internalType: "uint256";
        readonly name: "amountOut";
        readonly type: "uint256";
    }];
    readonly name: "quoteExactOutput";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "amountIn";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint160[]";
        readonly name: "sqrtPriceX96AfterList";
        readonly type: "uint160[]";
    }, {
        readonly internalType: "uint32[]";
        readonly name: "initializedTicksCrossedList";
        readonly type: "uint32[]";
    }, {
        readonly internalType: "uint256";
        readonly name: "gasEstimate";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly components: readonly [{
            readonly internalType: "address";
            readonly name: "tokenIn";
            readonly type: "address";
        }, {
            readonly internalType: "address";
            readonly name: "tokenOut";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "amount";
            readonly type: "uint256";
        }, {
            readonly internalType: "uint24";
            readonly name: "fee";
            readonly type: "uint24";
        }, {
            readonly internalType: "uint160";
            readonly name: "sqrtPriceLimitX96";
            readonly type: "uint160";
        }];
        readonly internalType: "struct IQuoterV2.QuoteExactOutputSingleParams";
        readonly name: "params";
        readonly type: "tuple";
    }];
    readonly name: "quoteExactOutputSingle";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "amountIn";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint160";
        readonly name: "sqrtPriceX96After";
        readonly type: "uint160";
    }, {
        readonly internalType: "uint32";
        readonly name: "initializedTicksCrossed";
        readonly type: "uint32";
    }, {
        readonly internalType: "uint256";
        readonly name: "gasEstimate";
        readonly type: "uint256";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];
//# sourceMappingURL=IQuoterV2.d.ts.map