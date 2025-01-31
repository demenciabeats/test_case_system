/// models/Build.js
const mongoose = require('mongoose');
const BuildSchema = new mongoose.Schema({
    build_id: { type: String, unique: true, immutable: true },
    build_name: { type: String, required: true },
    build_description: { type: String, required: true },
    version: { type: String },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

BuildSchema.pre('save', async function (next) {
    if (!this.build_id) {
        const lastBuild = await mongoose.model('Build').findOne().sort({ createdAt: -1 });
        const lastNumber = lastBuild ? parseInt(lastBuild.build_id.split('-')[1]) : 0;
        this.build_id = `BLD-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Build', BuildSchema);