/// models/Project.js
const mongoose = require('mongoose');
const ProjectSchema = new mongoose.Schema({
    project_id: { type: String, unique: true, immutable: true },
    project_name: { type: String, required: true },
    description: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product_manager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    celula: { type: mongoose.Schema.Types.ObjectId, ref: 'Celula' },
    keywords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Keyword' }],
    is_active: { type: Boolean, default: true }
}, { timestamps: true });

ProjectSchema.pre('save', async function (next) {
    if (!this.project_id) {
        const lastProject = await mongoose.model('Project').findOne().sort({ createdAt: -1 });
        const lastNumber = lastProject ? parseInt(lastProject.project_id.split('-')[1]) : 0;
        this.project_id = `PRY-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Project', ProjectSchema);