const mongoose = require('mongoose');

const RequirementSchema = new mongoose.Schema({
    requirement_id: { type: String, unique: true, immutable: true }, // Correlativo REQ-XXXX
    requirement_name: { type: String, required: true }, // Nombre del requerimiento
    description: { type: String }, // Descripción detallada
    status: { 
        type: String, 
        enum: ['Pendiente', 'En Desarrollo', 'En Revisión', 'Aprobado', 'Rechazado'], 
        default: 'Pendiente' 
    }, // Estado del requerimiento
    requirement_type: { 
        type: String, 
        enum: ['Funcional', 'No Funcional', 'Seguridad', 'Rendimiento', 'Usabilidad'], 
        required: true 
    }, // Tipo de requerimiento
    priority: { 
        type: String, 
        enum: ['Baja', 'Media', 'Alta', 'Crítica'], 
        default: 'Media' 
    }, // Prioridad del requerimiento
    complexity: { 
        type: String, 
        enum: ['Baja', 'Media', 'Alta'], 
        default: 'Media' 
    }, // Complejidad del requerimiento
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Usuario creador
    tech_lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Líder técnico asignado
    celula: { type: mongoose.Schema.Types.ObjectId, ref: 'Celula' }, // Célula de desarrollo
    builds: [{ type: String, ref: 'Build' }], // Asociación con `build_id` en lugar de `_id`
    external_id: { type: String, unique: true, sparse: true }, // ID externo para integración con Jira u otros sistemas
}, { timestamps: true });

// ✅ Generación automática del `requirement_id` con formato REQ-XXXX
RequirementSchema.pre('save', async function (next) {
    if (!this.requirement_id) {
        const lastRequirement = await mongoose.model('Requirement').findOne().sort({ createdAt: -1 });
        const lastNumber = lastRequirement ? parseInt(lastRequirement.requirement_id.split('-')[1]) : 0;
        this.requirement_id = `REQ-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Requirement', RequirementSchema);
