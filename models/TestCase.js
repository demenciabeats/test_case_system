// models/TestCase.js
const mongoose = require('mongoose');

const validPriorities = ['Baja', 'Media', 'Alta', 'Crítica'];
const validStatuses = ['Borrador', 'Listo', 'Deprecado'];
const validTestTypes = ['Funcional', 'Regresión', 'Smoke', 'Rendimiento', 'Seguridad', 'Usabilidad', 'Otro'];
const validAutomationStatuses = ['Manual', 'Automatizado', 'Semi-Automatizado'];

const TestCaseSchema = new mongoose.Schema({
  testcase_id: { type: String, unique: true, immutable: true },
  title: { type: String, required: true },
  description: { type: String },
  preconditions: { type: String },
  priority: { type: String, enum: validPriorities, required: true },
  status: { type: String, enum: validStatuses, default: 'Borrador' },
  test_type: { type: String, enum: validTestTypes, required: true },
  automation_status: { type: String, enum: validAutomationStatuses, required: true },

  suite_id: { type: mongoose.Schema.Types.ObjectId, ref: 'TestSuite', required: true },
  project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },

  expected_result: { type: String },
  duration_in_minutes: { type: Number, default: 0 },
  tester_occupation: { type: Number, default: 1 },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  keywords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Keyword' }],

  // Relación a un único StepCaseTemplate (por _id)
  step_case_template: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StepCaseTemplate'
  }

}, { timestamps: true });

// Generar correlativo `testcase_id` => p. ej. TC-0001
TestCaseSchema.pre('save', async function (next) {
  if (!this.testcase_id) {
    const lastTestCase = await mongoose.model('TestCase').findOne().sort({ createdAt: -1 });
    let nextNumber = 1;
    if (lastTestCase && lastTestCase.testcase_id) {
      const lastNumber = parseInt(lastTestCase.testcase_id.replace('TC-', ''), 10);
      nextNumber = lastNumber + 1;
    }
    this.testcase_id = `TC-${String(nextNumber).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('TestCase', TestCaseSchema);
