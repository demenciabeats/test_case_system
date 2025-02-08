const mongoose = require('mongoose');
const Requirement = require('../models/Requirement');
const Build = require('../models/Build');
const Keyword = require('../models/Keyword');
const Project = require('../models/Project');
const User = require('../models/User');  // Para `created_by`, `tech_lead`, `testers`
const Celula = require('../models/Celula'); // Para `celula`

/* Valores permitidos para los ENUMs
const validStatuses = ['Pendiente - PreQA', 'En Desarrollo - Development', 'QA', 'Aprobado', 'Rechazado'];
const validRequirementTypes = ['Funcional', 'No Funcional', 'Seguridad', 'Rendimiento', 'Usabilidad'];
const validPriorities = ['Baja', 'Media Baja', 'Media', 'Alta', 'Crítica'];
const validComplexities = ['Baja', 'Media', 'Alta', 'Muy Alta'];*/

// Estados no permitidos para agregar una Build a un Requerimiento
const invalidBuildStatuses = ['En Ejecucion', 'Completada', 'Fallida'];

// ✅ Validación ENUM
const validateEnum = (value, validValues, fieldName) => {
    if (value && !validValues.includes(value)) {
        return `El valor '${value}' para '${fieldName}' no es válido. Valores permitidos: ${validValues.join(', ')}.`;
    }
    return null;
};
// ✅ **Función auxiliar para formatear la salida**
const formatRequirement = (req) => ({
    requirement_id: req.requirement_id,
    _id: req._id,
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
    })),
    keywords: req.keywords.map(k => ({ _id: k._id, name: k.keyword_name })),
    external_id: req.external_id,
    external_link: req.external_link,
    sprints: req.sprints,
    estimated_end_date: req.estimated_end_date,
    start_date: req.start_date,
    end_date: req.end_date,
    createdAt: req.createdAt
});

// ✅ Crear un Requerimiento con Validaciones de Duplicidad por Proyecto
exports.createRequirement = async (req, res) => {
    try {
        const { requirement_type, status, priority, complexity } = req.body;
        let errors = [];

        // **Validar ENUMs**
        let enumErrors = [
            validateEnum(status, ['Pendiente - PreQA', 'En Desarrollo - Development', 'QA', 'Aprobado', 'Rechazado'], 'status'),
            validateEnum(requirement_type, ['Funcional', 'No Funcional', 'Seguridad', 'Rendimiento', 'Usabilidad'], 'requirement_type'),
            validateEnum(priority, ['Baja', 'Media Baja', 'Media', 'Alta', 'Crítica'], 'priority'),
            validateEnum(complexity, ['Baja', 'Media', 'Alta', 'Muy Alta'], 'complexity')
        ].filter(error => error !== null);

        errors.push(...enumErrors);

        // **Si hay errores de ENUM, se retorna enseguida**
        if (errors.length > 0) {
            return res.status(400).json({ 
                message: 'Errores en la validación de datos', 
                errors 
            });
        }

        const requirement = new Requirement({ 
            ...req.body, 
            created_by: req.user.id 
        });
        await requirement.save();

        return res.status(201).json({
            message: 'Requerimiento creado exitosamente',
            requirement
        });

    } catch (error) {
        console.error("❌ Error creando requerimiento:", error);

        // **Capturar error de clave duplicada (código 11000)**
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            const value = error.keyValue[field];
            return res.status(400).json({
                message: "Error de duplicidad",
                error: {
                    field: field,
                    value: value,
                    message: `El campo '${field}' con valor '${value}' ya está en uso. Por favor, use un valor distinto.`
                }
            });
        }

        return res.status(500).json({ 
            message: 'Error creando requerimiento', 
            error 
        });
    }
};

// ✅ **Actualizar un Requerimiento con validaciones**
exports.updateRequirement = async (req, res) => {
    try {
        const { requirement_name, external_id, project_id, ...updateData } = req.body;
        const { id } = req.params;

        // ✅ **Verificar si el requerimiento existe**
        const existingRequirement = await Requirement.findOne({ requirement_id: id });
        if (!existingRequirement) {
            return res.status(404).json({ 
                message: `Requerimiento con ID '${id}' no encontrado.` 
            });
        }

        let errors = [];

        // ✅ **Validar ENUMs antes de actualizar**
        let enumErrors = [
            validateEnum(updateData.status, ['Pendiente - PreQA', 'En Desarrollo - Development', 'QA', 'Aprobado', 'Rechazado'], 'status'),
            validateEnum(updateData.requirement_type, ['Funcional', 'No Funcional', 'Seguridad', 'Rendimiento', 'Usabilidad'], 'requirement_type'),
            validateEnum(updateData.priority, ['Baja', 'Media Baja', 'Media', 'Alta', 'Crítica'], 'priority'),
            validateEnum(updateData.complexity, ['Baja', 'Media', 'Alta', 'Muy Alta'], 'complexity')
        ].filter(error => error !== null);

        errors.push(...enumErrors);

        // ✅ **Validar nombre único en el mismo `project_id`**
        if (requirement_name && requirement_name.trim() !== existingRequirement.requirement_name) {
            const duplicateRequirement = await Requirement.findOne({
                requirement_name: requirement_name.trim(),
                project_id: existingRequirement.project_id,
                requirement_id: { $ne: id }
            });
            if (duplicateRequirement) {
                errors.push(`Ya existe un Requerimiento con el nombre '${requirement_name}' en este proyecto.`);
            }
            updateData.requirement_name = requirement_name.trim();
        }

        // ✅ **Validar que `external_id` sea único dentro del mismo `project_id`**
        if (external_id && external_id !== existingRequirement.external_id) {
            const duplicateExternalId = await Requirement.findOne({
                external_id,
                project_id: existingRequirement.project_id,
                requirement_id: { $ne: id }
            });
            if (duplicateExternalId) {
                errors.push(`El External ID '${external_id}' ya está asociado a otro requerimiento en este proyecto.`);
            }
            updateData.external_id = external_id;
        }

        // ✅ **Si hay errores, retornar antes de continuar**
        if (errors.length > 0) {
            return res.status(400).json({ 
                message: 'Errores en la validación de datos', 
                errors 
            });
        }

        // ✅ **Evitar modificar `created_by` para proteger la autoría**
        updateData.created_by = existingRequirement.created_by;

        // ✅ **Actualizar el requerimiento**
        const updatedRequirement = await Requirement.findOneAndUpdate(
            { requirement_id: id },
            updateData,
            { new: true }  // Devuelve el documento ya actualizado
        );

        if (!updatedRequirement) {
            return res.status(404).json({ 
                message: 'Requerimiento no encontrado' 
            });
        }

        return res.json({
            message: 'Requerimiento actualizado exitosamente',
            requirement: updatedRequirement
        });

    } catch (error) {
        console.error("❌ Error actualizando requerimiento:", error);

        // **Capturar error de clave duplicada (código 11000)**
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            const value = error.keyValue[field];
            return res.status(400).json({
                message: "Error de duplicidad",
                error: {
                    field: field,
                    value: value,
                    message: `El campo '${field}' con valor '${value}' ya está en uso. Por favor, use un valor distinto.`
                }
            });
        }

        return res.status(500).json({ 
            message: 'Error actualizando requerimiento', 
            error 
        });
    }
};

// ✅ Obtener todos los Requerimientos con salida optimizada y consistente
exports.getRequirements = async (req, res) => {
    try {
        const requirements = await Requirement.find()
            .populate('created_by', 'username _id')
            .populate('tech_lead', 'username _id')
            .populate('celula', 'celula_name _id')
            .populate('testers', 'username _id')
            .populate('keywords', '_id keyword_name')
            .populate('builds', 'build_id build_name version status')
            .select('-__v -updatedAt')
            .sort({ createdAt: -1 });

        res.json(requirements.map(req => formatRequirement(req)));
    } catch (error) {
        console.error("❌ Error obteniendo Requerimientos:", error);
        res.status(500).json({ message: 'Error obteniendo requerimientos', error });
    }
};

// ✅ Obtener un Requerimiento por ID con salida optimizada y consistente
exports.getRequirementById = async (req, res) => {
    try {
        const requirement = await Requirement.findOne({ requirement_id: req.params.id })
            .populate('created_by', 'username _id')
            .populate('tech_lead', 'username _id')
            .populate('celula', 'celula_name _id')
            .populate('testers', 'username _id')
            .populate('keywords', '_id keyword_name')
            .populate('builds', 'build_id build_name version status')
            .select('-__v -updatedAt');

        if (!requirement) {
            return res.status(404).json({ message: 'Requerimiento no encontrado' });
        }

        res.json(formatRequirement(requirement));
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
            .populate('builds', 'build_id build_name version status')
            .select('-__v -updatedAt');

        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });

        res.json(formatRequirement(requirement));
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
// ✅ **Asociar una o varias Builds a un Requerimiento**
exports.addBuildsToRequirement = async (req, res) => {
    try {
        const { requirement_id, build_ids } = req.body;

        // Buscar el requerimiento por `requirement_id`
        const requirement = await Requirement.findOne({ requirement_id });
        if (!requirement) {
            return res.status(404).json({ message: `Requerimiento con ID '${requirement_id}' no encontrado.` });
        }

        // Buscar las Builds por `build_id`
        const builds = await Build.find({ build_id: { $in: build_ids } }, '_id build_id build_name status');
        if (builds.length !== build_ids.length) {
            return res.status(400).json({ message: "Algunas Builds no existen en la base de datos." });
        }

        // Validar que las Builds no tengan estado inválido
        const invalidBuilds = builds.filter(build => invalidBuildStatuses.includes(build.status));
        if (invalidBuilds.length > 0) {
            return res.status(400).json({
                message: "Algunas Builds tienen estados inválidos para ser asociadas.",
                builds: invalidBuilds.map(b => ({
                    build_id: b.build_id,
                    build_name: b.build_name,
                    status: b.status
                }))
            });
        }

        // Buscar si alguna Build ya está asociada a otro Requerimiento
        const requirementsWithBuilds = await Requirement.find({ builds: { $in: builds.map(b => b._id) } }).populate('builds', 'build_id build_name');
        if (requirementsWithBuilds.length > 0) {
            return res.status(400).json({
                message: "Algunas Builds ya están asociadas a otro Requerimiento.",
                builds: requirementsWithBuilds.flatMap(req => req.builds.map(b => ({
                    build_id: b.build_id,
                    build_name: b.build_name,
                    requirement_id: req.requirement_id
                })))
            });
        }

        // Agregar las Builds al requerimiento
        requirement.builds.push(...builds.map(b => b._id));

        await requirement.save();

        // Retornar requerimiento actualizado
        const updatedRequirement = await Requirement.findOne({ requirement_id })
            .populate('builds', 'build_id build_name');

        res.json({
            message: `Builds asociadas exitosamente al Requerimiento '${requirement_id}'.`,
            requirement: updatedRequirement
        });

    } catch (error) {
        console.error("❌ Error asociando Builds al Requerimiento:", error);
        res.status(500).json({ message: "Error asociando Builds al Requerimiento", error });
    }
};

// ✅ **Eliminar una o varias Builds de un Requerimiento**
exports.removeBuildsFromRequirement = async (req, res) => {
    try {
        const { requirement_id, build_ids } = req.body;

        // Buscar el requerimiento por `requirement_id`
        const requirement = await Requirement.findOne({ requirement_id });
        if (!requirement) {
            return res.status(404).json({ message: `Requerimiento con ID '${requirement_id}' no encontrado.` });
        }

        // Buscar los ObjectId de las Builds a eliminar
        const builds = await Build.find({ build_id: { $in: build_ids } });
        if (builds.length === 0) {
            return res.status(400).json({ message: "Ninguna de las Builds existe en la base de datos." });
        }

        // Convertir a ObjectId
        const buildObjectIds = builds.map(build => build._id.toString());

        // Filtrar las Builds que deben ser eliminadas del Requerimiento
        requirement.builds = requirement.builds.filter(buildId => !buildObjectIds.includes(buildId.toString()));

        await requirement.save();

        // Retornar requerimiento actualizado
        const updatedRequirement = await Requirement.findOne({ requirement_id })
            .populate('builds', 'build_id build_name');

        res.json({
            message: `Builds eliminadas exitosamente del Requerimiento '${requirement_id}'.`,
            requirement: updatedRequirement
        });

    } catch (error) {
        console.error("❌ Error eliminando Builds del Requerimiento:", error);
        res.status(500).json({ message: "Error eliminando Builds del Requerimiento", error });
    }
};
