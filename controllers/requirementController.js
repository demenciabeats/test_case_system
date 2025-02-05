const mongoose = require('mongoose');
const Requirement = require('../models/Requirement');
const Build = require('../models/Build');
const Keyword = require('../models/Keyword');
const Project = require('../models/Project');
const User = require('../models/User');  // Para `created_by`, `tech_lead`, `testers`
const Celula = require('../models/Celula'); // Para `celula`

// Valores permitidos para los ENUMs
const validStatuses = ['Pendiente - PreQA', 'En Desarrollo - Development', 'QA', 'Aprobado', 'Rechazado'];
const validRequirementTypes = ['Funcional', 'No Funcional', 'Seguridad', 'Rendimiento', 'Usabilidad'];
const validPriorities = ['Baja', 'Media Baja', 'Media', 'Alta', 'Crítica'];
const validComplexities = ['Baja', 'Media', 'Alta', 'Muy Alta'];

// Estados no permitidos para agregar una Build a un Requerimiento
const invalidBuildStatuses = ['En Ejecucion', 'Completada', 'Fallida'];

// ✅ Validación ENUM
const validateEnum = (value, validValues, fieldName) => {
    if (value && !validValues.includes(value)) {
        return `El valor '${value}' para '${fieldName}' no es válido. Valores permitidos: ${validValues.join(', ')}.`;
    }
    return null;
};
// ✅ Crear un Requerimiento con Validaciones de todas las relaciones externas
exports.createRequirement = async (req, res) => {
    try {
        const { requirement_name, external_id, project_id, tech_lead, celula, testers, builds, keywords } = req.body;
        let errors = [];

        // ✅ **Validar que el `project_id` exista**
        if (!project_id) {
            errors.push("El campo 'project_id' es obligatorio.");
        } else {
            const existingProject = await Project.findOne({ project_id });
            if (!existingProject) {
                errors.push(`No se encontró un Proyecto con ID '${project_id}'.`);
            }
        }

        // ✅ **Validar `tech_lead` si se envía**
        if (tech_lead) {
            const existingTechLead = await User.findById(tech_lead);
            if (!existingTechLead) {
                errors.push(`No se encontró un Tech Lead con ID '${tech_lead}'.`);
            }
        }

        // ✅ **Validar `celula` si se envía**
        if (celula) {
            const existingCelula = await Celula.findById(celula);
            if (!existingCelula) {
                errors.push(`No se encontró una Célula con ID '${celula}'.`);
            }
        }

        // ✅ **Validar `testers` si se envían**
        let testerObjects = [];
        if (testers && testers.length > 0) {
            testerObjects = await User.find({ _id: { $in: testers } });
            if (testerObjects.length !== testers.length) {
                errors.push("Algunos testers no existen en la base de datos.");
            }
        }

        // ✅ **Validar `builds` si se envían**
        let buildObjects = [];
        if (builds && builds.length > 0) {
            buildObjects = await Build.find({ build_id: { $in: builds } });
            
            // Verificar si hay Builds inexistentes
            if (buildObjects.length !== builds.length) {
                errors.push("Algunas Builds no existen en la base de datos.");
            }

            // Verificar si las Builds tienen un estado inválido
            const invalidBuilds = buildObjects.filter(build => invalidBuildStatuses.includes(build.status));
            if (invalidBuilds.length > 0) {
                errors.push({
                    message: "Algunas Builds tienen estados inválidos para ser asociadas.",
                    builds: invalidBuilds.map(b => ({
                        build_id: b.build_id,
                        build_name: b.build_name,
                        status: b.status
                    }))
                });
            }

            // Verificar si alguna Build ya está asociada a otro Requerimiento
            const existingRequirements = await Requirement.find({ builds: { $in: buildObjects.map(b => b._id) } })
                .populate('builds', 'build_id build_name');
            if (existingRequirements.length > 0) {
                errors.push({
                    message: "Algunas Builds ya están asociadas a otro Requerimiento.",
                    builds: existingRequirements.flatMap(req => req.builds.map(b => ({
                        build_id: b.build_id,
                        build_name: b.build_name,
                        requirement_id: req.requirement_id
                    })))
                });
            }
        }

        // ✅ **Validar `keywords` si se envían**
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                errors.push("Algunas Keywords no existen en la base de datos.");
            }
        }

        // 🚨 **Si hay errores, retornar antes de crear el requerimiento**
        if (errors.length > 0) {
            return res.status(400).json({ message: 'Errores en la validación de datos', errors });
        }

        // ✅ **Crear el Requerimiento**
        const requirement = new Requirement({
            ...req.body,
            requirement_name: requirement_name.trim(),
            builds: buildObjects.map(b => b._id),
            keywords: keywordObjects.map(k => k._id),
            testers: testerObjects.map(t => t._id),
            created_by: req.user.id
        });

        await requirement.save();

        // ✅ **Obtener el requerimiento con sus relaciones para la respuesta**
        const fullRequirement = await Requirement.findOne({ requirement_id: requirement.requirement_id })
            .populate('created_by tech_lead celula testers builds')
            .populate('keywords', 'keyword_name');

        res.status(201).json({
            message: "Requerimiento creado exitosamente.",
            requirement: {
                requirement_id: fullRequirement.requirement_id,
                requirement_name: fullRequirement.requirement_name,
                description: fullRequirement.description,
                project_id: fullRequirement.project_id,
                status: fullRequirement.status,
                requirement_type: fullRequirement.requirement_type,
                priority: fullRequirement.priority,
                complexity: fullRequirement.complexity,
                created_by: fullRequirement.created_by ? { _id: fullRequirement.created_by._id, username: fullRequirement.created_by.username } : null,
                tech_lead: fullRequirement.tech_lead ? { _id: fullRequirement.tech_lead._id, username: fullRequirement.tech_lead.username } : null,
                testers: fullRequirement.testers.map(t => ({ _id: t._id, username: t.username })),
                celula: fullRequirement.celula ? { _id: fullRequirement.celula._id, name: fullRequirement.celula.celula_name } : null,
                builds: fullRequirement.builds.map(b => ({
                    build_id: b.build_id,
                    build_name: b.build_name,
                    version: b.version,
                    status: b.status,
                })),
                keywords: fullRequirement.keywords.map(k => ({ _id: k._id, name: k.keyword_name })),
                external_id: fullRequirement.external_id,
                external_link: fullRequirement.external_link,
                sprints: fullRequirement.sprints,
                estimated_end_date: fullRequirement.estimated_end_date,
                start_date: fullRequirement.start_date,
                end_date: fullRequirement.end_date,
                createdAt: fullRequirement.createdAt
            }
        });
    } catch (error) {
        console.error("❌ Error creando requerimiento:", error);

        // ✅ Manejo de error de clave duplicada
        if (error.code === 11000) {
            return res.status(400).json({
                message: "Error de duplicidad",
                error: {
                    field: Object.keys(error.keyPattern)[0],
                    value: error.keyValue[Object.keys(error.keyPattern)[0]],
                    message: `El valor '${error.keyValue[Object.keys(error.keyPattern)[0]]}' ya está en uso.`
                }
            });
        }

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