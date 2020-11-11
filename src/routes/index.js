const config = require('../../config.js');
const axios = require('axios');

const Web3 = require('web3');
const Contracts = require('web3-eth-contract');
const { getStakedAmount } = require('tokamak-staking-lib');
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
const _TON = createCurrency('TON');
Contracts.setProvider(config.mainnet.ws);

const TON_UNIT = 'wei';
const WTON_UNIT = 'ray';

module.exports = async function(app, krwPrice, Price, ton, seigManager, l2Registry) {
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
    const addr = await seigManager.methods.tot().call();

    const Tot = new Contracts(AutoRefactorCoinageABI, addr);
    const tonTotalSupply = await ton.methods.totalSupply().call();
    const totTotalSupply = await Tot.methods.totalSupply().call();
    const tonBalanceOfWTON = await ton.methods.balanceOf(config.mainnet.WTON).call();
    const tos = _WTON(tonTotalSupply, TON_UNIT)
      .plus(_WTON(totTotalSupply, WTON_UNIT))
      .minus(_WTON(tonBalanceOfWTON, TON_UNIT));

    res.json(Number(tos.toBigNumber().toString()));
  });

  // about staking
  app.get('/staking/current', async (req, res) => {
    await Promise.all([getOperators()]);
    let totalStake = 0;
    for (let i=0; i<operators.length; i++) {
      totalStake = totalStake + operators[i].totalStaked._amount.toNumber();
    }
    res.json(totalStake);
  });

  app.get('/staking/:account', async (req, res) => {
    const account = req.params.account;
    const numLayer2 = await l2Registry.methods.numLayer2s().call();
    
    const stakingAmount = []
    for (i=0;i<numLayer2;i++) {
      let op = await l2Registry.methods.layer2ByIndex(i).call()
      let amount = await seigManager.methods.stakeOf(op, account).call();

      let amountUnitInWTON = _WTON(amount, WTON_UNIT)
      let amountUnitNumber = Number(amountUnitInWTON.toBigNumber().toString());
      
      if (amountUnitNumber !== 0) {
        let amountPerOperator = {
          layer2: op,
          amount: amountUnitNumber
        }
        stakingAmount.push(amountPerOperator)
      }
    }
    let tonBalance = await ton.methods.balanceOf(account).call()
    tonBalance = Number(_WTON(tonBalance, TON_UNIT).toBigNumber().toString());

    const returnValue = {
      staking: stakingAmount,
      tonBalance: tonBalance
    }
    // console.log(stakingAmount);
    // console.log(numLayer2)
    // console.log(amount)
    res.json(returnValue);
  })
}

const getOperators = async () => {
  await axios.get('https://dashboard-api.tokamak.network/operators')
    .then(async response => {
      await Promise.all([setManagers()]);

      const SeigManager = managers.SeigManager;
      const l2Registry = managers.Layer2Registry;

      const operatorsFromDB = response.data;
      for (let i=0; i < operatorsFromDB.length; i++) {
        if (!await l2Registry.methods.layer2s(operatorsFromDB[i].layer2).call()) {
          operatorsFromDB.splice(i, 1);
        }
      }
      
      const operatorsFromLayer2 = await Promise.all(
        operatorsFromDB.map(async operatorFromLayer2 => {
          const layer2 = operatorFromLayer2.layer2;

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