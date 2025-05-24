# Arquitectura del Sistema de Mensajería

## Diagrama de Arquitectura

```
+----------------+     +----------------+     +----------------+
| Instagram      |     | Facebook       |     | WhatsApp       |
| Mensajes       |     | Mensajes       |     | Mensajes       |
+-------+--------+     +-------+--------+     +-------+--------+
        |                      |                      |
        v                      v                      v
+-------+------------------------+----------------+
|                Make.com                         |
| (Recibe mensajes de diferentes plataformas)     |
+-------+------------------------+----------------+
        |
        | Webhook
        v
+-------+------------------------+----------------+
|                Backend Node.js                  |
|                                                 |
|  +----------------+      +----------------+     |
|  | API REST       |      | Controladores  |     |
|  | (Recepción)    |      | de Mensajes    |     |
|  +-------+--------+      +-------+--------+     |
|          |                       |              |
|          v                       v              |
|  +-------+------------------------+--------+    |
|  |           Servicio de Agrupación        |    |
|  |           (Espera 20 segundos)          |    |
|  +-------+------------------------+--------+    |
|          |                       |              |
|          v                       v              |
|  +-------+--------+     +-------+--------+      |
|  | Redis          |     | Gestor de      |      |
|  | (Almacenamiento|     | Webhooks (JSON)|      |
|  | temporal)      |     |                |      |
|  +-------+--------+     +-------+--------+      |
|          |                       |              |
|          v                       v              |
|  +-------+------------------------+--------+    |
|  |           API REST (Envío)              |    |
|  +-------+------------------------+--------+    |
+-------+------------------------+----------------+
        |
        | Webhook de retorno
        v
+-------+------------------------+----------------+
|                Make.com                         |
| (Procesa mensajes agrupados)                    |
+-------+------------------------+----------------+
        |
        v
+-------+------------------------+----------------+
|                Chatbot                          |
| (Procesa mensajes completos, no fragmentados)   |
+-------+------------------------+----------------+

+-------+------------------------+----------------+
|                Widget de Chat                   |
| (Integrable en sitios web)                      |
+-------+------------------------+----------------+
        |
        | API REST
        v
+-------+------------------------+----------------+
|                Backend Node.js                  |
+-------+------------------------+----------------+
```

## Flujo de Procesamiento de Mensajes

1. **Recepción de Mensajes**:
   - Los mensajes llegan desde diferentes plataformas (Instagram, Facebook, WhatsApp, Web) a Make.com
   - Make.com envía estos mensajes al backend de Node.js a través de un webhook

2. **Procesamiento en Backend**:
   - El backend recibe el mensaje y lo identifica por usuario/conversación
   - Verifica si ya existe una cola activa para ese usuario en Redis:
     - Si no existe: crea una nueva cola y establece un temporizador de 20 segundos
     - Si existe: añade el mensaje a la cola existente

3. **Agrupación de Mensajes**:
   - Los mensajes se almacenan temporalmente en Redis
   - Se asocian a una clave única por usuario/conversación
   - Se mantienen en cola durante 20 segundos desde la llegada del primer mensaje

4. **Envío de Mensajes Agrupados**:
   - Cuando se cumple el temporizador de 20 segundos:
     - Se recuperan todos los mensajes de la cola
     - Se concatenan en un solo mensaje
     - Se envían de vuelta a Make.com a través del webhook configurado
     - Se elimina la cola de Redis

5. **Procesamiento de Archivos Multimedia**:
   - Si el mensaje contiene archivos multimedia (imágenes o audio):
     - Se almacenan temporalmente en Redis como datos binarios
     - Se incluyen en el mensaje agrupado como referencias o datos codificados

## Estructura de Datos en Redis

### Claves de Redis

1. **Cola de Mensajes**:
   ```
   message:queue:{userId}:{conversationId} -> Lista de mensajes
   ```

2. **Temporizador**:
   ```
   message:timer:{userId}:{conversationId} -> Timestamp de expiración
   ```

3. **Archivos Multimedia**:
   ```
   media:{messageId} -> Datos binarios del archivo
   ```

### Ejemplo de Estructura de Mensaje

```json
{
  "userId": "12345",
  "conversationId": "67890",
  "platform": "whatsapp",
  "messages": [
    {
      "text": "Hola",
      "timestamp": 1621234567890
    },
    {
      "text": "¿Cómo estás?",
      "timestamp": 1621234569000
    },
    {
      "text": "Quería preguntarte algo",
      "timestamp": 1621234571000
    }
  ],
  "media": [
    {
      "type": "image",
      "id": "img_12345",
      "data": "base64_encoded_data_or_reference"
    }
  ]
}
```

## Sistema de Webhooks

### Estructura del Archivo de Configuración (JSON)

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
  },
  "chatbot-objetivo": {
    "webhook": "",
    "name": "Ale",
    "description": "Asistente de Objetivo"
  }
}
```

### Flujo de Procesamiento de Webhooks

1. El sistema carga la configuración de webhooks desde el archivo JSON
2. Cuando llega un mensaje, se identifica el chatbot destinatario
3. Se busca la configuración del webhook correspondiente
4. Se envía el mensaje agrupado al webhook configurado
5. Se registra la transacción en los logs del sistema
