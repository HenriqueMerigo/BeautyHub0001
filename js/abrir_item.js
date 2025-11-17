document.addEventListener('DOMContentLoaded', () => {
    carregarComandasAbertas();
    setInterval(carregarComandasAbertas, 5000); 

    const btnNovaComanda = document.getElementById('btnNovaComanda');
    if (btnNovaComanda) {
        btnNovaComanda.addEventListener('click', () => {
            document.getElementById('comandaIdInput').value = '';
            abrirFluxoNovaComanda();
        });
    }
    
    const btnFecharContaModal = document.getElementById('btnFecharContaModal');
    if (btnFecharContaModal) {
        btnFecharContaModal.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            fecharComanda(parseInt(id));
        });
    }

    const formComanda = document.getElementById('formComanda');
    if (formComanda) {
        formComanda.addEventListener('submit', (e) => {
            e.preventDefault();
            salvarComanda();
        });
    }

    const btnAdicionarItensCardapio = document.getElementById('btnAdicionarItensCardapio');
    if (btnAdicionarItensCardapio) {
        btnAdicionarItensCardapio.addEventListener('click', adicionarItensAoResumo);
    }
    
    // Este é o botão "Adicionar Mais Itens" dentro do modal de DETALHES DA COMANDA (modalAcoesComanda)
    const btnAbrirCardapioDoModalComanda = document.getElementById('btnAdicionarItensModal');
    if(btnAbrirCardapioDoModalComanda) {
        btnAbrirCardapioDoModalComanda.addEventListener('click', () => {
            
            // Fecha o modal de ações
            if (modalAcoesComanda) modalAcoesComanda.style.display = 'none';
            
            // Abre o modal de comanda para edição
            if (modalComanda) {
                modalComanda.style.display = 'flex';
                document.getElementById('modalComandaTitle').textContent = 'Editar Comanda Existente'; 
            }

            // Agora sim, abre o cardápio, indicando que está vindo do modalComanda
            abrirModalCardapio(true); 
        });
    }
});

import { URL_API_COMANDAS } from './config.js';
import { URL_API_CARDAPIO } from './config.js';

const API_URL = URL_API_COMANDAS;
const CARDAPIO_API_URL = URL_API_CARDAPIO;

// CATEGORIAS FIXAS PARA O DROPDOWN (GARANTE ORDEM E CONSISTÊNCIA)
const CATEGORIAS_FIXAS = [
    'entradas', 
    'pratos principais', 
    'porções', 
    'adicionais', 
    'sobremesas', 
    'drinks', 
    'bebidas'
];
const FALLBACK_CATEGORY = 'Geral'; 

const comandasGrid = document.getElementById('comandasGrid'); 
const modalComanda = document.getElementById('modalComanda');
const modalCardapio = document.getElementById('modalCardapio');
const modalAcoesComanda = document.getElementById('modalAcoesComanda'); 
const tabelaItensComandaBody = document.getElementById('tabelaItensComandaBody');
const totalComandaDisplay = document.getElementById('totalComandaDisplay');

let cardapioCache = []; 
let itensSelecionados = []; 

// =========================================================================
// FUNÇÕES DE FLUXO PRINCIPAL
// =========================================================================

function formatarIdAgendamentoParaExibicao(idAgendamento) {
    if (!idAgendamento || idAgendamento.length !== 12) return `ID Inválido (${idAgendamento})`;

    const dia = idAgendamento.substring(0, 2);
    const mes = idAgendamento.substring(2, 4);
    const ano = idAgendamento.substring(4, 8);
    const hora = idAgendamento.substring(8, 10);
    const minuto = idAgendamento.substring(10, 12);

    return `${dia}/${mes}/${ano} às ${hora}:${minuto}`;
}

/**
 * Converte data (YYYY-MM-DD) e hora (HH:MM) para o formato DDMMAAAAHHMM.
 * Ex: "2025-08-05", "08:30" => "050820250830"
 */
function gerarIdAgendamento(dataStr, horaStr) {
    if (!dataStr || !horaStr) return null;

    // Data: YYYY-MM-DD => DDMMAAAA
    const [ano, mes, dia] = dataStr.split('-');
    const dataPart = `${dia}${mes}${ano}`;

    // Hora: HH:MM => HHMM
    const horaPart = horaStr.replace(':', '');

    return dataPart + horaPart;
}

/**
 * Inicia o fluxo para abrir uma NOVA comanda.
 */
function abrirFluxoNovaComanda() {
    // 1. Zera/Prepara o formulário da comanda
    document.getElementById('comandaIdInput').value = '';
    
    const dataInput = document.getElementById('dataAtendimentoInput');
    const horaInput = document.getElementById('horaAtendimentoInput');

    if (dataInput) dataInput.value = ''; // Limpa a data
    if (horaInput) horaInput.value = ''; // Limpa a hora

    if (document.getElementById('observacaoInput')) document.getElementById('observacaoInput').value = '';
    if (totalComandaDisplay) totalComandaDisplay.textContent = 'R$ 0,00';
    if (tabelaItensComandaBody) tabelaItensComandaBody.innerHTML = '';
    if (document.getElementById('modalComandaTitle')) document.getElementById('modalComandaTitle').textContent = 'Abrir Nova Comanda';

    // 2. Zera a lista de seleção
    itensSelecionados = []; 
    
    // 3. Abre o modal de Cardápio.
    // Passamos 'false' para indicar que não estamos vindo do modalComanda, portanto, não deve tentar fechá-lo.
    abrirModalCardapio(false); 
}


/**
 * Função para abrir o modal de seleção do cardápio.
 * @param {boolean} [isComingFromComandaModal=true] - Indica se a chamada veio do modalComanda.
 */
function abrirModalCardapio(isComingFromComandaModal = true) { 
    
    // Fecha o modal de Ações/Detalhes da Comanda se estiver aberto (sempre fecha este)
    if (modalAcoesComanda) modalAcoesComanda.style.display = 'none'; // <--- CORREÇÃO AQUI: De 'modalAacoesComanda' para 'modalAcoesComanda'

    // Se estiver vindo do modalComanda, esconde-o temporariamente.
    if (isComingFromComandaModal && modalComanda) { 
        modalComanda.style.display = 'none';
    }

    // 1. Garante que os campos de busca estejam limpos/resetados
    const searchInput = document.getElementById('cardapioSearch');
    const categorySelect = document.getElementById('categorySelect');
    if(searchInput) searchInput.value = '';
    if(categorySelect) categorySelect.value = ''; // Reseta a seleção
    
    const cardapioContainer = document.getElementById('cardapioItemsContainer');
    if(cardapioContainer) cardapioContainer.innerHTML = '<p>Carregando itens...</p>';

    // 2. Se o cardápio ainda não foi carregado, busca e renderiza.
    if (cardapioCache.length === 0) {
        carregarCardapioParaSelecao(); 
    } else {
        // Se já foi carregado, apenas renderiza para atualizar as quantidades
        renderizarSelecaoCardapio(cardapioCache);
    }
    
    // 3. Abre o modal do Cardápio (USANDO FLEX PARA CENTRALIZAÇÃO)
    if (modalCardapio) modalCardapio.style.display = 'flex';
    
    // 4. Atualiza o resumo lateral do cardápio
    renderizarResumoSelecionados();
}


async function carregarCardapioParaSelecao() {
    const cardapioContainer = document.getElementById('cardapioItemsContainer');
    if (!cardapioContainer) return;
    
    cardapioContainer.innerHTML = '<p>Buscando cardápio...</p>';
    
    try {
        const response = await fetch(CARDAPIO_API_URL); 
        if (!response.ok) throw new Error('Falha ao carregar cardápio do servidor.');

        const cardapioDoCSV = await response.json();
        
        if (cardapioDoCSV.length === 0) {
            cardapioContainer.innerHTML = '<p>Nenhum item cadastrado no cardápio.</p>';
            cardapioCache = [];
            return;
        }

        // Mapeia e padroniza a categoria para minúsculas para corresponder às CATEGORIAS_FIXAS
        cardapioCache = cardapioDoCSV.map(item => {
            let cat = item.categoria ? item.categoria.toLowerCase() : FALLBACK_CATEGORY.toLowerCase();
            
            // Se a categoria mapeada não estiver na lista fixa, joga para a fallback
            if (!CATEGORIAS_FIXAS.includes(cat)) {
                cat = FALLBACK_CATEGORY.toLowerCase();
            }
            
            return { 
                ...item, 
                categoria: cat 
            };
        });

        renderizarSelecaoCardapio(cardapioCache);

    } catch (error) {
        console.error('Erro ao carregar cardápio:', error);
        cardapioContainer.innerHTML = '<p class="text-danger">Erro ao carregar cardápio. Verifique o servidor.</p>';
    }
}

/**
 * Renderiza a interface de cardápio com o DROPDOWN de categorias.
 */
function renderizarSelecaoCardapio(cardapio) {
    const cardapioContainer = document.getElementById('cardapioItemsContainer');
    const categorySelect = document.getElementById('categorySelect');
    const searchInput = document.getElementById('cardapioSearch');
    
    if (!cardapioContainer || !categorySelect || !searchInput) return;

    // 1. Cria a lista de categorias que realmente têm itens.
    const categoriasPresentes = new Set(cardapio.map(item => item.categoria));
    let categoriasParaRenderizar = CATEGORIAS_FIXAS.filter(cat => categoriasPresentes.has(cat));

    // Adiciona a categoria FALLBACK (Geral) se houver itens nela.
    if (categoriasPresentes.has(FALLBACK_CATEGORY.toLowerCase())) {
        categoriasParaRenderizar.push(FALLBACK_CATEGORY.toLowerCase());
    }

    if (categoriasParaRenderizar.length === 0) {
        cardapioContainer.innerHTML = '<p>Nenhum item válido para exibição.</p>';
        categorySelect.innerHTML = '';
        return;
    }

    // 2. Preenche o Dropdown (Select)
    categorySelect.innerHTML = '<option value="">Todas as Opções</option>';
    categoriasParaRenderizar.forEach(cat => {
        // Formata para exibição (Primeira letra maiúscula)
        const displayCat = cat.charAt(0).toUpperCase() + cat.slice(1);
        categorySelect.innerHTML += `<option value="${cat}">${displayCat}</option>`;
    });

    // 3. Adiciona Listeners de Mudança (Dropdown e Busca)
    
    // Listener do SELECT (Mudança de Categoria)
    if(categorySelect.onchange === null) {
        categorySelect.onchange = () => {
            filtrarErenderizarItens(cardapio, categorySelect.value, searchInput.value);
        };
    }

    // Listener da Busca (Busca por Nome)
    if(searchInput.oninput === null) {
        searchInput.oninput = () => {
            filtrarErenderizarItens(cardapio, categorySelect.value, searchInput.value);
        };
    }
    
    // 4. Renderiza inicialmente (sem filtro de categoria ativo)
    filtrarErenderizarItens(cardapio, categorySelect.value, searchInput.value); 
    
    // 5. Atualiza o resumo de itens selecionados
    renderizarResumoSelecionados();
}

/**
 * Aplica o filtro (categoria e busca) e renderiza os cards de item.
 */
function filtrarErenderizarItens(cardapio, activeCategory, searchText) {
    const cardapioContainer = document.getElementById('cardapioItemsContainer');
    if (!cardapioContainer) return;
    
    cardapioContainer.innerHTML = '';
    
    const termoBusca = searchText.toLowerCase().trim();
    
    const itensFiltrados = cardapio.filter(item => {
        // Filtro por Categoria: Se activeCategory estiver vazio (""), não aplica o filtro de categoria.
        const byCategory = activeCategory === "" || item.categoria === activeCategory;
        
        // Filtro por Busca:
        const bySearch = item.nome.toLowerCase().includes(termoBusca);
        
        return byCategory && bySearch;
    });

    if (itensFiltrados.length === 0) {
        let categoryName = activeCategory ? (activeCategory.charAt(0).toUpperCase() + activeCategory.slice(1)) : 'todos os itens';
        
        if (termoBusca) {
            cardapioContainer.innerHTML = `<p>Nenhum item encontrado em ${categoryName} com o termo "${searchText}".</p>`;
        } else if (activeCategory) {
            cardapioContainer.innerHTML = `<p>Nenhum item cadastrado na categoria "${categoryName}".</p>`;
        } else {
             cardapioContainer.innerHTML = `<p>Nenhum item encontrado com seus filtros.</p>`;
        }
        return;
    }
    
    itensFiltrados.forEach(item => {
        const itemSelecionado = itensSelecionados.find(i => i.id === item.id);
        const quantidade = itemSelecionado ? itemSelecionado.quantidade : 0;
        
        cardapioContainer.innerHTML += criarCardItem(item, quantidade);
    });
    
    // Adiciona Listeners de clique nos cards
    document.querySelectorAll('.item-card-clickable').forEach(card => {
        card.onclick = (e) => {
            if (e.target.closest('.remove-item-button')) return; 
            
            const itemId = parseInt(card.getAttribute('data-id'));
            manipularItemSelecionado(itemId, 1); 
        };
    });
    
    // Adiciona Listeners de clique nos botões de REMOVER
     document.querySelectorAll('.remove-item-button').forEach(button => {
        button.onclick = (e) => {
            const itemId = parseInt(e.target.closest('.item-card-clickable').getAttribute('data-id'));
            manipularItemSelecionado(itemId, -1); 
        };
    });
}

/**
 * Cria o HTML para o card de seleção rápida.
 */
function criarCardItem(item, quantidade) {
    const isSelected = quantidade > 0;
    
    return `
        <div class="item-card-clickable ${isSelected ? 'selected' : ''}" data-id="${item.id}">
            <div class="item-info">
                <span class="item-name">${item.nome}</span>
                <span class="item-price">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
            </div>
            ${isSelected ? 
                `<div class="item-actions">
                    <span class="item-qty-indicator">${quantidade}x</span>
                    <button class="remove-item-button">-</button>
                </div>` 
                : ''}
        </div>
    `;
}

/**
 * Lógica para adicionar/remover o item da lista de itensSelecionados (Usado pelos cards).
 */
function manipularItemSelecionado(itemId, change) {
    const itemIndex = itensSelecionados.findIndex(i => i.id === itemId);
    const itemBase = cardapioCache.find(i => i.id === itemId);

    if (!itemBase) return;

    if (itemIndex > -1) {
        itensSelecionados[itemIndex].quantidade += change;
        
        if (itensSelecionados[itemIndex].quantidade <= 0) {
            itensSelecionados.splice(itemIndex, 1);
        }
    } else if (change > 0) {
        itensSelecionados.push({
            id: itemBase.id,
            nome: itemBase.nome,
            preco: itemBase.preco,
            quantidade: change
        });
    }
    
    // Atualiza a renderização dos cards na categoria ativa
    const categorySelect = document.getElementById('categorySelect');
    const searchInput = document.getElementById('cardapioSearch');
    
    if (categorySelect && searchInput) {
        filtrarErenderizarItens(cardapioCache, categorySelect.value, searchInput.value);
    }
    
    // Atualiza o resumo lateral
    renderizarResumoSelecionados();
}


function renderizarResumoSelecionados() {
    const resumoContainer = document.getElementById('resumoSelecaoBody'); 
    const resumoTotalDisplay = document.getElementById('resumoSelecaoTotal'); 

    if (!resumoContainer || !resumoTotalDisplay) return;

    resumoContainer.innerHTML = '';
    let totalGeral = 0;

    itensSelecionados.forEach(item => {
        const subtotal = item.quantidade * item.preco;
        totalGeral += subtotal;
        
        const row = resumoContainer.insertRow();
        
        // NOVO: Adiciona a célula com o botão 'X' para remover
        row.innerHTML = `
            <td>${item.quantidade}x</td>
            <td data-item-id="${item.id}">${item.nome}</td>
            <td>R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
            <td>
                <button 
                    class="action-button" 
                    onclick="removerItemDoResumo(${item.id})"
                    style="background-color: var(--danger-color); padding: 2px 6px; font-size: 10px; line-height: 1; border-radius: 4px;"
                >
                    X
                </button>
            </td>
        `;
    });
    
    resumoTotalDisplay.textContent = `Total: R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
}

/**
 * NOVO: Remove o item do resumo da seleção (zera a quantidade).
 */
function removerItemDoResumo(itemId) {
    const itemIndex = itensSelecionados.findIndex(i => i.id === itemId);

    if (itemIndex > -1) {
        // Remove o item do array
        itensSelecionados.splice(itemIndex, 1); 
        
        // Atualiza a renderização de ambos os lados: cards e resumo
        const categorySelect = document.getElementById('categorySelect');
        const searchInput = document.getElementById('cardapioSearch');
        
        if (categorySelect && searchInput) {
            filtrarErenderizarItens(cardapioCache, categorySelect.value, searchInput.value);
        }
        
        renderizarResumoSelecionados();
    }
}


function adicionarItensAoResumo() {
    if (!tabelaItensComandaBody || !totalComandaDisplay) return;

    if (itensSelecionados.length === 0) {
        alert('Selecione pelo menos um item!');
        return;
    }
    
    // Abre o Modal Comanda antes de injetar os itens (USANDO FLEX PARA CENTRALIZAÇÃO)
    // Se o modalComanda foi escondido ao abrir o cardápio (isComingFromComandaModal = true), ele precisa ser reaberto aqui.
    if (modalComanda) modalComanda.style.display = 'flex';
    if (modalCardapio) modalCardapio.style.display = 'none';

    tabelaItensComandaBody.innerHTML = '';
    
    let totalGeral = 0;
    
    // RECALCULA O TOTAL FINAL E INJETA NA TABELA DE RESUMO DA COMANDA
    itensSelecionados.forEach(item => {
        const subtotal = item.quantidade * item.preco;
        totalGeral += subtotal;
        
        const row = tabelaItensComandaBody.insertRow();
        row.innerHTML = `
            <td>${item.quantidade}x</td>
            <td>${item.nome}</td>
            <td>R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
        `;
    });
    
    totalComandaDisplay.textContent = `R$ ${totalGeral.toFixed(2).replace('.', ',')}`;
}

// =========================================================================
// FUNÇÃO CRÍTICA DE SALVAMENTO (MANTIDA)
// =========================================================================
async function salvarComanda() {
    const comandaId = document.getElementById('comandaIdInput')?.value; 
    const observacao = document.getElementById('observacaoInput')?.value;

    // NOVOS INPUTS DE DATA E HORA
    const dataAtendimento = document.getElementById('dataAtendimentoInput')?.value;
    const horaAtendimento = document.getElementById('horaAtendimentoInput')?.value;
    
    // GERA O NOVO ID DE ATENDIMENTO
    const idAgendamento = gerarIdAgendamento(dataAtendimento, horaAtendimento);
    
    const itensParaSalvar = itensSelecionados
        .filter(item => item.quantidade > 0)
        .map(item => ({
            id: item.id, 
            nome: item.nome,
            preco: item.preco,
            quantidade: item.quantidade
        }));
        
    if (itensParaSalvar.length === 0) {
        alert('O atendimento deve ter pelo menos um item/serviço.');
        return;
    }
    
    if (!comandaId && !idAgendamento) {
         alert('Por favor, informe a data e hora do atendimento.');
         return;
    }
    
    let method;
    let url;
    let successMessage;
    let payload = {};

    // 1. ATUALIZAÇÃO (PUT): Adicionar Itens
    if (comandaId) {
        method = 'PUT'; 
        url = `${API_URL}/${comandaId}/adicionar-itens`; 
        successMessage = 'Itens/Serviços adicionados ao atendimento com sucesso!';
        
        payload = {
            itens: itensParaSalvar
        };
        
        if (observacao) payload.observacao = observacao;
        
        // Se estiver editando, não mude o ID/mesa existente
        // Caso seu backend permita mudar a "mesa" em edição, adicione: payload.mesa = idAgendamento; 
        
    } else {
        // 2. CRIAÇÃO (POST): Novo Atendimento
        method = 'POST';
        url = API_URL;
        successMessage = 'Atendimento marcado com sucesso!';
        
        payload = {
            // Mapeia o ID do Agendamento para o campo 'mesa' da API, mantendo a compatibilidade:
            mesa: idAgendamento,
            observacao: observacao,
            itens: itensParaSalvar
        };
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            // ... (Lógica de tratamento de erro mantida) ...
            const contentType = response.headers.get("content-type");
            let errorMessage = `Erro ao salvar atendimento. Status: ${response.status} (${response.statusText})`;
            
            if (contentType && contentType.includes("application/json")) {
                const error = await response.json().catch(() => ({ message: response.statusText }));
                errorMessage = error.message || errorMessage;
            } else {
                 errorMessage += `. Verifique a rota da API no backend (URL: ${url}).`;
            }
            throw new Error(errorMessage);
        }

        alert(successMessage);
        if (modalComanda) modalComanda.style.display = 'none';
        
        itensSelecionados = []; 
        
        carregarComandasAbertas();
    } catch (error) {
        console.error('Erro ao salvar atendimento:', error);
        alert(`Erro ao salvar atendimento. Verifique o console. Detalhes: ${error.message}`);
    }
}
// =========================================================================
// FUNÇÕES DE EXIBIÇÃO E AÇÕES (MANTIDAS)
// =========================================================================

async function carregarComandasAbertas() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Erro ao buscar comandas abertas.');
        
        let comandas = await response.json();
        
        const comandasAbertas = comandas.filter(c => c.status !== 'FECHADA');
        
        renderizarComandas(comandasAbertas);
        
    } catch (error) {
        console.error('Erro ao carregar comandas:', error);
        if (comandasGrid) comandasGrid.innerHTML = '<p class="text-danger">Erro ao carregar comandas. Verifique o servidor.</p>';
    }
}

function renderizarComandas(comandas) {
    if (!comandasGrid) return;
    
    comandasGrid.innerHTML = '';
    
    if (comandas.length === 0) {
        comandasGrid.innerHTML = '<p>Nenhuma comanda aberta no momento.</p>';
        return;
    }

    comandas.forEach(comanda => {
        let statusClass = 'status-new'; 
        if (comanda.status === 'EM PREPARO') {
            statusClass = 'status-preparing'; 
        } else if (comanda.status === 'PRONTO') {
            statusClass = 'status-ready'; 
        } else if (comanda.status === 'EM CONSUMO') { 
            statusClass = 'status-new'; 
        }
        
        const cardHTML = criarCardComanda(comanda, statusClass);
        comandasGrid.insertAdjacentHTML('beforeend', cardHTML);
    });

    document.querySelectorAll('.comanda-card').forEach(card => {
        card.addEventListener('click', (e) => {
             if (e.target.closest('.card-actions button')) {
                return;
            }
            const id = card.getAttribute('data-id');
            carregarComandaParaModal(parseInt(id));
        });
    });

    document.querySelectorAll('.btn-fechar-card').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const id = button.getAttribute('data-id');
            carregarComandaParaModal(parseInt(id)); 
        });
    });
}

function criarCardComanda(comanda, statusClass) {
    const total = comanda.total.toFixed(2).replace('.', ',');
    const dataAbertura = new Date(comanda.data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    
    const itensEmPreparo = comanda.itens.filter(i => i.statusItem === 'EM PREPARO').length;
    const itensProntos = comanda.itens.filter(i => i.statusItem === 'PRONTO').length;
    
    let statusText = `Em Consumo (Fechamento)`;
    let statusTextColor = 'var(--primary-color)';
    
    const agendamentoFormatado = formatarIdAgendamentoParaExibicao(comanda.mesa); // Usando a nova função
    


    if (itensEmPreparo > 0) {
        statusText = `Preparando: ${itensEmPreparo} item(s)`;
        statusTextColor = 'var(--warning-color)';
    }
    if (itensProntos > 0) {
        statusText = `PRONTO: ${itensProntos} item(s) para entregar!`;
        statusTextColor = 'var(--ready-color)'; 
        statusClass = 'status-ready'; 
    }
    
    return `
        <div class="comanda-card ${statusClass}" data-id="${comanda.id}">
            <div class="comanda-header">
                <span class="table-number">Agendado para: ${agendamentoFormatado} (#${comanda.id})</span> 
                <span class="waiter-info">${dataAbertura}</span>
            </div>
            <p class="status-text" style="color: ${statusTextColor}; font-weight: bold;">${statusText}</p>
            </div>
    `;
}

async function carregarComandaParaModal(id) {
    try {
        const response = await fetch(`${API_URL}`);
        if (!response.ok) throw new Error('Erro ao buscar comandas.');
        
        const comandas = await response.json();
        const comanda = comandas.find(c => c.id === id);

        if (!comanda) {
            alert('Comanda não encontrada.');
            return;
        }

        renderizarDetalhesComanda(comanda);
        document.getElementById('modalAcoesComanda').style.display = 'flex'; 
        
    } catch (error) {
        console.error('Erro ao carregar detalhes da comanda:', error);
        alert('Não foi possível carregar os detalhes da comanda.');
    }
}


function renderizarDetalhesComanda(comanda) {
    const modal = document.getElementById('modalAcoesComanda');
    const comandaItensBody = document.getElementById('comandaItensBody');
    const resumoStatus = document.getElementById('comandaResumo');
    
    // GERAÇÃO DO FORMATO DE EXIBIÇÃO
    // comanda.mesa armazena o ID DDMMAAAAHHMM.
    const agendamentoFormatado = formatarIdAgendamentoParaExibicao(comanda.mesa);

    const btnAdicionarItensModal = document.getElementById('btnAdicionarItensModal');
    const comandaIdInput = document.getElementById('comandaIdInput');
    // ATENÇÃO: Os inputs de data e hora de EDIÇÃO precisam ser lidos aqui,
    // mas não podemos preenchê-los com o ID DDMMAAAAHHMM.

    // Apenas a observação é mantida para edição
    const observacaoInput = document.getElementById('observacaoInput'); 


    // Verificação de elementos (Mantida)
    if (!modal || !comandaItensBody || !resumoStatus || !btnAdicionarItensModal || !comandaIdInput || !observacaoInput) return;
    
    // 1. ATUALIZAÇÃO DO TÍTULO DO MODAL: Mudar de "Mesa" para "Agendamento"
    document.getElementById('modalAcoesTitle').textContent = `Atendimento #${comanda.id} - ${agendamentoFormatado.split(' ')[0]}`; // Exibe apenas a data no título para simplificar
    
    document.getElementById('comandaTotalDisplay').textContent = comanda.total.toFixed(2).replace('.', ',');
    
    document.getElementById('btnFecharContaModal').setAttribute('data-id', comanda.id);
    
    // 2. PREENCHIMENTO DE EDIÇÃO (BACKGROUND):
    comandaIdInput.value = comanda.id;
    // Removido: mesaInput.value = comanda.mesa || '00';
    observacaoInput.value = comanda.observacao || '';
    
    // Define o ID da comanda para a função de adicionar mais itens
    btnAdicionarItensModal.setAttribute('data-id', comanda.id);
    
    // Ao abrir o modal de detalhes, preenche itensSelecionados com itens não cancelados
    itensSelecionados = comanda.itens
        .filter(item => item.statusItem !== 'CANCELADO')
        .map(item => ({
            id: item.id, 
            nome: item.nome,
            preco: item.preco,
            quantidade: item.quantidade
        }));
    
    comandaItensBody.innerHTML = '';
    
    comanda.itens.forEach(item => {
        const subtotal = item.quantidade * item.preco;

        const row = comandaItensBody.insertRow();
        let statusDisplay = item.statusItem;
        let statusColor = '#3498db'; 

        if (item.statusItem === 'EM PREPARO') {
            statusColor = 'var(--warning-color)';
        } else if (item.statusItem === 'PRONTO') {
            statusColor = 'var(--ready-color)';
        } else if (item.statusItem === 'CANCELADO') {
            statusColor = 'var(--danger-color)';
        }
        
        row.innerHTML = `
            <td style="text-align: left; padding: 12px 8px;">${item.quantidade}x</td>
            <td style="text-align: left; padding: 12px 8px;">${item.nome}</td>
            <td style="text-align: right; padding: 12px 8px;">R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
            <td style="text-align: left; padding: 12px 8px;"><span style="color: ${statusColor}; font-weight: bold;">${statusDisplay}</span></td>
            <td style="text-align: center; padding: 12px 8px;">
                ${item.statusItem === 'PRONTO' ? 
                  `<button class="action-button btn-entregar-item" data-comanda-id="${comanda.id}" data-item-id="${item.id}" style="background-color: var(--success-color); padding: 5px 10px;">Entregar</button>` 
                  : '-'}
            </td>
        `;
    });
    
    document.querySelectorAll('.btn-entregar-item').forEach(button => {
        button.addEventListener('click', marcarItemEntregue);
    });

    let statusGeral = `Status: <span style="font-weight: bold; color: ${comanda.status === 'PRONTO' ? 'var(--ready-color)' : '#3498db'}">${comanda.status}</span>`;
    
    // 3. ATUALIZAÇÃO DO RESUMO DE STATUS: Usar a variável formatada
    resumoStatus.innerHTML = `
        <p>Agendamento: <span class="detail-value-bold">${agendamentoFormatado}</span></p>
        <p>Abertura: <span class="detail-value-bold">${new Date(comanda.data).toLocaleString('pt-BR')}</span></p>
        <p>${statusGeral}</p>
    `;
}

async function marcarItemEntregue(event) {
    const button = event.target;
    const comandaId = button.getAttribute('data-comanda-id');
    const itemId = button.getAttribute('data-item-id');

    button.disabled = true;
    button.textContent = 'Entregando...';

    try {
        const response = await fetch(`${API_URL}/item/${comandaId}/${itemId}/entregue`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || `Erro ao marcar item como entregue: ${response.statusText}`);
        }
        
        // Atualiza os modais e a grid
        carregarComandaParaModal(parseInt(comandaId));
        carregarComandasAbertas();
        
        setTimeout(() => {
             button.textContent = 'Entregue!';
        }, 300);

    } catch (error) {
        console.error('Erro ao marcar item entregue:', error);
        alert(`Falha ao marcar item como entregue: ${error.message}`);
        button.disabled = false;
        button.textContent = 'Tentar Novamente';
    }
}


async function fecharComanda(id) {
    const formaPagamento = prompt("Informe a forma de pagamento (Ex: Dinheiro, Cartão, PIX):");
    
    if (!formaPagamento) {
        alert("Fechamento cancelado.");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/fechar/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ formaPagamento: formaPagamento })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(error.message || 'Erro ao fechar comanda.');
        }

        alert(`Comanda #${id} fechada com sucesso! Enviada ao Financeiro.`);
        
        document.getElementById('modalAcoesComanda').style.display = 'none';
        carregarComandasAbertas();

    } catch (error) {
        console.error('Erro ao fechar comanda:', error);
        alert(`Falha ao fechar comanda: ${error.message}`);
    }
}


window.fecharModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
    }
}

window.removerItemDoResumo = removerItemDoResumo;
window.abrirModalCardapio = abrirModalCardapio;