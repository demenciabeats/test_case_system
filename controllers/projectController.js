const Project = require('../models/Project');

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

// ✅ **Crear un Proyecto**
exports.createProject = async (req, res) => {
    try {
        const { project_category, business_model, security_level, execution_platform, maintenance_status, priority, complexity } = req.body;

        // 🔍 Validaciones de ENUMS
        let errors = [];
        if (project_category) errors.push(validateEnum(project_category, validProjectCategories, 'project_category'));
        if (business_model) errors.push(validateEnum(business_model, validBusinessModels, 'business_model'));
        if (security_level) errors.push(validateEnum(security_level, validSecurityLevels, 'security_level'));
        if (execution_platform) errors.push(validateEnum(execution_platform, validExecutionPlatforms, 'execution_platform'));
        if (maintenance_status) errors.push(validateEnum(maintenance_status, validMaintenanceStatuses, 'maintenance_status'));
        if (priority) errors.push(validateEnum(priority, validPriorities, 'priority'));
        if (complexity) errors.push(validateEnum(complexity, validComplexities, 'complexity'));

        // 🔍 Filtrar errores
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

// ✅ **Actualizar un Proyecto**
exports.updateProject = async (req, res) => {
    try {
        const { project_category, business_model, security_level, execution_platform, maintenance_status, priority, complexity, ...updateData } = req.body;

        // 🔍 Validaciones de ENUMS
        let errors = [];
        if (project_category) errors.push(validateEnum(project_category, validProjectCategories, 'project_category'));
        if (business_model) errors.push(validateEnum(business_model, validBusinessModels, 'business_model'));
        if (security_level) errors.push(validateEnum(security_level, validSecurityLevels, 'security_level'));
        if (execution_platform) errors.push(validateEnum(execution_platform, validExecutionPlatforms, 'execution_platform'));
        if (maintenance_status) errors.push(validateEnum(maintenance_status, validMaintenanceStatuses, 'maintenance_status'));
        if (priority) errors.push(validateEnum(priority, validPriorities, 'priority'));
        if (complexity) errors.push(validateEnum(complexity, validComplexities, 'complexity'));

        // 🔍 Filtrar errores
        errors = errors.filter(error => error !== null);
        if (errors.length > 0) return res.status(400).json({ message: 'Errores en la validación de datos', errors });

        // ✅ Actualizar el proyecto
        const updatedProject = await Project.findOneAndUpdate(
            { project_id: req.params.id },
            updateData,
            { new: true }
        ).populate('keywords');

        if (!updatedProject) return res.status(404).json({ message: 'Proyecto no encontrado' });
        res.json(updatedProject);
    } catch (error) {
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

// ✅ **Obtener todos los Proyectos**
exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.find().populate('created_by product_manager celula keywords');
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo proyectos', error });
    }
};

// ✅ **Obtener un Proyecto por su ID**
exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findOne({ project_id: req.params.id }).populate('created_by product_manager celula keywords');
        if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });

        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo proyecto', error });
    }
};
