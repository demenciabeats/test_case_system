/// controllers/userController.js
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const UserRole = require('../models/UserRole');
const RolePermission = require('../models/RolePermission');

exports.registerUser = async (req, res) => {
    try {
        const { username, email, password, firstName, lastName } = req.body;
        const user = new User({ username, email, password, firstName, lastName });
        await user.save();
        res.status(201).json({ message: 'Usuario creado', user });
    } catch (error) {
        res.status(500).json({ message: 'Error al crear usuario', error });
    }
};

exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Usuario no encontrado' });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Contraseña incorrecta' });
        }

        // Obtener roles y permisos asociados al usuario
        const userRoles = await UserRole.find({ user_id: user._id }).populate('role_id');
        const rolesList = userRoles.map(r => ({
            id: r.role_id._id,
            name: r.role_id.role_name
        }));

        const rolePermissions = await RolePermission.find({
            role_id: { $in: userRoles.map(r => r.role_id._id) }
        }).populate('permission_id');
        const permissions = rolePermissions.map(rp => rp.permission_id.permission_name);

        // Generar el token JWT con la información necesaria (solo datos no sensibles)
        // Recuerda: aunque el JWT se firma y codifica en Base64URL, el payload puede ser decodificado
        const token = jwt.sign(
            { 
                id: user._id, 
                roles: rolesList.map(r => r.name), 
                permissions 
            },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Retornar el token y una información mínima del usuario (incluyendo roles)
        res.json({ 
            token, 
            user: { 
                id: user._id, 
                username: user.username, 
                roles: rolesList 
            } 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en login', error });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.find();
        const usersWithRolesAndPermissions = await Promise.all(users.map(async (user) => {
            const roles = await UserRole.find({ user_id: user._id }).populate('role_id');
            const rolePermissions = await RolePermission.find({ role_id: { $in: roles.map(r => r.role_id._id) } }).populate('permission_id');
            const permissions = rolePermissions.map(rp => rp.permission_id.permission_name);
            return {
                ...user.toObject(),
                roles: roles.map(r => r.role_id.role_name),
                permissions
            };
        }));
        res.json(usersWithRolesAndPermissions);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo usuarios', error });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedUser = await User.findByIdAndUpdate(id, req.body, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
        }
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando usuario' });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando usuario' });
    }
};