const mongoose = require('mongoose');

const StepGroupSchema = new mongoose.Schema({
    step_group_id: { type: String, unique: true, immutable: true },
    name: { type: String, required: true, unique: true },
    description: { type: String, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    keywords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Keyword', index: true }],
    steps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Step', index: true }]
}, { timestamps: true });

// ✅ Generar `step_group_id` automáticamente con formato STGRP-XXXX
StepGroupSchema.pre('save', async function (next) {
    if (!this.step_group_id) {
        const lastGroup = await mongoose.model('StepGroup').findOne().sort({ createdAt: -1 });

        const lastNumber = lastGroup && lastGroup.step_group_id
            ? parseInt(lastGroup.step_group_id.split('-')[1]) || 0
            : 0;

        this.step_group_id = `STGRP-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('StepGroup', StepGroupSchema);
