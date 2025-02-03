const TestSuite = require('../models/TestSuite');
const Project = require('../models/Project');
const Keyword = require('../models/Keyword');

exports.createTestSuite = async (req, res) => {
    try {
        console.log("📌 Recibido en createTestSuite:", req.body);

        const { suite_name, suite_description, owner_suite_id, project_id, keywords, suite_type, suite_status } = req.body;

        // 🔍 **Validar que el `project_id` exista**
        console.log("🔍 Buscando Proyecto con ID:", project_id);
        const project = await Project.findOne({ project_id });
        if (!project) {
            console.log("❌ Proyecto no encontrado");
            return res.status(400).json({ message: `No se encontró el Proyecto con ID ${project_id}` });
        }

        // 🔍 **Evitar `suite_name` duplicado en el mismo proyecto**
        console.log("🔍 Verificando TestSuite duplicada en el proyecto");
        const existingSuite = await TestSuite.findOne({ suite_name: suite_name.trim(), project_id: project._id });
        if (existingSuite) {
            console.log("❌ Ya existe una TestSuite con el mismo nombre");
            return res.status(400).json({ message: `La Test Suite '${suite_name}' ya existe en este proyecto.` });
        }

        // 🔍 **Validar que `owner_suite_id` exista si se proporciona**
        if (owner_suite_id) {
            console.log("🔍 Buscando Owner Suite con ID:", owner_suite_id);
            const parentSuite = await TestSuite.findOne({ suite_id: owner_suite_id });
            if (!parentSuite) {
                console.log("❌ Owner Suite no encontrada");
                return res.status(400).json({ message: `No se encontró la Test Suite con ID ${owner_suite_id}` });
            }
        }

        // 🔍 **Validar Keywords**
        let keywordObjects = [];
        if (keywords?.length) {
            console.log("🔍 Buscando Keywords:", keywords);
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                console.log("❌ Algunas keywords no existen");
                return res.status(400).json({ message: "Algunas keywords no existen en la base de datos." });
            }
        }

        console.log("✅ Creando Test Suite...");
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
        console.log("✅ Test Suite creada exitosamente:", newTestSuite);
        res.status(201).json(newTestSuite);
    } catch (error) {
        console.error("❌ Error creando Test Suite:", error);
        res.status(500).json({ message: 'Error creando Test Suite', error });
    }
};
// ✅ **Actualizar una Test Suite**
exports.updateTestSuite = async (req, res) => {
    try {
        const { suite_name, owner_suite_id, project_id, keywords, suite_type, suite_status, ...updateData } = req.body;

        const existingSuite = await TestSuite.findOne({ suite_id: req.params.id });
        if (!existingSuite) return res.status(404).json({ message: 'Test Suite no encontrada' });

        if (suite_name && suite_name.trim() !== existingSuite.suite_name) {
            const duplicateName = await TestSuite.findOne({ suite_name: suite_name.trim() });
            if (duplicateName) return res.status(400).json({ message: `La Test Suite '${suite_name}' ya existe.` });
            updateData.suite_name = suite_name.trim();
        }

        if (project_id) {
            const project = await Project.findOne({ project_id });
            if (!project) return res.status(400).json({ message: `No se encontró el Proyecto con ID ${project_id}` });
            updateData.project_id = project._id;
        }

        if (keywords) {
            const keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) return res.status(400).json({ message: "Algunas keywords no existen." });
            updateData.keywords = keywordObjects.map(k => k._id);
        }

        const updatedSuite = await TestSuite.findOneAndUpdate(
            { suite_id: req.params.id },
            updateData,
            { new: true }
        ).populate('created_by', '_id username')
         .populate('project_id', '_id project_id project_name')
         .populate('keywords', '_id keyword_name');

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
// ✅ **Obtener todas las Test Suites con formato de salida limpio
exports.getTestSuites = async (req, res) => {
    try {
        const testSuites = await TestSuite.find()
            .populate('created_by', '_id username')
            .populate('project_id', '_id project_id project_name')
            .populate('keywords', '_id keyword_name')
            .select('-__v -updatedAt')
            .lean();

        const formattedSuites = testSuites.map(suite => ({
            suite_id: suite.suite_id,
            suite_name: suite.suite_name,
            suite_description: suite.suite_description,
            owner_suite_id: suite.owner_suite_id,
            suite_type: suite.suite_type,
            suite_status: suite.suite_status,
            project: suite.project_id ? { id: suite.project_id.project_id, name: suite.project_id.project_name } : null,
            created_by: suite.created_by ? { id: suite.created_by._id, username: suite.created_by.username } : null,
            keywords: suite.keywords.map(k => ({ id: k._id, name: k.keyword_name })),
            created_at: suite.created_at
        }));

        res.json(formattedSuites);
    } catch (error) {
        console.error("❌ Error obteniendo Test Suites:", error);
        res.status(500).json({ message: 'Error obteniendo Test Suites', error });
    }
};
// ✅ **Obtener una Test Suite por ID con salida clara**
exports.getTestSuiteById = async (req, res) => {
    try {
        const suite = await TestSuite.findOne({ suite_id: req.params.id })
            .populate('created_by', '_id username')
            .populate('project_id', '_id project_id project_name')
            .populate('keywords', '_id keyword_name')
            .select('-__v -updatedAt')
            .lean();

        if (!suite) return res.status(404).json({ message: 'Test Suite no encontrada' });

        res.json({
            suite_id: suite.suite_id,
            suite_name: suite.suite_name,
            suite_description: suite.suite_description,
            owner_suite_id: suite.owner_suite_id,
            suite_type: suite.suite_type,
            suite_status: suite.suite_status,
            project: suite.project_id ? { id: suite.project_id.project_id, name: suite.project_id.project_name } : null,
            created_by: suite.created_by ? { id: suite.created_by._id, username: suite.created_by.username } : null,
            keywords: suite.keywords.map(k => ({ id: k._id, name: k.keyword_name })),
            created_at: suite.created_at
        });
    } catch (error) {
        console.error("❌ Error obteniendo Test Suite:", error);
        res.status(500).json({ message: 'Error obteniendo Test Suite', error });
    }
};
