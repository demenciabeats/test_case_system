const Project = require('../models/Project');
const Keyword = require('../models/Keyword');  
const Celula = require('../models/Celula');
const User = require('../models/User');

// ✅ Valores permitidos para los enums
const validProjectCategories = [
    'Aplicación Web - Corporativa', 'Aplicación Web - SaaS', 'Aplicación Web - E-commerce',
    'Aplicación Móvil - Android', 'Aplicación Móvil - iOS', 'Aplicación Móvil - Híbrida',
    'Backend API - REST', 'Backend API - GraphQL', 'Backend API - WebSockets',
    'Infraestructura - DevOps', 'Infraestructura - CI/CD', 'Infraestructura - Kubernetes',
    'Automatización - Pruebas Funcionales', 'Automatización - Pruebas de Carga', 'Automatización - RPA',
    'Seguridad - Pentesting', 'Seguridad - Cifrado y Protección de Datos'
];

const validBusinessModels = ['B2B', 'B2C', 'B2G', 'C2C', 'Freemium', 'Suscripción', 'Pago Único'];

const validSecurityLevels = [
    'Básico - Sin datos sensibles', 'Intermedio - Autenticación estándar',
    'Alto - Cumple con normativas (ISO, GDPR)', 'Crítico - Protección avanzada y cifrado extremo'
];

const validExecutionPlatforms = [
    'Web', 'Móvil - Android', 'Móvil - iOS', 'Móvil - Multiplataforma',
    'Desktop - Windows', 'Desktop - MacOS', 'Desktop - Linux',
    'IoT', 'Cloud - AWS', 'Cloud - Azure', 'Cloud - GCP', 'Híbrido'
];

const validMaintenanceStatuses = [
    'Activo - Desarrollo en curso', 'Activo - Solo mantenimiento', 'En pausa', 'Deprecado'
];

const validPriorities = [
    'Baja - Proyecto experimental', 'Baja - Poca urgencia',
    'Media - Relevante para la empresa', 'Media - Necesario en roadmap',
    'Alta - Proyecto estratégico', 'Alta - Alto impacto en negocio',
    'Crítica - Impacto financiero severo', 'Crítica - Cliente clave'
];

const validComplexities = [
    'Baja - Desarrollo sencillo', 'Baja - Pequeño alcance',
    'Media - Integración con otros sistemas', 'Media - Alguna complejidad técnica',
    'Alta - Múltiples dependencias', 'Alta - Tecnología avanzada',
    'Crítica - Requiere alta especialización', 'Crítica - Normativas estrictas'
];

// ✅ Función para validar valores de enum
const validateEnum = (value, validValues, fieldName) => {
    if (value && !validValues.includes(value)) {
        return `El valor '${value}' para '${fieldName}' no es válido. Valores permitidos: ${validValues.join(', ')}.`;
    }
    return null;
};

// ✅ **Crear un Proyecto (Validación de nombre único)**
exports.createProject = async (req, res) => {
    try {
        const { project_name, project_category, business_model, security_level, execution_platform, maintenance_status, priority, complexity } = req.body;

        // ✅ Validar si el nombre del proyecto ya existe
        const existingProject = await Project.findOne({ project_name: project_name.trim() });
        if (existingProject) {
            return res.status(400).json({ message: `El proyecto con nombre '${project_name}' ya existe.` });
        }

        // 🔍 Validaciones de ENUMS
        let errors = [];
        if (project_category) errors.push(validateEnum(project_category, validProjectCategories, 'project_category'));
        if (business_model) errors.push(validateEnum(business_model, validBusinessModels, 'business_model'));
        if (security_level) errors.push(validateEnum(security_level, validSecurityLevels, 'security_level'));
        if (execution_platform) errors.push(validateEnum(execution_platform, validExecutionPlatforms, 'execution_platform'));
        if (maintenance_status) errors.push(validateEnum(maintenance_status, validMaintenanceStatuses, 'maintenance_status'));
        if (priority) errors.push(validateEnum(priority, validPriorities, 'priority'));
        if (complexity) errors.push(validateEnum(complexity, validComplexities, 'complexity'));

        errors = errors.filter(error => error !== null);
        if (errors.length > 0) return res.status(400).json({ message: 'Errores en la validación de datos', errors });

        // ✅ Crear el proyecto
        const project = new Project({ ...req.body, created_by: req.user.id });
        await project.save();
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ message: 'Error creando proyecto', error });
    }
};
// ✅ **Actualizar un Proyecto con validaciones**
exports.updateProject = async (req, res) => {
    try {
        const { project_name, keywords, celula, product_manager, ...updateData } = req.body;
        const project_id = req.params.id;

        // 🔍 **Verificar si el proyecto existe**
        const existingProject = await Project.findOne({ project_id });
        if (!existingProject) {
            return res.status(404).json({ message: `Proyecto con ID ${project_id} no encontrado` });
        }

        // 🔍 **Validar y limpiar `project_name` si se envía**
        if (project_name && typeof project_name === 'string') {
            const trimmedProjectName = project_name.trim();

            // 🔍 **Verificar si otro proyecto ya tiene este nombre**
            const existingName = await Project.findOne({ project_name: trimmedProjectName, project_id: { $ne: project_id } });
            if (existingName) {
                return res.status(400).json({ message: `El nombre del proyecto '${trimmedProjectName}' ya está en uso.` });
            }
            updateData.project_name = trimmedProjectName;
        }

        // 🔍 **Validar `keywords` si se envían**
        let keywordObjects = [];
        if (Array.isArray(keywords) && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "Algunas keywords no existen en la base de datos." });
            }
            updateData.keywords = keywordObjects.map(k => k._id);
        }

        // 🔍 **Validar `celula` si se envía**
        if (celula) {
            const existingCelula = await Celula.findById(celula);
            if (!existingCelula) {
                return res.status(400).json({ message: `No se encontró la célula con ID ${celula}` });
            }
            updateData.celula = celula;
        }

        // 🔍 **Validar `product_manager` si se envía**
        if (product_manager) {
            const existingManager = await User.findById(product_manager);
            if (!existingManager) {
                return res.status(400).json({ message: `No se encontró el Product Manager con ID ${product_manager}` });
            }
            updateData.product_manager = product_manager;
        }

        // ✅ **Actualizar el Proyecto**
        const updatedProject = await Project.findOneAndUpdate(
            { project_id },
            updateData,
            { new: true }
        ).populate('keywords', 'keyword_name');

        if (!updatedProject) {
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        }

        res.json(updatedProject);
    } catch (error) {
        console.error("❌ Error actualizando proyecto:", error);
        res.status(500).json({ message: 'Error actualizando proyecto', error });
    }
};
// ✅ **Eliminar un Proyecto**
exports.deleteProject = async (req, res) => {
    try {
        const deletedProject = await Project.findOneAndDelete({ project_id: req.params.id });
        if (!deletedProject) return res.status(404).json({ message: 'Proyecto no encontrado' });

        res.json({ message: 'Proyecto eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando proyecto', error });
    }
};
// ✅ **Obtener todos los Proyectos con salida estructurada y optimizada**
exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.find()
            .populate('created_by', '_id username') // ✅ ID y username
            .populate('product_manager', '_id username') // ✅ ID y username
            .populate('celula', '_id celula_name') // ✅ ID y nombre de la célula
            .populate('keywords', '_id keyword_name') // ✅ ID y nombre de la keyword
            .select('project_id project_name project_category business_model security_level execution_platform maintenance_status priority complexity created_at') // ✅ Solo los campos esenciales
            .lean(); // ✅ Optimiza la consulta al devolver objetos JSON puros

        const formattedProjects = projects.map(proj => ({
            project_id: proj.project_id,
            project_name: proj.project_name,
            project_category: proj.project_category,
            business_model: proj.business_model,
            security_level: proj.security_level,
            execution_platform: proj.execution_platform,
            maintenance_status: proj.maintenance_status,
            priority: proj.priority,
            complexity: proj.complexity,
            created_by: proj.created_by ? { id: proj.created_by._id, username: proj.created_by.username } : null,
            product_manager: proj.product_manager ? { id: proj.product_manager._id, username: proj.product_manager.username } : null,
            celula: proj.celula ? { id: proj.celula._id, name: proj.celula.celula_name } : null,
            keywords: proj.keywords.map(k => ({ id: k._id, name: k.keyword_name })),
            created_at: proj.created_at
        }));

        res.json(formattedProjects);
    } catch (error) {
        console.error("❌ Error obteniendo Proyectos:", error);
        res.status(500).json({ message: 'Error obteniendo proyectos', error });
    }
};
// ✅ **Obtener un Proyecto por su ID con salida estructurada y optimizada**
exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findOne({ project_id: req.params.id })
            .populate('created_by', '_id username') // ✅ ID y username
            .populate('product_manager', '_id username') // ✅ ID y username
            .populate('celula', '_id celula_name') // ✅ ID y nombre de la célula
            .populate('keywords', '_id keyword_name') // ✅ ID y nombre de la keyword
            .select('project_id project_name project_category business_model security_level execution_platform maintenance_status priority complexity created_at') // ✅ Solo los campos esenciales
            .lean(); // ✅ Optimiza la consulta al devolver objetos JSON puros

        if (!project) {
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        }

        const formattedProject = {
            project_id: project.project_id,
            project_name: project.project_name,
            project_category: project.project_category,
            business_model: project.business_model,
            security_level: project.security_level,
            execution_platform: project.execution_platform,
            maintenance_status: project.maintenance_status,
            priority: project.priority,
            complexity: project.complexity,
            created_by: project.created_by ? { id: project.created_by._id, username: project.created_by.username } : null,
            product_manager: project.product_manager ? { id: project.product_manager._id, username: project.product_manager.username } : null,
            celula: project.celula ? { id: project.celula._id, name: project.celula.celula_name } : null,
            keywords: project.keywords.map(k => ({ id: k._id, name: k.keyword_name })),
            created_at: project.created_at
        };

        res.json(formattedProject);
    } catch (error) {
        console.error("❌ Error obteniendo Proyecto:", error);
        res.status(500).json({ message: 'Error obteniendo proyecto', error });
    }
};
