const authService = require('../services/authService');

exports.register = async(req, res) => {
  const result = await authService.registerUser(req.body);

  if (!result.isValid) {
    return res.status(result.status).json(result.error);
  }

  res.status(result.status).json(result.data);
};

exports.login = async(req, res) => {
  const result = await authService.authenticateUser(req.body);

  if (!result.isValid) {
    return res.status(result.status).json(result.error);
  }

  res.status(result.status).json(result.data);
};
