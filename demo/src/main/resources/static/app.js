/**
 * MiniRAG Ciberseguridad - CyberOps v3.0 (app.js)
 * Controlador de eventos y llamadas REST a Spring Boot (Vanilla JS).
 */

const API_ROUTES = {
    CHAT: '/api/chat',
    CONSULTAS: '/api/consultas',
    SALUD: '/api/salud'
};

const PRESET_QUERIES = [
    "\u00BFPara qu\u00E9 sirve el protocolo IPsec?",
    "\u00BFCu\u00E1les son las fases del pentesting?",
    "\u00BFEn qu\u00E9 consiste el bastionado de servidores?",
    "\u00BFC\u00F3mo se configura OSPF?"
];

// Referencias a elementos del DOM
const ui = {
    input: document.getElementById('preguntaInput'),
    btnConsultar: document.getElementById('btnConsultar'),
    btnInner: document.querySelector('.btn-inner'),
    btnLoadingState: document.querySelector('.btn-loading-state'),
    charCount: document.getElementById('charCount'),
    alertBox: document.getElementById('alertBox'),
    alertMessage: document.getElementById('alertMessage'),
    responseSection: document.getElementById('responseSection'),
    responseContent: document.getElementById('responseContent'),
    btnCopy: document.getElementById('btnCopy'),
    copyLabel: document.getElementById('copyLabel'),
    historyList: document.getElementById('historyList'),
    historyBadge: document.getElementById('historyBadge'),
    btnRefreshHistory: document.getElementById('btnRefreshHistory'),
    healthNode: document.getElementById('healthNode'),
    healthBeacon: document.getElementById('healthBeacon'),
    healthStatus: document.getElementById('healthStatus'),
    dbNode: document.getElementById('dbNode'),
    dbChip: document.getElementById('dbChip'),
    dbDot: document.getElementById('dbDot'),
    dbStatusText: document.getElementById('dbStatusText')
};

// Inicializacion de la aplicacion
document.addEventListener('DOMContentLoaded', () => {
    initCyberOps();
});

function initCyberOps() {
    // 1. Verificacion inmediata de salud y sondeo periodico cada 5 segundos
    verificarSalud();
    setInterval(verificarSalud, 5000);

    // 2. Carga inicial del historial desde MariaDB
    cargarHistorial();

    // 3. Evento de consulta al hacer clic en el boton principal
    ui.btnConsultar.addEventListener('click', ejecutarConsulta);

    // 4. Atajo rapido de teclado: Ctrl + Enter
    ui.input.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            ejecutarConsulta();
        }
    });

    // 5. Contador dinamico de caracteres
    ui.input.addEventListener('input', () => {
        const count = ui.input.value.length;
        ui.charCount.textContent = `${count} char${count === 1 ? '' : 's'}`;
    });

    // 6. Delegacion de eventos para las pildoras de ejemplo
    document.querySelectorAll('.preset-pill').forEach((pill, idx) => {
        pill.addEventListener('click', () => {
            const query = PRESET_QUERIES[idx] || pill.textContent.trim();
            ui.input.value = query;
            ui.input.focus();
            ui.charCount.textContent = `${query.length} chars`;
            ocultarAlerta();
        });
    });

    // 7. Boton de sincronizacion manual del historial
    if (ui.btnRefreshHistory) {
        ui.btnRefreshHistory.addEventListener('click', () => {
            ui.btnRefreshHistory.classList.add('rotating');
            cargarHistorial().finally(() => {
                setTimeout(() => ui.btnRefreshHistory.classList.remove('rotating'), 600);
            });
        });
    }

    // 8. Boton de copia al portapapeles
    if (ui.btnCopy) {
        ui.btnCopy.addEventListener('click', copiarRespuesta);
    }
}

/**
 * Comprueba el estado de salud del backend via GET /api/salud
 */
async function verificarSalud() {
    // Si el usuario abrio el HTML directamente como archivo local (file:///)
    if (window.location.protocol === 'file:') {
        actualizarEstadoNodo(false, 'OFFLINE (ARCHIVO LOCAL)');
        return;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const response = await fetch(API_ROUTES.SALUD, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data && data.estado === 'OK') {
                actualizarEstadoNodo(true, 'ONLINE');
                return;
            }
        }
        actualizarEstadoNodo(false, 'OFFLINE');
    } catch (err) {
        actualizarEstadoNodo(false, 'OFFLINE');
    }
}

/**
 * Actualiza la UI de los nodos de telemetria (ONLINE / OFFLINE)
 */
function actualizarEstadoNodo(online, customStatusText) {
    if (!ui.healthBeacon || !ui.healthStatus) return;

    if (online) {
        // Nodo RAG
        ui.healthBeacon.className = 'pulsing-beacon green';
        if (ui.healthNode) ui.healthNode.classList.remove('offline');
        ui.healthStatus.className = 'status-online';
        ui.healthStatus.textContent = customStatusText || 'ONLINE';

        // MariaDB Sync
        if (ui.dbChip) {
            ui.dbChip.className = 'status-chip online';
        }
        if (ui.dbDot) {
            ui.dbDot.className = 'chip-dot green';
        }
        if (ui.dbStatusText) {
            ui.dbStatusText.textContent = 'MARIADB SYNC';
        }
    } else {
        // Nodo RAG
        ui.healthBeacon.className = 'pulsing-beacon red';
        if (ui.healthNode) ui.healthNode.classList.add('offline');
        ui.healthStatus.className = 'status-offline';
        ui.healthStatus.textContent = customStatusText || 'OFFLINE';

        // MariaDB Offline
        if (ui.dbChip) {
            ui.dbChip.className = 'status-chip offline';
        }
        if (ui.dbDot) {
            ui.dbDot.className = 'chip-dot red';
        }
        if (ui.dbStatusText) {
            ui.dbStatusText.textContent = 'MARIADB OFFLINE';
        }
    }
}

/**
 * Envia la pregunta al backend mediante POST /api/chat
 */
async function ejecutarConsulta() {
    const pregunta = ui.input.value.trim();

    if (!pregunta) {
        mostrarAlerta('Por favor ingresa una consulta o selecciona un vector predefinido.');
        ui.input.focus();
        return;
    }

    ocultarAlerta();
    setEstadoCarga(true);

    try {
        const response = await fetch(API_ROUTES.CHAT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ pregunta: pregunta })
        });

        if (!response.ok) {
            const errorMsg = await response.text();
            throw new Error(`[HTTP ${response.status}] ${errorMsg || 'Fallo en la inferencia RAG'}`);
        }

        const data = await response.json();

        if (!data || typeof data.respuesta === 'undefined') {
            throw new Error('Estructura de respuesta inesperada del backend (se esperaba {"respuesta": "..."})');
        }

        // Mostrar respuesta formateada
        mostrarRespuesta(data.respuesta);

        // Estado del nodo confirmado online
        actualizarEstadoNodo(true, 'ONLINE');

        // Actualizar automaticamente el historial desde MariaDB
        await cargarHistorial();

    } catch (err) {
        console.error('Error al consultar /api/chat:', err);
        mostrarAlerta(`Error en la consulta: ${err.message}. Asegurate de que el servidor Spring Boot este en ejecucion.`);
        verificarSalud();
    } finally {
        setEstadoCarga(false);
    }
}

/**
 * Consulta el historial a traves de GET /api/consultas y lo renderiza
 */
async function cargarHistorial() {
    if (window.location.protocol === 'file:') {
        ui.historyList.innerHTML = `
            <div class="history-empty-state" style="color: var(--cyber-crimson);">
                <p>Estas visualizando el archivo en modo local (file:///). Inicia Spring Boot y abre http://localhost:8080/ para conectar con MariaDB.</p>
            </div>
        `;
        ui.historyBadge.textContent = 'Local';
        return;
    }

    try {
        const response = await fetch(API_ROUTES.CONSULTAS, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`[HTTP ${response.status}] No se pudo recuperar el historial.`);
        }

        const historial = await response.json();

        if (!Array.isArray(historial)) {
            throw new Error('El payload recibido de consultas no es un array');
        }

        renderizarHistorial(historial);

    } catch (err) {
        console.error('Error al cargar historial:', err);
        ui.historyList.innerHTML = `
            <div class="history-empty-state" style="color: var(--cyber-crimson);">
                <p>No se pudo conectar con MariaDB: ${sanitizarHTML(err.message)}</p>
            </div>
        `;
        ui.historyBadge.textContent = 'Error';
    }
}

/**
 * Renderiza los elementos del historial (mas recientes primero)
 */
function renderizarHistorial(registros) {
    if (registros.length === 0) {
        ui.historyList.innerHTML = `
            <div class="history-empty-state">
                <p>No hay consultas previas almacenadas en la base de datos.</p>
            </div>
        `;
        ui.historyBadge.textContent = '0 logs';
        return;
    }

    ui.historyBadge.textContent = `${registros.length} log${registros.length === 1 ? '' : 's'}`;

    // Mostramos los mas nuevos en la parte superior (invertimos una copia)
    const logsOrdenados = [...registros].reverse();

    ui.historyList.innerHTML = logsOrdenados.map((item, index) => {
        const idLog = logsOrdenados.length - index;
        const fechaFormateada = formatearFecha(item.fecha);

        return `
            <article class="audit-card">
                <div class="card-top-row">
                    <span class="audit-id-badge">
                        <span class="audit-log-dot"></span>
                        #AUDIT_LOG_${idLog}
                    </span>
                    <time class="audit-time">${fechaFormateada}</time>
                </div>
                <h3 class="audit-question">Q: ${sanitizarHTML(item.pregunta || 'Consulta sin texto')}</h3>
                <div class="audit-answer">${sanitizarHTML(item.respuesta || 'Sin respuesta almacenada')}</div>
            </article>
        `;
    }).join('');
}

/**
 * Presenta el contenedor de respuesta en pantalla
 */
function mostrarRespuesta(texto) {
    ui.responseContent.textContent = texto;
    ui.responseSection.classList.remove('hidden');

    // Desplazamiento suave para visibilidad
    ui.responseSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Control del estado visual de carga (Loading State)
 */
function setEstadoCarga(cargando) {
    ui.btnConsultar.disabled = cargando;
    if (cargando) {
        ui.btnInner.classList.add('hidden');
        ui.btnLoadingState.classList.remove('hidden');
    } else {
        ui.btnInner.classList.remove('hidden');
        ui.btnLoadingState.classList.add('hidden');
    }
}

/**
 * Copiado al portapapeles con retroalimentacion visual
 */
async function copiarRespuesta() {
    const texto = ui.responseContent.textContent;
    if (!texto) return;

    try {
        await navigator.clipboard.writeText(texto);
        ui.copyLabel.textContent = '\u00A1Copiado!';
        setTimeout(() => {
            ui.copyLabel.textContent = 'Copiar';
        }, 2000);
    } catch (err) {
        console.error('Error al copiar:', err);
    }
}

/**
 * Formateo estandar de fecha y hora local
 */
function formatearFecha(fechaRaw) {
    if (!fechaRaw) return 'Fecha desconocida';

    const fecha = new Date(fechaRaw);
    if (isNaN(fecha.getTime())) {
        return sanitizarHTML(String(fechaRaw));
    }

    return new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    }).format(fecha);
}

/**
 * Manejo de alertas y errores
 */
function mostrarAlerta(mensaje) {
    ui.alertMessage.textContent = mensaje;
    ui.alertBox.classList.remove('hidden');
}

function ocultarAlerta() {
    ui.alertMessage.textContent = '';
    ui.alertBox.classList.add('hidden');
}

/**
 * Sanitizacion para mitigar vulnerabilidades XSS
 */
function sanitizarHTML(str) {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}