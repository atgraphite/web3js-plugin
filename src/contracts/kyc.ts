import Web3, { Contract, HexString } from 'web3'
import { CONTRACT_ADDRESS } from '../consts';
import { kycAbi } from '../abi';
import CryptoJS from 'crypto-js'

export class KYCContract {
    public constructor(web3: Web3) {
        this.contract = new web3.eth.Contract(kycAbi, CONTRACT_ADDRESS.KYC)
    }

    async createKYCRequest(uuid: string, newLevel: number) {
        const hash = CryptoJS.SHA256(uuid);
        const data = Buffer.from(hash.toString(CryptoJS.enc.Hex), 'hex');

        const price = await this.getKYCFee(newLevel)

        return this.prepareTx(this.contract.methods.createKYCRequest(newLevel, data).encodeABI(), price)
    }
    
    async getKycLevel(address: string) {
        return await this.contract.methods.level(address).call() as bigint
    }

    async viewMyLastKycRequest() {
        return await this.contract.methods.viewMyLastRequest().call()
    }

    async repairLostKycRequest() {
        return this.prepareTx(this.contract.methods.repairLostRequest().encodeABI(), 0n)
    }

    async getKYCFee(level: number) {
        return await this.contract.methods.levelPrices(level).call() as bigint
    }

    async cancelUsersRequest() {
        return this.prepareTx(this.contract.methods.cancelUsersRequest().encodeABI(), 0n)
    }

    prepareTx(data: HexString, amount: bigint) {
		return {
			to: CONTRACT_ADDRESS.KYC,
			data: data,
			value: amount,
		}
	}

    private contract: Contract<typeof kycAbi>
}