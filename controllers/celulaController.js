/// controllers/celulaController.js
const Celula = require('../models/Celula');

exports.createCelula = async (req, res) => {
    try {
        const celula = new Celula(req.body);
        await celula.save();
        res.status(201).json(celula);
    } catch (error) {
        res.status(500).json({ message: 'Error creando celula', error });
    }
};

exports.getCelulas = async (req, res) => {
    try {
        const celulas = await Celula.find().populate('product_manager');
        res.json(celulas);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo celulas', error });
    }
};