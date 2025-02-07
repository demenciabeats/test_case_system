const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
    permission_name: { type: String, required: true, unique: true }, // Nombre del permiso
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true } // Usuario que creó el permiso
}, { timestamps: true });

module.exports = mongoose.model('Permission', PermissionSchema);
