/// controllers/criticityController.js
const Criticity = require('../models/Criticity');

exports.createCriticity = async (req, res) => {
    try {
        const criticity = new Criticity(req.body);
        await criticity.save();
        res.status(201).json(criticity);
    } catch (error) {
        res.status(500).json({ message: 'Error creando criticidad', error });
    }
};

exports.updateCriticity = async (req, res) => {
    try {
        const updatedCriticity = await Criticity.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedCriticity) return res.status(404).json({ message: 'Criticidad no encontrada' });
        res.json(updatedCriticity);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando criticidad', error });
    }
};