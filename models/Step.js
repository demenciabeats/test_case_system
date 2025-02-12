// models/Step.js
const mongoose = require('mongoose');

const stepSchema = new mongoose.Schema({
  step_id: {
    type: String,
    unique: true
  },
  title: {
    type: String,
    required: true
    // Eliminamos: unique: true => ya no es globalmente único
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
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Referencia al Project por _id
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },

  // **NUEVO**: relación a Keywords
  keywords: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Keyword'
  }],

  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Generar el step_id correlativo automáticamente
stepSchema.pre('save', async function (next) {
  if (!this.step_id) {
    const lastStep = await this.constructor.findOne().sort({ created_at: -1 });
    const lastID = lastStep ? parseInt(lastStep.step_id.split('-')[1]) : 0;
    this.step_id = `S-${String(lastID + 1).padStart(4, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Step', stepSchema);
