/// models/Requirement.js
const mongoose = require('mongoose');
const RequirementSchema = new mongoose.Schema({
    requirement_id: { type: String, unique: true, immutable: true },
    requirement_name: { type: String, required: true },
    description: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tech_lead: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    celula: { type: mongoose.Schema.Types.ObjectId, ref: 'Celula' },
    external_id: { type: String, unique: true, sparse: true } // ID externo para Jira u otros sistemas
}, { timestamps: true });

RequirementSchema.pre('save', async function (next) {
    if (!this.requirement_id) {
        const lastRequirement = await mongoose.model('Requirement').findOne().sort({ createdAt: -1 });
        const lastNumber = lastRequirement ? parseInt(lastRequirement.requirement_id.split('-')[1]) : 0;
        this.requirement_id = `REQ-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Requirement', RequirementSchema);