const mongoose = require('mongoose');
const Requirement = require('../models/Requirement');
const Build = require('../models/Build');
const Keyword = require('../models/Keyword');

// Valores permitidos para los ENUMs
const validStatuses = ['Pendiente - PreQA', 'En Desarrollo - Development', 'QA', 'Aprobado', 'Rechazado'];
const validRequirementTypes = ['Funcional', 'No Funcional', 'Seguridad', 'Rendimiento', 'Usabilidad'];
const validPriorities = ['Baja', 'Media Baja', 'Media', 'Alta', 'Crítica'];
const validComplexities = ['Baja', 'Media', 'Alta', 'Muy Alta'];

// ✅ Validación ENUM
const validateEnum = (value, validValues, fieldName) => {
    if (value && !validValues.includes(value)) {
        return `El valor '${value}' para '${fieldName}' no es válido. Valores permitidos: ${validValues.join(', ')}.`;
    }
    return null;
};

// ✅ Crear un Requerimiento con Keywords
exports.createRequirement = async (req, res) => {
    try {
        const { status, requirement_type, priority, complexity, external_id, project_id, builds, keywords } = req.body;
        let errors = [];

        if (!project_id) errors.push("El campo 'project_id' es obligatorio.");

        if (external_id) {
            const existingRequirement = await Requirement.findOne({ external_id });
            if (existingRequirement) {
                return res.status(400).json({ message: `El external_id '${external_id}' ya está en uso.` });
            }
        }

        // Validación de Builds
        let buildIds = [];
        if (builds && builds.length > 0) {
            buildIds = await Promise.all(builds.map(async (buildId) => {
                const build = await Build.findOne({ build_id: buildId });
                return build ? build._id : null;
            }));
            buildIds = buildIds.filter(id => id !== null);
        }

        // Validación de Keywords
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                errors.push("Algunos keywords no existen en la base de datos.");
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Errores en la validación de datos', errors });
        }

        const requirement = new Requirement({ 
            ...req.body, 
            builds: buildIds,
            keywords: keywordObjects.map(k => k._id),
            created_by: req.user.id
        });

        await requirement.save();

        const fullRequirement = await Requirement.findOne({ requirement_id: requirement.requirement_id })
            .populate('created_by tech_lead celula testers builds')
            .populate('keywords', 'keyword_name');

        res.status(201).json(fullRequirement);
    } catch (error) {
        res.status(500).json({ message: 'Error creando requerimiento', error });
    }
};

// ✅ Obtener todos los Requerimientos con Keywords solo con ID y Nombre
exports.getRequirements = async (req, res) => {
    try {
        const requirements = await Requirement.find()
            .populate('created_by tech_lead celula testers builds')
            .populate('keywords', 'keyword_name');

        res.json(requirements);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo requerimientos', error });
    }
};

// ✅ Obtener un Requerimiento por ID con Keywords solo con ID y Nombre
exports.getRequirementById = async (req, res) => {
    try {
        const requirement = await Requirement.findOne({ requirement_id: req.params.id })
            .populate('created_by tech_lead celula testers builds')
            .populate('keywords', 'keyword_name');

        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });
        res.json(requirement);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo requerimiento', error });
    }
};

// ✅ Obtener un Requerimiento por `external_id` con Keywords solo con ID y Nombre
exports.getRequirementByExternalId = async (req, res) => {
    try {
        const requirement = await Requirement.findOne({ external_id: req.params.externalId })
            .populate('created_by tech_lead celula testers builds')
            .populate('keywords', 'keyword_name');

        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });
        res.json(requirement);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo requerimiento por external_id', error });
    }
};

// ✅ Actualizar un Requerimiento incluyendo Keywords
exports.updateRequirement = async (req, res) => {
    try {
        const { keywords, builds, ...updateData } = req.body;
        let errors = [];

        // Validación de Builds
        let buildIds = [];
        if (builds && builds.length > 0) {
            buildIds = await Promise.all(builds.map(async (buildId) => {
                const build = await Build.findOne({ build_id: buildId });
                return build ? build._id : null;
            }));
            buildIds = buildIds.filter(id => id !== null);
        }

        // Validación de Keywords
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                errors.push("Algunos keywords no existen en la base de datos.");
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Errores en la validación de datos', errors });
        }

        const updatedRequirement = await Requirement.findOneAndUpdate(
            { requirement_id: req.params.id },
            { ...updateData, builds: buildIds, keywords: keywordObjects.map(k => k._id) },
            { new: true }
        ).populate('keywords', 'keyword_name');

        if (!updatedRequirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });

        res.json(updatedRequirement);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando requerimiento', error });
    }
};

// ✅ Eliminar un Requerimiento
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
