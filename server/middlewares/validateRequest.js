const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid request data',
        errors: error.issues || error.errors || [{ message: error.message }],
      });
    }
  };
};

module.exports = validateRequest;
