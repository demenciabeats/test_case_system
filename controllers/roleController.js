const Role = require('../models/Role');
const UserRole = require('../models/UserRole');

/**
 * Crear rol.
 * Se asigna el campo "created_by" con el ID del usuario autenticado (extraído del token).
 */
exports.createRole = async (req, res) => {
    try {
        const { role_name } = req.body;
        const newRole = new Role({
            role_name,
            created_by: req.user.id
        });
        await newRole.save();

        // Se devuelve el rol poblado con la información del usuario creador.
        const rolePopulated = await Role.findById(newRole._id)
            .populate('created_by', '_id username')
            .populate('updated_by', '_id username');
        res.status(201).json(rolePopulated);
    } catch (error) {
        res.status(500).json({ message: 'Error creando rol', error });
    }
};

/**
 * Obtener todos los roles.
 * Se incluyen los datos del usuario que creó y, en caso de haberse actualizado, del usuario que actualizó.
 */
exports.getRoles = async (req, res) => {
    try {
        const roles = await Role.find()
            .populate('created_by', '_id username')
            .populate('updated_by', '_id username');
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo roles', error });
    }
};

/**
 * Obtener rol por ID.
 */
exports.getRoleById = async (req, res) => {
    try {
        const role = await Role.findById(req.params.id)
            .populate('created_by', '_id username')
            .populate('updated_by', '_id username');
        if (!role) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }
        res.json(role);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo rol', error });
    }
};

/**
 * Buscar rol por nombre.
 * Se realiza una búsqueda insensible a mayúsculas/minúsculas.
 */
exports.getRoleByName = async (req, res) => {
    try {
        const role = await Role.findOne({ 
            role_name: { $regex: new RegExp(req.params.name, 'i') } 
        })
        .populate('created_by', '_id username')
        .populate('updated_by', '_id username');

        if (!role) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }
        res.json(role);
    } catch (error) {
        res.status(500).json({ message: 'Error buscando rol por nombre', error });
    }
};

/**
 * Actualizar rol.
 * Se asigna "updated_by" con el ID del usuario autenticado (quien realiza la actualización).
 */
exports.updateRole = async (req, res) => {
    try {
        const { role_name } = req.body;
        const updateData = {
            role_name,
            updated_by: req.user.id
        };

        const updatedRole = await Role.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedRole) {
            return res.status(404).json({ message: 'Rol no encontrado' });
        }

        // Se retorna el rol actualizado con la información del creador y actualizador.
        const rolePopulated = await Role.findById(updatedRole._id)
            .populate('created_by', '_id username')
            .populate('updated_by', '_id username');
        res.json(rolePopulated);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando rol', error });
    }
};

exports.deleteRole = async (req, res) => {
    try {
        // 🔍 Verificar si el rol existe antes de eliminarlo
        const role = await Role.findById(req.params.id);
        if (!role) {
            return res.status(404).json({ message: `Rol con ID '${req.params.id}' no encontrado.` });
        }

        // 🔍 Verificar si el rol está asignado a usuarios
        const usersWithRole = await UserRole.find({ role_id: req.params.id }).populate('user_id', '_id username');

        // 🔍 Filtrar los resultados que puedan tener `user_id` nulo
        const validUsersWithRole = usersWithRole.filter(ur => ur.user_id !== null);

        if (validUsersWithRole.length > 0) {
            const affectedUsers = validUsersWithRole.map(ur => ({
                _id: ur.user_id._id,
                username: ur.user_id.username
            }));

            return res.status(400).json({ 
                message: "No se puede eliminar el rol porque está asignado a usuarios.", 
                affected_users: affectedUsers 
            });
        }

        // ✅ Eliminar el rol si no está asignado a usuarios
        await Role.findByIdAndDelete(req.params.id);
        res.json({ message: 'Rol eliminado correctamente.' });

    } catch (error) {
        console.error("Error eliminando rol:", error);
        res.status(500).json({ message: 'Error eliminando rol', error });
    }
};
