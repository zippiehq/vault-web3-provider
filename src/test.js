import { div, span, br } from 'callbag-html'
import Vault from '@zippie/vault-api'
import * as zippieprovider from './index.js'
import Web3 from 'web3'

function testLog(message) {
  console.log(message)
  document.body.appendChild(
    div([span(message),
    br()
    ])
  )
}

const vault = new Vault()

testLog('--- Zippie Vault Web3 Tests ---')
testLog('check web console for detailed information')

testLog('--- Initialise the Vault ---')
vault.setup().then(async (result) => {
  await vault.signin(null, true)

  testLog('--- Initialise Web3 Provider ---')
  const provider = zippieprovider.init(vault, { network: 'foundation' })

  testLog('--- Add an Account ---')
  const account = await zippieprovider.addAccount('m/0')
  testLog('address: ' + account)
  
  const web3 = new Web3(provider)
  const accounts = await web3.eth.getAccounts()
  testLog('accounts:' + JSON.stringify(accounts))

  testLog('--- Get Ethereum Chain Info ---')
  const bnl = await web3.eth.getBlockNumber()
  testLog('block number: ' + bnl)

  const blockinfo = await web3.eth.getBlock(bnl)
  testLog('block info: ' + JSON.stringify(blockinfo))

  const balance = await web3.eth.getBalance(accounts[0])
  testLog('balance: ' + balance)

  const signature = await web3.eth.sign("datatosign", accounts[0])
  testLog('Sign: ' + signature)

  const signature2 = await web3.eth.personal.sign("datatosign", accounts[0], '')
  testLog('Personal Sign:' + signature2)
  
}, (error) => {
  testLog('encountered error: ')
  testLog(error)
})
