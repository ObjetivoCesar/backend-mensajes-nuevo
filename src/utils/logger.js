const winston = require('winston');
const path = require('path');

// Configuración del logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'message-aggregator' },
  transports: [
    // Escribir logs en consola con colores
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          return `${timestamp} [${level}]: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
          }`;
        })
      )
    }),
    // Log de errores
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/error.log'), 
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Log general
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/combined.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Log específico para Redis
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/redis.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    // Log específico para webhooks
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../logs/webhooks.log'),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    })
  ]
});

// Función helper para logging de Redis
logger.redis = (message, meta = {}) => {
  logger.info(`[Redis] ${message}`, { ...meta, type: 'redis' });
};

// Función helper para logging de webhooks
logger.webhook = (message, meta = {}) => {
  logger.info(`[Webhook] ${message}`, { ...meta, type: 'webhook' });
};

// Función helper para logging de mensajes
logger.message = (message, meta = {}) => {
  logger.info(`[Message] ${message}`, { ...meta, type: 'message' });
};

// Función helper para logging de errores con stack trace
logger.errorWithStack = (message, error) => {
  logger.error(message, {
    error: {
      message: error.message,
      stack: error.stack,
      ...error
    }
  });
};

module.exports = logger;
