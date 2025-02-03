const Build = require('../models/Build');
const Keyword = require('../models/Keyword');

// ✅ Función para validar valores ENUM
const validateEnum = (value, validValues, fieldName) => {
    if (value && !validValues.includes(value)) {
        return `El valor '${value}' para '${fieldName}' no es válido. Valores permitidos: ${validValues.join(', ')}.`;
    }
    return null;
};


const validStatuses = ['Pendiente', 'En Ejecucion', 'Completada', 'Fallida'];
const validOS = ["Windows", "OSX", "Linux", "Unix"];
const validLanguages = [
    "HTML", "CSS", "JavaScript", "TypeScript", "Vue.js", "React", "Angular", "Svelte", "SolidJS", "Ember.js",
    "Node.js", "Python", "Django", "Flask", "Ruby", "Ruby on Rails", "PHP", "Laravel", "Java", "Spring Boot",
    "Kotlin", "C#", ".NET", "Go", "Rust", "Scala", "Perl", "Elixir",
    "Swift", "Objective-C", "Kotlin", "Java", "Dart", "Flutter", "React Native", "Xamarin", "Ionic", "Cordova"
];
const validExecutionEnvs = ['QA', 'Staging', 'Production', 'Develop'];

// ✅ **Crear Build con validaciones y Keywords**
exports.createBuild = async (req, res) => {
    try {
        const { build_name, status, environment, keywords } = req.body;
        let errors = [];

        // 🔍 Verificar si ya existe una Build con el mismo nombre
        const existingBuild = await Build.findOne({ build_name });
        if (existingBuild) {
            return res.status(400).json({ message: `Ya existe una Build con el nombre '${build_name}'.` });
        }

        // Validaciones de ENUM
        if (status) {
            const statusError = validateEnum(status, validStatuses, 'status');
            if (statusError) errors.push(statusError);
        }

        if (environment) {
            if (environment.os) {
                const osError = validateEnum(environment.os, validOS, 'environment.os');
                if (osError) errors.push(osError);
            }
            if (environment.language) {
                const languageError = validateEnum(environment.language, validLanguages, 'environment.language');
                if (languageError) errors.push(languageError);
            }
            if (environment.execution_env) {
                const execEnvError = validateEnum(environment.execution_env, validExecutionEnvs, 'environment.execution_env');
                if (execEnvError) errors.push(execEnvError);
            }
        }

        // Validación de Keywords
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                errors.push("Algunos keywords no existen en la base de datos.");
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({ message: 'Errores en la validación de datos', errors });
        }

        const build = new Build({
            ...req.body,
            created_by: req.user.id,
            keywords: keywordObjects.map(k => k._id)
        });

        await build.save();
        res.status(201).json(build);
    } catch (error) {
        console.error("❌ Error creando Build:", error);
        res.status(500).json({ message: 'Error creando build', error });
    }
};

// ✅ **Obtener todas las Builds con salida optimizada y keywords con ID y nombre**
exports.getBuilds = async (req, res) => {
    try {
        const builds = await Build.find()
            .populate('created_by', 'username') // ✅ Solo ID y username
            .populate('keywords', '_id keyword_name') // ✅ Solo ID y nombre de las keywords
            .select('-__v -updatedAt') // ✅ Excluir campos innecesarios
            .sort({ build_id: 1 }); // ✅ Ordenar por build_id

        const formattedBuilds = builds.map(build => ({
            build_id: build.build_id,
            build_name: build.build_name,
            version: build.version,
            status: build.status,
            environment: build.environment,
            created_by: build.created_by,
            keywords: build.keywords.map(k => ({
                id: k._id,
                name: k.keyword_name
            })), // ✅ Agregar ID y nombre de cada keyword
            createdAt: build.createdAt
        }));

        res.json(formattedBuilds);
    } catch (error) {
        console.error("❌ Error obteniendo Builds:", error);
        res.status(500).json({ message: 'Error obteniendo builds', error });
    }
};
// ✅ **Obtener una Build por ID con salida optimizada y keywords con ID y nombre**
exports.getBuildById = async (req, res) => {
    try {
        const build = await Build.findOne({ build_id: req.params.id })
            .populate('created_by', 'username') // ✅ Solo ID y username
            .populate('keywords', '_id keyword_name') // ✅ Solo ID y nombre de las keywords
            .select('-__v -updatedAt'); // ✅ Excluir campos innecesarios

        if (!build) return res.status(404).json({ message: 'Build no encontrada' });

        const formattedBuild = {
            build_id: build.build_id,
            build_name: build.build_name,
            version: build.version,
            status: build.status,
            environment: build.environment,
            created_by: build.created_by,
            keywords: build.keywords.map(k => ({
                id: k._id,
                name: k.keyword_name
            })), // ✅ Agregar ID y nombre de cada keyword
            createdAt: build.createdAt
        };

        res.json(formattedBuild);
    } catch (error) {
        console.error("❌ Error obteniendo Build:", error);
        res.status(500).json({ message: 'Error obteniendo build', error });
    }
};
// ✅ **Actualizar una Build incluyendo Keywords y validación de nombre duplicado**
exports.updateBuild = async (req, res) => {
    try {
        const { build_name, keywords, ...updateData } = req.body;
        let keywordObjects = [];

        // 🔍 Verificar si el nuevo nombre de Build ya existe (excluyendo la Build actual)
        const existingBuild = await Build.findOne({ build_name, _id: { $ne: req.params.id } });
        if (existingBuild) {
            return res.status(400).json({ message: `Ya existe una Build con el nombre '${build_name}'.` });
        }

        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "Algunos keywords no existen en la base de datos." });
            }
        }

        const updatedBuild = await Build.findOneAndUpdate(
            { build_id: req.params.id },
            { ...updateData, keywords: keywordObjects.map(k => k._id) },
            { new: true }
        ).populate('keywords', 'keyword_name');

        if (!updatedBuild) return res.status(404).json({ message: 'Build no encontrada' });
        res.json(updatedBuild);
    } catch (error) {
        console.error("❌ Error actualizando Build:", error);
        res.status(500).json({ message: 'Error actualizando build', error });
    }
};
// ✅ **Eliminar una Build**
exports.deleteBuild = async (req, res) => {
    try {
        const deletedBuild = await Build.findOneAndDelete({ build_id: req.params.id });

        if (!deletedBuild) return res.status(404).json({ message: 'Build no encontrada' });

        res.json({ message: 'Build eliminada correctamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando build', error });
    }
};
