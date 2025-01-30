/// controllers/userRoleController.js
const UserRole = require('../models/UserRole');
exports.assignRoleToUser = async (req, res) => {
    try {
        const userRole = new UserRole(req.body);
        await userRole.save();
        res.status(201).json(userRole);
    } catch (error) {
        res.status(500).json({ message: 'Error asignando rol al usuario', error });
    }
};

exports.getUserRoles = async (req, res) => {
    try {
        const userRoles = await UserRole.find().populate('user_id').populate('role_id');
        res.json(userRoles);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo roles de usuarios' });
    }
};
