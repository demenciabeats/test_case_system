/// models/Keyword.js
const mongoose = require('mongoose');
const KeywordSchema = new mongoose.Schema({
    keyword_name: { type: String, required: true }
}, { timestamps: true });
module.exports = mongoose.model('Keyword', KeywordSchema);