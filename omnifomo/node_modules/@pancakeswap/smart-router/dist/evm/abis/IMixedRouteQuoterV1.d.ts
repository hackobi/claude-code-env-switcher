export declare const mixedRouteQuoterV1ABI: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "_deployer";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "_factory";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "_factoryV2";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "_factoryStable";
        readonly type: "address";
    }, {
        readonly internalType: "address";
        readonly name: "_WETH9";
        readonly type: "address";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "constructor";
}, {
    readonly inputs: readonly [];
    readonly name: "WETH9";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "deployer";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "factory";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "factoryStable";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "factoryV2";
    readonly outputs: readonly [{
        readonly internalType: "address";
        readonly name: "";
        readonly type: "address";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "int256";
        readonly name: "amount0Delta";
        readonly type: "int256";
    }, {
        readonly internalType: "int256";
        readonly name: "amount1Delta";
        readonly type: "int256";
    }, {
        readonly internalType: "bytes";
        readonly name: "path";
        readonly type: "bytes";
    }];
    readonly name: "pancakeV3SwapCallback";
    readonly outputs: readonly [];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "bytes";
        readonly name: "path";
        readonly type: "bytes";
    }, {
        readonly internalType: "uint256[]";
        readonly name: "flag";
        readonly type: "uint256[]";
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
        readonly name: "v3SqrtPriceX96AfterList";
        readonly type: "uint160[]";
    }, {
        readonly internalType: "uint32[]";
        readonly name: "v3InitializedTicksCrossedList";
        readonly type: "uint32[]";
    }, {
        readonly internalType: "uint256";
        readonly name: "v3SwapGasEstimate";
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
            readonly internalType: "uint256";
            readonly name: "flag";
            readonly type: "uint256";
        }];
        readonly internalType: "struct IMixedRouteQuoterV1.QuoteExactInputSingleStableParams";
        readonly name: "params";
        readonly type: "tuple";
    }];
    readonly name: "quoteExactInputSingleStable";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "amountOut";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
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
        }];
        readonly internalType: "struct IMixedRouteQuoterV1.QuoteExactInputSingleV2Params";
        readonly name: "params";
        readonly type: "tuple";
    }];
    readonly name: "quoteExactInputSingleV2";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "amountOut";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
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
        readonly internalType: "struct IMixedRouteQuoterV1.QuoteExactInputSingleV3Params";
        readonly name: "params";
        readonly type: "tuple";
    }];
    readonly name: "quoteExactInputSingleV3";
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
}];
//# sourceMappingURL=IMixedRouteQuoterV1.d.ts.map