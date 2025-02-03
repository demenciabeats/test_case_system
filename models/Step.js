const mongoose = require('mongoose');

const StepSchema = new mongoose.Schema({
    step_id: { type: String, unique: true, immutable: true },
    step_number: { type: Number, required: true },
    action: { type: String, required: true },
    expected_result: { type: String, required: true },
    step_group: { type: mongoose.Schema.Types.ObjectId, ref: 'StepGroup', required: true }
}, { timestamps: true });

// ✅ Generador automático de `step_id` con formato `STGRP-XXXX-STEP-XX`
StepSchema.pre('save', async function (next) {
    if (!this.step_id) {
        const lastStep = await mongoose.model('Step').findOne({ step_group: this.step_group }).sort({ step_number: -1 });
        const nextNumber = lastStep ? lastStep.step_number + 1 : 1;

        this.step_number = nextNumber;
        this.step_id = `STGRP-${this.step_group}-STEP-${String(nextNumber).padStart(2, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Step', StepSchema);
