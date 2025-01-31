/// controllers/buildController.js
const Build = require('../models/Build');

exports.createBuild = async (req, res) => {
    try {
        const build = new Build({ ...req.body, created_by: req.user.id });
        await build.save();
        res.status(201).json(build);
    } catch (error) {
        res.status(500).json({ message: 'Error creando build', error });
    }
};

exports.getBuilds = async (req, res) => {
    try {
        const builds = await Build.find().populate('created_by', 'username email');
        res.json(builds);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo builds', error });
    }
};

exports.getBuildById = async (req, res) => {
    try {
        const build = await Build.findOne({ build_id: req.params.id }).populate('created_by', 'username email');
        if (!build) return res.status(404).json({ message: 'Build no encontrada' });
        res.json(build);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo build', error });
    }
};

exports.updateBuild = async (req, res) => {
    try {
        const { build_id, ...updateData } = req.body;
        const updatedBuild = await Build.findOneAndUpdate({ build_id: req.params.id }, updateData, { new: true });
        if (!updatedBuild) return res.status(404).json({ message: 'Build no encontrada' });
        res.json(updatedBuild);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando build', error });
    }
};

exports.deleteBuild = async (req, res) => {
    try {
        await Build.findOneAndDelete({ build_id: req.params.id });
        res.json({ message: 'Build eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando build', error });
    }
};