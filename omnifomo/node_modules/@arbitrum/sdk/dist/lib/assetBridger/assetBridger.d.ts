import { L1ContractTransaction } from '../message/L1Transaction';
import { L2ContractTransaction } from '../message/L2Transaction';
import { L1Network, L2Network } from '../dataEntities/networks';
import { SignerOrProvider } from '../dataEntities/signerOrProvider';
/**
 * Base for bridging assets from l1 to l2 and back
 */
export declare abstract class AssetBridger<DepositParams, WithdrawParams> {
    readonly l2Network: L2Network;
    /**
     * Parent chain for the given Arbitrum chain, can be an L1 or an L2
     */
    readonly l1Network: L1Network | L2Network;
    /**
     * In case of a chain that uses ETH as its native/gas token, this is either `undefined` or the zero address
     *
     * In case of a chain that uses an ERC-20 token from the parent chain as its native/gas token, this is the address of said token on the parent chain
     */
    readonly nativeToken?: string;
    constructor(l2Network: L2Network);
    /**
     * Check the signer/provider matches the l1Network, throws if not
     * @param sop
     */
    protected checkL1Network(sop: SignerOrProvider): Promise<void>;
    /**
     * Check the signer/provider matches the l2Network, throws if not
     * @param sop
     */
    protected checkL2Network(sop: SignerOrProvider): Promise<void>;
    /**
     * Whether the chain uses ETH as its native/gas token
     * @returns {boolean}
     */
    protected get nativeTokenIsEth(): boolean;
    /**
     * Transfer assets from L1 to L2
     * @param params
     */
    abstract deposit(params: DepositParams): Promise<L1ContractTransaction>;
    /**
     * Transfer assets from L2 to L1
     * @param params
     */
    abstract withdraw(params: WithdrawParams): Promise<L2ContractTransaction>;
}
