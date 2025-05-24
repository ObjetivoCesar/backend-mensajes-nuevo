// Script de integración del widget de chat
(function() {
    // Crear elemento de script para cargar el widget
    const script = document.createElement('script');
    script.type = 'text/javascript';
    
    // Configuración del widget
    window.ChatWidgetConfig = {
        chatbotId: 'CHATBOT_ID', // Reemplazar con el ID del chatbot
        apiUrl: 'API_URL', // Reemplazar con la URL de la API
        title: 'Chat de Asistencia', // Título personalizable
        primaryColor: '#4a86e8', // Color primario personalizable
        welcomeMessage: '¡Hola! ¿En qué puedo ayudarte hoy?' // Mensaje de bienvenida personalizable
    };
    
    // Función para cargar el widget
    function loadWidget() {
        // Crear iframe para el widget
        const iframe = document.createElement('iframe');
        iframe.id = 'chat-widget-iframe';
        iframe.style.position = 'fixed';
        iframe.style.bottom = '0';
        iframe.style.right = '0';
        iframe.style.width = '350px';
        iframe.style.height = '600px';
        iframe.style.border = 'none';
        iframe.style.zIndex = '9999';
        iframe.style.overflow = 'hidden';
        
        // Establecer URL del widget
        iframe.src = window.ChatWidgetConfig.apiUrl + '/widget';
        
        // Añadir iframe al documento
        document.body.appendChild(iframe);
        
        // Comunicación con el iframe
        window.addEventListener('message', function(event) {
            // Verificar origen del mensaje
            if (event.origin !== window.ChatWidgetConfig.apiUrl) return;
            
            // Procesar mensaje
            const message = event.data;
            
            if (message.type === 'widget_loaded') {
                // Enviar configuración al widget
                iframe.contentWindow.postMessage({
                    type: 'set_config',
                    config: window.ChatWidgetConfig
                }, window.ChatWidgetConfig.apiUrl);
            }
        });
    }
    
    // Cargar widget cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadWidget);
    } else {
        loadWidget();
    }
})();
