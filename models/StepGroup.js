const mongoose = require('mongoose');

const StepGroupSchema = new mongoose.Schema({
    step_group_id: { type: String, unique: true, immutable: true }, // SG-XXXX
    name: { type: String, required: true },
    description: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    keywords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Keyword' }],
    steps: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Step' }]
}, { timestamps: true });

StepGroupSchema.pre('save', async function (next) {
    if (!this.step_group_id) {
        const lastStepGroup = await mongoose.model('StepGroup').findOne().sort({ createdAt: -1 });
        const lastNumber = lastStepGroup ? parseInt(lastStepGroup.step_group_id.split('-')[1]) : 0;
        this.step_group_id = `SG-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('StepGroup', StepGroupSchema);
