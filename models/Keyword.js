const mongoose = require('mongoose');

const KeywordSchema = new mongoose.Schema({
    keyword_name: { type: String, required: true, unique: true, trim: true },
    description: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('Keyword', KeywordSchema);