const config = require('../../config.js');


module.exports = function(app, krwPrice, Price, Circulate, Total) {
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

  app.get('/circulatedcoins', function (req, res) {
    Circulate.find(function(err, circulates){
      if(err) return res.status(500).send({error: 'database failure'});
      const length = circulates.length;
      res.json(circulates[length - 1].circulateSupply);
    })
  });

  app.get('/totalsupply', function (req, res) {
    Total.find(function(err, totals){
      if(err) return res.status(500).send({error: 'database failure'});
      const length = totals.length;
      res.json(totals[length - 1].totalSupply);
    })
  });
}
    