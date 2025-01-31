/// controllers/projectController.js
const Project = require('../models/Project');

exports.createProject = async (req, res) => {
    try {
        const project = new Project({ ...req.body, created_by: req.user.id });
        await project.save();
        res.status(201).json(project);
    } catch (error) {
        res.status(500).json({ message: 'Error creando proyecto', error });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const { project_id, ...updateData } = req.body;
        const updatedProject = await Project.findOneAndUpdate({ project_id: req.params.id }, updateData, { new: true }).populate('keywords');
        if (!updatedProject) return res.status(404).json({ message: 'Proyecto no encontrado' });
        res.json(updatedProject);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando proyecto', error });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        await Project.findOneAndDelete({ project_id: req.params.id });
        res.json({ message: 'Proyecto eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando proyecto', error });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.find().populate('created_by product_manager celula keywords');
        res.json(projects);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo proyectos', error });
    }
};

exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findOne({ project_id: req.params.id }).populate('created_by product_manager celula keywords');
        if (!project) return res.status(404).json({ message: 'Proyecto no encontrado' });
        res.json(project);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo proyecto', error });
    }
};