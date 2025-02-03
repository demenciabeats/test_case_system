const mongoose = require('mongoose');

const validSuiteTypes = ['Principal', 'Funcional', 'Regresión', 'Integración'];
const validSuiteStatuses = ['Activa', 'Inactiva', 'Obsoleta'];

const TestSuiteSchema = new mongoose.Schema({
    suite_id: { type: String, unique: true, immutable: true },
    suite_name: { type: String, required: true },
    suite_description: { type: String, required: true },
    owner_suite_id: { type: String, default: null, required: false }, // Permite jerarquía de suites
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    keywords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Keyword' }], // ✅ Relación con Keywords

    suite_type: { type: String, enum: validSuiteTypes, default: 'Funcional' }, // Define el tipo de suite
    suite_status: { type: String, enum: validSuiteStatuses, default: 'Activa' }, // Estado de la suite
}, { timestamps: true });

// ✅ Auto-generación del `suite_id` con formato `TST-XXXX`
TestSuiteSchema.pre('save', async function (next) {
    if (!this.suite_id) {
        const lastSuite = await mongoose.model('TestSuite').findOne().sort({ createdAt: -1 });
        const lastNumber = lastSuite ? parseInt(lastSuite.suite_id.split('-')[1]) : 0;
        this.suite_id = `TST-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('TestSuite', TestSuiteSchema);
