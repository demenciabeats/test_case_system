/// models/Permission.js
const mongoose = require('mongoose');
const PermissionSchema = new mongoose.Schema({
    permission_name: { type: String, required: true, unique: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
module.exports = mongoose.model('Permission', PermissionSchema);