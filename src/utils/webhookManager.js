const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// Cargar la configuración de webhooks desde el archivo JSON
const loadWebhooksConfig = () => {
  try {
    const configPath = process.env.WEBHOOKS_CONFIG_PATH || path.join(__dirname, '../../config/webhooks.json');
    const webhooksConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    logger.info('Configuración de webhooks cargada correctamente');
    return webhooksConfig;
  } catch (error) {
    logger.error(`Error al cargar la configuración de webhooks: ${error.message}`);
    return {};
  }
};

// Guardar la configuración de webhooks en el archivo JSON
const saveWebhooksConfig = (config) => {
  try {
    const configPath = process.env.WEBHOOKS_CONFIG_PATH || path.join(__dirname, '../../config/webhooks.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
    logger.info('Configuración de webhooks guardada correctamente');
    return true;
  } catch (error) {
    logger.error(`Error al guardar la configuración de webhooks: ${error.message}`);
    return false;
  }
};

// Obtener la URL del webhook para un chatbot específico
const getWebhookUrl = (chatbotId) => {
  const config = loadWebhooksConfig();
  if (config[chatbotId] && config[chatbotId].webhook) {
    return config[chatbotId].webhook;
  }
  logger.warn(`No se encontró webhook para el chatbot: ${chatbotId}`);
  return null;
};

// Añadir o actualizar un webhook
const updateWebhook = (chatbotId, webhookData) => {
  try {
    const config = loadWebhooksConfig();
    config[chatbotId] = webhookData;
    return saveWebhooksConfig(config);
  } catch (error) {
    logger.error(`Error al actualizar webhook: ${error.message}`);
    return false;
  }
};

// Eliminar un webhook
const deleteWebhook = (chatbotId) => {
  try {
    const config = loadWebhooksConfig();
    if (config[chatbotId]) {
      delete config[chatbotId];
      return saveWebhooksConfig(config);
    }
    return false;
  } catch (error) {
    logger.error(`Error al eliminar webhook: ${error.message}`);
    return false;
  }
};

// Listar todos los webhooks configurados
const listWebhooks = () => {
  return loadWebhooksConfig();
};

module.exports = {
  getWebhookUrl,
  updateWebhook,
  deleteWebhook,
  listWebhooks,
  loadWebhooksConfig,
  saveWebhooksConfig
};
