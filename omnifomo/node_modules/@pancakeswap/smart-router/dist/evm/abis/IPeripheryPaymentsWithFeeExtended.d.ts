export declare const peripheryPaymentsWithFeeExtendedAbi: readonly [{
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "value";
        readonly type: "uint256";
    }];
    readonly name: "pull";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [];
    readonly name: "refundETH";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "amountMinimum";
        readonly type: "uint256";
    }];
    readonly name: "sweepToken";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "amountMinimum";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly name: "sweepToken";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "amountMinimum";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "feeBips";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "feeRecipient";
        readonly type: "address";
    }];
    readonly name: "sweepTokenWithFee";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "token";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "amountMinimum";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "recipient";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "feeBips";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "feeRecipient";
        readonly type: "address";
    }];
    readonly name: "sweepTokenWithFee";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "amountMinimum";
        readonly type: "uint256";
    }];
    readonly name: "unwrapWETH9";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "amountMinimum";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "recipient";
        readonly type: "address";
    }];
    readonly name: "unwrapWETH9";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "amountMinimum";
        readonly type: "uint256";
    }, {
        readonly internalType: "uint256";
        readonly name: "feeBips";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "feeRecipient";
        readonly type: "address";
    }];
    readonly name: "unwrapWETH9WithFee";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "amountMinimum";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "recipient";
        readonly type: "address";
    }, {
        readonly internalType: "uint256";
        readonly name: "feeBips";
        readonly type: "uint256";
    }, {
        readonly internalType: "address";
        readonly name: "feeRecipient";
        readonly type: "address";
    }];
    readonly name: "unwrapWETH9WithFee";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "value";
        readonly type: "uint256";
    }];
    readonly name: "wrapETH";
    readonly outputs: readonly [];
    readonly stateMutability: "payable";
    readonly type: "function";
}];
//# sourceMappingURL=IPeripheryPaymentsWithFeeExtended.d.ts.map