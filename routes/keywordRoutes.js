const express = require('express');
const { 
    createKeyword, 
    getKeywords, 
    getKeywordById, 
    getKeywordByName, 
    updateKeyword, 
    deleteKeyword 
} = require('../controllers/keywordController');
const { authMiddleware } = require('../middleware/authMiddleware');
const router = express.Router();

router.post('/', authMiddleware(['CREATE_KEYWORD']), createKeyword);
router.get('/', authMiddleware(['READ_KEYWORD']), getKeywords);
router.get('/search', authMiddleware(['READ_KEYWORD']), getKeywordByName); // 🔍 Nueva búsqueda por nombre
router.get('/:id', authMiddleware(['READ_KEYWORD']), getKeywordById);
router.put('/:id', authMiddleware(['UPDATE_KEYWORD']), updateKeyword);
router.delete('/:id', authMiddleware(['DELETE_KEYWORD']), deleteKeyword);

module.exports = router;
