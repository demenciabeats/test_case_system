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

// ✅ Obtener todos los Requerimientos con salida optimizada
exports.getRequirements = async (req, res) => {
    try {
        const requirements = await Requirement.find()
            .populate('created_by', 'username _id') // ✅ Solo ID y username
            .populate('tech_lead', 'username _id') // ✅ Solo ID y username
            .populate('celula', 'celula_name _id') // ✅ Solo ID y nombre de la célula
            .populate('testers', 'username _id') // ✅ Solo ID y username
            .populate('keywords', '_id keyword_name') // ✅ Solo ID y nombre de las keywords
            .populate('builds', 'build_id build_name version status created_by') // ✅ Más información de la build
            .select('-__v -updatedAt') // ✅ Excluir campos innecesarios
            .sort({ createdAt: -1 }); // ✅ Ordenar por el más reciente

        res.json(requirements.map(req => ({
            requirement_id: req.requirement_id,
            requirement_name: req.requirement_name,
            description: req.description,
            project_id: req.project_id,
            status: req.status,
            requirement_type: req.requirement_type,
            priority: req.priority,
            complexity: req.complexity,
            created_by: req.created_by ? { _id: req.created_by._id, username: req.created_by.username } : null,
            tech_lead: req.tech_lead ? { _id: req.tech_lead._id, username: req.tech_lead.username } : null,
            testers: req.testers.map(t => ({ _id: t._id, username: t.username })),
            celula: req.celula ? { _id: req.celula._id, name: req.celula.celula_name } : null,
            builds: req.builds.map(b => ({
                build_id: b.build_id,
                build_name: b.build_name,
                version: b.version,
                status: b.status,
                created_by: b.created_by ? { _id: b.created_by._id, username: b.created_by.username } : null
            })),
            keywords: req.keywords.map(k => ({ _id: k._id, name: k.keyword_name })),
            external_id: req.external_id,
            external_link: req.external_link,
            sprints: req.sprints,
            estimated_end_date: req.estimated_end_date,
            start_date: req.start_date,
            end_date: req.end_date,
            createdAt: req.createdAt
        })));
    } catch (error) {
        console.error("❌ Error obteniendo Requerimientos:", error);
        res.status(500).json({ message: 'Error obteniendo requerimientos', error });
    }
};
// ✅ Obtener un Requerimiento por su ID con salida optimizada
exports.getRequirementById = async (req, res) => {
    try {
        const requirement = await Requirement.findOne({ requirement_id: req.params.id })
            .populate('created_by', 'username _id')
            .populate('tech_lead', 'username _id')
            .populate('celula', 'celula_name _id')
            .populate('testers', 'username _id')
            .populate('keywords', '_id keyword_name')
            .populate('builds', 'build_id build_name version status created_by')
            .select('-__v -updatedAt');

        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });

        res.json({
            requirement_id: requirement.requirement_id,
            requirement_name: requirement.requirement_name,
            description: requirement.description,
            project_id: requirement.project_id,
            status: requirement.status,
            requirement_type: requirement.requirement_type,
            priority: requirement.priority,
            complexity: requirement.complexity,
            created_by: requirement.created_by ? { _id: requirement.created_by._id, username: requirement.created_by.username } : null,
            tech_lead: requirement.tech_lead ? { _id: requirement.tech_lead._id, username: requirement.tech_lead.username } : null,
            testers: requirement.testers.map(t => ({ _id: t._id, username: t.username })),
            celula: requirement.celula ? { _id: requirement.celula._id, name: requirement.celula.celula_name } : null,
            builds: requirement.builds.map(b => ({
                build_id: b.build_id,
                build_name: b.build_name,
                version: b.version,
                status: b.status,
                created_by: b.created_by ? { _id: b.created_by._id, username: b.created_by.username } : null
            })),
            keywords: requirement.keywords.map(k => ({ _id: k._id, name: k.keyword_name })),
            external_id: requirement.external_id,
            external_link: requirement.external_link,
            sprints: requirement.sprints,
            estimated_end_date: requirement.estimated_end_date,
            start_date: requirement.start_date,
            end_date: requirement.end_date,
            createdAt: requirement.createdAt
        });
    } catch (error) {
        console.error("❌ Error obteniendo Requerimiento:", error);
        res.status(500).json({ message: 'Error obteniendo requerimiento', error });
    }
};
// ✅ Obtener un Requerimiento por external_id con salida optimizada
exports.getRequirementByExternalId = async (req, res) => {
    try {
        const requirement = await Requirement.findOne({ external_id: req.params.externalId })
            .populate('created_by', 'username _id')
            .populate('tech_lead', 'username _id')
            .populate('celula', 'celula_name _id')
            .populate('testers', 'username _id')
            .populate('keywords', '_id keyword_name')
            .populate('builds', 'build_id build_name version status created_by')
            .select('-__v -updatedAt');

        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });

        res.json({
            requirement_id: requirement.requirement_id,
            requirement_name: requirement.requirement_name,
            description: requirement.description,
            project_id: requirement.project_id,
            status: requirement.status,
            requirement_type: requirement.requirement_type,
            priority: requirement.priority,
            complexity: requirement.complexity,
            created_by: requirement.created_by ? { _id: requirement.created_by._id, username: requirement.created_by.username } : null,
            tech_lead: requirement.tech_lead ? { _id: requirement.tech_lead._id, username: requirement.tech_lead.username } : null,
            testers: requirement.testers.map(t => ({ _id: t._id, username: t.username })),
            celula: requirement.celula ? { _id: requirement.celula._id, name: requirement.celula.celula_name } : null,
            builds: requirement.builds.map(b => ({
                build_id: b.build_id,
                build_name: b.build_name,
                version: b.version,
                status: b.status,
                created_by: b.created_by ? { _id: b.created_by._id, username: b.created_by.username } : null
            })),
            keywords: requirement.keywords.map(k => ({ _id: k._id, name: k.keyword_name })),
            external_id: requirement.external_id,
            external_link: requirement.external_link,
            sprints: requirement.sprints,
            estimated_end_date: requirement.estimated_end_date,
            start_date: requirement.start_date,
            end_date: requirement.end_date,
            createdAt: requirement.createdAt
        });
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
// ✅ Agregar una o más Builds a un requerimiento
exports.addBuildToRequirement = async (req, res) => {
    try {
        const { requirement_id, builds } = req.body;

        // 🔍 Verificar si el requerimiento existe
        const requirement = await Requirement.findOne({ requirement_id });
        if (!requirement) {
            return res.status(404).json({ message: `Requerimiento con ID '${requirement_id}' no encontrado.` });
        }

        // 🔍 Verificar si las builds existen
        const buildDocs = await Build.find({ build_id: { $in: builds } });
        if (buildDocs.length !== builds.length) {
            return res.status(400).json({ message: 'Algunas builds no existen en la base de datos.' });
        }

        // 🔄 Evitar duplicados: Solo agregar builds nuevas
        const existingBuilds = new Set(requirement.builds.map(b => b.toString())); // Convertimos a Set para evitar duplicados
        const newBuilds = buildDocs.filter(b => !existingBuilds.has(b._id.toString()));

        if (newBuilds.length === 0) {
            return res.status(400).json({ message: 'Todas las builds ya están asociadas a este requerimiento.' });
        }

        // ✅ Agregar nuevas builds al requerimiento
        requirement.builds.push(...newBuilds.map(b => b._id));
        await requirement.save();

        // 🌟 Respuesta con el requerimiento actualizado
        const updatedRequirement = await Requirement.findOne({ requirement_id })
            .populate('builds', 'build_id build_name version status') // Poblar solo datos necesarios
            .populate('created_by', 'username'); // Poblar solo el usuario creador

        res.status(200).json({
            message: `Build(s) asociadas correctamente al requerimiento '${requirement_id}'`,
            requirement: updatedRequirement
        });
    } catch (error) {
        console.error("❌ Error al agregar builds al requerimiento:", error);
        res.status(500).json({ message: 'Error al agregar builds al requerimiento', error });
    }
};
