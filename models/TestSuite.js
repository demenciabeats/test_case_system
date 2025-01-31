/// models/TestSuite.js
const mongoose = require('mongoose');
const TestSuiteSchema = new mongoose.Schema({
    suite_id: { type: String, unique: true, immutable: true },
    suite_name: { type: String, required: true },
    suite_description: { type: String, required: true },
    owner_suite_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSuite', default: null, required: false },
    project_id: { type: String, required: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

TestSuiteSchema.pre('save', async function (next) {
    if (!this.suite_id) {
        const lastSuite = await mongoose.model('TestSuite').findOne().sort({ createdAt: -1 });
        const lastNumber = lastSuite ? parseInt(lastSuite.suite_id.split('-')[1]) : 0;
        this.suite_id = `TST-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('TestSuite', TestSuiteSchema);