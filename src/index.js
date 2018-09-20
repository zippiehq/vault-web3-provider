var ethutil = require('ethereumjs-util')
var Transaction = require('ethereumjs-tx')
var vault = null
var vaultSecp256k1 = null
var accounts = []

const ProviderEngine = require('web3-provider-engine/index.js')
const DefaultFixture = require('web3-provider-engine/subproviders/default-fixture.js')
const NonceTrackerSubprovider = require('web3-provider-engine/subproviders/nonce-tracker.js')
const CacheSubprovider = require('web3-provider-engine/subproviders/cache.js')
const FilterSubprovider = require('web3-provider-engine/subproviders/filters.js')
const SubscriptionSubprovider = require('web3-provider-engine/subproviders/subscriptions')
const InflightCacheSubprovider = require('web3-provider-engine/subproviders/inflight-cache')
const HookedWalletSubprovider = require('web3-provider-engine/subproviders/hooked-wallet.js')
const SanitizingSubprovider = require('web3-provider-engine/subproviders/sanitizer.js')
const WebSocketSubprovider = require('web3-provider-engine/subproviders/websocket.js')
const EthBlockTracker = require('eth-block-tracker')

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
  // const cacheSubprovider = new CacheSubprovider()
  // engine.addProvider(cacheSubprovider)

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
      vaultSecp256k1.keyInfo(vault, derive).then(function(result) {
        resolve(ethutil.bufferToHex(ethutil.pubToAddress("0x" + result.pubkey.slice(2))))
      })
    })
}

exports.addAccount = function(derive) {
   return new Promise(
     function (resolve, reject) { 
       ethAddress(derive).then((result) => {
         accounts.push({'derive': derive, 'address' : result})
         resolve(result)
       })
     })
}

exports.init = function(vaultModule, vaultSecp256k1Module, options = { network: 'foundation' }) {
  vault = vaultModule
  vaultSecp256k1 = vaultSecp256k1Module

  var zero = ZippieClientProvider({
      rpcUrl: 'wss://' + options.network + '.query.zippie.org/',
      getAccounts: function(cb) {
        let tempAccountsList = []
        for (var i = 0; i < accounts.length; i++) {
          tempAccountsList.push(accounts[i].address)
        }
        cb(null, tempAccountsList)
        return
      },
      signTransaction: function(txParams, cb) {
        let from = txParams.from
        let derive = null
        for (var i = 0; i < accounts.length; i++) {
          if (accounts[i].address === from) {
            derive = accounts[i].derive
            break
          }
        }
        if (derive === null) {
          cb('no such account')
          return
        }
        let tx = new Transaction(txParams)
        vaultSecp256k1.sign(vault, derive, tx.hash(false).toString('hex')).then(function(result) { 
          var sig = toEthSig(result)
          sig.r = Buffer.from(sig.r, 'hex')
          sig.s = Buffer.from(sig.s, 'hex')
          if (tx._chainId > 0) {
            sig.v += tx._chainId * 2 + 8
          }
          Object.assign(tx, sig)
          cb(null, '0x' + tx.serialize().toString('hex'))
          return
        })
        return
      }  
  })
  return zero
}
