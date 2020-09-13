const config = require('../../config.js');
const axios = require('axios');

const Web3 = require('web3');
const Contracts = require('web3-eth-contract');
const { BN } = require('web3-utils');
const { createCurrency } = require('@makerdao/currency');

const TONABI = require( '../contracts/TON.json');
const WTONABI = require( '../contracts/WTON.json');
const DepositManagerABI = require( '../contracts/DepositManager.json');
const Layer2RegistryABI = require( '../contracts/Layer2Registry.json');
const SeigManagerABI = require( '../contracts/SeigManager.json');
const PowerTONABI = require( '../contracts/PowerTON.json');
const Layer2ABI = require( '../contracts/Layer2.json');
const AutoRefactorCoinageABI = require( '../contracts/AutoRefactorCoinage.json');
let managers, operators;


const _WTON = createCurrency('WTON');
Contracts.setProvider(config.mainnet.ws);

const WTON_UNIT = 'ray';

module.exports = async function(app, krwPrice, Price, Circulate, Total, ton, seigManager) {
  // GET BTC pair price
  // GET ALL price
  app.get('/btc/price', function(req, res){
    Price.find(function(err, prices){
      if(err) return res.status(500).send({error: 'database failure'});
      res.json(prices);
    })
  });

  // GET latest price 
  app.get('/btc/price/latest', function (req, res) {
    Price.find(function(err, prices){
      if(err) return res.status(500).send({error: 'database failure'});
      const length = prices.length;
      res.json(prices[length - 1]);
    })
  });

  app.get('/btc/price/:from/:to', function(req, res) {
    krwPrice.find({ 
      "timestamp": { 
        $gte: req.params.from,
        $lte: req.params.to
      } 
    }).then((prices) => {
      if (!prices) return res.status(404).send({ err: 'Price info not found' });
      res.json(prices);
    })
    .catch(err => res.status(500).send(err));
  });

  // GET KRW pair price
  app.get('/krw/price', function(req, res){
    krwPrice.find(function(err, prices){
      if(err) return res.status(500).send({error: 'database failure'});
      res.json(prices);
    })
  });

  // GET latest price 
  app.get('/krw/price/latest', function (req, res) {
    krwPrice.find(function(err, prices){
      if(err) return res.status(500).send({error: 'database failure'});
      const length = prices.length;
      res.json(prices[length - 1]);
    })
  });

  app.get('/krw/price/:from/:to', function(req, res) {
    Price.find({ 
      "timestamp": { 
        $gte: req.params.from,
        $lte: req.params.to
      } 
    }).then((prices) => {
      if (!prices) return res.status(404).send({ err: 'Price info not found' });
      res.json(prices);
    })
    .catch(err => res.status(500).send(err));
  });

  app.get('/circulatedcoins', async function (req, res) {
    const totalBalance = await ton.methods.totalSupply().call();
    const vaultBalance = await ton.methods.balanceOf(config.mainnet.TONVault).call();
    const bnTot = new BN(totalBalance);
    const bnVault = new BN(vaultBalance);
    const balance = bnTot.sub(bnVault)
    const etherValue = Web3.utils.fromWei(balance, 'ether');
    res.json(Number(etherValue));
  });

  app.get('/totalsupply', async function (req, res) {
    const totalBalance = await ton.methods.totalSupply().call();
    const bnTot = new BN(totalBalance);
    const totalVaule = Web3.utils.fromWei(bnTot, 'ether');
    res.json(Number(totalVaule));
  });

  app.get('/staking/current', async (req, res) => {
    await Promise.all([getOperators()]);
    let totalStake = 0;
    for (let i=0; i<operators.length; i++) {
      totalStake = totalStake + operators[i].totalStaked._amount.toNumber();
    }
    res.json(totalStake);
  });

  app.get('/staking/seigrate', async (req, res) => {
    // seigManager.methods.
  });
}

const getOperators = async () => {
  await axios.get('https://dashboard-api.tokamak.network/operators')
    .then(async response => {
      await Promise.all([setManagers()]);
      const SeigManager = managers.SeigManager;
      const Tot = new Contracts(
        AutoRefactorCoinageABI, await SeigManager.methods.tot().call());
      
      const operatorsFromLayer2 = await Promise.all(
        response.data.map(async operatorFromLayer2 => {
          const layer2 = operatorFromLayer2.layer2;
          const Layer2 = new Contracts(Layer2ABI, layer2);
          const Coinage = new Contracts(
            AutoRefactorCoinageABI, await SeigManager.methods.coinages(layer2).call());
          
          const [totalStaked] = await Promise.all([Coinage.methods.totalSupply().call()])

          operatorFromLayer2.totalStaked = _WTON(totalStaked, WTON_UNIT);

          return operatorFromLayer2
        })
      );
      operators = operatorsFromLayer2;
      
    })
}

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

      return managers;
    });
}