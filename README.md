# A plugin for working with the Graphite transactions

## Installation

``` console
npm install @atgraphite/web3-plugin
# or
yarn add @atgraphite/web3-plugin
```

## Getting Started

To use this plugin simply import it, and add register it to your web3 instance.

```js
import { GraphitePlugin } from "@atgraphite/web3-plugin";

const NODE_URL = 'node url';
const web3 = new Web3(NODE_URL)
web3.eth.accounts.wallet.add(privateKey)
web3.registerPlugin(new GraphitePlugin(web3))
```

You can use our nodes instead of 'node url'.

They are available here: https://docs.atgraphite.com/overview/publish-your-docs

And you're ready to go! 

There are 2 types of nodes, normal and anonymous. Read more about them [here](https://docs.atgraphite.com/)

## First time users

After registering the plugin, you need to activate you account:

```js
await web3.graphite.activateAccount()
```

which has a fee, more about that [here](https://docs.atgraphite.com/build-on-graphite/system-contracts/account-activation)


To check the fee amount, use:
```js
await web3.graphite.getActivationFeeAmount()
```

## Interface

The following functions are accessible via web3.graphite.(*)
```js
async getActivationFeeAmount()
async activateAccount()
async isActivated(address: string = this.getWalletAddress())
async getFilterLevel()
async setFilterLevel(newLevel: number)
async createKYCRequest(uuid: string, newLevel: number)
async getKycLevel(address: string = this.getWalletAddress())
async getLastKycRequest()
async repairLostKycRequest()
async cancelKycRequest()
async getKYCFee(level: number)
async sendTransaction(txData: TxData)
async patchFields(txData: TxData)
async getReputation(address: string = this.getWalletAddress())
getWalletAddress()
getWalletPrivateKey()
getWallet()
async getEpAddress()
```

## Dev installation

Download the `@atgraphite/web3-plugin` repository. Type the following commands into the command prompt:

```console
$ cd @atgraphite/web3-plugin
$ npm i
$ npm run build
$ npm link 
```

Go to a chosen project and add the @atgraphite/web3-plugin as a local dependency:

```console
$ cd another-project
$ npm link '@atgraphite/web3-plugin'
```
