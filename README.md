# Zippie Vault Web3 Provider

[Web3](https://github.com/ethereum/web3.js/) Provider for [Zippie Vault](https://github.com/zippiehq/vault) allowing for easy onboarding and access to Web3 DApps

Requests are signed locally using Vault Derived Keys and sent to query.zippie.org server for submission to the Ethereum Network

## Dependencies
 - [Web3.js](https://github.com/ethereum/web3.js/)
 - [Zippie Vault API](https://github.com/zippiehq/vault-api)

## Building
```bash
npm install
```

## Example
```javascript
const vault = require('vault-api')
const vaultSecp256k1 = require('vault-api/src/secp256k1.js')
const zippieprovider = require('vault-web3-provider')
const Web3 = require('web3')

// Initialise the Vault
vault.init().then((result) => {
  console.log('Initialised Vault: ' + result)

  // Set up the provider on the Kovan Test Network
  var provider = zippieprovider.init(vault, vaultSecp256k1, { network: 'kovan' })

  // Add an Account using the Zippie Key Path eg. 'm/0'
  zippieprovider.addAccount('m/0').then((address) => {
    console.log(address)

    // Create a new Web3 Instance
    var web3 = new Web3(provider)
    web3.eth.getAccounts().then((accounts) => {
      console.log('accounts: ' + accounts)
 
      // Send an Ethereum Transaction
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
  console.log('encountered error: ' + error)
})
```

## Contributing

## License
