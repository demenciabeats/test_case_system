const TestSuite = require('../models/TestSuite');
const Project = require('../models/Project');
const Keyword = require('../models/Keyword');

// ✅ **Crear una Test Suite con Validaciones**
exports.createTestSuite = async (req, res) => {
    try {
        const { suite_name, suite_description, owner_suite_id, project_id, keywords, suite_type, suite_status } = req.body;

        // 🔍 **Validar que el `project_id` exista**
        const project = await Project.findOne({ project_id }, '_id');
        if (!project) {
            return res.status(400).json({ message: `No se encontró el Proyecto con ID ${project_id}` });
        }

        // 🔍 **Evitar que `suite_name` ya exista en la BD**
        const existingSuite = await TestSuite.findOne({ suite_name: suite_name.trim() });
        if (existingSuite) {
            return res.status(400).json({ message: `La Test Suite '${suite_name}' ya existe en la base de datos.` });
        }

        // 🔍 **Validar que `owner_suite_id` exista si se proporciona**
        if (owner_suite_id) {
            const parentSuite = await TestSuite.findOne({ suite_id: owner_suite_id });
            if (!parentSuite) {
                return res.status(400).json({ message: `No se encontró la Test Suite con ID ${owner_suite_id}` });
            }
        }

        // 🔍 **Validar Keywords**
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } }, '_id');
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "Algunas keywords no existen en la base de datos." });
            }
        }

        // ✅ **Crear la Test Suite**
        const newTestSuite = new TestSuite({
            suite_name: suite_name.trim(),
            suite_description: suite_description.trim(),
            owner_suite_id,
            project_id: project._id,
            suite_type,
            suite_status,
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

// ✅ **Actualizar una Test Suite con Validaciones**
exports.updateTestSuite = async (req, res) => {
    try {
        const { suite_name, owner_suite_id, project_id, keywords, suite_type, suite_status, ...updateData } = req.body;

        // 🔍 **Validar que la Test Suite exista**
        const existingSuite = await TestSuite.findOne({ suite_id: req.params.id });
        if (!existingSuite) {
            return res.status(404).json({ message: 'Test Suite no encontrada' });
        }

        // 🔍 **Evitar que se repita el `suite_name` en toda la BD**
        if (suite_name && suite_name.trim() !== existingSuite.suite_name) {
            const duplicateName = await TestSuite.findOne({ suite_name: suite_name.trim() });
            if (duplicateName) {
                return res.status(400).json({ message: `La Test Suite '${suite_name}' ya existe en la base de datos.` });
            }
            updateData.suite_name = suite_name.trim();
        }

        // 🔍 **Evitar que una Test Suite esté asignada a más de un proyecto**
        if (project_id) {
            const project = await Project.findOne({ project_id }, '_id');
            if (!project) {
                return res.status(400).json({ message: `No se encontró el Proyecto con ID ${project_id}` });
            }
            updateData.project_id = project._id;
        }

        // 🔍 **Validar que `owner_suite_id` exista si se proporciona**
        if (owner_suite_id) {
            const parentSuite = await TestSuite.findOne({ suite_id: owner_suite_id });
            if (!parentSuite) {
                return res.status(400).json({ message: `No se encontró la Test Suite con ID ${owner_suite_id}` });
            }
        }

        // 🔍 **Validar Keywords**
        let keywordObjects = [];
        if (keywords && keywords.length > 0) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } }, '_id');
            if (keywordObjects.length !== keywords.length) {
                return res.status(400).json({ message: "Algunas keywords no existen en la base de datos." });
            }
            updateData.keywords = keywordObjects.map(k => k._id);
        }

        // ✅ **Actualizar la Test Suite**
        const updatedSuite = await TestSuite.findOneAndUpdate(
            { suite_id: req.params.id },
            updateData,
            { new: true }
        )
            .populate('created_by', 'username')
            .populate('project_id', 'project_id project_name')
            .populate('keywords', 'keyword_name');

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
