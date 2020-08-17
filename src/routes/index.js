module.exports = function(app, Price) {
  // GET ALL price
  app.get('/api/price', function(req, res){
    Price.find(function(err, prices){
      if(err) return res.status(500).send({error: 'database failure'});
      res.json(prices);
    })
  });

  // GET latest price 
  app.get('/api/latest/', function(req, res){
    Price.find(function(err, prices){
      if(err) return res.status(500).send({error: 'database failure'});
      const length = prices.length;
      res.json(prices[length - 1]);
    })
  });

  // Insert price
  app.post('/api/price', function(req, res){
      res.end();
  });
}