// mainpage.js - Lógica para carregar os indicadores operacionais da mainpage (Com Alertas MP3 e Visuais)
// Importa ambas as URLs do config.js
import { URL_API_COMANDAS, URL_API_MOVIMENTACOES } from "./config.js";

const API_URL_COMANDAS = URL_API_COMANDAS;
// Usamos a nova constante que você definiu no config.js
const API_URL_MOVIMENTACOES = URL_API_MOVIMENTACOES; 

// Elementos do Dashboard (IDs definidos no mainpage.html)
const comandasAbertas = document.getElementById('comandasAbertas');
const itensEmPreparo = document.getElementById('itensEmPreparo');
const itensProntos = document.getElementById('itensProntos');
const faturamentoHoje = document.getElementById('faturamentoHoje');

// ========================= LÓGICA DE ALERTE SONORO (MP3) =========================
const audioNovoPedido = new Audio('audio/novo_pedido.mp3'); 
const audioPratoPronto = new Audio('audio/prato_pronto.mp3'); 

/**
 * Toca o arquivo de som correspondente.
 * @param {string} type - 'new' para novo pedido ou 'ready' para pedido pronto.
 */
function playAlertSound(type = 'new') {
    let audio = (type === 'ready') ? audioPratoPronto : audioNovoPedido;
    audio.currentTime = 0; 
    
    audio.play().catch(e => {
        console.warn(`Alerta de áudio (${type}) bloqueado. Erro:`, e.message);
        document.body.addEventListener('click', () => { audio.play().catch(e => {}); }, { once: true });
        document.body.addEventListener('touchstart', () => { audio.play().catch(e => {}); }, { once: true });
    });
}

// ========================= LÓGICA DE ALERTE VISUAL (TOAST) =========================

/**
 * Exibe uma notificação (toast) no canto inferior direito.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('new-order', 'ready-order').
 */
function showNotification(message, type) {
    const container = document.getElementById('notification-container');
    if (!container) {
        console.error("Elemento #notification-container não encontrado no HTML.");
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    void toast.offsetWidth; 
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 500); 
    }, 5000);
}


// ========================= LÓGICA DE MONITORAMENTO E DASHBOARD =========================

let knownComandasState = new Map(); 

/**
 * Busca e processa os dados da API para popular os cards de status operacional e verificar alertas.
 * @param {boolean} isInicializacao Indica se é a primeira carga (sem alertas sonoros).
 */
async function carregarIndicadoresOperacionais(isInicializacao = false) {
    
    // Resetar valores e mostrar loading
    [comandasAbertas, itensEmPreparo, itensProntos, faturamentoHoje].forEach(el => {
         if (el) el.textContent = '...';
    });
    
    try {
        // 1. Fetch Comandas
        const comandasResponse = await fetch(API_URL_COMANDAS);
        if (!comandasResponse.ok) throw new Error("Falha ao buscar comandas ativas. Status: " + comandasResponse.status);
        
        let comandas = await comandasResponse.json();
        
        // Validação de Comandas
        if (!Array.isArray(comandas)) {
            console.error("Resposta da API de comandas não é um array:", comandas);
            comandas = []; 
        }
        
        // 2. Fetch Movimentações (Usando a nova constante importada)
        const movimentacoesResponse = await fetch(API_URL_MOVIMENTACOES);
        if (!movimentacoesResponse.ok) throw new Error("Falha ao buscar movimentações financeiras. Status: " + movimentacoesResponse.status);
        
        let movimentacoes = await movimentacoesResponse.json();

        // Validação de Movimentações
        if (!Array.isArray(movimentacoes)) {
            console.error("Resposta da API de movimentações não é um array:", movimentacoes);
            movimentacoes = []; 
        }

        
        // --- Lógica de ALERTA (Universal) ---
        
        let newOrderDetected = false;
        let readyOrderDetected = false;
        const newComandasState = new Map();

        comandas.filter(c => c.status !== 'FECHADA').forEach(comanda => {
            const currentStatus = comanda.status;
            newComandasState.set(comanda.id, currentStatus);
            const previousStatus = knownComandasState.get(comanda.id);

            const hasItems = comanda.itens && Array.isArray(comanda.itens) && comanda.itens.length > 0;

            // DETECÇÃO DE ALERTA 1: Novo Pedido
            if (!knownComandasState.has(comanda.id) && hasItems) {
                newOrderDetected = true;
                if (!isInicializacao) {
                    showNotification(`🔔 NOVO PEDIDO #${comanda.id} (Mesa ${comanda.mesa || 'N/A'})`, 'new-order');
                }
            }
            
            // DETECÇÃO DE ALERTA 2: Pedido PRONTO
            if (previousStatus === 'EM PREPARO' && currentStatus === 'PRONTO') {
                readyOrderDetected = true;
                if (!isInicializacao) {
                    showNotification(`✅ PEDIDO PRONTO #${comanda.id} (Mesa ${comanda.mesa || 'N/A'})`, 'ready-order');
                }
            }
        });
        
        // Tocar alertas sonoros
        if (!isInicializacao) {
            if (newOrderDetected) {
                playAlertSound('new'); 
            } else if (readyOrderDetected) {
                playAlertSound('ready'); 
            }
        }
        
        // Atualiza o estado conhecido
        knownComandasState = newComandasState;


        // --- Processamento dos Dados para UI (Dashboard) ---
        
        const abertas = comandas.filter(c => c.status !== 'FECHADA');
        let totalEmPreparo = 0;
        let totalProntos = 0;
        
        abertas.forEach(comanda => {
            // VALIDAÇÃO: Garante que 'itens' existe e é um array antes de filtrar
            if (comanda.itens && Array.isArray(comanda.itens)) {
                totalEmPreparo += comanda.itens.filter(i => i.statusItem === 'EM PREPARO' || i.statusItem === 'ABERTO').length;
                totalProntos += comanda.itens.filter(i => i.statusItem === 'PRONTO').length;
            } else {
                 console.warn(`Comanda ID ${comanda.id} tem estrutura de itens inválida.`);
            }
        });

        // Faturamento de Hoje
        // Formato YYYY-MM-DD
        const hoje = new Intl.DateTimeFormat('fr-CA', { year: 'numeric', month: '2-digit', day: '2-digit' })
                         .format(new Date()).replace(/\//g, '-'); 

        let faturamentoTotalHoje = 0;
        
        movimentacoes.forEach(mov => {
            const dataFechamento = mov.dataFechamento ? new Date(mov.dataFechamento).toISOString().split('T')[0] : null;

            if (dataFechamento === hoje) {
                faturamentoTotalHoje += parseFloat(mov.valorTotal) || 0; 
            }
        });


        // --- 4. Atualização da UI ---
        
        if (comandasAbertas) comandasAbertas.textContent = abertas.length.toString();
        if (itensEmPreparo) itensEmPreparo.textContent = totalEmPreparo.toString();
        if (itensProntos) itensProntos.textContent = totalProntos.toString();
        
        if (faturamentoHoje) {
            faturamentoHoje.textContent = faturamentoTotalHoje.toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
            });
        }

    } catch (error) {
        console.error("ERRO CRÍTICO ao carregar dashboard. Verifique o console para mais detalhes:", error);
        // Em caso de erro, exibe 'ERRO' nos cards
        [comandasAbertas, itensEmPreparo, itensProntos, faturamentoHoje].forEach(el => {
             if (el) el.textContent = 'ERRO';
        });
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // 1. Carrega a primeira vez para inicializar o estado 
    carregarIndicadoresOperacionais(true); 
    
    // 2. Configura a busca periódica (a cada 10 segundos)
    setInterval(carregarIndicadoresOperacionais, 10000); 
});