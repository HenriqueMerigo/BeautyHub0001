// js/financeiro.js (VERSÃO RADICAL: REMOÇÃO TOTAL DA FUNCIONALIDADE DE CONFERIR DETALHES)

import { exibirAlerta, fecharModal } from "./alerta_global.js";
import { URL_API_COMANDAS, URL_API_COMPRAS, URL_API_FORNECEDORES } from "./config.js"; 

const COMANDAS_API_URL = URL_API_COMANDAS; // Ex: .../api/comandas (PLURAL para LISTAR)
const COMPRAS_API_URL = URL_API_COMPRAS;   // Ex: .../api/compras (PLURAL para LISTAR)
// FORNECEDORES_API_URL não será mais usada, pois a conferência de compra foi removida.
// const FORNECEDORES_API_URL = URL_API_FORNECEDORES; 

// Elementos do DOM
const filtroDataInicial = document.getElementById('filtroDataInicial');
const filtroDataFinal = document.getElementById('filtroDataFinal');
const btnFiltrar = document.getElementById('btnFiltrar'); 
const btnExportar = document.getElementById('btnExportarCSV');
const tabelaFinanceiraBody = document.getElementById('tabelaFinanceiraBody');
const totalEntradasDisplay = document.getElementById('totalEntradasDisplay');
const totalSaidasDisplay = document.getElementById('totalSaidasDisplay');
const totalLucroDisplay = document.getElementById('totalLucroDisplay');

let todasTransacoes = []; 

// =========================================================
// FUNÇÕES PRINCIPAIS E FLUXO DE CARREGAMENTO 
// =========================================================

document.addEventListener('DOMContentLoaded', () => {
    setDefaultDates(); 
    carregarTransacoes();
    
    if(btnFiltrar) btnFiltrar.addEventListener('click', aplicarFiltros);
    if(btnExportar) btnExportar.addEventListener('click', exportarCSV);
    
    if (tabelaFinanceiraBody) {
        tabelaFinanceiraBody.addEventListener('click', (event) => {
            // Garante que a delegação de eventos da linha não interfira.
            // A lógica de conferir ao clicar na linha FOI REMOVIDA.
            if (event.target.closest('.delete-button')) {
                return;
            }
        });
    }
});

function setDefaultDates() {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);

    const formatDate = (date) => date.toISOString().split('T')[0];

    if (filtroDataFinal) filtroDataFinal.value = formatDate(today);
    if (filtroDataInicial) filtroDataInicial.value = formatDate(thirtyDaysAgo);
}

/**
 * Função segura para realizar fetch e parsear JSON, retornando um array vazio em caso de falha.
 * @param {string} url 
 * @returns {Promise<Array<any>>}
 */
async function fetchSafeJson(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`Falha ao buscar dados de ${url}. Status: ${response.status}`);
            return [];
        }
        
        const data = await response.json().catch(error => {
             console.error(`Erro ao parsear JSON de ${url}:`, error);
             return [];
        });
        
        return Array.isArray(data) ? data : [];

    } catch (error) {
        console.error(`Erro na requisição de rede para ${url}:`, error);
        return [];
    }
}

/**
 * Carrega todas as movimentações financeiras (Comandas e Compras) da API.
 */
async function carregarTransacoes() {
    if (!tabelaFinanceiraBody) return;
    tabelaFinanceiraBody.innerHTML = `<tr><td colspan="5" class="text-center">Carregando dados...</td></tr>`;

    try {
        const [movimentacoesComandas, movimentacoesCompras] = await Promise.all([
            fetchSafeJson(COMANDAS_API_URL), // Usa URL no plural para listagem
            fetchSafeJson(COMPRAS_API_URL)   // Usa URL no plural para listagem
        ]);
        
        // 1. Padroniza Comandas (Receitas)
        const receitas = movimentacoesComandas
            .filter(mov => mov.status === 'FECHADA') 
            .map(mov => {
                const comandaId = mov.id_comanda || mov.id;
                const valor = parseFloat(mov.valorTotal || mov.total || mov.valor || 0) || 0; 

                return {
                    id: `R-${comandaId}`, 
                    idOriginal: comandaId, 
                    data: mov.dataFechamento || mov.data, 
                    descricao: `Atendimento #${comandaId || 'N/A'} (ID do Agendamento ${mov.mesa || '00'}) - ${mov.formaPagamento || 'Pix'}`, 
                    valor: valor,
                    tipo: 'Receita',
                    status: mov.status || 'FECHADA'
                };
            });

        // 2. Padroniza Compras (Saídas)
        const saidas = movimentacoesCompras.map(compra => ({
            id: `C-${compra.id}`,
            idOriginal: String(compra.id), 
            data: compra.data,
            descricao: `Compra: ${compra.descricao || 'Itens diversos'} (ID Compra: ${compra.id})`, 
            // O valor é negativo para ser subtraído do lucro
            valor: -Math.abs(parseFloat(compra.total) || 0), 
            tipo: 'Saída',
            status: 'PAGO'
        }));
        
        todasTransacoes = [...receitas, ...saidas];
        // Ordena por data (mais recente primeiro)
        todasTransacoes.sort((a, b) => new Date(b.data) - new Date(a.data)); 
        
        aplicarFiltros(); 
        
    } catch (error) {
        console.error("Erro fatal ao carregar transações:", error);
        if (tabelaFinanceiraBody) {
             tabelaFinanceiraBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Erro ao carregar dados. Verifique o console.</td></tr>`;
        }
        exibirAlerta('Erro ao carregar dados de Comandas ou Compras. Verifique o status das APIs.', 'error');
    }
}

// Funções utilitárias de Data, Filtros, Renderização e Totais
function getDateStartOfDay(dateString) {
    const parts = dateString.split('-');
    // Cria data UTC no início do dia
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}

function getDateEndOfDay(dateString) {
    const parts = dateString.split('-');
    // Cria data UTC no final do dia
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 23, 59, 59, 999));
    return date;
}

function aplicarFiltros() {
    const dataInicialValor = filtroDataInicial?.value;
    const dataFinalValor = filtroDataFinal?.value;

    let dadosFiltrados = todasTransacoes;

    if (dataInicialValor) {
        const dataInicial = getDateStartOfDay(dataInicialValor); 
        dadosFiltrados = dadosFiltrados.filter(mov => {
            const dataMovimentacao = new Date(mov.data); 
            return dataMovimentacao >= dataInicial;
        });
    }

    if (dataFinalValor) {
        const dataFinal = getDateEndOfDay(dataFinalValor); 
        dadosFiltrados = dadosFiltrados.filter(mov => {
            const dataMovimentacao = new Date(mov.data);
            return dataMovimentacao <= dataFinal;
        });
    }

    renderizarTabela(dadosFiltrados); 
    calcularTotaisEDashboard(dadosFiltrados); 
}

function renderizarTabela(dados) {
    if (!tabelaFinanceiraBody) return;
    tabelaFinanceiraBody.innerHTML = '';
    
    // Salva os dados atuais para exportação
    tabelaFinanceiraBody.dataset.dadosAtuais = JSON.stringify(dados); 
    
    if (dados.length === 0) {
        tabelaFinanceiraBody.innerHTML = `<tr><td colspan="5" class="text-center">Nenhuma transação encontrada no período.</td></tr>`;
        return;
    }

    dados.forEach(transacao => {
        const idOriginal = transacao.idOriginal; 
        const tipo = transacao.tipo;

        const dataFormatada = new Date(transacao.data).toLocaleDateString('pt-BR');
                              
        const valorNumerico = transacao.valor; 
        const valorDisplay = (typeof valorNumerico === 'number' && !isNaN(valorNumerico)) 
            ? Math.abs(valorNumerico).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            : 'R$ 0,00';
        
        const isSaida = transacao.tipo === 'Saída';
        const valorClass = isSaida ? 'text-danger' : 'text-success'; 
        
        const row = tabelaFinanceiraBody.insertRow();
        row.dataset.idOriginal = idOriginal; 
        row.dataset.tipo = tipo; 

        row.insertCell().textContent = dataFormatada; 
        
        const tipoCell = row.insertCell();
        tipoCell.textContent = tipo;
        tipoCell.style.fontWeight = 'bold';
        tipoCell.style.color = isSaida ? 'var(--danger-color)' : 'var(--success-color)';
        
        row.insertCell().textContent = transacao.descricao;
        
        const valorCell = row.insertCell();
        valorCell.textContent = valorDisplay;
        valorCell.className = valorClass;
        valorCell.style.textAlign = 'right';

        const cellAcoes = row.insertCell();
        cellAcoes.style.textAlign = 'center';
        
        // Formata o ID para ser passado corretamente na chamada JS
        const idParaFuncao = typeof idOriginal === 'string' ? `'${idOriginal}'` : idOriginal;

        // O BOTÃO CONFERIR (LUPA) FOI REMOVIDO DAQUI
        const excluirButton = `
            <button 
                class="action-button-danger delete-button" 
                onclick="event.stopPropagation(); solicitarConfirmacaoExclusao('${tipo}', ${idParaFuncao})"
                title="Excluir ${tipo === 'Receita' ? 'Comanda (Receita)' : 'Compra (Saída)'}"
            >
                <i class="fas fa-trash-alt"></i>
            </button>
        `;

        cellAcoes.innerHTML = excluirButton; // Apenas o botão de exclusão
    });
}

function calcularTotaisEDashboard(dados) {
    // Entradas (Receitas) são valores positivos
    const totalEntradas = dados
        .filter(t => t.tipo === 'Receita')
        .reduce((sum, t) => sum + t.valor, 0);

    // Saídas são valores negativos, somamos e pegamos o valor absoluto para o dashboard
    const totalSaidasAbs = dados
        .filter(t => t.tipo === 'Saída')
        .reduce((sum, t) => sum + t.valor, 0); 
    
    const totalSaidas = Math.abs(totalSaidasAbs); // Valor positivo para display

    const totalLucro = totalEntradas + totalSaidasAbs; // Saída é valor negativo

    const formatar = (valor) => valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    if (totalEntradasDisplay) {
        totalEntradasDisplay.textContent = formatar(totalEntradas);
    }
    
    if (totalSaidasDisplay) {
        totalSaidasDisplay.textContent = formatar(totalSaidas); 
    }
    
    if (totalLucroDisplay) {
        totalLucroDisplay.textContent = formatar(totalLucro);
        const lucroCard = totalLucroDisplay.closest('.metric-card');
        if(lucroCard) {
            lucroCard.classList.remove('primary', 'danger');
            lucroCard.classList.add(totalLucro >= 0 ? 'primary' : 'danger');
        }
    }
}

// =========================================================
// FUNÇÕES DE AÇÃO GLOBAIS
// =========================================================

// FUNÇÃO conferirTransacao FOI REMOVIDA

function solicitarConfirmacaoExclusao(tipo, id) {
    // Usa a função confirm() apenas como um fallback simples
    if (confirm(`ATENÇÃO: Deseja realmente excluir esta ${tipo} (ID: ${id})? Esta ação é irreversível!`)) {
        if (tipo === 'Receita') {
            excluirComanda(id);
        } else {
            removerCompra(id);
        }
    }
}

// =========================================================
// FUNÇÕES DE AÇÃO: EXCLUIR COMANDA (RECEITA)
// =========================================================

// FUNÇÃO conferirComanda FOI REMOVIDA

async function excluirComanda(id) {
    // A rota de delete deve ser /api/comandas/{id} (plural) ou /api/comanda/{id} (singular).
    // Usando a rota PLURAL, que é a que a maioria das APIs RESTful utiliza para recursos.
    // **ASSUMINDO QUE SUA ROTA DE DELETE É NO PLURAL, como a maioria das APIs RESTful:**
    const url = `${COMANDAS_API_URL}/${id}`; 
    // SE PRECISAR DO SINGULAR, DESCOMENTE ESTAS DUAS LINHAS:
    // const baseListUrl = COMANDAS_API_URL.replace(/\/comandas$/, '/comanda'); 
    // const url = `${baseListUrl}/${id}`; 
    
    exibirAlerta(`Excluindo Comanda #${id} do fluxo de caixa...`, 'info', 1500);

    try {
        const response = await fetch(url, {
            method: 'DELETE',
        });

        if (response.status === 204 || response.status === 200 || response.status === 404) {
            exibirAlerta(`Comanda #${id} excluída (ou já inexistente). Recarregando dados...`, 'success');
            // fecharModal('modalConferencia'); // REMOVIDO
            carregarTransacoes(); 
        } else {
            const errorText = await response.text();
            throw new Error(`Falha ao excluir comanda. Status: ${response.status}. Detalhe: ${errorText.substring(0, 100)}...`);
        }

    } catch (error) {
        console.error('Erro ao excluir comanda:', error);
        exibirAlerta(`Erro ao excluir comanda: ${error.message}`, 'error');
    }
}

// =========================================================
// FUNÇÕES DE AÇÃO: EXCLUIR COMPRA (SAÍDA)
// =========================================================

// FUNÇÃO conferirCompra FOI REMOVIDA

async function removerCompra(id) {
    // A rota de delete deve ser /api/compras/{id} (plural) ou /api/compra/{id} (singular).
    // Usando a rota PLURAL, que é a que a maioria das APIs RESTful utiliza para recursos.
    // **ASSUMINDO QUE SUA ROTA DE DELETE É NO PLURAL, como a maioria das APIs RESTful:**
    const url = `${COMPRAS_API_URL}/${id}`; 
    // SE PRECISAR DO SINGULAR, DESCOMENTE ESTAS DUAS LINHAS:
    // const baseListUrl = COMPRAS_API_URL.replace(/\/compras$/, '/compra'); 
    // const url = `${baseListUrl}/${id}`; 
    
    exibirAlerta(`Excluindo Compra #${id} do fluxo de caixa...`, 'info', 1500);

    try {
        const response = await fetch(url, {
            method: 'DELETE',
        });

        if (response.status === 204 || response.status === 200 || response.status === 404) {
            exibirAlerta(`Compra #${id} excluída (ou já inexistente). Recarregando dados...`, 'success');
            // fecharModal('modalDetalheCompra'); // REMOVIDO
            carregarTransacoes(); 
        } else {
            const errorText = await response.text();
            throw new Error(`Falha ao excluir compra. Status: ${response.status}. Detalhe: ${errorText.substring(0, 100)}...`);
        }

    } catch (error) {
        console.error('Erro ao excluir compra:', error);
        exibirAlerta(`Erro ao excluir compra: ${error.message}`, 'error');
    }
}


// =========================================================
// FUNÇÕES DE EXPORTAÇÃO CSV
// =========================================================

function converterArrayParaCSV(dados) {
    if (!dados || dados.length === 0) return '';
    
    const colunasAmigaveis = ['ID Ref', 'Tipo', 'Data', 'Descrição', 'Valor (R$)'];
    const header = colunasAmigaveis.join(';'); 
    
    const linhas = dados.map(item => {
        // Remove o sinal negativo para exportação, pois o Tipo já indica Saída
        const valorDisplay = Math.abs(item.valor).toFixed(2).replace('.', ','); 

        return [
            item.idOriginal || '',
            item.tipo,
            new Date(item.data).toLocaleDateString('pt-BR') || '', 
            // Substitui ponto e vírgula e quebras de linha na descrição
            item.descricao.replace(/;/g, ',').replace(/\n/g, ' ') || '', 
            valorDisplay 
        ].join(';');
    });

    return header + '\n' + linhas.join('\n');
}

function exportarCSV() {
    if (!tabelaFinanceiraBody) {
        exibirAlerta("Elemento da tabela não encontrado.", 'error');
        return;
    }
    const dadosJSON = tabelaFinanceiraBody.dataset.dadosAtuais;
    if (!dadosJSON) {
        exibirAlerta("Não há dados para exportar. Tente recarregar ou filtrar.", 'warning');
        return;
    }

    let dadosParaExportar;
    try {
        dadosParaExportar = JSON.parse(dadosJSON);
    } catch (e) {
        console.error("Erro ao analisar dados JSON para exportação:", e);
        exibirAlerta("Erro interno ao preparar dados para exportação.", 'error');
        return;
    }


    if (dadosParaExportar.length === 0) {
        exibirAlerta("Nenhuma transação para exportar.", 'warning');
        return;
    }
    
    const csvContent = converterArrayParaCSV(dadosParaExportar);
    
    // Cria o Blob com BOM (\ufeff) para garantir a compatibilidade com acentos no Excel
    const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `FluxoDeCaixa_Relatorio_${new Date().toISOString().slice(0, 10)}.csv`);
    
    link.style.display = 'none'; 
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

// =========================================================
// EXPOSIÇÃO GLOBAL (Obrigatória para uso em onclick HTML)
// =========================================================

// REMOVIDO: window.conferirTransacao
// REMOVIDO: window.conferirComanda
// REMOVIDO: window.conferirCompra

window.solicitarConfirmacaoExclusao = solicitarConfirmacaoExclusao; 
window.excluirComanda = excluirComanda;
window.removerCompra = removerCompra;
window.exportarCSV = exportarCSV; 
window.aplicarFiltros = aplicarFiltros;