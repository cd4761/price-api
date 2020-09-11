const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios');

const cors = require('cors');

const Price = require('./models/price.js');
const krwPrice = require('./models/krw.js');
const Circulate = require('./models/circulate.js');
const Total = require('./models/total.js');

const config = require('../config.js');

const Web3 = require('web3');
const Contracts = require('web3-eth-contract');
const { BN } = require('web3-utils');

Contracts.setProvider(config.mainnet.ws);

const TONABI = require( './contracts/TON.json');
const WTONABI = require( './contracts/WTON.json');
const DepositManagerABI = require( './contracts/DepositManager.json');
const Layer2RegistryABI = require( './contracts/Layer2Registry.json');
const SeigManagerABI = require( './contracts/SeigManager.json');
const PowerTONABI = require( './contracts/PowerTON.json');

const seigManager = new Contracts(SeigManagerABI, config.mainnet.SeigManager);

let managers;


const ton = new Contracts(TONABI, config.mainnet.TON);

const db = mongoose.connection;

db.on('error', console.error);
db.once('open', function(){
  // CONNECTED TO MONGODB SERVER
  console.log("Connected to mongod server");
});

mongoose.connect('mongodb://localhost:27017/price-api')
  .then(() => console.log('Successfully connected to mongodb'))
  .catch(e => console.error(e));

require('dotenv').config();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 4500;

const router = require('./routes')(app, krwPrice, Price, Circulate, Total, seigManager);

cron.schedule('0,30 * * * * *', () => {
  getBTCPrice();
  getKRWPrice();
});

// for test 0 * * * *
cron.schedule('0 * * * *', () => {
  getCoins();
});

const getBTCPrice = async () => {
  const rawData = await axios.get('https://api.upbit.com/v1/ticker?markets=BTC-TON');
  const data = await Promise.all([rawData.data[0]]);
  let price = new Price(data[0]);

  price.save(function (err, prices) {
    if (err) return console.error(err);
    console.log(prices.market + " saved to price collection.");
  })
};

const getKRWPrice = async () => {
  const rawData = await axios.get('https://api.upbit.com/v1/ticker?markets=KRW-TON');
  const data = await Promise.all([rawData.data[0]]);
  let price = new krwPrice(data[0]);

  price.save(function (err, prices) {
    if (err) return console.error(err);
    console.log(prices.market + " saved to price collection.");
  })
};

const getCoins = async () => {
  const totalBalance = await ton.methods.totalSupply().call();
  const vaultBalance = await ton.methods.balanceOf(config.mainnet.TONVault).call();
  const bnTot = new BN(totalBalance);
  const bnVault = new BN(vaultBalance);
  const balance = bnTot.sub(bnVault)
  const etherValue = Web3.utils.fromWei(balance, 'ether');
  const totalVaule = Web3.utils.fromWei(bnTot, 'ether');
  let circulate = new Circulate({
    'circulateSupply': Number(etherValue)
  });

  let total = new Total({
    'totalSupply': Number(totalVaule)
  });
  
  circulate.save(function (err, circulates) {
    if (err) return console.error(err);
    console.log("Current circulating supply is " + circulates.circulateSupply);
  })

  total.save(function (err, totals) {
    if (err) return console.error(err);
    console.log("Current circulating supply is " + totals.totalSupply);
  })
}

const setManagers = async () => {
  await axios.get('https://dashboard-api.tokamak.network/managers')
    .then(response => {
      // console.log(response.data);
      managers = response.data;
      const managerABIs = {
        TONABI,
        WTONABI,
        DepositManagerABI,
        Layer2RegistryABI,
        SeigManagerABI,
        PowerTONABI,
      };

      for (const [name, address] of Object.entries(managers)) {
        const abi = managerABIs[`${name}ABI`];
        managers[name] = new Contracts(abi, address);
      }
    });
}

const server = app.listen(port, async function(){
 console.log("Express server has started on port " + port)
});
