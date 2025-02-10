// models/StepCaseTemplate.js

const mongoose = require('mongoose');

const stepCaseTemplateSchema = new mongoose.Schema({
  stc_id: {
    type: String,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,   // Referencia al User por ObjectId
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['Draft', 'Open', 'Closed'],     // Estado de la plantilla
    default: 'draft'
  },
  // En lugar de almacenar el ObjectId de Project, guardamos directamente su "project_id" (ej: "PRY-0001").
  project_id: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Generar STC-XXXX en secuencia automáticamente
stepCaseTemplateSchema.pre('save', async function (next) {
  if (!this.stc_id) {
    // Ordenamos por fecha de creación descendente para ver el último insertado
    const last = await this.constructor.findOne().sort({ createdAt: -1 });
    const lastNumber = last ? parseInt(last.stc_id.split('-')[1]) : 0;
    this.stc_id = `STC-${String(lastNumber + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('StepCaseTemplate', stepCaseTemplateSchema);
