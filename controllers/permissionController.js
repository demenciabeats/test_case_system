/// controllers/permissionController.js
const Permission = require('../models/Permission');
exports.createPermission = async (req, res) => {
    try {
        const permission = new Permission(req.body);
        await permission.save();
        res.status(201).json(permission);
    } catch (error) {
        res.status(500).json({ message: 'Error creando permiso', error });
    }
};

exports.getPermissions = async (req, res) => {
    try {
        const permissions = await Permission.find();
        res.json(permissions);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo permisos' });
    }
};