const Joi = require('joi');

const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ error: error.details[0].message });
        }
        next();
    };
};

// Schemas
const createTicketSchema = Joi.object({
    device_id: Joi.alternatives().try(Joi.string(), Joi.number()).required(),
    subject: Joi.string().min(3).max(100).required(),
    description: Joi.string().min(3).required(),
    priority_id: Joi.alternatives().try(Joi.number().integer().min(1).max(5), Joi.string()).required()
});

const updateTicketSchema = Joi.object({
    status: Joi.string().valid('Open', 'In Progress', 'Resolved', 'Closed').required()
});

const postMessageSchema = Joi.object({
    content: Joi.string().required()
});

module.exports = {
    validate,
    createTicketSchema,
    updateTicketSchema,
    postMessageSchema
};
