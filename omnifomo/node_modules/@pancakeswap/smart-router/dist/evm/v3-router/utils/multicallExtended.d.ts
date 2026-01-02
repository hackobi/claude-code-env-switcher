import { Hex } from 'viem';
import { BigintIsh } from '@pancakeswap/sdk';
export type Validation = BigintIsh | string;
export declare abstract class MulticallExtended {
    static ABI: readonly [{
        readonly inputs: readonly [{
            readonly internalType: "bytes32";
            readonly name: "previousBlockhash";
            readonly type: "bytes32";
        }, {
            readonly internalType: "bytes[]";
            readonly name: "data";
            readonly type: "bytes[]";
        }];
        readonly name: "multicall";
        readonly outputs: readonly [{
            readonly internalType: "bytes[]";
            readonly name: "results";
            readonly type: "bytes[]";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "uint256";
            readonly name: "deadline";
            readonly type: "uint256";
        }, {
            /**
             * Cannot be constructed.
             */
            readonly internalType: "bytes[]";
            readonly name: "data";
            readonly type: "bytes[]";
        }];
        readonly name: "multicall";
        readonly outputs: readonly [{
            readonly internalType: "bytes[]";
            readonly name: "results";
            readonly type: "bytes[]";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }, {
        readonly inputs: readonly [{
            readonly internalType: "bytes[]";
            readonly name: "data";
            readonly type: "bytes[]";
        }];
        readonly name: "multicall";
        readonly outputs: readonly [{
            readonly internalType: "bytes[]";
            readonly name: "results";
            readonly type: "bytes[]";
        }];
        readonly stateMutability: "payable";
        readonly type: "function";
    }];
    /**
     * Cannot be constructed.
     */
    private constructor();
    static encodeMulticall(calldatas: Hex | Hex[], validation?: Validation): Hex;
}
//# sourceMappingURL=multicallExtended.d.ts.map