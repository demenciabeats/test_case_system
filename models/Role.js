/// models/Role.js
const mongoose = require('mongoose');
const RoleSchema = new mongoose.Schema({
    role_name: { type: String, required: true, unique: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Role', RoleSchema);