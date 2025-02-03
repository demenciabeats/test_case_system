const StepGroup = require('../models/StepGroup');
const Step = require('../models/Step');
const Keyword = require('../models/Keyword');

// ✅ **Crear un Step Group con al menos un Step**
exports.createStepGroup = async (req, res) => {
    try {
        const { name, description, created_by, keywords, steps } = req.body;

        if (!steps || steps.length === 0) {
            return res.status(400).json({ message: "Debe incluir al menos un Step en el StepGroup." });
        }

        const existingGroup = await StepGroup.findOne({ name: name.trim() });
        if (existingGroup) return res.status(400).json({ message: `El grupo '${name}' ya existe.` });

        let keywordObjects = [];
        if (keywords?.length) {
            keywordObjects = await Keyword.find({ _id: { $in: keywords } });
        }

        // ✅ Generar ID único para el StepGroup
        const lastGroup = await StepGroup.findOne().sort({ created_at: -1 });
        const lastNumber = lastGroup ? parseInt(lastGroup.step_group_id.split('-')[1]) : 0;
        const stepGroupId = `STGRP-${String(lastNumber + 1).padStart(4, '0')}`;

        // ✅ Crear StepGroup (pero sin steps aún)
        const stepGroup = new StepGroup({
            step_group_id: stepGroupId,
            name: name.trim(),
            description,
            created_by,
            keywords: keywordObjects.map(k => k._id),
            steps: []
        });

        await stepGroup.save();

        // ✅ Crear Steps y asociarlos al grupo
        const createdSteps = await Promise.all(
            steps.map(async (step, index) => {
                const newStep = new Step({
                    step_id: `${stepGroupId}-STEP-${index + 1}`,
                    step_number: index + 1,
                    action: step.action,
                    expected_result: step.expected_result,
                    step_group: stepGroup._id
                });

                await newStep.save();
                return newStep._id;
            })
        );

        stepGroup.steps = createdSteps;
        await stepGroup.save();

        res.status(201).json(stepGroup);
    } catch (error) {
        console.error("❌ Error creando Step Group:", error);
        res.status(500).json({ message: 'Error creando Step Group', error });
    }
};
// ✅ **Obtener todos los Step Groups con formato limpio**
exports.getStepGroups = async (req, res) => {
    try {
        const stepGroups = await StepGroup.find()
            .populate('created_by', 'username')
            .populate('keywords', '_id keyword_name')
            .populate({
                path: 'steps',
                options: { sort: { step_number: 1 } },
                select: 'step_id step_number action expected_result'
            })
            .lean();

        if (!stepGroups || stepGroups.length === 0) {
            return res.status(404).json({ message: 'No hay Step Groups disponibles' });
        }

        // ✅ **Estructura formateada para el Frontend**
        const formattedResponse = stepGroups.map(stepGroup => ({
            step_group_id: stepGroup.step_group_id,
            name: stepGroup.name,
            description: stepGroup.description,
            created_by: stepGroup.created_by ? { id: stepGroup.created_by._id, username: stepGroup.created_by.username } : null,
            keywords: stepGroup.keywords.map(k => ({ id: k._id, name: k.keyword_name })),
            steps: stepGroup.steps.map(step => ({
                step_id: step.step_id,
                step_number: step.step_number,
                action: step.action,
                expected_result: step.expected_result
            })),
            created_at: stepGroup.created_at
        }));

        res.json(formattedResponse);
    } catch (error) {
        console.error("❌ Error obteniendo Step Groups:", error);
        res.status(500).json({ message: 'Error obteniendo Step Groups', error });
    }
};
// ✅ **Obtener Step Group por su correlativo con formato limpio**
exports.getStepGroupById = async (req, res) => {
    try {
        const stepGroup = await StepGroup.findOne({ step_group_id: req.params.id })
            .populate('created_by', 'username')
            .populate('keywords', '_id keyword_name')
            .populate({
                path: 'steps',
                options: { sort: { step_number: 1 } },
                select: 'step_id step_number action expected_result'
            })
            .lean();

        if (!stepGroup) {
            return res.status(404).json({ message: 'Step Group no encontrado' });
        }

        // ✅ **Estructura formateada para el Frontend**
        const formattedResponse = {
            step_group_id: stepGroup.step_group_id,
            name: stepGroup.name,
            description: stepGroup.description,
            created_by: stepGroup.created_by ? { id: stepGroup.created_by._id, username: stepGroup.created_by.username } : null,
            keywords: stepGroup.keywords.map(k => ({ id: k._id, name: k.keyword_name })),
            steps: stepGroup.steps.map(step => ({
                step_id: step.step_id,
                step_number: step.step_number,
                action: step.action,
                expected_result: step.expected_result
            })),
            created_at: stepGroup.created_at
        };

        res.json(formattedResponse);
    } catch (error) {
        console.error("❌ Error obteniendo Step Group:", error);
        res.status(500).json({ message: 'Error obteniendo Step Group', error });
    }
};
// ✅ **Actualizar Step Group sin borrar los Steps existentes**
exports.updateStepGroup = async (req, res) => {
    try {
        const { name, description, keywords, steps } = req.body;

        let stepGroup = await StepGroup.findOne({ step_group_id: req.params.id });
        if (!stepGroup) return res.status(404).json({ message: 'Step Group no encontrado' });

        // ✅ Evitar nombres duplicados
        if (name) {
            const existingName = await StepGroup.findOne({ name: name.trim(), _id: { $ne: stepGroup._id } });
            if (existingName) return res.status(400).json({ message: `El grupo '${name}' ya existe.` });
            stepGroup.name = name.trim();
        }

        if (description) stepGroup.description = description;

        // ✅ Actualizar Keywords
        if (keywords) {
            const keywordObjects = await Keyword.find({ _id: { $in: keywords } });
            stepGroup.keywords = keywordObjects.map(k => k._id);
        }

        // ✅ Si hay nuevos Steps, los agregamos sin borrar los anteriores
        if (steps && steps.length > 0) {
            const createdSteps = await Promise.all(
                steps.map(async (step, index) => {
                    const newStepNumber = stepGroup.steps.length + index + 1;

                    const newStep = new Step({
                        step_id: `${stepGroup.step_group_id}-STEP-${newStepNumber}`,
                        step_number: newStepNumber,
                        action: step.action,
                        expected_result: step.expected_result,
                        step_group: stepGroup._id
                    });

                    await newStep.save();
                    return newStep._id;
                })
            );

            stepGroup.steps.push(...createdSteps);
        }

        await stepGroup.save();
        res.json(stepGroup);
    } catch (error) {
        console.error("❌ Error actualizando Step Group:", error);
        res.status(500).json({ message: 'Error actualizando Step Group', error });
    }
};
// ✅ **Asignar un Step a un StepGroup con Validaciones**
exports.assignStepToGroup = async (req, res) => {
    try {
        const { step_group_id, action, expected_result } = req.body;

        // 🔍 **Buscar el StepGroup**
        const stepGroup = await StepGroup.findOne({ step_group_id }).populate('steps');
        if (!stepGroup) return res.status(404).json({ message: 'Step Group no encontrado' });

        // 🔍 **Evitar duplicados: Mismo Step ya en el grupo**
        const existingStep = stepGroup.steps.find(
            step => step.action.trim().toLowerCase() === action.trim().toLowerCase()
        );

        if (existingStep) {
            return res.status(400).json({ message: `El Step con acción '${action}' ya existe en este grupo.` });
        }

        // 🔍 **Obtener el último número de Step en el grupo**
        const lastStep = await Step.findOne({ step_group: stepGroup._id }).sort({ step_number: -1 });
        const newStepNumber = lastStep ? lastStep.step_number + 1 : 1;

        // ✅ **Crear el nuevo Step**
        const newStep = new Step({
            step_id: `${stepGroup.step_group_id}-STEP-${newStepNumber}`,
            step_number: newStepNumber,
            action: action.trim(),
            expected_result: expected_result.trim(),
            step_group: stepGroup._id
        });

        await newStep.save();

        // 🔗 **Asociar el nuevo Step al grupo**
        stepGroup.steps.push(newStep._id);
        await stepGroup.save();

        res.json({ message: 'Step asignado correctamente', stepGroup });
    } catch (error) {
        console.error("❌ Error asignando Step:", error);
        res.status(500).json({ message: 'Error asignando Step', error });
    }
};
// ✅ **Eliminar StepGroup y Steps Asociados**
exports.deleteStepGroup = async (req, res) => {
    try {
        const stepGroup = await StepGroup.findOne({ step_group_id: req.params.id });
        if (!stepGroup) return res.status(404).json({ message: 'Step Group no encontrado' });

        await Step.deleteMany({ step_group: stepGroup._id });
        await StepGroup.deleteOne({ _id: stepGroup._id });

        res.json({ message: 'Step Group y Steps eliminados correctamente' });
    } catch (error) {
        console.error("❌ Error eliminando StepGroup:", error);
        res.status(500).json({ message: 'Error eliminando StepGroup', error });
    }
};