declare const _default: readonly [{
    readonly inputs: readonly [];
    readonly name: "getCurrentBlockTimestamp";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "timestamp";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly internalType: "address";
        readonly name: "addr";
        readonly type: "address";
    }];
    readonly name: "getEthBalance";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "balance";
        readonly type: "uint256";
    }];
    readonly stateMutability: "view";
    readonly type: "function";
}, {
    readonly inputs: readonly [{
        readonly components: readonly [{
            readonly internalType: "address";
            readonly name: "target";
            readonly type: "address";
        }, {
            readonly internalType: "uint256";
            readonly name: "gasLimit";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes";
            readonly name: "callData";
            readonly type: "bytes";
        }];
        readonly internalType: "struct PancakeInterfaceMulticall.Call[]";
        readonly name: "calls";
        readonly type: "tuple[]";
    }];
    readonly name: "multicall";
    readonly outputs: readonly [{
        readonly internalType: "uint256";
        readonly name: "blockNumber";
        readonly type: "uint256";
    }, {
        readonly components: readonly [{
            readonly internalType: "bool";
            readonly name: "success";
            readonly type: "bool";
        }, {
            readonly internalType: "uint256";
            readonly name: "gasUsed";
            readonly type: "uint256";
        }, {
            readonly internalType: "bytes";
            readonly name: "returnData";
            readonly type: "bytes";
        }];
        readonly internalType: "struct PancakeInterfaceMulticall.Result[]";
        readonly name: "returnData";
        readonly type: "tuple[]";
    }];
    readonly stateMutability: "nonpayable";
    readonly type: "function";
}];
export default _default;
//# sourceMappingURL=InterfaceMulticall.d.ts.map