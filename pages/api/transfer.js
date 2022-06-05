import { createAlchemyWeb3 } from '@alch/alchemy-web3';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDocs, setDoc } from "firebase/firestore/lite";

const firebaseConfig = {
  apiKey: "AIzaSyDPnRC0VToZsRcoXuDG7xq9alr1fXhi_g8",
  authDomain: "meetn-9cc66.firebaseapp.com",
  projectId: "meetn-9cc66",
  storageBucket: "meetn-9cc66.appspot.com",
  messagingSenderId: "774863347933",
  appId: "1:774863347933:web:3808cdbcf47ab0a785bb34"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// const connections = {"0x50B80aa3877fC852f3194a0331177FDDcF0891bf": Date.now()};

const API_KEY = process.env.API_KEY;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const PUBLIC_KEY = process.env.PUBLIC_KEY;
const web3 = createAlchemyWeb3(
  `https://polygon-mumbai.g.alchemy.com/v2/${API_KEY}`
);
const contract = require('../../src/contracts/BeanToken.json');
const tokenAddress = process.env.TOKEN_ADDRESS;
const Contract = new web3.eth.Contract(contract.abi, tokenAddress, { from: PUBLIC_KEY });

const getConnections = async (db) => {
  const conCol = collection(db, 'connections');
  const conSnap = await getDocs(conCol);
  const conList = conSnap.docs.map(doc => doc.data());
  const connections = {};
  conList.forEach(con => connections[con.address] = con.timestamp);
  return connections;
};

const addConnection = async (address, timestamp) => {
  await setDoc(doc(db, 'connections', address), {
    address: address,
    timestamp: timestamp
  });
};

const TransferToken = async (res, addr1, addr2) => {
  console.log('TRANSFERING TO', addr1,'AND', addr2);
  const data = await Contract.methods.multiTransfer([addr1, addr2], [100000000, 100000000]).encodeABI();
  const tx = {
    "gas": 500000,
    "to": tokenAddress,
    "value": "0x00",
    "data": data,
    "from": PUBLIC_KEY
  };
  await web3.eth.accounts.signTransaction(tx, PRIVATE_KEY, async (err, signedTx) => {
    if (err) return console.log('TRANS ERROR', err);
    console.log('SIGNING', signedTx)
    await web3.eth.sendSignedTransaction(signedTx.rawTransaction, (err, resp) => {
      if (err) return console.log('TRANSFER ERROR', err)
      console.log('SENDING', resp)
      res.status(200).send("success transfer");
    });
  });
};

const handler = async (req, res) => {
  await addConnection(req.body, Date.now());
  const connections = await getConnections(db);
  const now = Date.now();
  console.log('CONNECTIONS', connections); 
  console.log('REQ.BODY', req.body);
  
  // Loops through the Values which are times
  let found = '';
  for (const [a, t] of Object.entries(connections)) {
    console.log(`address: ${a} time: ${t}`);
    if (t > now - 20000 && a != req.body) { // if connection time is within last 20 seconds
      // We found the connection
      found = a;
      break;
    }
  }

  if (found) {
    console.log('Transfering');
    await TransferToken(res, found, req.body)
  } else {
    console.log('Adding');
    connections[req.body] = now;
    res.status(200).send("success adding");
  }
};
export default handler;
