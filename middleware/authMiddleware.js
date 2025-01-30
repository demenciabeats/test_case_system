/// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const UserRole = require('../models/UserRole');
const RolePermission = require('../models/RolePermission');

exports.authMiddleware = (requiredPermissions) => {
    return async (req, res, next) => {
        const token = req.header('Authorization');
        if (!token) return res.status(401).json({ message: 'No autorizado' });

        try {
            const decoded = jwt.verify(token.split(' ')[1], process.env.JWT_SECRET);
            req.user = decoded;

            const roles = await UserRole.find({ user_id: decoded.id }).populate('role_id');
            const rolePermissions = await RolePermission.find({ role_id: { $in: roles.map(r => r.role_id._id) } }).populate('permission_id');
            const permissions = rolePermissions.map(rp => rp.permission_id ? rp.permission_id.permission_name : null).filter(Boolean);
            const hasPermission = requiredPermissions.every(perm => permissions.includes(perm));
            if (!hasPermission) {
                return res.status(403).json({ 
                    message: 'Permiso denegado', 
                    requiredPermissions, 
                    userPermissions: permissions 
                }); 
            }

            // Solo pasa al siguiente middleware si tiene los permisos requeridos
            next();
        } catch (error) {
            console.error("Error en autenticación:", error);
            return res.status(401).json({ message: 'Token inválido' });
        }
    };
};
