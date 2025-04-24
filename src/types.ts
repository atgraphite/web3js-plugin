import { AccessListItem } from "web3-eth-accounts"

export interface TxData {
    gasLimit?: string | number | bigint
    gasPrice?: string | number | bigint
    chainId?: string | number | bigint
    nonce?: string | number | bigint
    from?: string
    to: string
    data?: string
    value?: string | number | bigint
    type?: string | number
    accessList?: AccessListItem[]
}