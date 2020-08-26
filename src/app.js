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

const config = require('../config.js');

const Web3 = require('web3');
const Contracts = require('web3-eth-contract');
const { BN } = require('web3-utils');

Contracts.setProvider(config.mainnet.ws);

const TONABI = require('./contracts/TON.json');

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

const port = process.env.PORT || 8080;

const router = require('./routes')(app, krwPrice, Price, Circulate);

cron.schedule('0,30 * * * * *', () => {
  getBTCPrice();
  getKRWPrice();
});

cron.schedule('0 * * * *', () => {
  getCircultate();
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

const getCircultate = async () => {
  const totalBalance = await ton.methods.totalSupply().call();
  const vaultBalance = await ton.methods.balanceOf(config.mainnet.TONVault).call();
  const bnTot = new BN(totalBalance);
  const bnVault = new BN(vaultBalance);
  const balance = bnTot.sub(bnVault)
  const etherValue = Web3.utils.fromWei(balance, 'ether');
  let circulate = new Circulate({
    'circulateSupply': Number(etherValue)
  })
  
  circulate.save(function (err, circulates) {
    if (err) return console.error(err);
    console.log("Current circulating supply is " + circulates.circulateSupply);
  })
}

const server = app.listen(port, function(){
 console.log("Express server has started on port " + port)
});