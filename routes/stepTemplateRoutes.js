// routes/stepTemplateRoutes.js
const express = require('express');
const router = express.Router();
const stepTemplateController = require('../controllers/stepTemplateController');

// Ejemplo de middleware (ajusta a tu conveniencia)
const { authMiddleware } = require('../middleware/authMiddleware');

// 1) Asignar Steps originales a una plantilla
router.post('/:stc_id/assign',
  authMiddleware(['CREATE_STEP_TEMPLATE']), 
  stepTemplateController.assignStepsToTemplate
);

// 2) Listar StepTemplates de una plantilla
router.get('/byTemplate/:stc_id',
  authMiddleware(['READ_STEP_TEMPLATE']), 
  stepTemplateController.getStepTemplatesByTemplate
);

// 3) Obtener StepTemplate por stt_id
router.get('/:stt_id',
  authMiddleware(['READ_STEP_TEMPLATE']),
  stepTemplateController.getStepTemplateById
);

// 4) Actualizar un StepTemplate
router.put('/:stt_id',
  authMiddleware(['UPDATE_STEP_TEMPLATE']),
  stepTemplateController.updateStepTemplate
);

// 5) Eliminar un StepTemplate
router.delete('/:stt_id',
  authMiddleware(['DELETE_STEP_TEMPLATE']),
  stepTemplateController.deleteStepTemplate
);

// Reemplazar un StepTemplate (PUT) - si lo deseas
router.put('/:stt_id',
  authMiddleware(['UPDATE_STEP_TEMPLATE']),
  stepTemplateController.replaceStepTemplate
);

// Actualización parcial (PATCH)
router.patch('/:stt_id',
  authMiddleware(['UPDATE_STEP_TEMPLATE']),
  stepTemplateController.patchStepTemplate
);

module.exports = router;
