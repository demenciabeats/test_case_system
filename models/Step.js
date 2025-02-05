const mongoose = require('mongoose');

const StepSchema = new mongoose.Schema({
    step_id: { type: String, unique: true, immutable: true },
    step_number: { type: Number, required: true },
    action: { type: String, required: true },
    expected_result: { type: String, required: true },
    step_group: { type: mongoose.Schema.Types.ObjectId, ref: 'StepGroup', required: true }
}, { timestamps: true });

StepSchema.pre('save', async function (next) {
    try {
        if (!this.isNew) return next(); // Si no es nuevo, no recalcular

        // Buscar el StepGroup asociado
        const stepGroup = await mongoose.model('StepGroup').findOne({ _id: this.step_group });
        if (!stepGroup) {
            return next(new Error('Step Group no encontrado'));
        }

        // Obtener los Steps existentes en el grupo ordenados por número
        const steps = await mongoose.model('Step')
            .find({ step_group: this.step_group })
            .sort({ step_number: 1 });

        // Obtener los números de paso usados
        let usedNumbers = steps.map(step => step.step_number);

        // Encontrar el primer número disponible en la secuencia
        let stepNumber = 1;
        while (usedNumbers.includes(stepNumber)) {
            stepNumber++;
        }

        // Asignar `step_number` y `step_id`
        this.step_number = stepNumber;
        this.step_id = `${stepGroup.step_group_id}-STEP-${String(stepNumber).padStart(2, '0')}`;

        next();
    } catch (error) {
        next(error);
    }
});



module.exports = mongoose.model('Step', StepSchema);
