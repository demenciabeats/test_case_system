// models/StepTemplate.js

const mongoose = require('mongoose');

const stepTemplateSchema = new mongoose.Schema({
  // Correlativo STT-0001, STT-0002...
  stt_id: {
    type: String,
    unique: true
  },

  // Copia de los campos de Step:
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  expected_result: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['Setup', 'Execution', 'Teardown'],
    required: true
  },
  is_critical: {
    type: Boolean,
    default: false
  },
  is_stop_point: {
    type: Boolean,
    default: false
  },
  stop_reason: {
    type: String,
    enum: ['Validation', 'Manual_intervention', 'Api_call', 'Automation_failure']
  },
  stop_action_required: {
    type: String
  },
  automation_type: {
    type: String,
    enum: ['Manual', 'Semi-automated', 'Automated'],
    required: true
  },
  script_paste: {
    type: String
  },
  attachments: [
    {
      file_name: String,
      file_url: String,
      file_type: {
        type: String,
        enum: ['Image', 'Pdf', 'Word', 'Script']
      }
    }
  ],

  // El usuario que crea la copia del step. 
  // (Podrías conservar el created_by original del Step o usar el user actual)
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Correlativo del proyecto (ej: PRY-0001)
  project_id: {
    type: String,
    required: true
  },

  // Correlativo del StepCaseTemplate (ej: STC-0001)
  template_id: {
    type: String,
    required: true
  },

  // Orden dentro de la plantilla
  order: {
    type: Number,
    default: 1
  },

  // Timestamps manuales (o podrías usar { timestamps: true })
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Generar STT-XXXX automáticamente
stepTemplateSchema.pre('save', async function(next) {
  if (!this.stt_id) {
    const last = await this.constructor.findOne().sort({ created_at: -1 });
    const lastNumber = last ? parseInt(last.stt_id.split('-')[1]) : 0;
    this.stt_id = `STT-${String(lastNumber + 1).padStart(4, '0')}`;
  }
  // Actualizamos updated_at
  this.updated_at = new Date();
  next();
});

module.exports = mongoose.model('StepTemplate', stepTemplateSchema);
