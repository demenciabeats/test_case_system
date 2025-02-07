const UserRole = require('../models/UserRole');
const User = require('../models/User');
const Role = require('../models/Role');

/**
 * Asignar un rol a un usuario con validaciones.
 */
exports.assignRoleToUser = async (req, res) => {
    try {
        const { user_id, role_id } = req.body;

        const user = await User.findById(user_id);
        if (!user) return res.status(404).json({ message: `Usuario con ID '${user_id}' no encontrado.` });

        const role = await Role.findById(role_id);
        if (!role) return res.status(404).json({ message: `Rol con ID '${role_id}' no encontrado.` });

        const existingAssignment = await UserRole.findOne({ user_id, role_id });
        if (existingAssignment) {
            return res.status(400).json({ message: `El usuario '${user.username}' ya tiene asignado el rol '${role.role_name}'.` });
        }

        const newUserRole = new UserRole({
            user_id,
            role_id,
            created_by: req.user.id
        });

        await newUserRole.save();

        const userRolePopulated = await UserRole.findById(newUserRole._id)
            .populate('user_id', '_id username')
            .populate('role_id', '_id role_name')
            .populate('created_by', '_id username');

        res.status(201).json({ message: "Rol asignado correctamente.", userRole: userRolePopulated });
    } catch (error) {
        res.status(500).json({ message: 'Error asignando rol al usuario', error });
    }
};

/**
 * Obtener todas las asignaciones de roles con formato limpio.
 */
exports.getUserRoles = async (req, res) => {
    try {
        const userRoles = await UserRole.find()
            .populate('user_id', '_id username')
            .populate('role_id', '_id role_name')
            .populate('created_by', '_id username');

        res.json(userRoles);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo roles de usuarios', error });
    }
};

/**
 * Eliminar una asignación de rol a un usuario con validación.
 */
exports.removeUserRole = async (req, res) => {
    try {
        const { user_id, role_id } = req.params;

        const userRole = await UserRole.findOneAndDelete({ user_id, role_id });

        if (!userRole) {
            return res.status(404).json({ message: "No se encontró la asignación de este rol al usuario." });
        }

        res.json({ message: "Asignación eliminada correctamente." });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando asignación de rol', error });
    }
};

/**
 * Obtener roles asignados a un usuario específico.
 */
exports.getRolesByUser = async (req, res) => {
    try {
        const { user_id } = req.params;

        const userRoles = await UserRole.find({ user_id })
            .populate('role_id', '_id role_name')
            .populate('created_by', '_id username');

        if (userRoles.length === 0) {
            return res.status(404).json({ message: `El usuario con ID '${user_id}' no tiene roles asignados.` });
        }

        res.json(userRoles);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo roles del usuario', error });
    }
};
