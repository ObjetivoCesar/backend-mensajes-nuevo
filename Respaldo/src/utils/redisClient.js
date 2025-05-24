const redis = require('redis');
const { promisify } = require('util');
const logger = require('./logger');

// Crear cliente Redis
const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL || null;
  const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  };
  
  // Si hay contraseña, añadirla a la configuración
  if (process.env.REDIS_PASSWORD) {
    redisConfig.password = process.env.REDIS_PASSWORD;
  }

  logger.redis('Iniciando conexión a Redis', { 
    host: redisConfig.host, 
    port: redisConfig.port,
    usingUrl: !!redisUrl 
  });

  // Usar URL si está disponible, de lo contrario usar configuración individual
  const client = redisUrl 
    ? redis.createClient(redisUrl) 
    : redis.createClient(redisConfig);

  // Manejar eventos del cliente Redis
  client.on('error', (err) => {
    logger.errorWithStack('Error en la conexión Redis', err);
  });

  client.on('connect', () => {
    logger.redis('Conectado a Redis correctamente', {
      host: redisConfig.host,
      port: redisConfig.port
    });
  });

  client.on('ready', () => {
    logger.redis('Cliente Redis listo para operaciones');
  });

  client.on('reconnecting', () => {
    logger.redis('Reconectando a Redis...');
  });

  client.on('end', () => {
    logger.redis('Conexión a Redis cerrada');
  });

  // Promisificar métodos de Redis para usar async/await
  const asyncGet = async (key) => {
    try {
      const result = await promisify(client.get).bind(client)(key);
      logger.redis('GET operación completada', { key, result });
      return result;
    } catch (error) {
      logger.errorWithStack('Error en GET Redis', error);
      throw error;
    }
  };

  const asyncSet = async (key, value) => {
    try {
      const result = await promisify(client.set).bind(client)(key, value);
      logger.redis('SET operación completada', { key, value });
      return result;
    } catch (error) {
      logger.errorWithStack('Error en SET Redis', error);
      throw error;
    }
  };

  const asyncDel = async (key) => {
    try {
      const result = await promisify(client.del).bind(client)(key);
      logger.redis('DEL operación completada', { key, result });
      return result;
    } catch (error) {
      logger.errorWithStack('Error en DEL Redis', error);
      throw error;
    }
  };

  const asyncExpire = async (key, seconds) => {
    try {
      const result = await promisify(client.expire).bind(client)(key, seconds);
      logger.redis('EXPIRE operación completada', { key, seconds, result });
      return result;
    } catch (error) {
      logger.errorWithStack('Error en EXPIRE Redis', error);
      throw error;
    }
  };

  const asyncRpush = async (key, value) => {
    try {
      const result = await promisify(client.rpush).bind(client)(key, value);
      logger.redis('RPUSH operación completada', { key, value, result });
      return result;
    } catch (error) {
      logger.errorWithStack('Error en RPUSH Redis', error);
      throw error;
    }
  };

  const asyncLrange = async (key, start, stop) => {
    try {
      const result = await promisify(client.lrange).bind(client)(key, start, stop);
      logger.redis('LRANGE operación completada', { key, start, stop, resultLength: result.length });
      return result;
    } catch (error) {
      logger.errorWithStack('Error en LRANGE Redis', error);
      throw error;
    }
  };

  const asyncLlen = async (key) => {
    try {
      const result = await promisify(client.llen).bind(client)(key);
      logger.redis('LLEN operación completada', { key, result });
      return result;
    } catch (error) {
      logger.errorWithStack('Error en LLEN Redis', error);
      throw error;
    }
  };

  return {
    client,
    asyncGet,
    asyncSet,
    asyncDel,
    asyncExpire,
    asyncRpush,
    asyncLrange,
    asyncLlen,
    quit: () => {
      logger.redis('Cerrando conexión Redis');
      return client.quit();
    }
  };
};

module.exports = createRedisClient; 