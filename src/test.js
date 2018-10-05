var vault = require('@zippie/vault-api')
var vaultSecp256k1 = require('@zippie/vault-api/src/secp256k1.js')
var zippieprovider = require('./index.js')
var Web3 = require('web3');

var opts = {vaultURL: 'https://vault.dev.zippie.org'}

vault.init(opts).then((result) => {
  console.log('got inited:')
  console.log(result)
  var provider = zippieprovider.init(vault, vaultSecp256k1, { network: 'kovan' })
  zippieprovider.addAccount('m/0').then((addy) => {
    console.log(addy)
    var web3 = new Web3(provider)
    web3.eth.getAccounts().then((accounts) => {
      console.log('accounts:')
      console.log(accounts)

      web3.eth.getBlockNumber().then((bnl) => {
	 console.log('block number: ' + bnl)
         web3.eth.getBlock(bnl).then((blockinfo) => {
	  console.log('block info: ')
          console.log(blockinfo)
         })
      })
      web3.eth.getBalance(accounts[0]).then((balance) => console.log('balance: ' + balance))
    })
  })
  
}, (error) => {
  console.log('encountered error: ')
  if (error.error === 'launch') {
    vault.launch(error.launch)
  }
  console.log(error)
})
