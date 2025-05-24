const createRedisClient = require('../utils/redisClient');
const logger = require('../utils/logger');
const { getWebhookUrl } = require('../utils/webhookManager');
const { sendMessageToWebhook } = require('./webhookService');

// Crear cliente Redis
const redis = createRedisClient();

// Tiempo de agrupación de mensajes en milisegundos (por defecto 20 segundos)
const MESSAGE_AGGREGATION_TIME = parseInt(process.env.MESSAGE_AGGREGATION_TIME || 20000);

/**
 * Servicio para manejar la agrupación de mensajes
 */
class MessageAggregationService {
  
  /**
   * Procesa un mensaje entrante
   * @param {Object} message - Mensaje recibido
   * @param {String} chatbotId - ID del chatbot
   * @param {String} userId - ID del usuario
   * @param {String} conversationId - ID de la conversación
   */
  async processIncomingMessage(message, chatbotId, userId, conversationId) {
    try {
      // Crear clave única para esta conversación
      const queueKey = `message:queue:${chatbotId}:${userId}:${conversationId}`;
      const timerKey = `message:timer:${chatbotId}:${userId}:${conversationId}`;
      
      // Verificar si ya existe un temporizador para esta conversación
      const existingTimer = await redis.asyncGet(timerKey);
      
      // Añadir mensaje a la cola
      await redis.asyncRpush(queueKey, JSON.stringify(message));
      logger.info(`Mensaje añadido a la cola: ${queueKey}`);
      
      // Si no hay temporizador activo, crear uno nuevo
      if (!existingTimer) {
        // Establecer timestamp de expiración
        const expirationTime = Date.now() + MESSAGE_AGGREGATION_TIME;
        await redis.asyncSet(timerKey, expirationTime);
        
        // Establecer tiempo de expiración para la clave del temporizador
        await redis.asyncExpire(timerKey, Math.ceil(MESSAGE_AGGREGATION_TIME / 1000));
        
        logger.info(`Nuevo temporizador creado para: ${queueKey}, expira en ${MESSAGE_AGGREGATION_TIME}ms`);
        
        // Programar el envío de mensajes agrupados
        setTimeout(async () => {
          await this.sendAggregatedMessages(chatbotId, userId, conversationId);
        }, MESSAGE_AGGREGATION_TIME);
      }
      
      return {
        success: true,
        message: 'Mensaje recibido y en cola para procesamiento'
      };
    } catch (error) {
      logger.error(`Error al procesar mensaje entrante: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Envía los mensajes agrupados al webhook correspondiente
   * @param {String} chatbotId - ID del chatbot
   * @param {String} userId - ID del usuario
   * @param {String} conversationId - ID de la conversación
   */
  async sendAggregatedMessages(chatbotId, userId, conversationId) {
    try {
      // Crear clave única para esta conversación
      const queueKey = `message:queue:${chatbotId}:${userId}:${conversationId}`;
      const timerKey = `message:timer:${chatbotId}:${userId}:${conversationId}`;
      
      // Obtener todos los mensajes de la cola
      const messages = await redis.asyncLrange(queueKey, 0, -1);
      
      if (!messages || messages.length === 0) {
        logger.warn(`No hay mensajes en la cola: ${queueKey}`);
        return {
          success: true,
          message: 'No hay mensajes para enviar'
        };
      }
      
      // Parsear los mensajes
      const parsedMessages = messages.map(msg => JSON.parse(msg));
      
      // Obtener la URL del webhook para este chatbot
      const webhookUrl = getWebhookUrl(chatbotId);
      
      if (!webhookUrl) {
        throw new Error(`No se encontró webhook para el chatbot: ${chatbotId}`);
      }
      
      // Crear el mensaje agrupado
      const aggregatedMessage = {
        userId,
        conversationId,
        chatbotId,
        timestamp: Date.now(),
        messages: parsedMessages
      };
      
      // Enviar el mensaje agrupado al webhook
      const result = await sendMessageToWebhook(webhookUrl, aggregatedMessage);
      
      // Eliminar la cola y el temporizador después de enviar
      await redis.asyncDel(queueKey);
      await redis.asyncDel(timerKey);
      
      logger.info(`Mensajes agrupados enviados y cola eliminada: ${queueKey}`);
      
      return {
        success: result.success,
        message: 'Mensajes agrupados enviados correctamente',
        data: result
      };
    } catch (error) {
      logger.error(`Error al enviar mensajes agrupados: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Procesa un archivo multimedia
   * @param {Buffer} fileBuffer - Buffer del archivo
   * @param {String} fileType - Tipo de archivo (image, audio)
   * @param {String} fileName - Nombre del archivo
   */
  async processMediaFile(fileBuffer, fileType, fileName) {
    try {
      // Generar ID único para el archivo
      const mediaId = `media_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      
      // Clave para almacenar el archivo en Redis
      const mediaKey = `media:${mediaId}`;
      
      // Convertir buffer a string base64
      const base64Data = fileBuffer.toString('base64');
      
      // Almacenar archivo en Redis con tiempo de expiración (1 hora)
      await redis.asyncSet(mediaKey, JSON.stringify({
        id: mediaId,
        type: fileType,
        name: fileName,
        data: base64Data
      }));
      
      // Establecer tiempo de expiración (1 hora)
      await redis.asyncExpire(mediaKey, 3600);
      
      logger.info(`Archivo multimedia almacenado: ${mediaKey}`);
      
      return {
        success: true,
        mediaId,
        message: 'Archivo multimedia procesado correctamente'
      };
    } catch (error) {
      logger.error(`Error al procesar archivo multimedia: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Obtiene un archivo multimedia por su ID
   * @param {String} mediaId - ID del archivo multimedia
   */
  async getMediaFile(mediaId) {
    try {
      const mediaKey = `media:${mediaId}`;
      const mediaData = await redis.asyncGet(mediaKey);
      
      if (!mediaData) {
        throw new Error(`Archivo multimedia no encontrado: ${mediaId}`);
      }
      
      return {
        success: true,
        media: JSON.parse(mediaData)
      };
    } catch (error) {
      logger.error(`Error al obtener archivo multimedia: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new MessageAggregationService();
