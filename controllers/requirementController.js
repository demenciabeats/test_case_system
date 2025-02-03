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

// ✅ Crear un Requerimiento con Validaciones
exports.createRequirement = async (req, res) => {
    try {
        const { requirement_name, external_id, project_id, builds, keywords } = req.body;
        let errors = [];

        if (!project_id) errors.push("El campo 'project_id' es obligatorio.");

        // 🔍 **Verificar si el nombre del requerimiento ya existe**
        if (requirement_name) {
            const existingRequirement = await Requirement.findOne({ requirement_name: requirement_name.trim() });
            if (existingRequirement) {
                return res.status(400).json({ message: `El requerimiento '${requirement_name}' ya existe.` });
            }
        }

        // 🔍 **Verificar si el `external_id` ya existe**
        if (external_id) {
            const existingExternal = await Requirement.findOne({ external_id });
            if (existingExternal) {
                return res.status(400).json({ message: `El external_id '${external_id}' ya está en uso.` });
            }
        }

        // 🔍 **Validación de Builds**
        let buildIds = [];
        if (builds && builds.length > 0) {
            buildIds = await Build.find({ build_id: { $in: builds } }).select('_id');
            if (buildIds.length !== builds.length) {
                errors.push("Algunas builds no existen en la base de datos.");
            }
        }

        // 🔍 **Validación de Keywords**
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                errors.push("Algunas keywords no existen en la base de datos.");
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Errores en la validación de datos', errors });
        }

        const requirement = new Requirement({ 
            ...req.body, 
            requirement_name: requirement_name.trim(),
            builds: buildIds.map(b => b._id),
            keywords: keywordObjects.map(k => k._id),
            created_by: req.user.id
        });

        await requirement.save();

        const fullRequirement = await Requirement.findOne({ requirement_id: requirement.requirement_id })
            .populate('created_by tech_lead celula testers builds')
            .populate('keywords', 'keyword_name');

        res.status(201).json(fullRequirement);
    } catch (error) {
        console.error("❌ Error creando requerimiento:", error);
        res.status(500).json({ message: 'Error creando requerimiento', error });
    }
};

// ✅ **Actualizar un Requerimiento incluyendo Keywords y validando nombre**
exports.updateRequirement = async (req, res) => {
    try {
        const { requirement_name, keywords, builds, ...updateData } = req.body;
        let errors = [];

        // 🔍 **Verificar si el requerimiento existe**
        const existingRequirement = await Requirement.findOne({ requirement_id: req.params.id });
        if (!existingRequirement) {
            return res.status(404).json({ message: 'Requerimiento no encontrado' });
        }

        // 🔍 **Verificar si otro requerimiento ya tiene este nombre**
        if (requirement_name) {
            const existingName = await Requirement.findOne({
                requirement_name: requirement_name.trim(),
                requirement_id: { $ne: req.params.id }
            });
            if (existingName) {
                return res.status(400).json({ message: `El nombre del requerimiento '${requirement_name}' ya está en uso.` });
            }
            updateData.requirement_name = requirement_name.trim();
        }

        // 🔍 **Validación de Builds**
        let buildIds = [];
        if (builds && builds.length > 0) {
            buildIds = await Build.find({ build_id: { $in: builds } }).select('_id');
            if (buildIds.length !== builds.length) {
                errors.push("Algunas builds no existen en la base de datos.");
            }
            updateData.builds = buildIds.map(b => b._id);
        }

        // 🔍 **Validación de Keywords**
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                errors.push("Algunas keywords no existen en la base de datos.");
            }
            updateData.keywords = keywordObjects.map(k => k._id);
        }

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Errores en la validación de datos', errors });
        }

        const updatedRequirement = await Requirement.findOneAndUpdate(
            { requirement_id: req.params.id },
            updateData,
            { new: true }
        ).populate('keywords', 'keyword_name');

        if (!updatedRequirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });

        res.json(updatedRequirement);
    } catch (error) {
        console.error("❌ Error actualizando requerimiento:", error);
        res.status(500).json({ message: 'Error actualizando requerimiento', error });
    }
};

// ✅ **Obtener todos los Requerimientos con salida optimizada**
exports.getRequirements = async (req, res) => {
    try {
        const requirements = await Requirement.find()
            .populate('created_by', 'username') // ✅ Solo ID y username
            .populate('tech_lead', 'username') // ✅ Solo ID y username
            .populate('celula', 'celula_name') // ✅ Solo ID y nombre de la célula
            .populate('testers', 'username') // ✅ Solo ID y username
            .populate('keywords', 'keyword_name') // ✅ Solo ID y nombre de las keywords
            .populate('builds', 'build_name') // ✅ Solo ID y nombre de la build
            .select('-__v -updatedAt'); // ✅ Excluir campos innecesarios

        res.json(requirements);
    } catch (error) {
        console.error("❌ Error obteniendo Requerimientos:", error);
        res.status(500).json({ message: 'Error obteniendo requerimientos', error });
    }
};

// ✅ **Obtener un Requerimiento por su ID con salida optimizada**
exports.getRequirementById = async (req, res) => {
    try {
        const requirement = await Requirement.findOne({ requirement_id: req.params.id })
            .populate('created_by', 'username') // ✅ Solo ID y username
            .populate('tech_lead', 'username') // ✅ Solo ID y username
            .populate('celula', 'celula_name') // ✅ Solo ID y nombre de la célula
            .populate('testers', 'username') // ✅ Solo ID y username
            .populate('keywords', 'keyword_name') // ✅ Solo ID y nombre de las keywords
            .populate('builds', 'build_name') // ✅ Solo ID y nombre de la build
            .select('-__v -updatedAt'); // ✅ Excluir campos innecesarios

        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });

        res.json(requirement);
    } catch (error) {
        console.error("❌ Error obteniendo Requerimiento:", error);
        res.status(500).json({ message: 'Error obteniendo requerimiento', error });
    }
};

// ✅ **Obtener un Requerimiento por `external_id` con salida optimizada**
exports.getRequirementByExternalId = async (req, res) => {
    try {
        const requirement = await Requirement.findOne({ external_id: req.params.externalId })
            .populate('created_by', 'username') // ✅ Solo ID y username
            .populate('tech_lead', 'username') // ✅ Solo ID y username
            .populate('celula', 'celula_name') // ✅ Solo ID y nombre de la célula
            .populate('testers', 'username') // ✅ Solo ID y username
            .populate('keywords', 'keyword_name') // ✅ Solo ID y nombre de las keywords
            .populate('builds', 'build_name') // ✅ Solo ID y nombre de la build
            .select('-__v -updatedAt'); // ✅ Excluir campos innecesarios

        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });

        res.json(requirement);
    } catch (error) {
        console.error("❌ Error obteniendo Requerimiento por external_id:", error);
        res.status(500).json({ message: 'Error obteniendo requerimiento por external_id', error });
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
