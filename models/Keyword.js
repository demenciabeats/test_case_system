/// models/Keyword.js
const mongoose = require('mongoose');

const KeywordSchema = new mongoose.Schema({
    keyword_name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" } // Nueva descripción opcional
}, { timestamps: true });

module.exports = mongoose.model('Keyword', KeywordSchema);