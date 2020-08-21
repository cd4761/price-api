const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const circulateSchema = new mongoose.Schema({
    circulateSupply: Number,
});

module.exports = mongoose.model('circulate', circulateSchema);
