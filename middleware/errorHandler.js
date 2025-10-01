const { logger } = require('../utils/logger');

function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.statusCode || err.status || 500;
  const code = err.code || (status >= 500 ? 'internal_error' : 'error');
  const payload = { message: err.message || 'Erro interno', code };
  if (process.env.NODE_ENV !== 'production') {
    payload.trace = err.stack?.split('\n').slice(0,5).join('\n');
  }
  logger.error({ status, code, err }, 'Unhandled error');
  res.status(status).json(payload);
}

module.exports = { errorHandler };
