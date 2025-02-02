const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    project_id: { type: String, unique: true, immutable: true },
    project_name: { type: String, required: true },
    description: { type: String },

    // ✅ Usuario que creó el proyecto
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ✅ Product Manager asignado al proyecto
    product_manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // ✅ Célula de desarrollo asociada
    celula: { type: mongoose.Schema.Types.ObjectId, ref: 'Celula' },

    // ✅ Palabras clave asociadas
    keywords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Keyword' }],

    // ✅ Tipo de proyecto más detallado
    project_category: {
        type: String,
        enum: [
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
        required: true
    },

    // ✅ Tecnologías principales del proyecto
    technologies: [{
        type: String,
        enum: [
            "JavaScript", "TypeScript", "Vue.js", "React", "Angular", "Svelte",
            "Node.js", "Python", "Django", "Flask", "Ruby", "PHP", "Laravel", "Java", "Spring Boot",
            "Kotlin", "C#", ".NET", "Go", "Rust", "Scala", "Swift", "Objective-C", "Dart", "Flutter",
            "Docker", "Kubernetes", "Terraform", "Jenkins", "GitHub Actions", "AWS", "Azure", "GCP"
        ]
    }],

    // ✅ Modelo de negocio
    business_model: {
        type: String,
        enum: [
            'B2B', // Business to Business
            'B2C', // Business to Consumer
            'B2G', // Business to Government
            'C2C', // Consumer to Consumer
            'Freemium',
            'Suscripción',
            'Pago Único'
        ],
        required: true
    },

    // ✅ Nivel de seguridad requerido
    security_level: {
        type: String,
        enum: [
            'Básico - Sin datos sensibles',
            'Intermedio - Autenticación estándar',
            'Alto - Cumple con normativas (ISO, GDPR)',
            'Crítico - Protección avanzada y cifrado extremo'
        ],
        required: true
    },

    // ✅ Plataforma donde se ejecuta el proyecto
    execution_platform: {
        type: String,
        enum: [
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
        required: true
    },

    // ✅ Estado de mantenimiento del proyecto
    maintenance_status: {
        type: String,
        enum: [
            'Activo - Desarrollo en curso',
            'Activo - Solo mantenimiento',
            'En pausa',
            'Deprecado'
        ],
        required: true
    },

    // ✅ Prioridad del proyecto (más detallado)
    priority: {
        type: String,
        enum: [
            'Baja - Proyecto experimental',
            'Baja - Poca urgencia',
            'Media - Relevante para la empresa',
            'Media - Necesario en roadmap',
            'Alta - Proyecto estratégico',
            'Alta - Alto impacto en negocio',
            'Crítica - Impacto financiero severo',
            'Crítica - Cliente clave'
        ],
        default: 'Media - Necesario en roadmap'
    },

    // ✅ Complejidad del proyecto (más detallado)
    complexity: {
        type: String,
        enum: [
            'Baja - Desarrollo sencillo',
            'Baja - Pequeño alcance',
            'Media - Integración con otros sistemas',
            'Media - Alguna complejidad técnica',
            'Alta - Múltiples dependencias',
            'Alta - Tecnología avanzada',
            'Crítica - Requiere alta especialización',
            'Crítica - Normativas estrictas'
        ],
        default: 'Media - Integración con otros sistemas'
    },

    // ✅ Indica si el proyecto está activo o no
    is_active: { type: Boolean, default: true }

}, { timestamps: true });

// ✅ Generación automática de `project_id`
ProjectSchema.pre('save', async function (next) {
    if (!this.project_id) {
        const lastProject = await mongoose.model('Project').findOne().sort({ createdAt: -1 });
        const lastNumber = lastProject ? parseInt(lastProject.project_id.split('-')[1]) : 0;
        this.project_id = `PRY-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Project', ProjectSchema);
