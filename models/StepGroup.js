const mongoose = require('mongoose');

const StepGroupSchema = new mongoose.Schema({
    step_group_id: { type: String, unique: true, immutable: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    keywords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Keyword' }],
    steps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Step' }],
    created_at: { type: Date, default: Date.now }
});

// ✅ Generar `step_group_id` automáticamente con formato STGRP-XXXX
StepGroupSchema.pre('save', async function (next) {
    if (!this.step_group_id) {
        const lastGroup = await mongoose.model('StepGroup').findOne().sort({ created_at: -1 });
        const lastNumber = lastGroup ? parseInt(lastGroup.step_group_id.split('-')[1]) : 0;
        this.step_group_id = `STGRP-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

// 🚨 **ELIMINADA** la validación en `pre('validate')`, ya que los Steps se agregan después en el controlador.

module.exports = mongoose.model('StepGroup', StepGroupSchema);
