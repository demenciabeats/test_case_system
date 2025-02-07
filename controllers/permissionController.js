const Permission = require('../models/Permission');

/**
 * Crear un permiso con validación de duplicado.
 */
exports.createPermission = async (req, res) => {
    try {
        const { permission_name } = req.body;
        
        const existingPermission = await Permission.findOne({
            permission_name: { $regex: new RegExp("^" + permission_name + "$", "i") }
        }); // Verificar si el permiso ya existe (insensible a mayúsculas/minúsculas)
        if (existingPermission) {
            return res.status(400).json({ message: `El permiso '${permission_name}' ya existe.` });
        }

        const newPermission = new Permission({
            permission_name,
            created_by: req.user.id
        }); // Crear nuevo permiso
        await newPermission.save();

        const permissionPopulated = await Permission.findById(newPermission._id)
            .populate('created_by', '_id username'); // Poblar datos del creador

        res.status(201).json({ message: "Permiso creado exitosamente.", permission: permissionPopulated });
    } catch (error) {
        res.status(500).json({ message: 'Error creando permiso', error });
    }
};

/**
 * Obtener todos los permisos con detalles del creador.
 */
exports.getPermissions = async (req, res) => {
    try {
        const permissions = await Permission.find()
            .populate('created_by', '_id username'); // Poblar información del creador
        res.json(permissions);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo permisos', error });
    }
};

/**
 * Obtener un permiso por ID con validación de existencia.
 */
exports.getPermissionById = async (req, res) => {
    try {
        const permission = await Permission.findById(req.params.id)
            .populate('created_by', '_id username'); // Poblar información del creador

        if (!permission) {
            return res.status(404).json({ message: 'Permiso no encontrado.' });
        }
        res.json(permission);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo permiso', error });
    }
};

/**
 * Buscar permiso por nombre con validación.
 */
exports.getPermissionByName = async (req, res) => {
    try {
        const permission = await Permission.findOne({ 
            permission_name: { $regex: new RegExp("^" + req.params.name + "$", "i") }
        }).populate('created_by', '_id username'); // Poblar información del creador

        if (!permission) {
            return res.status(404).json({ message: `No se encontró el permiso con nombre '${req.params.name}'.` });
        }
        res.json(permission);
    } catch (error) {
        res.status(500).json({ message: 'Error buscando permiso por nombre', error });
    }
};

/**
 * Actualizar permiso con validación de duplicados.
 */
exports.updatePermission = async (req, res) => {
    try {
        const { permission_name } = req.body;

        const existingPermission = await Permission.findById(req.params.id);
        if (!existingPermission) {
            return res.status(404).json({ message: `Permiso con ID '${req.params.id}' no encontrado.` });
        } // Verificar si el permiso existe antes de actualizar

        const duplicatePermission = await Permission.findOne({ 
            permission_name: { $regex: new RegExp("^" + permission_name + "$", "i") },
            _id: { $ne: req.params.id }
        }); // Verificar si el nuevo nombre ya existe (excluyendo el mismo ID)

        if (duplicatePermission) {
            return res.status(400).json({ message: `Ya existe un permiso con el nombre '${permission_name}'.` });
        }

        const updatedPermission = await Permission.findByIdAndUpdate(req.params.id, { permission_name }, { new: true }); // Actualizar datos

        const permissionPopulated = await Permission.findById(updatedPermission._id)
            .populate('created_by', '_id username'); // Poblar información del creador

        res.json({ message: "Permiso actualizado exitosamente.", permission: permissionPopulated });
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando permiso', error });
    }
};

/**
 * Eliminar permiso con validación de existencia.
 */
exports.deletePermission = async (req, res) => {
    try {
        const deletedPermission = await Permission.findByIdAndDelete(req.params.id);
        if (!deletedPermission) {
            return res.status(404).json({ message: `Permiso con ID '${req.params.id}' no encontrado.` });
        } // Verificar si el permiso existe antes de eliminar

        res.json({ message: 'Permiso eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando permiso', error });
    }
};
