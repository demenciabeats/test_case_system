/// controllers/testSuiteController.js
const TestSuite = require('../models/TestSuite');

exports.createTestSuite = async (req, res) => {
    try {
        const testSuite = new TestSuite({ ...req.body, created_by: req.user.id });
        await testSuite.save();
        res.status(201).json(testSuite);
    } catch (error) {
        res.status(500).json({ message: 'Error creando Test Suite', error });
    }
};

exports.updateTestSuite = async (req, res) => {
    try {
        const { suite_id, ...updateData } = req.body;
        const updatedSuite = await TestSuite.findOneAndUpdate({ suite_id: req.params.id }, updateData, { new: true });
        if (!updatedSuite) return res.status(404).json({ message: 'Test Suite no encontrada' });
        res.json(updatedSuite);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando Test Suite', error });
    }
};

exports.deleteTestSuite = async (req, res) => {
    try {
        const deletedSuite = await TestSuite.findOneAndDelete({ suite_id: req.params.id });
        if (!deletedSuite) return res.status(404).json({ message: 'Test Suite no encontrada' });
        res.json({ message: 'Test Suite eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando Test Suite', error });
    }
};

exports.getTestSuites = async (req, res) => {
    try {
        const testSuites = await TestSuite.find().populate('created_by owner_suite_id project_id');
        res.json(testSuites);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error obteniendo Test Suites', error });
    }
};

exports.getTestSuiteById = async (req, res) => {
    try {
        const testSuite = await TestSuite.findOne({ suite_id: req.params.id }).populate('created_by owner_suite_id project_id');
        if (!testSuite) return res.status(404).json({ message: 'Test Suite no encontrada' });
        res.json(testSuite);
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error obteniendo Test Suite', error });
    }
};