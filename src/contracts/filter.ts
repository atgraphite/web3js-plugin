import Web3, { Contract, HexString } from 'web3'
import { CONTRACT_ADDRESS } from '../consts';
import { filterAbi } from '../abi';

export class FilterContract {
    public constructor(web3: Web3) {
        this.contract = new web3.eth.Contract(filterAbi, CONTRACT_ADDRESS.FILTER)
    }

    async getFilterLevel() {
        return await this.contract.methods.viewFilterLevel().call()
    }

    async setFilterLevel(newLevel: number) {
        return this.prepareTx(this.contract.methods.setFilterLevel(newLevel).encodeABI(), 0n)
    }

    prepareTx(data: HexString, amount: bigint) {
		return {
			to: CONTRACT_ADDRESS.FILTER,
			data: data,
			value: amount,
		}
	}

    contract: Contract<typeof filterAbi>
}