var vault = null
var accounts = []

import * as ethutil from 'ethereumjs-util'
import * as Transaction from 'ethereumjs-tx'
import * as ProviderEngine from 'web3-provider-engine'
import * as DefaultFixture from 'web3-provider-engine/subproviders/default-fixture'
import * as NonceTrackerSubprovider from 'web3-provider-engine/subproviders/nonce-tracker'
import * as CacheSubprovider from 'web3-provider-engine/subproviders/cache'
import * as FilterSubprovider from 'web3-provider-engine/subproviders/filters'
import * as InflightCacheSubprovider from 'web3-provider-engine/subproviders/inflight-cache'
import * as HookedWalletSubprovider from 'web3-provider-engine/subproviders/hooked-wallet'
import * as SanitizingSubprovider from 'web3-provider-engine/subproviders/sanitizer'
import * as WebSocketSubprovider from 'web3-provider-engine/subproviders/websocket'
import * as EthBlockTracker from '@zippie/eth-block-tracker'

function ZippieClientProvider(opts = {}){
  let dataSubprovider = new WebSocketSubprovider({ rpcUrl: opts.rpcUrl, debug: true })
  if (!('engineParams' in opts)) {
    opts.engineParams = {}
  }
    
  const directProvider = {}
  opts.engineParams.blockTracker = new EthBlockTracker({ provider: directProvider, pollingInterval: 8000})
  const engine = new ProviderEngine(opts.engineParams)
  directProvider.sendAsync = engine._handleAsync.bind(engine)
  directProvider.on = engine.on.bind(engine)

  // static
  const staticSubprovider = new DefaultFixture(opts.static)
  engine.addProvider(staticSubprovider)

  // nonce tracker
  engine.addProvider(new NonceTrackerSubprovider())

  // sanitization
  const sanitizer = new SanitizingSubprovider()
  engine.addProvider(sanitizer)

  // cache layer
  const cacheSubprovider = new CacheSubprovider()
  engine.addProvider(cacheSubprovider)

  // filters + subscriptions
  // for websockets, only polyfill filters
  const filterSubprovider = new FilterSubprovider()
  engine.addProvider(filterSubprovider)

  // inflight cache
  const inflightCache = new InflightCacheSubprovider()
  engine.addProvider(inflightCache)

  // id mgmt
  const idmgmtSubprovider = new HookedWalletSubprovider({
    // accounts
    getAccounts: opts.getAccounts,
    // transactions
    processTransaction: opts.processTransaction,
    approveTransaction: opts.approveTransaction,
    signTransaction: opts.signTransaction,
    publishTransaction: opts.publishTransaction,
    // messages
    // old eth_sign
    processMessage: opts.processMessage,
    approveMessage: opts.approveMessage,
    signMessage: opts.signMessage,
    // new personal_sign
    processPersonalMessage: opts.processPersonalMessage,
    processTypedMessage: opts.processTypedMessage,
    approvePersonalMessage: opts.approvePersonalMessage,
    approveTypedMessage: opts.approveTypedMessage,
    signPersonalMessage: opts.signPersonalMessage,
    signTypedMessage: opts.signTypedMessage,
    personalRecoverSigner: opts.personalRecoverSigner,
  })
  engine.addProvider(idmgmtSubprovider)

  // for websockets, forward subscription events through provider
  dataSubprovider.on('data', (err, notification) => {
    engine.emit('data', err, notification)
  })

  // also forward websocket close event through provider
  dataSubprovider._socket.addEventListener('close', evt => {
    engine.emit('wsClosed', evt)
  })

  engine.addProvider(dataSubprovider)

  // start polling
  if (!opts.stopped) {
    engine.start()
  }

  return engine

}


function normalize(hex) {
  if (hex == null) {
    return null
  }
  if (hex.startsWith("0x")) {
    hex = hex.substring(2)
  }
  if (hex.length % 2 != 0) {
    hex = "0" + hex
  }
  return hex
}

function buffer(hex) {
  if (hex == null) {
    return new Buffer('', 'hex')
  } else {
    return new Buffer(normalize(hex), 'hex')
  }
}

/**
 * Converts a secp256k1 signature in hex form into a Ethereum form v,r,s
 * @param {{signature: String, recovery: Number} sig the signature to convert
 * @return {{v: Number, r: String, s: String}} the Ethereum form signature
 */
function toEthSig(sig) {
    var ret = {}
    ret.r = sig.signature.slice(0, 64)
    ret.s = sig.signature.slice(64, 128)
    ret.v = sig.recovery + 27
    return ret
}

/**
 * Converts a Ethereum style signature into secp256k1 form
 * @param {Number} v part of Ethereum style signature, either 27 or 28
 * @param {String} r part of Ethereum style signature, in hex form
 * @param {String} s part of Ethereum style signature, in hex form
 * @return {{String, Number}} secp256k1 signature
 */

function fromEcSig(v,r,s) {
    r = Buffer.from(r, 'hex');
    s = Buffer.from(s, 'hex');
    var signature = Buffer.concat([r, s]);
    var recovery = v - 27
    if (recovery !== 0 && recovery !== 1) {
       throw new Error('Invalid signature v value')
    }
    return { signature: signature.toString('hex'), recovery: recovery }
}

function ethAddress(derive) {
  return new Promise( 
    function (resolve, reject) {
      vault.secp256k1.keyInfo(derive).then(function(result) {
        resolve(ethutil.bufferToHex(ethutil.pubToAddress("0x" + result.pubkey.slice(2))))
      }).catch(reject)
    })
}

export function addAccount(derive) {
   return new Promise(
     function (resolve, reject) { 
       ethAddress(derive).then((result) => {
         accounts.push({'derive': derive, 'address' : result})
         resolve(result)
       }).catch(reject)
     })
}

/**
 * 
 * @param {function} callback 
 */
function getAccounts(callback) {
  let tempAccountsList = []
  for (var i = 0; i < accounts.length; i++) {
    tempAccountsList.push(accounts[i].address)
  }
  callback(null, tempAccountsList)
}

/**
 * Find the vault derive key for a specified address
 * @param {String} address address to find derive for
 * @return {String} derive path
 */
function findDerive(address) {
  let derive = null
  for (var i = 0; i < accounts.length; i++) {
    if (accounts[i].address === address) {
      derive = accounts[i].derive
      break
    }
  }
  return derive
}

/**
 * 
 * @param {*} txParams 
 * @param {function} callback 
 */
function signTransaction(txParams, callback) {
  let from = txParams.from
  let derive = findDerive(from)

  if (derive === null) {
    callback('no such account')
    return
  }

  let tx = new Transaction(txParams)
  vault.secp256k1.sign(derive, tx.hash(false).toString('hex')).then(function(result) { 
    var sig = toEthSig(result)
    sig.r = Buffer.from(sig.r, 'hex')
    sig.s = Buffer.from(sig.s, 'hex')
    if (tx._chainId > 0) {
      sig.v += tx._chainId * 2 + 8
    }
    Object.assign(tx, sig)
    callback(null, '0x' + tx.serialize().toString('hex'))
    return
  })
  return
}

/**
 * 
 * @param {*} msgParams 
 * @param {function} callback 
 */
function signMessage(msgParams, callback) {
  let account = msgParams.from
  let derive = findDerive(account)
  let message = ethutil.keccak256(msgParams.data)

  vault.secp256k1.sign(derive, message).then((result) => {
    var sig = result.signature
    callback(null, sig)
  })
}

/**
 * Initialise Vault Web3 Provider
 * @param {Object} vaultModule Initialised instance of Zippie Vault
 * @param {Object} vaultSecp256k1Module Initialised instance of Zippie Vault Secp256k1
 * @param {rpcUrl: String, network: String, environment: String} options 
 * @return {Object} Zero Client
 */
export function init(vaultModule, options = { rpcUrl: null, network: 'foundation', environment: null }) {
  vault = vaultModule

  if(options.rpcUrl === null || options.rpcUrl === undefined) {
    if (environment) {
      options.rpcUrl = `wss://${options.network}-eth.${environment}.zippie.org/`
    } else {
      options.rpcUrl = `wss://${options.network}-eth.zippie.org/`
    }
  }

  console.info("WEB3 RPC URL: " + options.rpcUrl)

  var zero = ZippieClientProvider({
      rpcUrl: options.rpcUrl,
      getAccounts: getAccounts,
      signTransaction: signTransaction,
      signMessage: signMessage,
      signPersonalMessage: signMessage
  })
  return zero
}

export default {init, addAccount}