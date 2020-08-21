const config = require('../../config.js');


module.exports = function(app, Price, Circulate, ton, vault) {
  // GET ALL price
  app.get('/price', function(req, res){
    Price.find(function(err, prices){
      if(err) return res.status(500).send({error: 'database failure'});
      res.json(prices);
    })
  });

  // GET latest price 
  app.get('/price/latest', function (req, res) {
    Price.find(function(err, prices){
      if(err) return res.status(500).send({error: 'database failure'});
      const length = prices.length;
      res.json(prices[length - 1]);
    })
  });

  app.get('/price/:from/:to', function(req, res) {
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
}
    