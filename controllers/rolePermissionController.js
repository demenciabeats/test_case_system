/// controllers/rolePermissionController.js
const RolePermission = require('../models/RolePermission');
exports.assignPermissionToRole = async (req, res) => {
    try {
        const rolePermission = new RolePermission(req.body);
        await rolePermission.save();
        res.status(201).json(rolePermission);
    } catch (error) {
        res.status(500).json({ message: 'Error asignando permiso al rol', error });
    }
};

exports.getRolePermissions = async (req, res) => {
    try {
        const rolePermissions = await RolePermission.find().populate('role_id').populate('permission_id');
        res.json(rolePermissions);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo permisos de roles' });
    }
};