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
        os: { type: String, enum: ["Windows", "OSX","Lisnux","Unix" ]},
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
        execution_env: { type: String, enum: ['QA', 'Staging', 'Production','Develop'], default: 'QA' } // Entorno de ejecución
    },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
}, { timestamps: true });

// Auto-generación del build_id con formato BLD-XXXX
BuildSchema.pre('save', async function (next) {
    if (!this.build_id) {
        const lastBuild = await mongoose.model('Build').findOne().sort({ createdAt: -1 });
        const lastNumber = lastBuild ? parseInt(lastBuild.build_id.split('-')[1]) : 0;
        this.build_id = `BLD-${String(lastNumber + 1).padStart(4, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Build', BuildSchema);
