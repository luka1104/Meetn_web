// import { NextApiRequest, NextApiResponse } from 'next';
import { createAlchemyWeb3 } from '@alch/alchemy-web3';

const connections = {};

const API_KEY = process.env.API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const web3 = createAlchemyWeb3(
  `https://polygon-mumbai.g.alchemy.com/v2/${API_KEY}`
);
const contract = require('../../src/contracts/BeanToken.json');
const tokenAddress = process.env.TOKEN_ADDRESS;
const Contract = new web3.eth.Contract(contract.abi, tokenAddress, { from: PUBLIC_KEY });

const handler = (req, res) => {
  const now = Date.now();
  
  // Loops through the Values which are times
  let found = '';
  for (const [a, t] of Object.entries(connections)) {
    console.log(`address: ${a} time: ${t}`);
    if (t > now - 20000) { // if connection time is within last 20 seconds
      console.log('collect');
      // We found the connection
      found = a;
      delete connections[a]; 
      break;
    }
  }

  const TransferToken = async () => {
    const data = await Contract.methods.multiTransfer([found, req.body], [100000000, 100000000]).encodeABI()
    const tx = {
      "gas": 500000,
      "to": tokenAddress,
      "value": "0x00",
      "data": data,
      "from": PUBLIC_KEY
    };
    web3.eth.accounts.signTransaction(tx, PRIVATE_KEY, (err, signedTx) => {
      if (err) {
        return err
      } else {
        console.log(signedTx)
        web3.eth.sendSignedTransaction(signedTx.rawTransaction, (err, res) => {
          if (err) {
            console.log(err)
          } else {
            console.log(res)
          }
        })
      }
    });
  }
  if (found) {
    TransferToken()
  } else {
    connections[req.body] = now;
  }
  console.log(`connect ${Object.entries(connections)}`);
  return res
};
export default handler;
