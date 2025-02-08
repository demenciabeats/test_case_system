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

exports.createProject = async (req, res) => {
    try {
        const { project_name, product_manager, keywords, celula, is_active, ...projectData } = req.body;
        let errors = [];

        // 🔍 **Verificar si el nombre ya existe**
        const existingProject = await Project.findOne({ project_name: project_name.trim() });
        if (existingProject) {
            return res.status(400).json({ message: `El proyecto con nombre '${project_name}' ya existe.` });
        }

        // 🔍 **Validaciones**
        if (!product_manager) {
            errors.push("El campo 'product_manager' es obligatorio.");
        } else {
            const existingManager = await User.findById(product_manager);
            if (!existingManager) {
                errors.push(`No se encontró el Product Manager con ID '${product_manager}'.`);
            }
        }

        let keywordObjects = [];
        if (Array.isArray(keywords) && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                errors.push("Algunas keywords no existen en la base de datos.");
            }
        }

        if (celula) {
            const existingCelula = await Celula.findById(celula);
            if (!existingCelula) {
                errors.push(`No se encontró la célula con ID '${celula}'.`);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ message: "Errores en la validación de datos", errors });
        }

        // ✅ **Crear el proyecto**
        const project = new Project({
            ...projectData,
            project_name: project_name.trim(),
            product_manager,
            keywords: keywordObjects.map(k => k._id),
            celula,
            is_active: is_active !== undefined ? is_active : true, // ✅ Ahora toma el valor enviado o usa `true` por defecto
            created_by: req.user.id
        });

        await project.save();

        // ✅ **Obtener el proyecto con relaciones**
        const fullProject = await Project.findOne({ project_id: project.project_id })
            .populate('created_by', '_id username')
            .populate('product_manager', '_id username')
            .populate('celula', '_id celula_name')
            .populate('keywords', '_id keyword_name')
            .select('-__v -updatedAt');

        res.status(201).json(fullProject);
    } catch (error) {
        console.error("Error creando proyecto:", error);
        res.status(500).json({ message: "Error creando proyecto", error });
    }
};

// ✅ **Actualizar un Proyecto con validaciones**
exports.updateProject = async (req, res) => {
    try {
        const { project_name, keywords, celula, product_manager, is_active, ...updateData } = req.body;
        const project_id = req.params.id;

        // 🔍 **Verificar si el proyecto existe**
        const existingProject = await Project.findOne({ project_id });
        if (!existingProject) {
            return res.status(404).json({ message: `Proyecto con ID ${project_id} no encontrado` });
        }

        if (project_name && typeof project_name === 'string') {
            const trimmedProjectName = project_name.trim();

            const existingName = await Project.findOne({ project_name: trimmedProjectName, project_id: { $ne: project_id } });
            if (existingName) {
                return res.status(400).json({ message: `El nombre del proyecto '${trimmedProjectName}' ya está en uso.` });
            }
            updateData.project_name = trimmedProjectName;
        }

        let keywordObjects = [];
        if (Array.isArray(keywords) && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "Algunas keywords no existen en la base de datos." });
            }
            updateData.keywords = keywordObjects.map(k => k._id);
        }

        if (celula) {
            const existingCelula = await Celula.findById(celula);
            if (!existingCelula) {
                return res.status(400).json({ message: `No se encontró la célula con ID ${celula}` });
            }
            updateData.celula = celula;
        }

        if (product_manager) {
            const existingManager = await User.findById(product_manager);
            if (!existingManager) {
                return res.status(400).json({ message: `No se encontró el Product Manager con ID ${product_manager}` });
            }
            updateData.product_manager = product_manager;
        }

        if (is_active !== undefined) {
            updateData.is_active = is_active;
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
        console.error("Error actualizando proyecto:", error);
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
            .populate('created_by', '_id username')
            .populate('product_manager', '_id username')
            .populate('celula', '_id celula_name')
            .populate('keywords', '_id keyword_name')
            .select('-__v -updatedAt')
            .lean();

        res.json(projects);
    } catch (error) {
        console.error("Error obteniendo proyectos:", error);
        res.status(500).json({ message: 'Error obteniendo proyectos', error });
    }
};
// ✅ **Obtener un Proyecto por su ID con salida estructurada y optimizada**
exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findOne({ project_id: req.params.id })
            .populate('created_by', '_id username')
            .populate('product_manager', '_id username')
            .populate('celula', '_id celula_name')
            .populate('keywords', '_id keyword_name')
            .select('-__v -updatedAt')
            .lean();

        if (!project) {
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        }

        res.json(project);
    } catch (error) {
        console.error("Error obteniendo Proyecto:", error);
        res.status(500).json({ message: 'Error obteniendo proyecto', error });
    }
};
// ✅ Valores permitidos para los enums con descripciones
const validEnums = {
    project_category: [
        'Aplicación Web - Corporativa',
        'Aplicación Web - SaaS',
        'Aplicación Web - E-commerce',
        'Aplicación Móvil - Android',
        'Aplicación Móvil - iOS',
        'Aplicación Móvil - Híbrida',
        'Backend API - REST',
        'Backend API - GraphQL',
        'Backend API - WebSockets',
        'Infraestructura - DevOps',
        'Infraestructura - CI/CD',
        'Infraestructura - Kubernetes',
        'Automatización - Pruebas Funcionales',
        'Automatización - Pruebas de Carga',
        'Automatización - RPA',
        'Seguridad - Pentesting',
        'Seguridad - Cifrado y Protección de Datos'
    ],
    business_model: [
        'B2B - Negocios a Negocios',
        'B2C - Negocios a Consumidores',
        'B2G - Negocios a Gobierno',
        'C2C - Consumidor a Consumidor',
        'Freemium - Gratis con mejoras pagas',
        'Suscripción - Pago recurrente',
        'Pago Único - Compra sin suscripción'
    ],
    security_level: [
        'Básico - Sin datos sensibles',
        'Intermedio - Autenticación estándar',
        'Alto - Cumple con normativas (ISO, GDPR)',
        'Crítico - Protección avanzada y cifrado extremo'
    ],
    execution_platform: [
        'Web',
        'Móvil - Android',
        'Móvil - iOS',
        'Móvil - Multiplataforma',
        'Desktop - Windows',
        'Desktop - MacOS',
        'Desktop - Linux',
        'IoT',
        'Cloud - AWS',
        'Cloud - Azure',
        'Cloud - GCP',
        'Híbrido'
    ],
    maintenance_status: [
        'Activo - Desarrollo en curso',
        'Activo - Solo mantenimiento',
        'En pausa',
        'Deprecado'
    ],
    priority: [
        'Baja - Proyecto experimental',
        'Baja - Poca urgencia',
        'Media - Relevante para la empresa',
        'Media - Necesario en roadmap',
        'Alta - Proyecto estratégico',
        'Alta - Alto impacto en negocio',
        'Crítica - Impacto financiero severo',
        'Crítica - Cliente clave'
    ],
    complexity: [
        'Baja - Desarrollo sencillo',
        'Baja - Pequeño alcance',
        'Media - Integración con otros sistemas',
        'Media - Alguna complejidad técnica',
        'Alta - Múltiples dependencias',
        'Alta - Tecnología avanzada',
        'Crítica - Requiere alta especialización',
        'Crítica - Normativas estrictas'
    ]
};
// ✅ Método para obtener los enums permitidos
exports.getProjectEnums = async (req, res) => {
    try {
        res.json(validEnums);
    } catch (error) {
        console.error("❌ Error obteniendo enums de proyectos:", error);
        res.status(500).json({ message: "Error obteniendo enums de proyectos", error });
    }
};