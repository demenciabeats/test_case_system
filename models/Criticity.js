/// models/Criticity.js
const mongoose = require('mongoose');
const CriticitySchema = new mongoose.Schema({
    level: { type: String, required: true },
    criticity_name: { type: String, required: true }
}, { timestamps: true });
module.exports = mongoose.model('Criticity', CriticitySchema);