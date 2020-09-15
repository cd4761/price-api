const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios');

const cors = require('cors');

const Price = require('./models/price.js');
const krwPrice = require('./models/krw.js');

const config = require('../config.js');

const Web3 = require('web3');
const Contracts = require('web3-eth-contract');
const { BN } = require('web3-utils');
const { calculateExpectedSeig } = require('tokamak-staking-lib');

Contracts.setProvider(config.mainnet.ws);

const TONABI = require('./contracts/TON.json');
const WTONABI = require('./contracts/WTON.json');
const DepositManagerABI = require('./contracts/DepositManager.json');
const Layer2RegistryABI = require('./contracts/Layer2Registry.json');
const SeigManagerABI = require('./contracts/SeigManager.json');
const PowerTONABI = require('./contracts/PowerTON.json');
const AutoRefactorCoinageABI = require('./contracts/AutoRefactorCoinage.json');

const seigManager = new Contracts(SeigManagerABI, config.mainnet.SeigManager);
// const Tot = new Contracts(AutoRefactorCoinageABI, seigManager.methods.tot().call());
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

const router = require('./routes')(app, krwPrice, Price, ton, seigManager);

cron.schedule('0,30 * * * * *', () => {
  getBTCPrice();
  getKRWPrice();
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
//const tos = _WTON(tonTotalSupply, TON_UNIT)
// .plus(_WTON(totTotalSupply, WTON_UNIT))
// .minus(_WTON(tonBalanceOfWTON, TON_UNIT));
// 10863985
// 10865101
// 4349329087368301060902778501239
// 1213804057214259028802978341880929
// 50023183.566028304
// 400000000000000000000000000
// Ray:   1000000000000000000000000000
//        6498456070843226921998727561
// const result = calculateExpectedSeig(
//   new BN('10863985'),
//   new BN('10865101'),
//   new BN('4349329087368301060902778501239'),
//   new BN('1213804057214259028802978341880929'),
//   new BN('50023183566028304000000000000000000'),
//   new BN('400000000000000000000000000'),
// )

const setManagers = async () => {
  await axios.get('https://dashboard-api.tokamak.network/managers')
    .then(response => {
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
