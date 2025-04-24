export class AddressNotActivatedError extends Error {
    name = "AddressNotActivatedError";
    message ="Address is not activated, activate is using web3.graphite.activateAccount()"
}

export class WalletNotAddedError extends Error {
    name = "WalletNotAddedError";
    message ="Need to add wallet using web3.eth.accounts.wallet.add('privateKey')"
}
