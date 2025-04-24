import Web3, { Contract } from 'web3'
import { CONTRACT_ADDRESS } from '../consts';
import { reputationAbi } from '../abi';


export class ReputationContract {
    public constructor(web3: Web3) {
        this.contract = new web3.eth.Contract(reputationAbi, CONTRACT_ADDRESS.REPUTATION)
    }

    async getReputation(addr: string) {
        return await this.contract.methods.getReputation(addr).call()
    }

    contract: Contract<typeof reputationAbi>
}