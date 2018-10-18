import { div, span, br } from 'callbag-html'
var vault = require('@zippie/vault-api')
var vaultSecp256k1 = require('@zippie/vault-api/src/secp256k1.js')
var zippieprovider = require('./index.js')
var Web3 = require('web3');

var opts = {vaultURL: 'https://vault.dev.zippie.org'}

function testLog(message)
{
  console.log(message)
  document.body.appendChild(
    div([span(message),
    br()
    ])
  )
}

testLog('--- Zippie Vault Web3 Tests ---')
testLog('check web console for detailed information')

testLog('--- Initialise the Vault ---')
vault.init(opts).then((result) => {
  testLog('got inited:')
  testLog(result)

  testLog('--- Initialise Web3 Provider ---')
  var provider = zippieprovider.init(vault, vaultSecp256k1, { network: 'kovan' })

  testLog('--- Add an Account ---')
  zippieprovider.addAccount('m/0').then((addy) => {
    testLog('address: ' + addy)
    var web3 = new Web3(provider)
    web3.eth.getAccounts().then((accounts) => {
          testLog('accounts:' + JSON.stringify(accounts))

          testLog('--- Get Ethereum Chain Info ---')
          web3.eth.getBlockNumber().then((bnl) => {
          testLog('block number: ' + bnl)
          web3.eth.getBlock(bnl).then((blockinfo) => {
          testLog('block info: ' + JSON.stringify(blockinfo))
         })
      })
      web3.eth.getBalance(accounts[0]).then((balance) => testLog('balance: ' + balance))
    })
  })
  
}, (error) => {
  testLog('encountered error: ')
  if (error.error === 'launch') {
    vault.launch(error.launch)
  }
  testLog(error)
})
