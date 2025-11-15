// js/alerta_global.js (VERSÃO HÍBRIDA: Monitoramento + Utilitários de UI)

import { URL_API_COMANDAS } from "./config.js";

// A API_BASE_URL é necessária para o monitoramento (LÓGICA CORE)
const API_BASE_URL = URL_API_COMANDAS;

// ========================= LÓGICA DE ALERTE SONORO (MP3) =========================
const audioNovoPedido = new Audio('audio/novo_pedido.mp3'); 
const audioPratoPronto = new Audio('audio/prato_pronto.mp3'); 

/**
 * Toca o arquivo de som correspondente.
 */
function playAlertSound(type = 'new') {
    let audio = (type === 'ready') ? audioPratoPronto : audioNovoPedido;
    
    audio.currentTime = 0; 
    
    audio.play().catch(e => {
        console.warn(`Alerta de áudio (${type}) bloqueado. Tente interagir com a página para ativar o som.`);
        document.body.addEventListener('click', () => { audio.play().catch(e => {}); }, { once: true });
        document.body.addEventListener('touchstart', () => { audio.play().catch(e => {}); }, { once: true });
    });
}

// ========================= LÓGICA DE ALERTE VISUAL (TOAST) =========================

/**
 * Mapeia o tipo de alerta interno (new-order, ready-order) para a classe CSS de cor.
 */
function mapAlertTypeToCSS(type) {
    switch(type) {
        case 'new-order':
            return 'notification-warning'; 
        case 'ready-order':
            return 'notification-success';
        case 'success': 
            return 'notification-success';
        case 'error':   
            return 'notification-danger';
        case 'warning': 
            return 'notification-warning';
        case 'info':    
            return 'notification-info';
        default:
            return 'notification-info'; 
    }
}

/**
 * Exibe uma notificação (toast) no canto inferior direito.
 */
function showNotification(message, type, duration = 5000) {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.error("Elemento #notification-container não encontrado no HTML. Alerta visual desativado.");
        return;
    }
    const toast = document.createElement('div');
    
    const cssClass = mapAlertTypeToCSS(type);
    toast.className = `notification-message ${cssClass}`; 
    
    toast.textContent = message;

    container.appendChild(toast); 

    void toast.offsetWidth; // Força reflow para animação
    toast.style.opacity = '1'; 
    toast.style.transform = 'translateY(0)'; 

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(100%)';
        
        setTimeout(() => toast.remove(), 500); 
    }, duration);
}

// ========================= LÓGICA DE FECHAR MODAL =========================

/**
 * Fecha um modal específico pelo seu ID.
 */
function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
    }
}

// ========================= LÓGICA DE MONITORAMENTO (CORE) =========================

let knownComandasState = new Map(); 

/**
 * Busca e processa os dados da API para verificar alertas.
 */
async function monitorarAlertas(isInicializacao = false) {
    if (!API_BASE_URL) {
        console.warn("URL da API de Comandas não definida. Monitoramento desativado.");
        return;
    }

    try {
        const comandasResponse = await fetch(API_BASE_URL);
        if (!comandasResponse.ok) throw new Error("Falha ao buscar comandas ativas. Status: " + comandasResponse.status);
        const comandas = await comandasResponse.json();
        
        let newOrderDetected = false;
        let readyOrderDetected = false;
        const newComandasState = new Map();

        comandas.filter(c => c.status !== 'FECHADA').forEach(comanda => {
            const currentStatus = comanda.status;
            const comandaId = comanda.id_comanda || comanda.id; 
            newComandasState.set(comandaId, currentStatus);
            const previousStatus = knownComandasState.get(comandaId);

            if (!knownComandasState.has(comandaId) && comanda.itens && comanda.itens.length > 0) {
                newOrderDetected = true;
                if (!isInicializacao) {
                    showNotification(`🔔 NOVO PEDIDO #${comandaId} (Mesa ${comanda.mesa || 'N/A'})`, 'new-order');
                }
            }
            
            if (previousStatus === 'EM PREPARO' && currentStatus === 'PRONTO') {
                readyOrderDetected = true;
                if (!isInicializacao) {
                    showNotification(`✅ PEDIDO PRONTO #${comandaId} (Mesa ${comanda.mesa || 'N/A'})`, 'ready-order');
                }
            }
        });
        
        knownComandasState.forEach((_, comandaId) => {
            if (!newComandasState.has(comandaId)) {
                console.log(`Comanda #${comandaId} fechada/removida.`);
            }
        });

        if (!isInicializacao) {
            if (newOrderDetected) {
                playAlertSound('new'); 
            } else if (readyOrderDetected) {
                playAlertSound('ready'); 
            }
        }
        
        knownComandasState = newComandasState;

    } catch (error) {
        console.error("Erro no monitoramento de alertas:", error);
        if (isInicializacao) {
            showNotification("⚠️ Falha ao conectar ao servidor de comandas.", 'error', 10000);
        }
    }
}

// Inicia o monitoramento global
document.addEventListener('DOMContentLoaded', () => {
    monitorarAlertas(true); 
    setInterval(monitorarAlertas, 1000); 
});


// =========================================================
// EXPORTAÇÕES OBRIGATÓRIAS
// =========================================================

// CORREÇÃO: Consolida as exportações em um único bloco, resolvendo o erro de SyntaxError/Export.
export { 
    showNotification as exibirAlerta, 
    fecharModal 
};

// Expõe a função fecharModal globalmente para uso direto em botões HTML (onclick)
window.fecharModal = fecharModal;