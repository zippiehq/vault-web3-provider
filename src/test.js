
var vault = require('vault-api')
var vaultSecp256k1 = require('vault-api/src/secp256k1.js')
var zippieprovider = require('./index.js')
var Web3 = require('web3');

vault.init().then((result) => {
  console.log('got inited:')
  console.log(result)
  var provider = zippieprovider.init(vault, vaultSecp256k1, { network: 'kovan' })
  zippieprovider.addAccount('m/0').then((addy) => {
    console.log(addy)
    var web3 = new Web3(provider)
    web3.eth.getAccounts().then((accounts) => {
      console.log('accounts:')
      console.log(accounts)
      web3.eth.sendTransaction({from: accounts[0],
        gasPrice: "2000000000",
        gas: "21000",
        to: '0x21ef24ffb2116f44e7918a80cea4f52a2ea72b17',
        value: "1",
        data: ""}).once('transactionHash', function(hash){
          console.log('transaction ' + hash)
        })
        .once('receipt', function(receipt){
          console.log('receipt ' + receipt)
        })
        .on('confirmation', function(confirmationNumber, receipt) {
          console.log('confirmation ' + confirmationNumber + " " + receipt)
        })
        .on('error', console.error)
    })
  })
  
}, (error) => {
  console.log('encountered error: ')
  if (error.error === 'launch') {
    vault.launch(error.launch)
  }
  console.log(error)
})
