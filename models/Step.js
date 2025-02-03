const mongoose = require('mongoose');

const StepSchema = new mongoose.Schema({
    step_id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    step_number: { type: Number, required: true },
    action: { type: String, required: true },
    expected_result: { type: String, required: true },
    step_group_id: { type: mongoose.Schema.Types.ObjectId, ref: 'StepGroup', required: true }
}, { timestamps: true });

module.exports = mongoose.model('Step', StepSchema);
