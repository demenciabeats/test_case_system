const mongoose = require('mongoose');

const StepSchema = new mongoose.Schema({
    step_id: { type: String, unique: true, immutable: true },
    step_number: { type: Number, required: true },
    action: { type: String, required: true },
    expected_result: { type: String, required: true },
    step_group: { type: mongoose.Schema.Types.ObjectId, ref: 'StepGroup', required: true },
    created_at: { type: Date, default: Date.now }
});

// ✅ Generar `step_number` automáticamente dentro del grupo
StepSchema.pre('save', async function (next) {
    if (!this.step_number) {
        const lastStep = await mongoose.model('Step').findOne({ step_group: this.step_group }).sort({ step_number: -1 });
        this.step_number = lastStep ? lastStep.step_number + 1 : 1;
    }
    next();
});

module.exports = mongoose.model('Step', StepSchema);
