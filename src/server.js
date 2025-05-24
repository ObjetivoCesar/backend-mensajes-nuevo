const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

// Importar utilidades y servicios
const logger = require('./utils/logger');
const messageAggregationService = require('./services/messageAggregationService');
const webhookManager = require('./utils/webhookManager');

// Crear aplicación Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar almacenamiento temporal para archivos multimedia
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // Límite de 10MB
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar logging de solicitudes HTTP
app.use(morgan('combined', {
  stream: { write: message => logger.info(message.trim()) }
}));

// Servir archivos estáticos (widget de chat)
app.use('/widget', express.static(path.join(__dirname, 'static/widget')));

// Rutas API
const apiRouter = express.Router();

// Ruta de estado
apiRouter.get('/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString()
  });
});

// Ruta para recibir mensajes
apiRouter.post('/messages', async (req, res) => {
  try {
    const { message, chatbotId, userId, conversationId } = req.body;
    
    if (!message || !chatbotId || !userId || !conversationId) {
      return res.status(400).json({
        success: false,
        error: 'Faltan parámetros requeridos'
      });
    }
    
    const result = await messageAggregationService.processIncomingMessage(
      message, 
      chatbotId, 
      userId, 
      conversationId
    );
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    logger.error(`Error en ruta /messages: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para subir archivos multimedia
apiRouter.post('/media', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No se proporcionó ningún archivo'
      });
    }
    
    const fileType = req.body.fileType || 'unknown';
    const fileName = req.file.originalname || 'unnamed';
    
    const result = await messageAggregationService.processMediaFile(
      req.file.buffer,
      fileType,
      fileName
    );
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    logger.error(`Error en ruta /media: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ruta para obtener archivos multimedia
apiRouter.get('/media/:mediaId', async (req, res) => {
  try {
    const { mediaId } = req.params;
    
    const result = await messageAggregationService.getMediaFile(mediaId);
    
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(404).json(result);
    }
  } catch (error) {
    logger.error(`Error en ruta /media/:mediaId: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rutas para gestión de webhooks
apiRouter.get('/webhooks', (req, res) => {
  try {
    const webhooks = webhookManager.listWebhooks();
    return res.status(200).json({
      success: true,
      webhooks
    });
  } catch (error) {
    logger.error(`Error en ruta /webhooks: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

apiRouter.post('/webhooks/:chatbotId', (req, res) => {
  try {
    const { chatbotId } = req.params;
    const webhookData = req.body;
    
    if (!webhookData.webhook || !webhookData.name) {
      return res.status(400).json({
        success: false,
        error: 'Faltan datos requeridos (webhook y name)'
      });
    }
    
    const result = webhookManager.updateWebhook(chatbotId, webhookData);
    
    if (result) {
      return res.status(200).json({
        success: true,
        message: `Webhook para ${chatbotId} actualizado correctamente`
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Error al actualizar webhook'
      });
    }
  } catch (error) {
    logger.error(`Error en ruta /webhooks/:chatbotId: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

apiRouter.delete('/webhooks/:chatbotId', (req, res) => {
  try {
    const { chatbotId } = req.params;
    const result = webhookManager.deleteWebhook(chatbotId);
    
    if (result) {
      return res.status(200).json({
        success: true,
        message: `Webhook para ${chatbotId} eliminado correctamente`
      });
    } else {
      return res.status(404).json({
        success: false,
        error: `No se encontró webhook para ${chatbotId}`
      });
    }
  } catch (error) {
    logger.error(`Error en ruta /webhooks/:chatbotId: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Montar router API
app.use('/api', apiRouter);

// Middleware para manejo de errores
app.use((err, req, res, next) => {
  logger.error(`Error no manejado: ${err.message}`);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  const publicUrl = process.env.PUBLIC_URL || `http://localhost:${PORT}`;
  logger.info(`Servidor iniciado en puerto ${PORT}`);
  logger.info(`Widget de chat disponible en: ${publicUrl}/widget`);
  logger.info(`API disponible en: ${publicUrl}/api`);
});

module.exports = app;
