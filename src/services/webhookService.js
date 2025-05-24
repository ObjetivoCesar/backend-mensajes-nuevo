const axios = require('axios');
const logger = require('../utils/logger');

// Servicio para enviar mensajes agrupados a través de webhooks
const sendMessageToWebhook = async (webhookUrl, messageData) => {
  try {
    if (!webhookUrl) {
      throw new Error('URL de webhook no proporcionada');
    }
    
    const response = await axios.post(webhookUrl, messageData, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`Mensaje enviado correctamente al webhook: ${webhookUrl}`);
    return {
      success: true,
      statusCode: response.status,
      data: response.data
    };
  } catch (error) {
    logger.error(`Error al enviar mensaje al webhook: ${error.message}`);
    return {
      success: false,
      error: error.message,
      statusCode: error.response?.status || 500
    };
  }
};

module.exports = {
  sendMessageToWebhook
};
