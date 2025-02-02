const Keyword = require('../models/Keyword');

// ✅ **Crear una Keyword**
exports.createKeyword = async (req, res) => {
    try {
        const { keyword_name, description } = req.body;

        // Validar que no exista una Keyword con el mismo nombre
        const existingKeyword = await Keyword.findOne({ keyword_name });
        if (existingKeyword) {
            return res.status(400).json({ message: 'La Keyword ya existe' });
        }

        const keyword = new Keyword({ keyword_name, description });
        await keyword.save();
        res.status(201).json(keyword);
    } catch (error) {
        res.status(500).json({ message: 'Error creando keyword', error });
    }
};

// ✅ **Obtener todas las Keywords**
exports.getKeywords = async (req, res) => {
    try {
        const keywords = await Keyword.find();
        res.json(keywords);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo keywords', error });
    }
};

// ✅ **Obtener una Keyword por su ID**
exports.getKeywordById = async (req, res) => {
    try {
        const keyword = await Keyword.findById(req.params.id);
        if (!keyword) return res.status(404).json({ message: 'Keyword no encontrada' });
        res.json(keyword);
    } catch (error) {
        res.status(500).json({ message: 'Error obteniendo keyword', error });
    }
};

// ✅ **Buscar Keywords por Nombre**
exports.getKeywordByName = async (req, res) => {
    try {
        const { name } = req.query;
        if (!name) {
            return res.status(400).json({ message: 'Debe proporcionar un nombre para la búsqueda' });
        }

        const keywords = await Keyword.find({ keyword_name: { $regex: name, $options: 'i' } });
        if (keywords.length === 0) return res.status(404).json({ message: 'No se encontraron Keywords' });

        res.json(keywords);
    } catch (error) {
        res.status(500).json({ message: 'Error buscando keyword por nombre', error });
    }
};

// ✅ **Actualizar una Keyword**
exports.updateKeyword = async (req, res) => {
    try {
        const { keyword_name, description } = req.body;

        // Validar si se intenta actualizar a un nombre ya existente
        if (keyword_name) {
            const existingKeyword = await Keyword.findOne({ keyword_name });
            if (existingKeyword && existingKeyword._id.toString() !== req.params.id) {
                return res.status(400).json({ message: 'Ya existe una Keyword con ese nombre' });
            }
        }

        const updatedKeyword = await Keyword.findByIdAndUpdate(
            req.params.id,
            { keyword_name, description },
            { new: true }
        );

        if (!updatedKeyword) return res.status(404).json({ message: 'Keyword no encontrada' });

        res.json(updatedKeyword);
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando keyword', error });
    }
};

// ✅ **Eliminar una Keyword**
exports.deleteKeyword = async (req, res) => {
    try {
        await Keyword.findByIdAndDelete(req.params.id);
        res.json({ message: 'Keyword eliminada' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando keyword', error });
    }
};
