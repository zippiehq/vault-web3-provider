
var vault = require('vault-api')
var vaultSecp256k1 = require('vault-api/src/secp256k1.js')
var zipperprovider = require('./index.js')
var Web3 = require('web3');

opts = {}

if (location.hash.startsWith('#zipper-vault=')) {
   opts = { 'vaultURL' : location.hash.slice('#zipper-vault='.length) }
}
vault.init(opts).then((result) => {
  console.log('got inited:')
  console.log(result)
  var underlying = new Web3.providers.HttpProvider('https://contribution.zipperglobal.com/eth')
  underlying.sendAsync = underlying.send
  var provider = zipperprovider.init(vault, vaultSecp256k1, underlying)
  zipperprovider.addAccount('m/0').then((addy) => {
    console.log(addy)
    var web3 = new Web3(provider)
    web3.eth.getAccounts().then((accounts) => {
      console.log('accounts:')
      console.log(accounts)
      web3.eth.signTransaction({from: accounts[0],
        gasPrice: "20000000000",
        gas: "21000",
        to: '0x3535353535353535353535353535353535353535',
        value: "1",
        data: ""}).then(console.log)
    })
  })
  
}, (error) => {
  console.log('encountered error: ')
  if (error.error === 'launch') {
    vault.launch(error.launch)
  }
  console.log(error)
})
