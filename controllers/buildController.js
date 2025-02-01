const Build = require('../models/Build');

const validStatuses = ['Pendiente', 'En Ejecucion', 'Completada', 'Fallida'];
const validOS = ["Windows", "OSX", "Linux", "Unix"];
const validLanguages = [
    // Frontend
    "HTML", "CSS", "JavaScript", "TypeScript", "Vue.js", "React", "Angular", "Svelte", "SolidJS", "Ember.js",
    // Backend
    "Node.js", "Python", "Django", "Flask", "Ruby", "Ruby on Rails", "PHP", "Laravel", "Java", "Spring Boot",
    "Kotlin", "C#", ".NET", "Go", "Rust", "Scala", "Perl", "Elixir",
    // Mobile
    "Swift", "Objective-C", "Kotlin", "Java", "Dart", "Flutter", "React Native", "Xamarin", "Ionic", "Cordova"
];
const validExecutionEnvs = ['QA', 'Staging', 'Production', 'Develop'];

// Función para validar los valores del enum
const validateEnum = (value, validValues, fieldName) => {
    if (!validValues.includes(value)) {
        return `El valor '${value}' para '${fieldName}' no es válido. Valores permitidos: ${validValues.join(', ')}.`;
    }
    return null;
};

// Crear Build con validación de enum
exports.createBuild = async (req, res) => {
    try {
        const { status, environment } = req.body;

        // Validaciones de ENUM
        let errors = [];
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

        // Si hay errores, responder con 400
        if (errors.length > 0) {
            return res.status(400).json({ message: 'Errores en la validación de datos', errors });
        }

        const build = new Build({ ...req.body, created_by: req.user.id });
        await build.save();
        res.status(201).json(build);
    } catch (error) {
        res.status(500).json({ message: 'Error creando build', error });
    }
};

// Obtener todas las Builds
exports.getBuilds = async (req, res) => {
    try {
        const builds = await Build.find().populate('created_by', 'username email');
        res.json(builds);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo builds', error });
    }
};

// Obtener una Build por ID
exports.getBuildById = async (req, res) => {
    try {
        const build = await Build.findOne({ build_id: req.params.id }).populate('created_by', 'username email');
        if (!build) return res.status(404).json({ message: 'Build no encontrada' });
        res.json(build);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo build', error });
    }
};

// Actualizar una Build con validaciones de enum
exports.updateBuild = async (req, res) => {
    try {
        const { build_id, status, environment, ...updateData } = req.body;
        let errors = [];

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

        // Si hay errores, responder con 400
        if (errors.length > 0) {
            return res.status(400).json({ message: 'Errores en la validación de datos', errors });
        }

        const updatedBuild = await Build.findOneAndUpdate(
            { build_id: req.params.id },
            updateData,
            { new: true }
        );

        if (!updatedBuild) return res.status(404).json({ message: 'Build no encontrada' });
        res.json(updatedBuild);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando build', error });
    }
};

// Eliminar una Build
exports.deleteBuild = async (req, res) => {
    try {
        await Build.findOneAndDelete({ build_id: req.params.id });
        res.json({ message: 'Build eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando build', error });
    }
};
