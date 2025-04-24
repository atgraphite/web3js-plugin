import Web3, { Web3PluginBase } from "web3";
import { hexToBytes } from "web3-utils";

import { TxData } from "./types"
import { GraphiteTransaction } from "./transaction";
import { GRAPHITE_TRANSACTION_TYPE } from "./consts";
import { AddressNotActivatedError, WalletNotAddedError } from "./errors";
import { FeeContract, FilterContract, KYCContract, ReputationContract } from "./contracts";


class GraphitePlugin extends Web3PluginBase {
	public pluginNamespace = 'graphite';

	public constructor(web3: Web3) {
		super();
		this.web3 = web3

		web3.config.defaultTransactionType = 0
		web3.eth.config.defaultTransactionType = 0
		web3.config.defaultAccount = this.getWalletAddress()
		web3.eth.config.defaultAccount = this.getWalletAddress()

		this.registerNewTransactionType(GRAPHITE_TRANSACTION_TYPE, GraphiteTransaction);

		this.feeContract = new FeeContract(web3)
		this.kycContract = new KYCContract(web3)
		this.filterContract = new FilterContract(web3)
		this.reputationContract = new ReputationContract(web3)
	}

	async getActivationFeeAmount() {
		return await this.feeContract.getFeeAmount()
	}

	async activateAccount() {
		return await this.sendTransaction(await this.feeContract.activateAccount())
	}

	async isActivated(address: string = this.getWalletAddress()) {
		return await this.feeContract.getActivationStatus(address)
	}

	async getFilterLevel() {
		return await this.filterContract.getFilterLevel()
	}

	async setFilterLevel(newLevel: number) {
		const activated = await this.isActivated(this.getWalletAddress())
		if (!activated)
			throw new AddressNotActivatedError()

		return await this.sendTransaction(await this.filterContract.setFilterLevel(newLevel))
	}

	async createKYCRequest(uuid: string, newLevel: number) {
		return await this.sendTransaction(await this.kycContract.createKYCRequest(uuid, newLevel))
	}

	async getKycLevel(address: string = this.getWalletAddress()) {
		return await this.kycContract.getKycLevel(address)
	}

	async getLastKycRequest() {
		return await this.kycContract.viewMyLastKycRequest()
	}

	async repairLostKycRequest() {
		return await this.sendTransaction(await this.kycContract.repairLostKycRequest())
	}

	async cancelKycRequest() {
		return await this.sendTransaction(await this.kycContract.cancelUsersRequest())
	}

	async getKYCFee(level: number) {
		return await this.kycContract.getKYCFee(level)
	}

	async sendTransaction(txData: TxData) {
		await this.patchFields(txData)
		const epAddress = await this.getEpAddress()

		if (epAddress !== '') {
			const tx = new GraphiteTransaction({
				...txData,
				epAddress: epAddress!,
			})

			const signedTx = tx.sign(hexToBytes(this.getWalletPrivateKey()))
			const serialized = signedTx.serialize()
			return await this.web3.eth.sendSignedTransaction(serialized)
		}

		return await this.web3.eth.sendTransaction(txData)
	}

	async patchFields(txData: TxData) {
		if (!txData.chainId)
			txData.chainId = await this.web3.eth.getChainId()
		if (!txData.gasPrice)
			txData.gasPrice = await this.web3.eth.getGasPrice()
		if (!txData.nonce)
			txData.nonce = await this.web3.eth.getTransactionCount(this.getWalletAddress())
		if (!txData.from) 
			txData.from = this.getWalletAddress()
		if (!txData.gasLimit)
			txData.gasLimit = await this.web3.eth.estimateGas(txData)
	}

	async getReputation(address: string = this.getWalletAddress()) {
		return await this.reputationContract.getReputation(address)
	}

	getWalletAddress() {
		if (this.getWallet())
			return this.getWallet()!.address
		else
			throw new WalletNotAddedError()
	}

	getWalletPrivateKey() {
		if (this.getWallet())
			return this.getWallet()!.privateKey
		else
			throw new WalletNotAddedError()
	}

	getWallet() {
		return this.web3.eth.accounts.wallet.at(0)
	}

	async getEpAddress() {
		if (this.epAddress === undefined)
			this.epAddress = await this.requestManager.send({
				method: 'graphite_getEpAddress',
				params: [],
			});

		(this.epAddress)
		return this.epAddress
	}

	private readonly web3: Web3
	private readonly feeContract: FeeContract
	private readonly kycContract: KYCContract;
	private readonly filterContract: FilterContract
	private readonly reputationContract: ReputationContract

	private epAddress: string | undefined
}

// Module Augmentation
declare module 'web3' {
	interface Web3Context {
		graphite: GraphitePlugin;
	}
}

export {
	GraphitePlugin,
	GraphiteTransaction,
	GRAPHITE_TRANSACTION_TYPE
}