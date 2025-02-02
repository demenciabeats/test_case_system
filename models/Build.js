const mongoose = require('mongoose');

const BuildSchema = new mongoose.Schema({
    build_id: { type: String, unique: true, immutable: true }, // ID autogenerado BLD-XXXX
    build_name: { type: String, required: true }, // Nombre descriptivo
    build_description: { type: String, required: true }, // Descripción detallada
    version: { type: String }, // Versión del software en la build
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // Usuario creador
    pr_id: { type: String, required: true }, // Pull Request asociado en Bitbucket
    branch: { type: String, required: true }, // Rama de la que se generó la Build
    commit_hash: { type: String, required: true }, // Último commit de la Build
    status: { 
        type: String, 
        enum: ['Pendiente', 'En Ejecucion', 'Completada', 'Fallida'], 
        default: 'Pendiente' 
    }, // Estado de la Build
    environment: {
        os: { type: String, enum: ["Windows", "OSX", "Linux", "Unix"] },
        language: { 
            type: String, 
            enum: [
                // Frontend
                "HTML", "CSS", "JavaScript", "TypeScript", "Vue.js", "React", "Angular", "Svelte", "SolidJS", "Ember.js",
                // Backend
                "Node.js", "Python", "Django", "Flask", "Ruby", "Ruby on Rails", "PHP", "Laravel", "Java", "Spring Boot",
                "Kotlin", "C#", ".NET", "Go", "Rust", "Scala", "Perl", "Elixir",
                // Mobile
                "Swift", "Objective-C", "Kotlin", "Java", "Dart", "Flutter", "React Native", "Xamarin", "Ionic", "Cordova"
            ],
            required: true
        }, 
        execution_env: { type: String, enum: ['QA', 'Staging', 'Production', 'Develop'], default: 'QA' } // Entorno de ejecución
    }
}, { timestamps: true }); // ✅ Solo esto generará `createdAt` y `updatedAt`

// ✅ Auto-generación del build_id con formato BLD-XXXX
BuildSchema.pre('save', async function (next) {
    if (!this.build_id) {
        try {
            const lastBuild = await mongoose.model('Build').findOne().sort({ createdAt: -1 });

            let lastNumber = 0;
            if (lastBuild && lastBuild.build_id) {
                const match = lastBuild.build_id.match(/BLD-(\d+)/);
                if (match) {
                    lastNumber = parseInt(match[1], 10);
                }
            }

            this.build_id = `BLD-${String(lastNumber + 1).padStart(4, '0')}`;
        } catch (error) {
            console.error("Error generando build_id:", error);
            return next(error);
        }
    }
    next();
});

module.exports = mongoose.model('Build', BuildSchema);
