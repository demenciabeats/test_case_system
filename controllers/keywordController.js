/// controllers/keywordController.js
const Keyword = require('../models/Keyword');

exports.createKeyword = async (req, res) => {
    try {
        const keyword = new Keyword(req.body);
        await keyword.save();
        res.status(201).json(keyword);
    } catch (error) {
        res.status(500).json({ message: 'Error creando keyword', error });
    }
};

exports.getKeywords = async (req, res) => {
    try {
        const keywords = await Keyword.find();
        res.json(keywords);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo keywords', error });
    }
};

exports.getKeywordById = async (req, res) => {
    try {
        const keyword = await Keyword.findById(req.params.id);
        if (!keyword) return res.status(404).json({ message: 'Keyword no encontrada' });
        res.json(keyword);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo keyword', error });
    }
};

exports.updateKeyword = async (req, res) => {
    try {
        const updatedKeyword = await Keyword.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!updatedKeyword) return res.status(404).json({ message: 'Keyword no encontrada' });
        res.json(updatedKeyword);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando keyword', error });
    }
};

exports.deleteKeyword = async (req, res) => {
    try {
        await Keyword.findByIdAndDelete(req.params.id);
        res.json({ message: 'Keyword eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando keyword', error });
    }
};
