import Web3, { Contract, HexString } from 'web3'
import { feeAbi } from '../abi';
import { CONTRACT_ADDRESS } from '../consts';

export class FeeContract {
    public constructor(web3: Web3) {
        this.contract = new web3.eth.Contract(feeAbi, CONTRACT_ADDRESS.FEE)
    }

    async getFeeAmount() {
        return await this.contract.methods.initialFee().call() as bigint
    }

    async activateAccount() {
        const fee = await this.getFeeAmount()
        return this.prepareTx(this.contract.methods.pay().encodeABI(), fee)
    }

    async getActivationStatus(address: string) {
        return await this.contract.methods.paidFee(address).call()
    }

    prepareTx(data: HexString, amount: bigint) {
		return {
			to: CONTRACT_ADDRESS.FEE,
            data: data,
			value: amount,
		}
	}

    contract: Contract<typeof feeAbi>
}