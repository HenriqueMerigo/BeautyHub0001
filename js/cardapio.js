// cardapio.js (Comunicação com o backend Node.js na porta 3000 e melhorias de UX)
import { URL_API_CARDAPIO } from './config.js'
// 1. Variáveis Globais e Configurações
let cardapio = []; // Array que armazena o cache local dos dados
const API_URL = URL_API_CARDAPIO;

// 2. Elementos do DOM (Modal Principal)
const modal = document.getElementById("cardapioModal");
const btnAcessarCardapio = document.getElementById("btnAcessarCardapio");
const spanClose = document.querySelector(".close-button");
const cardapioDataContainer = document.getElementById("cardapioData");
const btnAdicionar = document.getElementById("btnAdicionar");

// 3. Elementos do DOM (Modal de Formulário Add/Edit)
const itemFormModal = document.getElementById("itemFormModal");
const closeFormButton = document.querySelector(".close-form-button");
const itemForm = document.getElementById("itemForm");
const btnCancelarForm = document.getElementById("btnCancelarForm");
const formTitle = document.getElementById("formTitle");


// 4. FUNÇÕES DE CARREGAMENTO VIA API

/**
 * Carrega os dados do cardápio do servidor via API e atualiza a view.
 */
async function carregarCardapio() {
    try {
        cardapioDataContainer.innerHTML = "Carregando Cardápio do Servidor...";
        
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Erro ${response.status}: Falha ao buscar dados da API.`);
        }
        
        // Os dados vêm no formato JSON, prontos para uso
        cardapio = await response.json(); 
        
        renderCardapio(); // Renderiza a tabela
        
    } catch (error) {
        console.error("Falha ao carregar Cardápio:", error);
        cardapioDataContainer.innerHTML = `<p style="color: red;">
            Erro de conexão: Certifique-se de que o <strong>servidor Node.js está rodando</strong> na porta 3000.
        </p><p>Detalhes: ${error.message}</p>`;
    }
}


// 5. FUNÇÃO DE RENDERIZAÇÃO (Desenha a Tabela no Modal)

function renderCardapio() {
    if (cardapio.length === 0) {
        cardapioDataContainer.innerHTML = "<p>O cardápio está vazio.</p>";
        return;
    }

    let html = '<table>';
    html += '<thead><tr><th>ID</th><th>Nome</th><th>Preço</th><th>Categoria</th><th>Ações</th></tr></thead>';
    html += '<tbody>';

    cardapio.forEach(item => {
        // Formata o preço para o padrão BRL
        const precoFormatado = (item.preco || 0).toFixed(2).replace('.', ','); 
        
        html += `
            <tr id="item-${item.id}">
                <td>${item.id}</td>
                <td>${item.nome}</td>
                <td>R$ ${precoFormatado}</td>
                <td>${item.categoria}</td>
                <td>
                    <button onclick="editarItem(${item.id})">Editar</button>
                    <button onclick="excluirItem(${item.id})">Excluir</button>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    cardapioDataContainer.innerHTML = html;
}


// 6. FUNÇÕES DE CONTROLE DO MODAL DE FORMULÁRIO (Add/Edit)

function abrirFormulario(titulo, item = null) {
    // 1. Limpa o formulário
    itemForm.reset(); 
    
    // 2. Define o título
    formTitle.textContent = titulo;

    if (item) {
        // Modo EDIÇÃO: Preenche o formulário
        document.getElementById("itemId").value = item.id;
        document.getElementById("nome").value = item.nome;
        document.getElementById("preco").value = item.preco; // Sem toFixed para permitir a edição
        document.getElementById("categoria").value = item.categoria;
    } else {
        // Modo ADICIONAR: Garante que o ID está vazio
        document.getElementById("itemId").value = "";
    }
    
    // 3. Exibe o modal
    itemFormModal.style.display = "block";
}

function fecharFormulario() {
    itemFormModal.style.display = "none";
}

// 7. FUNÇÕES CRUD (Comunicação com o Backend)

// ABRIR FORMULÁRIO DE ADIÇÃO
btnAdicionar.onclick = function() {
    // Fecha o modal de visualização antes de abrir o de formulário (UX)
    modal.style.display = "none"; 
    abrirFormulario("Adicionar Novo Item");
}

// ABRIR FORMULÁRIO DE EDIÇÃO
function editarItem(id) {
    const item = cardapio.find(i => i.id === id);
    if (!item) {
        alert("Item não encontrado localmente. Recarregue a lista.");
        return;
    }
    
    // Fecha o modal de visualização
    modal.style.display = "none"; 
    abrirFormulario(`Editar Item ID: ${id}`, item);
}

// TRATAMENTO DO SUBMIT DO FORMULÁRIO (Adicionar e Editar Juntos)
itemForm.onsubmit = async function(e) {
    e.preventDefault(); // Impede o envio padrão do formulário
    
    // 1. Coleta e valida os dados do formulário
    const id = document.getElementById("itemId").value;
    const nome = document.getElementById("nome").value.trim();
    // O parseFloat garante que o valor seja um número, crucial para o backend
    const preco = parseFloat(document.getElementById("preco").value); 
    const categoria = document.getElementById("categoria").value.trim();
    
    if (nome === "" || isNaN(preco) || preco <= 0 || categoria === "") {
        alert("Por favor, preencha todos os campos corretamente.");
        return;
    }

    const itemData = { nome, preco, categoria };
    
    // Log para depuração: verifique no console do navegador se os dados estão corretos
    console.log(`Tentando ${id ? 'EDITAR (PUT)' : 'ADICIONAR (POST)'}. Dados:`, itemData);
    
    let method = id ? 'PUT' : 'POST';
    let url = id ? `${API_URL}/${id}` : API_URL;
    
    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemData)
        });

        if (response.ok) {
            fecharFormulario();
            
            // Recarrega os dados e reabre o modal principal (confirmação visual)
            await carregarCardapio(); 
            modal.style.display = "block";

        } else {
            // Se o servidor falhar (e.g., erro 500)
            throw new Error(`Falha no servidor: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error("Erro ao salvar item:", error);
        // Mantemos o alert de erro para notificar o usuário sobre a falha
        alert(`Ocorreu um erro ao salvar: ${error.message}. Verifique o console.`); 
    }
};

// Excluir Item
async function excluirItem(id) {
    if (!confirm(`Tem certeza que deseja excluir o item de ID ${id}? Esta ação é permanente no CSV.`)) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            // Recarrega para refletir a mudança
            await carregarCardapio(); 
        } else {
            throw new Error(`Falha na exclusão: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao tentar excluir item. Verifique o console.");
    }
}


// 8. FUNÇÕES DE CONTROLE DO MODAL PRINCIPAL E EVENTOS DE FECHAMENTO

// Abre o modal principal, e carrega/renderiza o cardápio
btnAcessarCardapio.onclick = function() {
    carregarCardapio(); 
    modal.style.display = "block";
}

// Fecha o modal principal ao clicar no 'x'
spanClose.onclick = function() {
    modal.style.display = "none";
}

// Fecha o modal de formulário ao clicar em "Cancelar"
btnCancelarForm.onclick = fecharFormulario;

// Fecha os modais ao clicar fora deles
window.onclick = function(event) {
    if (event.target === modal) {
        modal.style.display = "none";
    } else if (event.target === itemFormModal) {
        fecharFormulario();
    }
}