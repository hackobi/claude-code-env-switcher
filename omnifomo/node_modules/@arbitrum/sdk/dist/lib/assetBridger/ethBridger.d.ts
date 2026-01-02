import { Signer } from '@ethersproject/abstract-signer';
import { Provider, TransactionRequest } from '@ethersproject/abstract-provider';
import { PayableOverrides, Overrides } from '@ethersproject/contracts';
import { BigNumber } from 'ethers';
import { AssetBridger } from './assetBridger';
import { L1EthDepositTransaction, L1ContractCallTransaction } from '../message/L1Transaction';
import { L2ContractTransaction } from '../message/L2Transaction';
import { GasOverrides } from '../message/L1ToL2MessageGasEstimator';
import { L1ToL2TransactionRequest, L2ToL1TransactionRequest } from '../dataEntities/transactionRequest';
import { OmitTyped } from '../utils/types';
export type ApproveGasTokenParams = {
    /**
     * Amount to approve. Defaults to max int.
     */
    amount?: BigNumber;
    /**
     * Transaction overrides
     */
    overrides?: PayableOverrides;
};
export type ApproveGasTokenTxRequest = {
    /**
     * Transaction request
     */
    txRequest: Required<Pick<TransactionRequest, 'to' | 'data' | 'value'>>;
    /**
     * Transaction overrides
     */
    overrides?: Overrides;
};
export type ApproveGasTokenParamsOrTxRequest = ApproveGasTokenParams | ApproveGasTokenTxRequest;
type WithL1Signer<T extends ApproveGasTokenParamsOrTxRequest> = T & {
    l1Signer: Signer;
};
export interface EthWithdrawParams {
    /**
     * The amount of ETH or tokens to be withdrawn
     */
    amount: BigNumber;
    /**
     * The L1 address to receive the value.
     */
    destinationAddress: string;
    /**
     * The address of the withdrawal sender
     */
    from: string;
    /**
     * Transaction overrides
     */
    overrides?: PayableOverrides;
}
export type EthDepositParams = {
    /**
     * The L1 provider or signer
     */
    l1Signer: Signer;
    /**
     * The amount of ETH or tokens to be deposited
     */
    amount: BigNumber;
    /**
     * Transaction overrides
     */
    overrides?: PayableOverrides;
};
export type EthDepositToParams = EthDepositParams & {
    /**
     * An L2 provider
     */
    l2Provider: Provider;
    /**
     * L2 address of the entity receiving the funds
     */
    destinationAddress: string;
    /**
     * Overrides for the retryable ticket parameters
     */
    retryableGasOverrides?: GasOverrides;
};
export type L1ToL2TxReqAndSigner = L1ToL2TransactionRequest & {
    l1Signer: Signer;
    overrides?: Overrides;
};
export type L2ToL1TxReqAndSigner = L2ToL1TransactionRequest & {
    l2Signer: Signer;
    overrides?: Overrides;
};
type EthDepositRequestParams = OmitTyped<EthDepositParams, 'overrides' | 'l1Signer'> & {
    from: string;
};
type EthDepositToRequestParams = OmitTyped<EthDepositToParams, 'overrides' | 'l1Signer'> & {
    /**
     * The L1 provider
     */
    l1Provider: Provider;
    /**
     * Address that is depositing the ETH
     */
    from: string;
};
/**
 * Bridger for moving ETH back and forth between L1 to L2
 */
export declare class EthBridger extends AssetBridger<EthDepositParams | EthDepositToParams | L1ToL2TxReqAndSigner, EthWithdrawParams | L2ToL1TxReqAndSigner> {
    /**
     * Instantiates a new EthBridger from an L2 Provider
     * @param l2Provider
     * @returns
     */
    static fromProvider(l2Provider: Provider): Promise<EthBridger>;
    /**
     * Asserts that the provided argument is of type `ApproveGasTokenParams` and not `ApproveGasTokenTxRequest`.
     * @param params
     */
    private isApproveGasTokenParams;
    /**
     * Creates a transaction request for approving the custom gas token to be spent by the inbox on the parent chain
     * @param params
     */
    getApproveGasTokenRequest(params?: ApproveGasTokenParams): Required<Pick<TransactionRequest, 'to' | 'data' | 'value'>>;
    /**
     * Approves the custom gas token to be spent by the Inbox on the parent chain.
     * @param params
     */
    approveGasToken(params: WithL1Signer<ApproveGasTokenParamsOrTxRequest>): Promise<import("@ethersproject/abstract-provider").TransactionResponse>;
    /**
     * Gets transaction calldata for a tx request for depositing ETH or custom gas token
     * @param params
     * @returns
     */
    private getDepositRequestData;
    /**
     * Gets tx request for depositing ETH or custom gas token
     * @param params
     * @returns
     */
    getDepositRequest(params: EthDepositRequestParams): Promise<OmitTyped<L1ToL2TransactionRequest, 'retryableData'>>;
    /**
     * Deposit ETH from L1 onto L2
     * @param params
     * @returns
     */
    deposit(params: EthDepositParams | L1ToL2TxReqAndSigner): Promise<L1EthDepositTransaction>;
    /**
     * Get a transaction request for an ETH deposit to a different L2 address using Retryables
     * @param params
     * @returns
     */
    getDepositToRequest(params: EthDepositToRequestParams): Promise<L1ToL2TransactionRequest>;
    /**
     * Deposit ETH from L1 onto a different L2 address
     * @param params
     * @returns
     */
    depositTo(params: EthDepositToParams | (L1ToL2TxReqAndSigner & {
        l2Provider: Provider;
    })): Promise<L1ContractCallTransaction>;
    /**
     * Get a transaction request for an eth withdrawal
     * @param params
     * @returns
     */
    getWithdrawalRequest(params: EthWithdrawParams): Promise<L2ToL1TransactionRequest>;
    /**
     * Withdraw ETH from L2 onto L1
     * @param params
     * @returns
     */
    withdraw(params: (EthWithdrawParams & {
        l2Signer: Signer;
    }) | L2ToL1TxReqAndSigner): Promise<L2ContractTransaction>;
}
export {};
