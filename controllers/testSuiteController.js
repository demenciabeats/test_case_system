const TestSuite = require('../models/TestSuite');
const Project = require('../models/Project');
const Keyword = require('../models/Keyword');

// ✅ **Crear una Test Suite con Keywords y Validación de Project**
exports.createTestSuite = async (req, res) => {
    try {
        const { suite_name, suite_description, owner_suite_id, project_id, keywords } = req.body;

        // Validar que `project_id` exista y obtener su `_id`
        const project = await Project.findOne({ project_id }, '_id');
        if (!project) {
            return res.status(400).json({ message: `No se encontró el Proyecto con ID ${project_id}` });
        }

        // Validar que `owner_suite_id` exista si se proporciona
        if (owner_suite_id) {
            const parentSuite = await TestSuite.findOne({ suite_id: owner_suite_id });
            if (!parentSuite) {
                return res.status(400).json({ message: `No se encontró la Test Suite con ID ${owner_suite_id}` });
            }
        }

        // Validar Keywords
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } }, '_id');
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "Algunos keywords no existen en la base de datos." });
            }
        }

        // Crear la Test Suite
        const newTestSuite = new TestSuite({ 
            ...req.body, 
            project_id: project._id, // Asigna el `_id` del proyecto en lugar del `project_id`
            created_by: req.user.id,
            keywords: keywordObjects.map(k => k._id)
        });

        await newTestSuite.save();
        res.status(201).json(newTestSuite);
    } catch (error) {
        console.error("❌ Error creando Test Suite:", error);
        res.status(500).json({ message: 'Error creando Test Suite', error });
    }
};

// ✅ **Actualizar una Test Suite con Keywords y Validación de Project**
exports.updateTestSuite = async (req, res) => {
    try {
        const { owner_suite_id, project_id, keywords, ...updateData } = req.body;

        // Validar que `project_id` exista y obtener su `_id`
        if (project_id) {
            const project = await Project.findOne({ project_id }, '_id');
            if (!project) {
                return res.status(400).json({ message: `No se encontró el Proyecto con ID ${project_id}` });
            }
            updateData.project_id = project._id;
        }

        // Validar que `owner_suite_id` exista si se proporciona
        if (owner_suite_id) {
            const parentSuite = await TestSuite.findOne({ suite_id: owner_suite_id });
            if (!parentSuite) {
                return res.status(400).json({ message: `No se encontró la Test Suite con ID ${owner_suite_id}` });
            }
        }

        // Validar Keywords
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } }, '_id');
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "Algunos keywords no existen en la base de datos." });
            }
            updateData.keywords = keywordObjects.map(k => k._id);
        }

        // Actualizar la Test Suite
        const updatedSuite = await TestSuite.findOneAndUpdate(
            { suite_id: req.params.id },
            updateData,
            { new: true }
        )
        .populate('created_by', 'username') // ✅ Solo ID y username
        .populate('project_id', 'project_id project_name') // ✅ Solo ID y nombre del proyecto
        .populate('keywords', 'keyword_name'); // ✅ Solo ID y nombre de los keywords

        if (!updatedSuite) return res.status(404).json({ message: 'Test Suite no encontrada' });

        res.json(updatedSuite);
    } catch (error) {
        console.error("❌ Error actualizando Test Suite:", error);
        res.status(500).json({ message: 'Error actualizando Test Suite', error });
    }
};

// ✅ **Eliminar una Test Suite**
exports.deleteTestSuite = async (req, res) => {
    try {
        const deletedSuite = await TestSuite.findOneAndDelete({ suite_id: req.params.id });
        if (!deletedSuite) return res.status(404).json({ message: 'Test Suite no encontrada' });

        res.json({ message: 'Test Suite eliminada', deletedSuite });
    } catch (error) {
        console.error("❌ Error eliminando Test Suite:", error);
        res.status(500).json({ message: 'Error eliminando Test Suite', error });
    }
};

// ✅ **Obtener todas las Test Suites con salida ordenada**
exports.getTestSuites = async (req, res) => {
    try {
        const testSuites = await TestSuite.find()
            .populate('created_by', 'username') // ✅ Solo ID y username
            .populate('project_id', 'project_id project_name') // ✅ Solo ID y nombre del proyecto
            .populate('keywords', 'keyword_name') // ✅ Solo ID y nombre de los keywords
            .select('-__v -updatedAt'); // ✅ Excluir campos innecesarios

        res.json(testSuites);
    } catch (error) {
        console.error("❌ Error obteniendo Test Suites:", error);
        res.status(500).json({ message: 'Error obteniendo Test Suites', error });
    }
};

// ✅ **Obtener una Test Suite por su ID con salida ordenada**
exports.getTestSuiteById = async (req, res) => {
    try {
        const testSuite = await TestSuite.findOne({ suite_id: req.params.id })
            .populate('created_by', 'username') // ✅ Solo ID y username
            .populate('project_id', 'project_id project_name') // ✅ Solo ID y nombre del proyecto
            .populate('keywords', 'keyword_name') // ✅ Solo ID y nombre de los keywords
            .select('-__v -updatedAt'); // ✅ Excluir campos innecesarios

        if (!testSuite) return res.status(404).json({ message: 'Test Suite no encontrada' });

        res.json(testSuite);
    } catch (error) {
        console.error("❌ Error obteniendo Test Suite:", error);
        res.status(500).json({ message: 'Error obteniendo Test Suite', error });
    }
};
