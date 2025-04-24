import { keccak256 } from 'ethereum-cryptography/keccak';
import { validateNoLeadingZeroes } from 'web3-validator';
// eslint-disable-next-line import/no-extraneous-dependencies
import { RLP } from '@ethereumjs/rlp';
import { bytesToHex, hexToBytes, uint8ArrayConcat, uint8ArrayEquals } from 'web3-utils';
import {
	BaseTransaction,
	txUtils,
	Common,
	bigIntToHex,
	toUint8Array,
	ecrecover,
	uint8ArrayToBigInt,
	bigIntToUnpaddedUint8Array,
	AccessList,
	AccessListUint8Array,
	AccessListEIP2930TxData,
	JsonTx,
	TxOptions,
	TxValuesArray,
} from 'web3-eth-accounts';
import { HexString } from 'web3';

import { Address } from "./address"
import { GRAPHITE_TRANSACTION_TYPE } from './consts';

const { getAccessListData, getAccessListJSON, getDataFeeEIP2930, verifyAccessList } = txUtils;

const MAX_INTEGER = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
const TRANSACTION_TYPE_UINT8ARRAY = hexToBytes(GRAPHITE_TRANSACTION_TYPE.toString(16).padStart(2, '0'));

type GraphiteTransactionValuesArray = [
	Uint8Array,
	Uint8Array,
	Uint8Array,
	Uint8Array,
	Uint8Array,
	Uint8Array,
	Uint8Array,
	AccessListUint8Array,
	Uint8Array,
	Uint8Array?,
	Uint8Array?,
	Uint8Array?,
];

type GraphiteTransactionTxData = AccessListEIP2930TxData & {
	epAddress: Address | Uint8Array | HexString;
};

/**
 * Typed transaction with a new gas fee market mechanism
 *
 * - TransactionType: 100
 */
// eslint-disable-next-line no-use-before-define
export class GraphiteTransaction extends BaseTransaction<GraphiteTransaction> {
	public readonly gasPrice: bigint;
  	public readonly chainId: bigint;
	public readonly accessList: AccessListUint8Array;
	public readonly AccessListJSON: AccessList;
	public readonly epAddress: Address;

	public readonly common: Common;

	public static fromTxData(txData: GraphiteTransactionTxData, opts: TxOptions = {}) {
		return new GraphiteTransaction(txData, opts);
	}

	public static fromSerializedTx(serialized: Uint8Array, opts: TxOptions = {}) {
		if (!uint8ArrayEquals(serialized.subarray(0, 1), TRANSACTION_TYPE_UINT8ARRAY)) {
			throw new Error(
				`Invalid serialized tx input: not an Graphite Transaction (wrong tx type, expected: ${GRAPHITE_TRANSACTION_TYPE}, received: ${bytesToHex(
					serialized.subarray(0, 1),
				)}`,
			);
		}
		const values = RLP.decode(serialized.subarray(1));

		if (!Array.isArray(values)) {
			throw new Error('Invalid serialized tx input: must be array');
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
		return GraphiteTransaction.fromValuesArray(values as any, opts);
	}

	public static fromValuesArray(values: GraphiteTransactionValuesArray, opts: TxOptions = {}) {
		if (values.length !== 9 && values.length !== 12) {
			throw new Error(
				'Invalid CUSTOM TEST transaction. Only expecting 10 values (for unsigned tx) or 13 values (for signed tx).',
			);
		}

		const [chainId, nonce, gasPrice, gasLimit, to, value, data, accessList, epAddress, v, r, s] = values;

		this._validateNotArray({ chainId, v });
		validateNoLeadingZeroes({ nonce, gasPrice, gasLimit, value, v, r, s });

		const emptyAccessList: AccessList = [];

		return new GraphiteTransaction(
			{
				chainId: uint8ArrayToBigInt(chainId),
				nonce,
        		gasPrice,
				gasLimit,
				to,
				value,
				data,
				accessList: accessList ?? emptyAccessList,
				epAddress,
				v: v !== undefined ? uint8ArrayToBigInt(v) : undefined, // EIP2930 supports v's with value 0 (empty Uint8Array)
				r,
				s,
			},
			opts,
		);
	}

	public constructor(txData: GraphiteTransactionTxData, opts: TxOptions = {}) {
		super({ ...txData, type: GRAPHITE_TRANSACTION_TYPE }, opts);
		const { chainId, accessList, gasPrice, epAddress: epAddress } = txData;

		const epAddressB = toUint8Array(epAddress === '' ? '0x' : epAddress);

		this.common = this._getCommon(opts.common, chainId);
		this.chainId = this.common.chainId();
		this.epAddress = new Address(epAddressB)

		// if (!this.common.isActivatedEIP(1559)) {
			// throw new Error('EIP-1559 not enabled on Common');
		// }
		this.activeCapabilities = this.activeCapabilities.concat([2718, 2930]);

		// Populate the access list fields
		const accessListData = getAccessListData(accessList ?? []);
		this.accessList = accessListData.accessList;
		this.AccessListJSON = accessListData.AccessListJSON;
		// Verify the access list format.
		verifyAccessList(this.accessList);

    this.gasPrice = uint8ArrayToBigInt(toUint8Array(gasPrice === '' ? '0x' : gasPrice));

    this._validateCannotExceedMaxInteger({
      gasPrice: this.gasPrice,
    })

		BaseTransaction._validateNotArray(txData);
		
		if (this.gasPrice * this.gasLimit > MAX_INTEGER) {
			const msg = this._errorMsg('gasLimit * gasPrice cannot exceed MAX_INTEGER');
			throw new Error(msg);
		}

		this._validateYParity();
		this._validateHighS();

		const freeze = opts?.freeze ?? true;
		if (freeze) {
			Object.freeze(this);
		}
	}

	public getDataFee(): bigint {
		if (this.cache.dataFee && this.cache.dataFee.hardfork === this.common.hardfork()) {
			return this.cache.dataFee.value;
		}

		let cost = super.getDataFee();
		cost += BigInt(getDataFeeEIP2930(this.accessList, this.common));

		if (Object.isFrozen(this)) {
			this.cache.dataFee = {
				value: cost,
				hardfork: this.common.hardfork(),
			};
		}

		return cost;
	}

	public getUpfrontCost(): bigint {
		return this.gasLimit * this.gasPrice + this.value;
	}

	public raw(): TxValuesArray {
		return [
			bigIntToUnpaddedUint8Array(this.chainId),
			bigIntToUnpaddedUint8Array(this.nonce),
			bigIntToUnpaddedUint8Array(this.gasPrice),
			bigIntToUnpaddedUint8Array(this.gasLimit),
			this.to !== undefined ? this.to.buf : Uint8Array.from([]),
			bigIntToUnpaddedUint8Array(this.value),
			this.data,
			this.accessList,
			this.epAddress !== undefined ? this.epAddress.buf : Uint8Array.from([]),
			this.v !== undefined ? bigIntToUnpaddedUint8Array(this.v) : Uint8Array.from([]),
			this.r !== undefined ? bigIntToUnpaddedUint8Array(this.r) : Uint8Array.from([]),
			this.s !== undefined ? bigIntToUnpaddedUint8Array(this.s) : Uint8Array.from([]),
		] as TxValuesArray;
	}

	public serialize(): Uint8Array {
		const base = this.raw();
		return uint8ArrayConcat(TRANSACTION_TYPE_UINT8ARRAY, RLP.encode(base));
	}

	public getMessageToSign(hashMessage = true): Uint8Array {
		const base = this.raw().slice(0, 9);
		const message = uint8ArrayConcat(TRANSACTION_TYPE_UINT8ARRAY, RLP.encode(base));
		if (hashMessage) {
			return keccak256(message);
		}
		return message;
	}

	public hash(): Uint8Array {
		if (!this.isSigned()) {
			const msg = this._errorMsg('Cannot call hash method if transaction is not signed');
			throw new Error(msg);
		}

		if (Object.isFrozen(this)) {
			if (!this.cache.hash) {
				this.cache.hash = keccak256(this.serialize());
			}
			return this.cache.hash;
		}
		return keccak256(this.serialize());
	}

	public getMessageToVerifySignature(): Uint8Array {
		return this.getMessageToSign();
	}

	public getSenderPublicKey(): Uint8Array {
		if (!this.isSigned()) {
			const msg = this._errorMsg('Cannot call this method if transaction is not signed');
			throw new Error(msg);
		}

		const msgHash = this.getMessageToVerifySignature();
		const { v, r, s } = this;

		this._validateHighS();

		try {
			return ecrecover(
				msgHash,
				v! + BigInt(27), // Recover the 27 which was stripped from ecsign
				bigIntToUnpaddedUint8Array(r!),
				bigIntToUnpaddedUint8Array(s!),
			);
		} catch (e) {
			const msg = this._errorMsg('Invalid Signature');
			throw new Error(msg);
		}
	}

	public _processSignature(v: bigint, r: Uint8Array, s: Uint8Array) {
		const opts = { ...this.txOptions, common: this.common };

		return GraphiteTransaction.fromTxData(
			{
				chainId: this.chainId,
				nonce: this.nonce,
				gasPrice: this.gasPrice,
				gasLimit: this.gasLimit,
				to: this.to,
				value: this.value,
				data: this.data,
				accessList: this.accessList,
				epAddress: this.epAddress,
				v: v - BigInt(27), // This looks extremely hacky: /util actually adds 27 to the value, the recovery bit is either 0 or 1.
				r: uint8ArrayToBigInt(r),
				s: uint8ArrayToBigInt(s),
			},
			opts,
		);
	}

	public toJSON(): JsonTx {
		const accessListJSON = getAccessListJSON(this.accessList);

		return {
			chainId: bigIntToHex(this.chainId),
			nonce: bigIntToHex(this.nonce),
			gasPrice: bigIntToHex(this.gasPrice),
			gasLimit: bigIntToHex(this.gasLimit),
			to: this.to !== undefined ? this.to.toString() : undefined,
			value: bigIntToHex(this.value),
			data: bytesToHex(this.data),
			accessList: accessListJSON,
			v: this.v !== undefined ? bigIntToHex(this.v) : undefined,
			r: this.r !== undefined ? bigIntToHex(this.r) : undefined,
			s: this.s !== undefined ? bigIntToHex(this.s) : undefined,
		};
	}

	public errorStr() {
		return this._getSharedErrorPostfix();;
	}

	protected _errorMsg(msg: string) {
		return `${msg} (${this.errorStr()})`;
	}
}
