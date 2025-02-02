const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
    requirement_id: { type: String, unique: true, immutable: true }, // Correlativo REQ-XXXX
    requirement_name: { type: String, required: true }, // Nombre del requerimiento
    description: { type: String }, // Descripción detallada
    project_id: { type: String, required: true }, // ✅ Relación con el proyecto
    status: { 
        type: String, 
        enum: ['Pendiente - PreQA', 'En Desarrollo - Development', 'QA', 'Aprobado', 'Rechazado'], 
        default: 'Pendiente - PreQA' 
    },
    requirement_type: { 
        type: String, 
        enum: ['Funcional', 'No Funcional', 'Seguridad', 'Rendimiento', 'Usabilidad'], 
        required: true 
    },
    priority: { 
        type: String, 
        enum: ['Baja', 'Media Baja', 'Media', 'Alta', 'Crítica'], 
        default: 'Media' 
    },
    complexity: { 
        type: String, 
        enum: ['Baja', 'Media', 'Alta', 'Muy Alta'], 
        default: 'Media' 
    },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Usuario creador
    tech_lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Líder técnico asignado
    testers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // ✅ Testers asignados
    celula: { type: mongoose.Schema.Types.ObjectId, ref: 'Celula' }, // Célula de desarrollo
    builds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Build' }], // Asociación con `build_id`
    keywords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Keyword' }], // ✅ Relación con Keywords
    external_id: { type: String, unique: true, sparse: true }, // ID externo para Jira u otros sistemas
    external_link: { type: String }, // ✅ Link a Jira u otro sistema externo
    sprints: [{ type: String }], // ✅ Relación con uno o más sprints
    estimated_end_date: { type: Date }, // ✅ Fecha estimada de finalización
    start_date: { type: Date }, // ✅ Fecha de inicio (cuando el estado cambia a QA)
    end_date: { type: Date } // ✅ Fecha de finalización (cuando el estado cambia a Aprobado o Rechazado)
}, { timestamps: true });

// ✅ Generación automática del `requirement_id`
RequirementSchema.pre('save', async function (next) {
    if (!this.requirement_id) {
        const lastRequirement = await mongoose.model('Requirement').findOne().sort({ createdAt: -1 });
        const lastNumber = lastRequirement ? parseInt(lastRequirement.requirement_id.split('-')[1]) : 0;
        this.requirement_id = `REQ-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Requirement', RequirementSchema);
