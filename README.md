# Sistema de Mensajería para Administrar Mensajes en Tiempo Real

Este sistema permite administrar mensajes entrantes en tiempo real provenientes de Instagram, Facebook, WhatsApp y páginas web a través de webhooks de Make.com. El sistema agrupa mensajes cortos durante 20 segundos antes de enviarlos al chatbot, evitando respuestas desubicadas causadas por mensajes fragmentados.

## Características Principales

- **Agrupación de mensajes**: Agrupa mensajes del mismo usuario durante 20 segundos
- **Integración con Make.com**: Recibe y envía mensajes a través de webhooks
- **Almacenamiento temporal**: Utiliza Redis para el almacenamiento en caché y gestión de colas
- **Manejo de archivos multimedia**: Procesa imágenes y audio
- **Webhooks configurables**: Sistema flexible para múltiples chatbots
- **Widget de chat**: Integrable en cualquier sitio web

## Requisitos Técnicos

- Node.js (versión 14 o superior)
- Redis (para almacenamiento temporal)
- Make.com (para integración con plataformas de mensajería)

## Instalación

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd message-aggregator-system
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con la siguiente configuración:

```
# Configuración del servidor
PORT=3000
NODE_ENV=development

# Configuración de Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=tu_contraseña_redis
REDIS_URL=tu_url_redis_completa

# Tiempo de agrupación de mensajes (en milisegundos)
MESSAGE_AGGREGATION_TIME=20000

# Ruta del archivo de configuración de webhooks
WEBHOOKS_CONFIG_PATH=./config/webhooks.json

# Configuración de logs
LOG_LEVEL=info
```

### 4. Configurar webhooks

Edita el archivo `config/webhooks.json` para configurar los webhooks de tus chatbots:

```json
{
  "chatbot-3": {
    "webhook": "https://hook.us2.make.com/r9mihhm8gdc8paeydfnmw2wwvn7c9p5q",
    "name": "Energym",
    "description": "Asistente de Energym"
  },
  "sara-topdent": {
    "webhook": "https://hook.us2.make.com/uv54rz61icbhw1colpy1xgpbrgoyjoda",
    "name": "Sara",
    "description": "Asistente de Topdent"
  }
}
```

### 5. Iniciar el servidor

```bash
node src/server.js
```

El servidor estará disponible en `http://localhost:3000` (o el puerto configurado).

## Uso de la API

### Enviar un mensaje

```
POST /api/messages
```

Cuerpo de la solicitud:

```json
{
  "message": {
    "text": "Hola, ¿cómo estás?",
    "timestamp": 1621234567890
  },
  "chatbotId": "sara-topdent",
  "userId": "12345",
  "conversationId": "67890"
}
```

### Subir un archivo multimedia

```
POST /api/media
```

Formulario multipart con los siguientes campos:
- `file`: Archivo a subir (imagen o audio)
- `fileType`: Tipo de archivo ("image" o "audio")

Respuesta:

```json
{
  "success": true,
  "mediaId": "media_1621234567890_123",
  "message": "Archivo multimedia procesado correctamente"
}
```

### Obtener un archivo multimedia

```
GET /api/media/:mediaId
```

### Gestionar webhooks

Listar todos los webhooks:
```
GET /api/webhooks
```

Añadir o actualizar un webhook:
```
POST /api/webhooks/:chatbotId
```

Cuerpo de la solicitud:
```json
{
  "webhook": "https://hook.us2.make.com/example",
  "name": "Nombre del Chatbot",
  "description": "Descripción del Chatbot"
}
```

Eliminar un webhook:
```
DELETE /api/webhooks/:chatbotId
```

## Integración del Widget de Chat

### 1. Añadir el script de carga

Agrega el siguiente código en el `<head>` o antes del cierre de `</body>` de tu sitio web:

```html
<script>
// Configuración del widget
window.ChatWidgetConfig = {
  chatbotId: 'tu-chatbot-id', // ID del chatbot configurado en webhooks.json
  apiUrl: 'https://tu-dominio.com', // URL donde está alojado el backend
  title: 'Chat de Asistencia', // Título personalizable
  primaryColor: '#4a86e8', // Color primario personalizable
  welcomeMessage: '¡Hola! ¿En qué puedo ayudarte hoy?' // Mensaje de bienvenida
};
</script>
<script src="https://tu-dominio.com/widget/widget-loader.js"></script>
```

### 2. Personalización del widget

Puedes personalizar el widget modificando las opciones en `ChatWidgetConfig`:

- `chatbotId`: ID del chatbot configurado en webhooks.json
- `apiUrl`: URL donde está alojado el backend
- `title`: Título del widget
- `primaryColor`: Color principal del widget (en formato hexadecimal)
- `welcomeMessage`: Mensaje de bienvenida que se muestra al abrir el chat

## Flujo de Datos

1. Los mensajes llegan desde las plataformas (Instagram, Facebook, WhatsApp) a Make.com
2. Make.com envía estos mensajes al backend a través de un webhook
3. El backend agrupa los mensajes del mismo usuario durante 20 segundos
4. Después de 20 segundos, el backend envía todos los mensajes agrupados de vuelta a Make.com
5. Make.com procesa los mensajes agrupados y los envía al chatbot

## Estructura del Proyecto

```
message-aggregator-system/
├── config/
│   └── webhooks.json       # Configuración de webhooks
├── logs/                   # Archivos de registro
├── src/
│   ├── api/                # Rutas de la API
│   ├── controllers/        # Controladores
│   ├── services/           # Servicios de negocio
│   │   ├── messageAggregationService.js  # Servicio de agrupación
│   │   └── webhookService.js             # Servicio de webhooks
│   ├── static/             # Archivos estáticos
│   │   └── widget/         # Widget de chat
│   │       ├── index.html  # Página principal del widget
│   │       └── widget-loader.js  # Script de carga del widget
│   ├── utils/              # Utilidades
│   │   ├── logger.js       # Utilidad de registro
│   │   ├── redisClient.js  # Cliente Redis
│   │   └── webhookManager.js  # Gestor de webhooks
│   └── server.js           # Punto de entrada principal
├── .env                    # Variables de entorno
├── package.json            # Dependencias y scripts
└── README.md               # Documentación
```

## Solución de Problemas

### El servidor no se inicia

- Verifica que Node.js esté instalado correctamente
- Comprueba que el puerto configurado esté disponible
- Revisa los logs en la carpeta `logs/`

### Problemas de conexión con Redis

- Verifica que Redis esté en ejecución
- Comprueba las credenciales en el archivo `.env`
- Asegúrate de que el host y puerto sean accesibles

### Los mensajes no se agrupan correctamente

- Verifica que el tiempo de agrupación (`MESSAGE_AGGREGATION_TIME`) esté configurado correctamente
- Comprueba que los IDs de usuario y conversación sean consistentes

### El widget no se muestra en el sitio web

- Verifica que la URL de la API sea correcta
- Comprueba la consola del navegador para ver posibles errores
- Asegúrate de que el chatbotId esté configurado en webhooks.json

## Mantenimiento

### Logs

Los logs se almacenan en la carpeta `logs/`:
- `combined.log`: Todos los logs
- `error.log`: Solo errores

### Respaldo de configuración

Es recomendable hacer copias de seguridad regulares del archivo `config/webhooks.json`.

## Licencia

Este proyecto está licenciado bajo [Licencia].
