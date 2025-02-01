const TestSuite = require('../models/TestSuite');

// ✅ **Crear una Test Suite**
exports.createTestSuite = async (req, res) => {
    try {
        const { suite_name, suite_description, owner_suite_id, project_id } = req.body;

        // Validar que `owner_suite_id` exista si se proporciona
        if (owner_suite_id) {
            const parentSuite = await TestSuite.findOne({ suite_id: owner_suite_id });
            if (!parentSuite) {
                return res.status(400).json({ message: `No se encontró la Test Suite con ID ${owner_suite_id}` });
            }
        }

        // Crear la Test Suite
        const newTestSuite = new TestSuite({ ...req.body, created_by: req.user.id });
        await newTestSuite.save();

        res.status(201).json(newTestSuite);
    } catch (error) {
        console.error("❌ Error creando Test Suite:", error);
        res.status(500).json({ message: 'Error creando Test Suite', error });
    }
};

// ✅ **Actualizar una Test Suite**
exports.updateTestSuite = async (req, res) => {
    try {
        const { suite_id, owner_suite_id, ...updateData } = req.body;

        // Validar que `owner_suite_id` exista si se proporciona
        if (owner_suite_id) {
            const parentSuite = await TestSuite.findOne({ suite_id: owner_suite_id });
            if (!parentSuite) {
                return res.status(400).json({ message: `No se encontró la Test Suite con ID ${owner_suite_id}` });
            }
        }

        // Actualizar la Test Suite
        const updatedSuite = await TestSuite.findOneAndUpdate(
            { suite_id: req.params.id },
            updateData,
            { new: true }
        );
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

// ✅ **Obtener todas las Test Suites**
exports.getTestSuites = async (req, res) => {
    try {
        const testSuites = await TestSuite.find().populate('created_by project_id');
        res.json(testSuites);
    } catch (error) {
        console.error("❌ Error obteniendo Test Suites:", error);
        res.status(500).json({ message: 'Error obteniendo Test Suites', error });
    }
};

// ✅ **Obtener una Test Suite por su ID**
exports.getTestSuiteById = async (req, res) => {
    try {
        const testSuite = await TestSuite.findOne({ suite_id: req.params.id }).populate('created_by project_id');
        if (!testSuite) return res.status(404).json({ message: 'Test Suite no encontrada' });

        res.json(testSuite);
    } catch (error) {
        console.error("❌ Error obteniendo Test Suite:", error);
        res.status(500).json({ message: 'Error obteniendo Test Suite', error });
    }
};
