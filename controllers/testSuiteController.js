const TestSuite = require('../models/TestSuite');
const Project = require('../models/Project');
const Keyword = require('../models/Keyword');
const TestCase = require('../models/TestCase');

exports.createTestSuite = async (req, res) => {
    try {
        console.log("📌 Recibido en createTestSuite:", req.body);

        const { suite_name, suite_description, owner_suite_id, project_id, keywords, suite_type, suite_status } = req.body;

        // 🔍 Validar que el project_id exista
        console.log("🔍 Buscando Proyecto con ID:", project_id);
        const project = await Project.findOne({ project_id }).select('_id');
        if (!project) {
            console.log("❌ Proyecto no encontrado");
            return res.status(400).json({ message: `❌ No se encontró el Proyecto con ID '${project_id}'.` });
        }

        // 🔍 Evitar suite_name duplicado en el mismo proyecto
        console.log("🔍 Verificando TestSuite duplicada en el proyecto");
        const existingSuite = await TestSuite.findOne({ suite_name: suite_name.trim(), project_id: project._id });
        if (existingSuite) {
            console.log("❌ Ya existe una TestSuite con el mismo nombre en este proyecto");
            return res.status(400).json({ message: `❌ La Test Suite '${suite_name}' ya existe en este proyecto.` });
        }

        // 🔍 Validar que owner_suite_id exista y obtener su suite_id (identificador correlativo)
        let ownerSuiteCorrelative = null;
        if (owner_suite_id) {
            console.log("🔍 Buscando Owner Suite con ID:", owner_suite_id);
            const parentSuite = await TestSuite.findOne({ suite_id: owner_suite_id }).select('suite_id project_id');
            if (!parentSuite) {
                console.log("❌ Owner Suite no encontrada");
                return res.status(400).json({ message: `❌ No se encontró la Test Suite con ID '${owner_suite_id}'.` });
            }
            ownerSuiteCorrelative = parentSuite.suite_id;

            // Validar que el proyecto de la suite padre sea el mismo
            if (parentSuite.project_id && parentSuite.project_id.toString() !== project._id.toString()) {
                console.log("❌ La Test Suite hija pertenece a un proyecto diferente");
                return res.status(400).json({
                    message: `❌ No se puede asociar esta Test Suite a '${owner_suite_id}' porque pertenece a un proyecto diferente.`
                });
            }

            // Validar que la suite padre no tenga casos de prueba asociados
            const hasTestCases = await TestCase.findOne({ suite_id: parentSuite._id });
            if (hasTestCases) {
                return res.status(400).json({
                    message: `⚠️ No se puede crear una Test Suite bajo '${owner_suite_id}' porque ya tiene casos de prueba asignados.`
                });
            }
        }

        // 🔍 Validar Keywords
        let keywordObjects = [];
        if (keywords?.length) {
            console.log("🔍 Buscando Keywords:", keywords);
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            if (keywordObjects.length !== keywords.length) {
                console.log("❌ Algunas keywords no existen");
                return res.status(400).json({ message: "⚠️ Algunas keywords no existen en la base de datos." });
            }
        }

        console.log("✅ Creando Test Suite...");
        // Crear la Test Suite
        const newTestSuite = new TestSuite({
            suite_name: suite_name.trim(),
            suite_description: suite_description.trim(),
            owner_suite_id: ownerSuiteCorrelative, // Se almacena el identificador correlativo
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
        res.status(500).json({ message: '❌ Error creando Test Suite.', error });
    }
};

// ✅ Actualizar una Test Suite
exports.updateTestSuite = async (req, res) => {
    try {
        console.log("📌 Recibido en updateTestSuite:", req.body);

        const { suite_name, owner_suite_id, project_id, keywords, suite_type, suite_status, ...updateData } = req.body;
        const suite_id = req.params.id;

        // 🔍 Verificar si la Test Suite existe
        console.log("🔍 Buscando Test Suite con ID:", suite_id);
        const existingSuite = await TestSuite.findOne({ suite_id });
        if (!existingSuite) {
            console.log("❌ Test Suite no encontrada");
            return res.status(404).json({ message: `❌ Test Suite con ID '${suite_id}' no encontrada.` });
        }

        // 🔍 Convertir project_id en _id si se proporciona
        if (project_id && project_id !== existingSuite.project_id.toString()) {
            console.log("🔍 Buscando nuevo Proyecto con ID:", project_id);
            const newProject = await Project.findOne({ project_id }).select('_id');
            if (!newProject) {
                console.log("❌ Proyecto no encontrado");
                return res.status(400).json({ message: `❌ No se encontró el Proyecto con ID '${project_id}'.` });
            }
            updateData.project_id = newProject._id;
        }

        // 🔍 Convertir owner_suite_id en identificador correlativo si se proporciona
        if (owner_suite_id && owner_suite_id !== existingSuite.owner_suite_id) {
            console.log("🔍 Buscando nueva Test Suite padre con ID:", owner_suite_id);
            const parentSuite = await TestSuite.findOne({ suite_id: owner_suite_id }).select('suite_id');
            if (!parentSuite) {
                console.log("❌ Nueva Test Suite padre no encontrada");
                return res.status(400).json({ message: `❌ No se encontró la Test Suite con ID '${owner_suite_id}'.` });
            }
            updateData.owner_suite_id = parentSuite.suite_id;
        }

        // ✅ Actualizar la Test Suite
        console.log("✅ Actualizando Test Suite...");
        const updatedSuite = await TestSuite.findOneAndUpdate(
            { suite_id },
            updateData,
            { new: true }
        );

        console.log("✅ Test Suite actualizada exitosamente:", updatedSuite);
        res.json(updatedSuite);
    } catch (error) {
        console.error("❌ Error actualizando Test Suite:", error);
        res.status(500).json({ message: '❌ Error actualizando Test Suite.', error });
    }
};

// ✅ Eliminar una Test Suite
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

// ✅ Obtener todas las Test Suites con formato de salida limpio
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

// ✅ Obtener una Test Suite por ID con salida clara
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

// ✅ Obtener la jerarquía de Test Suites
exports.getTestSuiteHierarchy = async (req, res) => {
    try {
        const { suite_id } = req.params;
        console.log(`Buscando jerarquía para la Test Suite: ${suite_id}`);

        // Buscar la Test Suite base
        const baseSuite = await TestSuite.findOne({ suite_id }).select('suite_id suite_name owner_suite_id project_id').lean();
        if (!baseSuite) {
            return res.status(404).json({ message: `No se encontró la Test Suite con ID ${suite_id}` });
        }

        // Obtener el project_id correlativo
        const project = await Project.findById(baseSuite.project_id).select('project_id').lean();
        if (!project) {
            return res.status(404).json({ message: `No se encontró el Proyecto asociado a la Test Suite con ID ${suite_id}` });
        }

        // Obtener todas las Test Suites del mismo proyecto
        const allSuites = await TestSuite.find({ project_id: baseSuite.project_id })
            .select('suite_id suite_name owner_suite_id project_id')
            .lean();

        // Función recursiva para construir la jerarquía
        const buildHierarchy = (parentSuiteId) => {
            let childrenSuites = allSuites.filter(suite => suite.owner_suite_id === parentSuiteId);
            return childrenSuites.map(suite => {
                const subSuites = buildHierarchy(suite.suite_id);
                let suiteData = {
                    suite_id: suite.suite_id,
                    suite_name: suite.suite_name,
                    project_id: project.project_id
                };
                if (suite.owner_suite_id) {
                    suiteData.owner_suite_id = suite.owner_suite_id;
                }
                if (subSuites.length > 0) {
                    suiteData.children = subSuites;
                }
                return suiteData;
            });
        };

        const hierarchy = buildHierarchy(suite_id);
        let response = {
            suite_id: baseSuite.suite_id,
            suite_name: baseSuite.suite_name,
            project_id: project.project_id
        };
        if (hierarchy.length > 0) {
            response.children = hierarchy;
        }

        res.json(response);

    } catch (error) {
        console.error("Error obteniendo jerarquía de Test Suites:", error);
        res.status(500).json({ message: 'Error obteniendo jerarquía de Test Suites', error });
    }
};

// ✅ Obtener Test Suites por Proyecto
exports.getTestSuitesByProject = async (req, res) => {
    try {
        const { project_id } = req.params;
        console.log(`Buscando Test Suites para el Proyecto: ${project_id}`);

        // Buscar el Proyecto
        const project = await Project.findOne({ project_id }).select('_id project_id project_name').lean();
        if (!project) {
            return res.status(404).json({ message: `No se encontró el Proyecto con ID ${project_id}` });
        }

        // Obtener todas las Test Suites del mismo proyecto
        const allSuites = await TestSuite.find({ project_id: project._id })
            .select('suite_id suite_name owner_suite_id project_id')
            .lean();

        if (allSuites.length === 0) {
            return res.json({
                project_id: project.project_id,
                project_name: project.project_name,
                children: []
            });
        }

        // Función recursiva para construir la jerarquía
        const buildHierarchy = (parentSuiteId) => {
            let childrenSuites = allSuites.filter(suite => suite.owner_suite_id === parentSuiteId);
            return childrenSuites.map(suite => {
                const subSuites = buildHierarchy(suite.suite_id);
                let suiteData = {
                    suite_id: suite.suite_id,
                    suite_name: suite.suite_name,
                    project_id: project.project_id
                };
                if (suite.owner_suite_id) {
                    suiteData.owner_suite_id = suite.owner_suite_id;
                }
                if (subSuites.length > 0) {
                    suiteData.children = subSuites;
                }
                return suiteData;
            });
        };

        // Construir jerarquía a partir de las suites de primer nivel
        const rootSuites = allSuites.filter(suite => !suite.owner_suite_id);
        const hierarchy = rootSuites.map(rootSuite => ({
            suite_id: rootSuite.suite_id,
            suite_name: rootSuite.suite_name,
            project_id: project.project_id,
            children: buildHierarchy(rootSuite.suite_id)
        }));

        const response = {
            project_id: project.project_id,
            project_name: project.project_name,
            children: hierarchy
        };

        res.json(response);

    } catch (error) {
        console.error("Error obteniendo Test Suites por Proyecto:", error);
        res.status(500).json({ message: 'Error obteniendo Test Suites por Proyecto', error });
    }
};
