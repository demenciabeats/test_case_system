const mongoose = require('mongoose');
const Requirement = require('../models/Requirement');
const Build = require('../models/Build');

// Valores permitidos para los enums
const validStatuses = ['Pendiente', 'En Desarrollo', 'En Revisión', 'Aprobado', 'Rechazado'];
const validRequirementTypes = ['Funcional', 'No Funcional', 'Seguridad', 'Rendimiento', 'Usabilidad'];
const validPriorities = ['Baja', 'Media', 'Alta', 'Crítica'];
const validComplexities = ['Baja', 'Media', 'Alta'];

// Función para validar valores de enum
const validateEnum = (value, validValues, fieldName) => {
    if (value && !validValues.includes(value)) {
        return `El valor '${value}' para '${fieldName}' no es válido. Valores permitidos: ${validValues.join(', ')}.`;
    }
    return null;
};

// ✅ **Crear un Requerimiento**
exports.createRequirement = async (req, res) => {
    try {
        const { status, requirement_type, priority, complexity, external_id } = req.body;

        // Validación de ENUMS
        let errors = [];
        if (status) errors.push(validateEnum(status, validStatuses, 'status'));
        if (requirement_type) errors.push(validateEnum(requirement_type, validRequirementTypes, 'requirement_type'));
        if (priority) errors.push(validateEnum(priority, validPriorities, 'priority'));
        if (complexity) errors.push(validateEnum(complexity, validComplexities, 'complexity'));

        // Validación de `external_id` único
        if (external_id) {
            const existingRequirement = await Requirement.findOne({ external_id });
            if (existingRequirement) {
                return res.status(400).json({ message: `El external_id '${external_id}' ya está en uso.` });
            }
        }

        // Filtrar errores
        errors = errors.filter(error => error !== null);
        if (errors.length > 0) return res.status(400).json({ message: 'Errores en la validación de datos', errors });

        // Crear el requerimiento
        const requirement = new Requirement({ ...req.body, created_by: req.user.id });
        await requirement.save();
        res.status(201).json(requirement);
    } catch (error) {
        res.status(500).json({ message: 'Error creando requerimiento', error });
    }
};

// ✅ **Actualizar un Requerimiento**
exports.updateRequirement = async (req, res) => {
    try {
        const { requirement_id, status, requirement_type, priority, complexity, external_id, ...updateData } = req.body;
        let errors = [];

        // Validación de ENUMS
        if (status) errors.push(validateEnum(status, validStatuses, 'status'));
        if (requirement_type) errors.push(validateEnum(requirement_type, validRequirementTypes, 'requirement_type'));
        if (priority) errors.push(validateEnum(priority, validPriorities, 'priority'));
        if (complexity) errors.push(validateEnum(complexity, validComplexities, 'complexity'));

        // Validación de external_id único al actualizar
        if (external_id) {
            const existingRequirement = await Requirement.findOne({ external_id, requirement_id: { $ne: req.params.id } });
            if (existingRequirement) {
                return res.status(400).json({ message: `El external_id '${external_id}' ya está en uso por otro requerimiento.` });
            }
            updateData.external_id = external_id;
        }

        // Filtrar errores
        errors = errors.filter(error => error !== null);
        if (errors.length > 0) return res.status(400).json({ message: 'Errores en la validación de datos', errors });

        // Actualizar el requerimiento
        const updatedRequirement = await Requirement.findOneAndUpdate(
            { requirement_id: req.params.id },
            updateData,
            { new: true }
        );
        if (!updatedRequirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });

        res.json(updatedRequirement);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando requerimiento', error });
    }
};

// ✅ **Eliminar un Requerimiento**
exports.deleteRequirement = async (req, res) => {
    try {
        const deletedRequirement = await Requirement.findOneAndDelete({ requirement_id: req.params.id });

        if (!deletedRequirement) {
            return res.status(404).json({ message: 'Requerimiento no encontrado' });
        }

        res.json({ message: 'Requerimiento eliminado correctamente', deletedRequirement });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando requerimiento', error });
    }
};

// ✅ **Obtener todos los Requerimientos**
exports.getRequirements = async (req, res) => {
    try {
        let requirements = await Requirement.find().populate('created_by tech_lead celula');

        // Obtener detalles de las builds asociadas
        for (let requirement of requirements) {
            if (requirement.builds.length > 0) {
                let buildsData = await Build.find({ build_id: { $in: requirement.builds } });
                requirement = requirement.toObject(); // Convertir el documento a objeto para modificarlo
                requirement.build_details = buildsData; // Agregar los detalles de la Build
            }
        }

        res.json(requirements);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo requerimientos', error });
    }
};

// ✅ **Obtener un Requerimiento por su ID**
exports.getRequirementById = async (req, res) => {
    try {
        const requirement = await Requirement.findOne({ requirement_id: req.params.id }).populate('created_by tech_lead celula');
        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });

        res.json(requirement);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo requerimiento', error });
    }
};

// ✅ **Obtener un Requerimiento por su ID Externo (Jira, etc.)**
exports.getRequirementByExternalId = async (req, res) => {
    try {
        const requirement = await Requirement.findOne({ external_id: req.params.externalId }).populate('created_by tech_lead celula');
        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });

        res.json(requirement);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo requerimiento por external_id', error });
    }
};

// ✅ **Asociar una Build a un Requerimiento**
exports.addBuildToRequirement = async (req, res) => {
    try {
        const { requirement_id, build_id } = req.body;

        // Validar que existan los IDs
        if (!requirement_id || !build_id) {
            return res.status(400).json({ message: 'Se requiere requirement_id y build_id' });
        }

        // ✅ Buscar la Build por su `build_id`
        const build = await Build.findOne({ build_id });
        if (!build) {
            return res.status(404).json({ message: `No se encontró una Build con ID ${build_id}` });
        }

        // ✅ Buscar el requerimiento por `requirement_id`
        const requirement = await Requirement.findOne({ requirement_id });
        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });

        // ✅ Verificar si la Build ya está asociada
        if (!requirement.builds.includes(build.build_id)) {
            requirement.builds.push(build.build_id);
            await requirement.save();
        }

        res.json({ message: 'Build asociada correctamente', requirement });
    } catch (error) {
        res.status(500).json({ message: 'Error asociando Build al requerimiento', error });
    }
};
