// js/preparar_item.js

// Importações (garanta que config.js está no mesmo diretório ou caminho correto)
import { exibirAlerta } from './alerta_global.js'; // Adicionado import de alerta
import { URL_API_COMANDAS } from './config.js';
import { URL_API_CARDAPIO } from './config.js';

const API_URL = URL_API_COMANDAS; // Para comandas (KDS)
const CARDAPIO_API_URL = URL_API_CARDAPIO; // Para CRUD do cardápio

// Referências aos elementos HTML
const cozinhaGrid = document.getElementById('cozinhaGrid');
const cardapioModal = document.getElementById('cardapioModal'); // Modal principal do cardápio
const tabelaCardapioBody = document.getElementById('tabelaCardapioBody'); // Body da tabela do cardápio

// Elementos do modal de formulário de item (itemFormModal)
const itemFormModal = document.getElementById('itemFormModal');
const btnNovoItemCardapio = document.getElementById('btnNovoItemCardapio'); // Botão "Novo Item" no header do cardapioModal
const btnAcessarCardapio = document.getElementById('btnAcessarCardapio'); // Botão "Gerenciar Cardápio" na página
const formCardapio = document.getElementById('formCardapio');
const modalCardapioTitle = document.getElementById('modalCardapioTitle'); // Título do modal de formulário (Adicionar/Editar)
const itemIdInput = document.getElementById('itemId');
const itemNomeInput = document.getElementById('itemNome');
const itemCategoriaInput = document.getElementById('itemCategoria');
const itemPrecoInput = document.getElementById('itemPreco');
const btnVoltarItemForm = document.getElementById('btnVoltarItemForm'); // Botão "Voltar" no formulário

let cardapioCache = []; // Para armazenar o cardápio carregado e evitar múltiplas requisições

// =========================================================================
// LISTENERS DE EVENTOS PRINCIPAIS
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. KDS - Carrega pedidos em preparo e atualiza a cada 10s
    carregarPedidosCozinha();
    setInterval(carregarPedidosCozinha, 10000);

    // 2. GESTÃO DE CARDÁPIO - Inicializa listeners
    if (btnAcessarCardapio) {
        btnAcessarCardapio.addEventListener('click', abrirModalCardapioGerenciamento);
    }
    
    if (btnNovoItemCardapio) {
        btnNovoItemCardapio.addEventListener('click', () => abrirModalFormularioItem(null)); // Abre para novo item
    }

    if (btnVoltarItemForm) {
        btnVoltarItemForm.addEventListener('click', () => {
            fecharModal('itemFormModal'); // Fecha o formulário
            abrirModalCardapioGerenciamento(); // Reabre o modal de gerenciamento do cardápio
        });
    }

    if (formCardapio) {
        formCardapio.addEventListener('submit', salvarItemCardapio);
    }
});

// =========================================================================
// MÓDULO 1: KITCHEN DISPLAY SYSTEM (KDS)
// =========================================================================

async function carregarPedidosCozinha() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Erro ao buscar dados: ${response.statusText}`);
        }
        const comandas = await response.json();
        renderizarPedidos(comandas);

    } catch (error) {
        console.error('Erro ao carregar pedidos da cozinha:', error);
        if (cozinhaGrid) {
            cozinhaGrid.innerHTML = `<p class="text-danger">Erro ao carregar pedidos. Verifique o servidor Node.js rodando na porta 3000.</p>`;
        }
    }
}

function renderizarPedidos(comandas) {
    if (!cozinhaGrid) return;
    
    cozinhaGrid.innerHTML = ''; 
    
    const comandasComItensPendentes = comandas.filter(comanda => 
        comanda.itens.some(item => 
            item.statusItem === 'EM PREPARO' || item.statusItem === 'PRONTO'
        )
    );

    if (comandasComItensPendentes.length === 0) {
        cozinhaGrid.innerHTML = '<p>Nenhum pedido em preparo ou pronto no momento.</p>';
        return;
    }

    comandasComItensPendentes.forEach(comanda => {
        const itensParaPreparo = comanda.itens.filter(item => 
            item.statusItem === 'EM PREPARO' || item.statusItem === 'PRONTO'
        );

        const cardHTML = criarCardCozinha(comanda, itensParaPreparo);
        cozinhaGrid.insertAdjacentHTML('beforeend', cardHTML);
    });

    // CORREÇÃO CRÍTICA: Anexar o listener AGORA, após os cards terem sido adicionados.
    // O seletor agora corresponde ao botão gerado na função criarCardCozinha.
    document.querySelectorAll('.btn-comanda-pronta').forEach(button => {
        button.addEventListener('click', marcarComandaPronta);
    });
}


function criarCardCozinha(comanda, itens) {
    const dataHora = new Date(comanda.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const itensEmPreparo = itens.filter(i => i.statusItem === 'EM PREPARO').length;
    
    let itensListHTML = '';
    itens.forEach(item => {
        const statusClass = item.statusItem === 'PRONTO' ? 'item-pronto' : 'item-em-preparo';
        
        itensListHTML += `
            <li class="${statusClass}">
                <span class="item-qty">${item.quantidade}x</span>
                <span class="item-nome">${item.nome}</span>
                <span class="status-item-display">(${item.statusItem})</span>
            </li>
        `;
    });
    
    let btnHTML = '';
    if (itensEmPreparo > 0) {
        // CORREÇÃO: Adicionada a classe 'btn-comanda-pronta' para que o listener encontre o botão.
        btnHTML = `
            <button class="action-button action-button-primary btn-comanda-pronta" 
                    data-comanda-id="${comanda.id}" 
                    style="background-color: var(--success-color); margin-top: 10px;">
                <i class="fas fa-check"></i> Marcar TODOS como PRONTO (${itensEmPreparo} itens)
            </button>
        `;
    } else {
        btnHTML = `
            <div class="alert alert-info" style="margin-top: 10px; padding: 10px; border-radius: 5px; background-color: var(--alternate-row-background); color: var(--text-color-light); display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fas fa-info-circle"></i> TODOS os itens estão PRONTOS!
            </div>
        `;
    }

    return `
        <div class="comanda-cozinha-card">
            <div class="card-header">
                <h3>Comanda #${comanda.id}</h3>
                <span class="mesa-info">Mesa ${comanda.mesa}</span>
            </div>
            <span class="time-info">Aberto às: ${dataHora}</span>

            ${comanda.observacao ? `<div class="observacao">Obs: ${comanda.observacao}</div>` : ''}

            <div class="itens-container">
                <h4>Itens Pendentes:</h4>
                <ul class="itens-list">
                    ${itensListHTML}
                </ul>
            </div>
            
            <div class="card-footer-action">
                ${btnHTML}
            </div>
        </div>
    `;
}

async function marcarComandaPronta(event) {
    // CORREÇÃO: O event.target pode ser o <i>. Devemos subir até encontrar o botão.
    let button = event.target.closest('.btn-comanda-pronta'); 
    
    if (!button) {
        console.error("Botão 'Marcar TODOS como PRONTO' não encontrado.");
        return;
    }
    
    const comandaId = button.getAttribute('data-comanda-id');

    if (!confirm(`Confirma que todos os itens da Comanda #${comandaId} estão prontos para entrega?`)) {
        return;
    }

    button.disabled = true;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando Todos...'; // Ícone de loading

    try {
        const response = await fetch(`${API_URL}/${comandaId}/pronto-todos`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const errorData = await response.json();
                exibirAlerta(errorData.message || `Erro ao marcar comanda pronta: ${response.statusText}`, 'error');
                throw new Error(errorData.message || `Erro ao marcar comanda pronta: ${response.statusText}`);
            } else {
                exibirAlerta(`Erro de comunicação com o servidor: ${response.status}`, 'error');
                throw new Error(`Erro de comunicação. Servidor retornou HTML em vez de JSON. Verifique se o servidor Node.js está rodando.`);
            }
        }
        
        
        carregarPedidosCozinha(); 

    } catch (error) {
        console.error('Erro ao marcar comanda pronta:', error);
        // O alerta já foi disparado acima ou será disparado pelo throw
        // Removido o alert() nativo para usar o seu sistema de alertas
    } finally {
        // Reabilitar, embora a recarga remova este botão
        button.disabled = false; 
        button.innerHTML = `<i class="fas fa-check"></i> Marcar TODOS como PRONTO`; // Retorna ao estado original
    }
}


// =========================================================================
// MÓDULO 2: GESTÃO DE CARDÁPIO (CRUD CSV) - MANTIDO
// =========================================================================

/**
 * Abre o modal principal de gerenciamento do cardápio e carrega os dados.
 */
function abrirModalCardapioGerenciamento() {
    carregarCardapio(); // Carrega os dados mais recentes do cardápio
    if (cardapioModal) {
        cardapioModal.style.display = 'flex'; // Abre o modal principal do cardápio
    }
}

/**
 * Abre o modal de formulário para adicionar ou editar um item do cardápio.
 * @param {object|null} item - Objeto do item a ser editado, ou null para novo item.
 */
function abrirModalFormularioItem(item = null) {
    if (itemFormModal) {
        cardapioModal.style.display = 'none'; // Fecha o modal de gerenciamento de cardápio
        itemFormModal.style.display = 'flex'; // Abre o modal do formulário (com flex para centralizar)

        if (item) {
            // Modo Edição
            modalCardapioTitle.textContent = 'Editar Item do Cardápio';
            itemIdInput.value = item.id;
            itemNomeInput.value = item.nome;
            itemCategoriaInput.value = item.categoria || ''; // Garante que a categoria não seja 'null' ou 'undefined'
            itemPrecoInput.value = item.preco.toFixed(2);
        } else {
            // Modo Novo Item
            modalCardapioTitle.textContent = 'Adicionar Novo Item';
            formCardapio.reset(); // Limpa o formulário
            itemIdInput.value = '';
        }
    }
}


async function carregarCardapio() {
    if (!tabelaCardapioBody) return;
    tabelaCardapioBody.innerHTML = '<tr><td colspan="5" class="text-center">Carregando Cardápio...</td></tr>';
    
    try {
        const response = await fetch(CARDAPIO_API_URL);
        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("text/html")) {
                exibirAlerta(`Erro 404: Falha ao buscar dados da API. Verifique o servidor Node.js.`, 'error');
                throw new Error(`Erro 404: Falha ao buscar dados da API. Verifique se o servidor Node.js está rodando.`);
            }
            exibirAlerta(`Erro ${response.status}: Falha ao carregar cardápio.`, 'error');
            throw new Error(`Erro ${response.status}: ${response.statusText || 'Falha ao carregar cardápio.'}`);
        }

        const data = await response.json();
        cardapioCache = data; // Armazena em cache
        renderizarTabelaCardapio(data);

    } catch (error) {
        console.error('Erro ao carregar cardápio:', error);
        tabelaCardapioBody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Erro ao carregar cardápio: ${error.message}</td></tr>`;
    }
}

function renderizarTabelaCardapio(itens) {
    if (!tabelaCardapioBody) return;
    tabelaCardapioBody.innerHTML = ''; // Limpa a tabela

    if (itens.length === 0) {
        tabelaCardapioBody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum item cadastrado no cardápio. Use o botão "Novo Item".</td></tr>';
        return;
    }

    itens.forEach(item => {
        const row = tabelaCardapioBody.insertRow();
        row.innerHTML = `
            <td>#${item.id}</td>
            <td>${item.nome}</td>
            <td>${item.categoria || 'Geral'}</td>
            <td>R$ ${item.preco.toFixed(2).replace('.', ',')}</td>
            <td class="action-buttons-cell">
                <button class="action-button-secondary edit-item-btn" data-id="${item.id}" title="Editar Item">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="action-button-danger delete-item-btn" data-id="${item.id}" title="Excluir Item">
                    <i class="fas fa-trash-alt"></i> Excluir
                </button>
            </td>
        `;
    });

    // Adiciona event listeners aos botões de Editar e Excluir
    document.querySelectorAll('.edit-item-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const itemId = parseInt(e.currentTarget.dataset.id);
            const itemToEdit = cardapioCache.find(i => i.id === itemId);
            if (itemToEdit) {
                abrirModalFormularioItem(itemToEdit);
            }
        });
    });

    document.querySelectorAll('.delete-item-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const itemId = parseInt(e.currentTarget.dataset.id);
            if (confirm(`Tem certeza que deseja excluir o item #${itemId}?`)) {
                excluirItemCardapio(itemId);
            }
        });
    });
}

async function salvarItemCardapio(event) {
    event.preventDefault();

    const id = itemIdInput.value ? parseInt(itemIdInput.value) : null;
    const nome = itemNomeInput.value.trim();
    const categoria = itemCategoriaInput.value.trim();
    const preco = parseFloat(itemPrecoInput.value); // Já está validado no HTML como number

    if (!nome || !categoria || isNaN(preco) || preco <= 0) {
        exibirAlerta('Por favor, preencha todos os campos corretamente (Nome, Categoria e Preço > 0).', 'warning');
        return;
    }

    const itemData = { nome, categoria, preco };

    let url = CARDAPIO_API_URL;
    let method = 'POST';
    let successMessage = 'Item adicionado com sucesso!';

    if (id) {
        url = `${CARDAPIO_API_URL}/${id}`;
        method = 'PUT';
        successMessage = 'Item atualizado com sucesso!';
        itemData.id = id; // Garante que o ID é enviado na atualização
    }
    
    // Desabilitar o botão de salvar para evitar múltiplos cliques
    const btnSalvar = document.getElementById('btnSalvarItem');
    btnSalvar.disabled = true;
    btnSalvar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Salvando...';

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            exibirAlerta(`Falha ao salvar item: Erro ${response.status}`, 'error');
            throw new Error(`Erro ${response.status}: ${errorText}`);
        }

        exibirAlerta(successMessage, 'success');
        fecharModal('itemFormModal');
        abrirModalCardapioGerenciamento(); // Reabre o modal de gerenciamento e recarrega

    } catch (error) {
        console.error('Erro ao salvar item do cardápio:', error);
        // O alerta já foi disparado
    } finally {
        btnSalvar.disabled = false;
        btnSalvar.innerHTML = '<i class="fas fa-save"></i> Salvar';
    }
}

async function excluirItemCardapio(itemId) { // Recebe o ID diretamente
    if (!confirm(`Tem certeza que deseja excluir o item #${itemId} do cardápio?`)) {
        return;
    }

    try {
        const response = await fetch(`${CARDAPIO_API_URL}/${itemId}`, {
            method: 'DELETE'
        });

        if (response.status === 204 || response.status === 200) {
            exibirAlerta('Item excluído com sucesso.', 'success');
            carregarCardapio(); // Recarrega a tabela do cardápio
        } else if (response.status === 404) {
            exibirAlerta('Item não encontrado.', 'warning');
        } else {
             const errorText = await response.text();
             exibirAlerta(`Falha ao excluir item: Erro ${response.status}`, 'error');
             throw new Error(`Falha ao excluir item: ${response.statusText} - ${errorText}`);
        }
        
    } catch (error) {
        console.error('Erro ao excluir item:', error);
        // O alerta já foi disparado
    }
}


// =========================================================================
// UTILITÁRIOS DE MODAL (MANTIDO)
// =========================================================================

window.fecharModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
        // Limpa o formulário do item ao fechar, se for o modal correto
        if (id === 'itemFormModal' && formCardapio) {
            formCardapio.reset();
            itemIdInput.value = '';
        }
    }
}