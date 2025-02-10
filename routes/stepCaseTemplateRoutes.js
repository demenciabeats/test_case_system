// routes/stepCaseTemplateRoutes.js
const express = require('express');
const router = express.Router();
const {
  createStepCaseTemplate,
  getAllStepCaseTemplates,
  getStepCaseTemplateById,
  updateStepCaseTemplate,
  deleteStepCaseTemplate
} = require('../controllers/stepCaseTemplateController');

// Importa tu middleware de autenticación
const { authMiddleware } = require('../middleware/authMiddleware');

// Rutas CRUD para StepCaseTemplate:

// Crear StepCaseTemplate
router.post('/',
  authMiddleware(['CREATE_STEP_CASE_TEMPLATE']),  // Ejemplo de permiso
  createStepCaseTemplate
);

// Listar todos
router.get('/',
  authMiddleware(['READ_STEP_CASE_TEMPLATE']),
  getAllStepCaseTemplates
);

// Obtener por stc_id (ej: STC-0001)
router.get('/:stc_id',
  authMiddleware(['READ_STEP_CASE_TEMPLATE']),
  getStepCaseTemplateById
);

// Actualizar (PUT)
router.put('/:stc_id',
  authMiddleware(['UPDATE_STEP_CASE_TEMPLATE']),
  updateStepCaseTemplate
);

// (Opcional) Actualizar con PATCH
// router.patch('/:stc_id',
//   authMiddleware(['UPDATE_STEP_CASE_TEMPLATE']),
//   updateStepCaseTemplate
// );

// Eliminar
router.delete('/:stc_id',
  authMiddleware(['DELETE_STEP_CASE_TEMPLATE']),
  deleteStepCaseTemplate
);

module.exports = router;
