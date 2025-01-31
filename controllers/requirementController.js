/// controllers/requirementController.js
const Requirement = require('../models/Requirement');

exports.createRequirement = async (req, res) => {
    try {
        const requirement = new Requirement({ ...req.body, created_by: req.user.id });
        await requirement.save();
        res.status(201).json(requirement);
    } catch (error) {
        res.status(500).json({ message: 'Error creando requerimiento', error });
    }
};

exports.updateRequirement = async (req, res) => {
    try {
        const { requirement_id, ...updateData } = req.body;
        const updatedRequirement = await Requirement.findOneAndUpdate({ requirement_id: req.params.id }, updateData, { new: true });
        if (!updatedRequirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });
        res.json(updatedRequirement);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando requerimiento', error });
    }
};

exports.deleteRequirement = async (req, res) => {
    try {
        await Requirement.findOneAndDelete({ requirement_id: req.params.id });
        res.json({ message: 'Requerimiento eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando requerimiento', error });
    }
};

exports.getRequirements = async (req, res) => {
    try {
        const requirements = await Requirement.find().populate('created_by tech_lead celula');
        res.json(requirements);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo requerimientos', error });
    }
};

exports.getRequirementById = async (req, res) => {
    try {
        const requirement = await Requirement.findOne({ requirement_id: req.params.id }).populate('created_by tech_lead celula');
        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });
        res.json(requirement);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo requerimiento', error });
    }
};

exports.getRequirementByExternalId = async (req, res) => {
    try {
        const requirement = await Requirement.findOne({ external_id: req.params.externalId }).populate('created_by tech_lead celula');
        if (!requirement) return res.status(404).json({ message: 'Requerimiento no encontrado' });
        res.json(requirement);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo requerimiento por external_id', error });
    }
};
