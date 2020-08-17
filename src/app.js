const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cron = require('node-cron');
const axios = require('axios');

const cors = require('cors');

const Price = require('./models/index.js');

const db = mongoose.connection;

db.on('error', console.error);
db.once('open', function(){
  // CONNECTED TO MONGODB SERVER
  console.log("Connected to mongod server");
});

mongoose.connect('mongodb://localhost:27017/price-api', { useMongoClient: true })
  .then(() => console.log('Successfully connected to mongodb'))
  .catch(e => console.error(e));

require('dotenv').config();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const port = process.env.PORT || 8080;

const router = require('./routes')(app, Price);

cron.schedule('* * * * *', () => {
  dump();
});

const dump = async () => {
  
  const rawData = await axios.get('https://api.upbit.com/v1/ticker?markets=BTC-TON');
  const data = await Promise.all([rawData.data[0]]);
  let price = new Price(data[0]);

  price.save(function (err, prices) {
    if (err) return console.error(err);
    console.log(prices.market + " saved to price collection.");
  })
};

const server = app.listen(port, function(){
 console.log("Express server has started on port " + port)
});