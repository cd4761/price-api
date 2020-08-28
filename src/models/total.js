const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const totalSchema = new mongoose.Schema({
    totalSupply: Number,
});

module.exports = mongoose.model('total', totalSchema);
