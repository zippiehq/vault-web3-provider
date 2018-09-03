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

## Run Tests
```bash
npm run build-test
npm run test
```

## How to Use

### Imports
```javascript
import * as vault from 'vault-api'
import * as vaultSecp256k1 from 'vault-api/src/secp256k1.js'
import * as zippieprovider from 'vault-web3-provider'
import * as Web3 from 'web3'
```

### Initialise the Vault
this will redirect the user on boarding if required
```javascript
vault
  .init()
  .then((result) => {
    console.log('Initialised Vault: ' + result)
  },
  (error) => {
    console.log('Error initialising vault: ' + error)
  }
);
```

### Initialise Web3 Provider
on the ethereum network of your choice .eg kovan, ropsten, maimnet
```javascript
var ethereum = zippieprovider.init(vault, vaultSecp256k1, { network: 'kovan' })
```

### Add Accounts
Set up some accounts using a [vault key path](https://github.com/zippiehq/vault-api#key-paths)
```javascript
 zippieprovider
  .addAccount('m/0')
  .then((address) => {
    console.log(address)
  }
);
```

### Initialise Web3.js
and finally set up Web3.js
```javascript
if(window.web3 === undefined) {
  window.web3 = new Web3(ethereum)
}

web3.eth.getAccounts()
  .then((accounts) => {
    console.log('accounts: ' + accounts)
  }
);
```

## Contributing

## License
