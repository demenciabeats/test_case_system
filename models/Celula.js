const mongoose = require('mongoose');
const CelulaSchema = new mongoose.Schema({
    celula_name: { type: String, required: true },
    description: { type: String },
    product_manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Celula', CelulaSchema);