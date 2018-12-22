import { div, span, br } from 'callbag-html'
import * as vault from '@zippie/vault-api'
import * as vaultSecp256k1 from '@zippie/vault-api/src/secp256k1.js'
import * as zippieprovider from './index.js'
import * as Web3 from 'web3'

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

      web3.eth.sign("datatosign", accounts[0]).then((data) => testLog('Sign: ' + JSON.stringify(data)))
    })
  })
  
}, (error) => {
  testLog('encountered error: ')
  testLog(error)
})
