// server.js (VERSÃO COMPLETA E ATUALIZADA - Pronta para ES Modules)

// server.js - INÍCIO DO ARQUIVO

// =========================================================
// ⚠️ CONFIGURAÇÃO CRÍTICA DE LICENÇA OFFLINE ⚠️
//
// 1. ESTE VALOR DEVE SER ATUALIZADO (RENOVADO) MENSALMENTE.
// 2. O TIMESTAMP DEVE REPRESENTAR O PRIMEIRO INSTANTE (00:00:00) 
//    DO DIA EM QUE A LICENÇA DEVE EXPIRAR.
//
const DATA_EXPIRACAO_TIMESTAMP = 1763002800000; //resultado da conversão do timestamp.py
// =========================================================

/**
 * Função utilitária para obter o timestamp de meia-noite (00:00:00) 
 * de uma determinada data, na zona horária local.
 * Isso garante que a comparação seja feita apenas pelo dia.
 * @param {number} timestamp - Timestamp em milissegundos.
 * @returns {number} O timestamp do início do dia.
 */
function getStartOfDayTimestamp(timestamp) {
    const data = new Date(timestamp);
    // Garante que a hora seja 00:00:00.000 no fuso horário local
    data.setHours(0, 0, 0, 0); 
    return data.getTime();
}

/**
 * Realiza a checagem de licença localmente. Se a data atual for
 * igual ou superior à data de expiração, encerra o processo.
 */
function verificarBloqueioOffline() {
    console.log(`\n--- INICIALIZANDO CHECK DE LICENCA OFFLINE ---`);
    
    // 1. Normaliza a data atual do cliente para 00:00:00
    const dataAtualNormalizada = getStartOfDayTimestamp(Date.now()); 
    
    // 2. Normaliza a data de expiração para 00:00:00
    const dataExpiracaoNormalizada = getStartOfDayTimestamp(DATA_EXPIRACAO_TIMESTAMP);
    
    // Checa se a data atual é IGUAL ou POSTERIOR à data de expiração
    if (dataAtualNormalizada >= dataExpiracaoNormalizada) {
        
        // Formata a data para a mensagem de erro (usa a data original apenas para exibição)
        const dataVencimento = new Date(DATA_EXPIRACAO_TIMESTAMP).toLocaleDateString('pt-BR');
        
        console.error('\n❌ ==========================================');
        console.error(`   ATENÇÃO: LICENCA VENCIDA EM ${dataVencimento}.`);
        console.error('   O sistema detectou que a data de hoje é igual ou posterior à data de vencimento.');
        console.error('   CONTATE O SUPORTE PARA RENOVAÇÃO DO PRAZO.');
        console.error('   ------------------------------------------');
        console.error('   O sistema será encerrado.');
        console.error('==========================================\n');
        
        // Usa process.exit(1) para bloquear o sistema imediatamente
        process.exit(1); 
        
    } else {
        // Se ainda estiver dentro do prazo
        const msRestantes = dataExpiracaoNormalizada - dataAtualNormalizada;
        const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));
        const dataVencimento = new Date(DATA_EXPIRACAO_TIMESTAMP).toLocaleDateString('pt-BR');

        console.log(`✅ Licenca ATIVA. Restam ${diasRestantes} dias.`);
        console.log(`   Vencimento: ${dataVencimento}`);
        console.log('--- CHECK CONCLUÍDO ---\n');
    }
}

// =========================================================
// 🚨 CHAME A FUNÇÃO DE BLOQUEIO ANTES DE QUALQUER INICIALIZAÇÃO 🚨
verificarBloqueioOffline(); 
// Se a função não encerrar o processo, o código continua.
// =========================================================

// =========================================================================
// IMPORTS: APENAS SINTAXE ES MODULES (COMPATÍVEL COM "type": "module" no package.json)
// =========================================================================
import express from 'express';
import cors from 'cors';
import fs from 'fs';          // Módulo Node.js 'fs' (File System)
import path from 'path';        // Módulo Node.js 'path'
// Imports do seu arquivo de configuração
import { API_PORT, BASE_URL, IP } from "./js/config.js"; 

// PARA __dirname e __filename em ES Modules, precisamos de um workaround
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const app = express();
// Garante que o PORTA seja lido corretamente do config.js ou use um fallback
const PORT = API_PORT;

// Caminhos dos arquivos de dados
const COMANDAS_FILE = path.join(__dirname, 'comandas.json');
const CARDAPIO_FILE = path.join(__dirname, 'cardapio.csv'); 
const FORNECEDORES_FILE = path.join(__dirname, 'fornecedores.json'); 
const COMPRAS_FILE = path.join(__dirname, 'compras.json');       

// Middleware
app.use(cors()); 
app.use(express.json()); 
// Configura para servir arquivos estáticos (HTML, CSS, JS)
app.use(express.static(path.join(__dirname))); 

// Middleware de log simples para cada requisição
app.use((req, res, next) => {
    const timestamp = new Date().toLocaleString('pt-BR');
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
});

// =========================================================================
// FUNÇÕES AUXILIARES DE MANIPULAÇÃO DE ARQUIVOS JSON (GENÉRICO)
// =========================================================================

/**
 * Lê um arquivo JSON e retorna seu conteúdo.
 * Cria o arquivo com um array vazio se não existir.
 * @param {string} filePath - Caminho para o arquivo JSON.
 * @returns {Array} - Conteúdo do arquivo JSON.
 */
const readJsonFile = (filePath) => {
    try {
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, '[]', 'utf8'); // Cria o arquivo se não existir
            return [];
        }
        const data = fs.readFileSync(filePath, 'utf8');
        // Adiciona um fallback para JSONs malformados ou vazios, retornando um array vazio.
        return data.trim() ? JSON.parse(data) : [];
    } catch (error) {
        console.error(`Erro ao ler ${filePath}:`, error.message);
        // Se houver erro de parse (JSON inválido), tenta resetar o arquivo
        if (error.name === 'SyntaxError') {
             console.log(`Tentativa de corrigir JSON inválido em ${filePath}. Arquivo resetado.`);
             fs.writeFileSync(filePath, '[]', 'utf8');
        }
        return [];
    }
};

/**
 * Escreve dados em um arquivo JSON.
 * @param {string} filePath - Caminho para o arquivo JSON.
 * @param {Array} data - Dados a serem escritos.
 */
const writeJsonFile = (filePath, data) => {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (error) {
        console.error(`Erro ao escrever em ${filePath}:`, error.message);
    }
};


// =========================================================================
// FUNÇÕES AUXILIARES DE MANIPULAÇÃO DE ARQUIVOS (COMANDAS - JSON)
// =========================================================================

// Usando as funções genéricas para comandas e compras
const readComandas = () => readJsonFile(COMANDAS_FILE);
const writeComandas = (comandas) => writeJsonFile(COMANDAS_FILE, comandas);

/**
 * Atualiza o status geral de uma comanda com base no status de seus itens.
 * @param {object} comanda - O objeto comanda a ser atualizado.
 */
const updateComandaStatus = (comanda) => {
    // Não tenta alterar o status de comandas já FECHADAS
    if (comanda.status === 'FECHADA') {
        return;
    }
    
    if (!comanda.itens || comanda.itens.length === 0) {
        comanda.status = 'ABERTA'; // Se não houver itens, está apenas aberta.
        return;
    }

    // Verifica se existe algum item que NÃO está entregue ou cancelado
    const itensNaoEntreguesOuCancelados = comanda.itens.filter(i => 
        i.statusItem !== 'ENTREGUE' && i.statusItem !== 'CANCELADO'
    );
    
    // Se não houver itens para serem processados (todos entregues ou cancelados)
    if (itensNaoEntreguesOuCancelados.length === 0) {
        comanda.status = 'EM CONSUMO'; // Indica que todos os itens foram servidos/resolvidos.
        return;
    }
    
    // Prioridades de status para os itens restantes:
    const emPreparo = itensNaoEntreguesOuCancelados.some(i => i.statusItem === 'EM PREPARO');
    const prontos = itensNaoEntreguesOuCancelados.some(i => i.statusItem === 'PRONTO');
    const abertos = itensNaoEntreguesOuCancelados.some(i => i.statusItem === 'ABERTO');

    // A ordem de precedência é importante:
    if (prontos) {
        // Se houver itens prontos para serem servidos
        comanda.status = 'PRONTO';
    } else if (emPreparo) {
        // Se houver itens sendo preparados
        comanda.status = 'EM PREPARO';
    } else if (abertos) {
        // Se houver itens que acabaram de ser adicionados (status inicial)
        comanda.status = 'EM PREPARO'; // Trata 'ABERTO' como se estivesse 'EM PREPARO' para a cozinha
    } else {
        // Estado de fallback (embora a lógica acima deva cobrir)
        comanda.status = 'ABERTA'; 
    }
};

// =========================================================================
// FUNÇÕES AUXILIARES DE MANIPULAÇÃO DE ARQUIVOS (CARDÁPIO - CSV)
// =========================================================================

/**
 * Lê o cardapio.csv e o transforma em um array de objetos.
 */
const readCardapio = () => {
    try {
        if (!fs.existsSync(CARDAPIO_FILE)) {
            // Cria o arquivo CSV com cabeçalho se ele não existir
            fs.writeFileSync(CARDAPIO_FILE, 'id;nome;preco;categoria\n', 'utf8');
            return [];
        }
        
        const data = fs.readFileSync(CARDAPIO_FILE, 'utf8');
        const lines = data.trim().split('\n');
        
        // Remove o cabeçalho
        if (lines.length <= 1) return [];

        return lines.slice(1).map(line => {
            const parts = line.split(';');
            
            // Garantindo compatibilidade com arquivos antigos que não tinham categoria
            const [id, nome, preco, categoria = 'Geral'] = parts; 

            return {
                id: parseInt(id),
                nome: nome ? nome.trim() : '',
                // Garantir o parse correto do preço, independente de vírgula ou ponto
                preco: parseFloat((preco ? preco.trim() : '0').replace(',', '.')) || 0.00,
                categoria: categoria ? categoria.trim() : 'Geral' // Default para 'Geral' se estiver vazio
            };
        });
    } catch (error) {
        console.error("Erro ao ler cardapio.csv:", error);
        return [];
    }
};

/**
 * Escreve um array de objetos de cardápio de volta para o cardapio.csv.
 */
const writeCardapio = (cardapio) => {
    try {
        let csvContent = 'id;nome;preco;categoria\n';
        cardapio.forEach(item => {
            // Garante que o preço seja formatado com vírgula para o CSV
            const precoFormatado = (item.preco || 0).toFixed(2).replace('.', ','); 
            // NOVO: Inclui categoria
            csvContent += `${item.id};${item.nome};${precoFormatado};${item.categoria}\n`; 
        });
        fs.writeFileSync(CARDAPIO_FILE, csvContent.trim(), 'utf8');
    } catch (error) {
        console.error("Erro ao escrever cardapio.csv:", error);
    }
};

// =========================================================================
// FUNÇÃO DE DADOS MOCK PARA INICIALIZAÇÃO DE RELATÓRIOS
// =========================================================================
/**
 * Adiciona dados de vendas fechadas ao iniciar o servidor, se comandas.json estiver vazio.
 */
const generateMockVendas = () => {
    const comandasAtuais = readComandas();
    // Apenas simula dados se o arquivo de comandas estiver vazio
    if (comandasAtuais.length > 0) return; 

    console.log("Simulando dados de vendas iniciais para teste de relatórios...");

    const hoje = new Date();
    const dataFechamento = hoje.toISOString();
    // Data de ontem para ter movimentação em dias diferentes
    const dataOntem = new Date(hoje.setDate(hoje.getDate() - 1)).toISOString();

    const mockComandas = [
        // Venda 1: Categoria 'Bebida', Forma de Pagamento 'Cartão'
        {
            id: 1,
            data: dataOntem,
            status: 'FECHADA',
            itens: [
                { id: 1.1, nome: "Refrigerante 2L", quantidade: 3, preco: 5.00, precoUnitario: 5.00, statusItem: 'ENTREGUE' },
                { id: 1.2, nome: "Suco Natural", quantidade: 2, preco: 8.00, precoUnitario: 8.00, statusItem: 'ENTREGUE' }
            ],
            total: (3 * 5.00) + (2 * 8.00), // 15.00 + 16.00 = 31.00
            mesa: '10',
            observacao: '',
            dataFechamento: dataOntem,
            formaPagamento: 'Cartão'
        },
        // Venda 2: Categoria 'Comida', Forma de Pagamento 'Dinheiro'
        {
            id: 2,
            data: dataFechamento,
            status: 'FECHADA',
            itens: [
                { id: 2.1, nome: "Pizza Margherita", quantidade: 1, preco: 45.00, precoUnitario: 45.00, statusItem: 'ENTREGUE' },
                { id: 2.2, nome: "Açaí", quantidade: 2, preco: 18.00, precoUnitario: 18.00, statusItem: 'ENTREGUE' },
            ],
            total: 45.00 + (2 * 18.00), // 45.00 + 36.00 = 81.00
            mesa: '03',
            observacao: 'Com gelo',
            dataFechamento: dataFechamento,
            formaPagamento: 'Dinheiro'
        }
    ];

    writeComandas(mockComandas);
};
// =========================================================================


// =========================================================================
// ROTAS DE SERVIÇO DE PÁGINAS HTML
// =========================================================================

// Rotas para as suas páginas HTML principais
app.get('/mainpage.html', (req, res) => res.sendFile(path.join(__dirname, 'mainpage.html')));
app.get('/abrir_item.html', (req, res) => res.sendFile(path.join(__dirname, 'abrir_item.html')));
app.get('/preparar_item.html', (req, res) => res.sendFile(path.join(__dirname, 'preparar_item.html')));
app.get('/financeiro.html', (req, res) => res.sendFile(path.join(__dirname, 'financeiro.html')));
app.get('/relatorios.html', (req, res) => res.sendFile(path.join(__dirname, 'relatorios.html')));
app.get('/compras.html', (req, res) => res.sendFile(path.join(__dirname, 'compras.html'))); // NOVA PÁGINA
app.get('/contato.html', (req, res) => res.sendFile(path.join(__dirname, 'contato.html')));
app.get('/sobre.html', (req, res) => res.sendFile(path.join(__dirname, 'sobre.html')));

// Rota padrão (redireciona para mainpage.html se acessar a raiz)
app.get('/', (req, res) => res.redirect('/mainpage.html'));


// =========================================================================
// ROTAS DE API: CARDÁPIO
// =========================================================================

// Rota GET: Listar Cardápio
// Caminho base deve ser /api/cardapio
app.get('/api/cardapio', (req, res) => {
    const cardapio = readCardapio();
    res.json(cardapio);
});

// Rota POST: Adicionar/Editar Item do Cardápio
app.post('/api/cardapio', (req, res) => {
    const cardapio = readCardapio();
    const { id, nome, preco, categoria } = req.body; 
    
    // Garante que preço é um número válido
    const precoNumerico = typeof preco === 'string' ? parseFloat(preco.replace(',', '.')) : preco;

    if (!nome || typeof precoNumerico !== 'number' || isNaN(precoNumerico) || precoNumerico < 0 || !categoria) {
        return res.status(400).json({ message: 'Dados do item (nome, preço, categoria) inválidos ou incompletos.' });
    }

    // Normaliza a categoria (primeira letra maiúscula)
    const categoriaFormatada = categoria.trim().charAt(0).toUpperCase() + categoria.trim().slice(1).toLowerCase();

    // ID deve ser um número inteiro, se fornecido
    const idNumerico = id ? parseInt(id) : null; 

    if (idNumerico) {
        // Editar item existente
        const index = cardapio.findIndex(item => item.id === idNumerico);
        if (index !== -1) {
            cardapio[index].nome = nome;
            cardapio[index].preco = precoNumerico;
            cardapio[index].categoria = categoriaFormatada; 
            writeCardapio(cardapio);
            return res.json(cardapio[index]);
        }
    } 
    
    // Adicionar novo item
    const newId = cardapio.length > 0 ? Math.max(...cardapio.map(i => i.id)) + 1 : 1;
    const newItem = { id: newId, nome, preco: precoNumerico, categoria: categoriaFormatada }; 
    cardapio.push(newItem);
    writeCardapio(cardapio);
    res.status(201).json(newItem);
});

// Rota DELETE: Remover Item do Cardápio
app.delete('/api/cardapio/:id', (req, res) => {
    // Garante que o ID é um número
    const id = parseInt(req.params.id); 
    let cardapio = readCardapio();

    const initialLength = cardapio.length;
    cardapio = cardapio.filter(item => item.id !== id);

    if (cardapio.length === initialLength) {
        return res.status(404).json({ message: 'Item do cardápio não encontrado.' });
    }
    
    writeCardapio(cardapio);
    res.status(204).send(); // 204 No Content
});


// =========================================================================
// ROTAS DE API: COMANDAS
// =========================================================================

// Rota GET: Buscar uma única comanda pelo ID (DETALHE - CORRIGIDA)
app.get('/api/comandas/:id', (req, res) => {
    const comandas = readComandas();
    // Garante que o ID é um número
    const comandaId = parseInt(req.params.id); 

    // Busca a comanda pelo ID
    const comanda = comandas.find(c => c.id === comandaId);

    if (!comanda) {
        // Se a comanda não for encontrada, retorna 404.
        return res.status(404).json({ message: 'Comanda não encontrada.' });
    }

    // Retorna os dados da comanda
    res.json(comanda);
});


// Rota GET: Listar todas as comandas (Comandas e Cozinha)
app.get('/api/comandas', (req, res) => {
    const comandas = readComandas();
    // Filtra comandas para excluir dados sensíveis (dataFechamento, formaPagamento)
    // se o status não for FECHADA.
    const comandasAbertas = comandas.map(comanda => {
        if (comanda.status !== 'FECHADA') {
            const { dataFechamento, formaPagamento, ...rest } = comanda;
            return rest;
        }
        return comanda;
    });
    res.json(comandasAbertas);
});


// Rota POST: ABRIR NOVA COMANDA (Lógica EXCLUSIVA para criação)
app.post('/api/comandas', (req, res) => {
    const comandas = readComandas();
    const { mesa, itens, observacao } = req.body;

    // A mesa não é estritamente obrigatória, mas os itens sim.
    if (!itens || itens.length === 0) {
        return res.status(400).json({ message: 'Dados insuficientes para abrir uma comanda (itens são obrigatórios).' });
    }
    
    // Atribui um ID único a cada novo item e garante que o preço seja float
    const itensComId = itens.map(item => ({
        ...item,
        // ID único para o item dentro da comanda (usando float para o Date.now())
        id: Date.now() + Math.random(), 
        preco: parseFloat(item.preco) 
    }));


    // Lógica para ABRIR NOVA COMANDA
    // Garante o ID máximo usando Number.isInteger para evitar IDs de itens
    const newId = comandas.length > 0 ? Math.max(...comandas.map(c => c.id).filter(id => Number.isInteger(id))) + 1 : 1;

    // Itens de uma nova comanda devem ir para EM PREPARO imediatamente
    const itensComStatus = itensComId.map(item => ({
        ...item,
        statusItem: 'EM PREPARO'
    }));

    const novaComanda = {
        id: newId,
        data: new Date().toISOString(),
        status: 'EM PREPARO', // Status inicial corrigido para EM PREPARO
        itens: itensComStatus,
        total: itensComStatus.reduce((acc, item) => acc + (item.preco * item.quantidade), 0),
        mesa: mesa || '00',
        observacao: observacao || '',
        dataFechamento: null,
        formaPagamento: null
    };

    comandas.push(novaComanda);
    writeComandas(comandas);
    return res.status(201).json(novaComanda);
});


// ROTA PUT: ADICIONAR ITENS A UMA COMANDA EXISTENTE (ROTA CORRIGIDA)
app.put('/api/comandas/:id/adicionar-itens', (req, res) => {
    const comandas = readComandas();
    const comandaId = parseInt(req.params.id);
    const { itens, observacao, mesa } = req.body;

    const comandaIndex = comandas.findIndex(c => c.id === comandaId);

    if (comandaIndex === -1) {
        return res.status(404).json({ message: 'Comanda não encontrada.' });
    }

    const comanda = comandas[comandaIndex];
    let itensAdicionados = 0;

    // Se a comanda estiver FECHADA, não pode adicionar itens
    if (comanda.status === 'FECHADA') {
        return res.status(400).json({ message: 'Não é possível adicionar itens a uma comanda fechada.' });
    }

    // Se houver alteração de observação ou mesa, atualiza
    if (observacao !== undefined) comanda.observacao = observacao;
    if (mesa !== undefined) comanda.mesa = mesa;
    
    if (itens && itens.length > 0) {
        // Mapeia os novos itens, garantindo um ID único para cada um e status 'EM PREPARO'
        const novosItens = itens.map(item => ({
            ...item,
            id: Date.now() + Math.random(), // ID único como float
            preco: parseFloat(item.preco),
            statusItem: 'EM PREPARO'
        }));
    
        // Adiciona os novos itens
        comanda.itens.push(...novosItens);
        itensAdicionados = novosItens.length;

        // Recalcula o total
        comanda.total = comanda.itens.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
        
        // Atualiza o status geral
        updateComandaStatus(comanda);
    }
    
    if (itensAdicionados === 0 && observacao === undefined && mesa === undefined) {
         return res.status(400).json({ message: 'Nenhum item para adicionar ou campo para atualizar.' });
    }
    
    writeComandas(comandas);
    res.json(comanda);
});


// NOVO: Rota DELETE para excluir uma comanda FECHADA (Usada pelo Financeiro)
app.delete('/api/comandas/:id', (req, res) => {
    const comandas = readComandas();
    const id = parseInt(req.params.id);

    const initialLength = comandas.length;
    let comandaExcluida = null;

    // Filtra todas as comandas exceto a que tem o ID fornecido
    const comandasAtualizadas = comandas.filter(comanda => {
        if (comanda.id === id) {
            comandaExcluida = comanda;
            return false; // Exclui este item
        }
        return true; // Mantém este item
    });

    if (comandasAtualizadas.length === initialLength) {
        return res.status(404).json({ message: 'Comanda não encontrada.' });
    }
    
    // Opcional: Impedir a exclusão de comandas abertas (para fins de integridade)
    if (comandaExcluida && comandaExcluida.status !== 'FECHADA') {
        // Reverte a ação de exclusão, escrevendo de volta a lista original (se a exclusão não for permitida)
        writeComandas(comandas);
        return res.status(400).json({ message: 'Apenas comandas FECHADAS podem ser excluídas do histórico financeiro.' });
    }

    writeComandas(comandasAtualizadas);
    res.status(204).send(); // 204 No Content
});


// Rota PUT: Marcar ITEM como PRONTO (Usada pela Cozinha - Se voltarmos ao fluxo item a item)
app.put('/api/comandas/item/:comandaId/:itemId/pronto', (req, res) => {
    const comandas = readComandas();
    const comandaId = parseInt(req.params.comandaId);
    const itemId = parseFloat(req.params.itemId); // Item ID é float

    const comandaIndex = comandas.findIndex(c => c.id === comandaId);

    if (comandaIndex === -1) {
        return res.status(404).json({ message: 'Comanda não encontrada.' });
    }

    const comanda = comandas[comandaIndex];
    // Usa comparação estrita para o item ID (float)
    const item = comanda.itens.find(i => i.id === itemId); 

    if (!item) {
        return res.status(404).json({ message: 'Item não encontrado na comanda.' });
    }
    if (item.statusItem === 'PRONTO') {
        return res.status(400).json({ message: 'Item já está PRONTO.' });
    }

    item.statusItem = 'PRONTO';
    updateComandaStatus(comanda);
    
    writeComandas(comandas);
    res.json(comanda);
});


// Rota PUT: Marcar TODOS os itens 'EM PREPARO' de uma comanda como PRONTO (NOVA ROTA)
app.put('/api/comandas/:comandaId/pronto-todos', (req, res) => {
    const comandas = readComandas();
    const comandaId = parseInt(req.params.comandaId);

    const comandaIndex = comandas.findIndex(c => c.id === comandaId);

    if (comandaIndex === -1) {
        return res.status(404).json({ message: 'Comanda não encontrada.' });
    }

    const comanda = comandas[comandaIndex];
    let itensAtualizados = 0;

    comanda.itens.forEach(item => {
        if (item.statusItem === 'EM PREPARO' || item.statusItem === 'ABERTO') {
            item.statusItem = 'PRONTO';
            itensAtualizados++;
        }
    });

    if (itensAtualizados === 0) {
         return res.status(400).json({ message: 'Nenhum item para marcar como PRONTO.' });
    }

    updateComandaStatus(comanda);
    
    writeComandas(comandas);
    res.json({ message: `${itensAtualizados} item(s) da comanda #${comandaId} marcados como PRONTO.`, comanda: comanda });
});


// Rota PUT: Marcar ITEM como ENTREGUE (Usada pelo Garçom/Comandas)
app.put('/api/comandas/item/:comandaId/:itemId/entregue', (req, res) => {
    const comandas = readComandas();
    const comandaId = parseInt(req.params.comandaId);
    const itemId = parseFloat(req.params.itemId); // Item ID é float

    const comandaIndex = comandas.findIndex(c => c.id === comandaId);

    if (comandaIndex === -1) {
        return res.status(404).json({ message: 'Comanda não encontrada.' });
    }

    const comanda = comandas[comandaIndex];
    // Usa comparação estrita para o item ID (float)
    const item = comanda.itens.find(i => i.id === itemId); 

    if (!item) {
        return res.status(404).json({ message: 'Item não encontrado na comanda.' });
    }

    if (item.statusItem === 'ENTREGUE' || item.statusItem === 'CANCELADO') {
        return res.status(400).json({ message: 'Item já foi entregue ou cancelado.' });
    }

    item.statusItem = 'ENTREGUE';
    updateComandaStatus(comanda);

    writeComandas(comandas);
    res.json(comanda);
});


// Rota PUT: Fechar/Pagar Comanda (Usada pelo Garçom/Caixa)
app.put('/api/comandas/fechar/:id', (req, res) => {
    const comandas = readComandas();
    const id = parseInt(req.params.id);
    const { formaPagamento } = req.body;

    if (!formaPagamento) {
        return res.status(400).json({ message: 'Forma de pagamento é obrigatória.' });
    }

    const comandaIndex = comandas.findIndex(c => c.id === id);
    if (comandaIndex === -1) {
        return res.status(404).json({ message: 'Comanda não encontrada.' });
    }

    const comanda = comandas[comandaIndex];

    if (comanda.status === 'FECHADA') {
        return res.status(400).json({ message: 'Comanda já está fechada.' });
    }
    
    // Verifica se há algum item que não esteja ENTREGUE ou CANCELADO
    const itensPendentes = comanda.itens.some(i => 
        i.statusItem === 'EM PREPARO' || 
        i.statusItem === 'PRONTO' || 
        i.statusItem === 'ABERTO'
    );
    
    if (itensPendentes) {
        return res.status(400).json({ 
            message: 'Não é possível fechar a comanda. Existem itens ainda em preparo, prontos para entrega ou pendentes.' 
        });
    }

    comanda.status = 'FECHADA';
    comanda.dataFechamento = new Date().toISOString();
    comanda.formaPagamento = formaPagamento;
    
    // Garante que todos os itens não cancelados estejam marcados como entregues
    comanda.itens.forEach(item => {
        if (item.statusItem !== 'CANCELADO') {
            item.statusItem = 'ENTREGUE';
        }
    });

    writeComandas(comandas);
    res.json(comanda);
});


// Rota GET: Movimentações Financeiras (Usada pelo Financeiro)
// CORRIGIDO: Rota alterada de '/api/comandas/movimentacoes' para '/api/movimentacoes'
app.get('/api/movimentacoes', (req, res) => {
    const comandas = readComandas();
    
    const movimentacoes = comandas
        .filter(c => c.status === 'FECHADA' && c.dataFechamento) 
        .map(c => ({
            id_comanda: c.id,
            dataFechamento: c.dataFechamento,
            formaPagamento: c.formaPagamento,
            valorTotal: c.total,
            mesa: c.mesa, 
            status: c.status
        }));
        
    res.json(movimentacoes);
});


// =========================================================================
// ROTAS DE API: RELATÓRIOS (CORRIGIDAS)
// =========================================================================

// Rota GET /api/relatorios/itens-vendidos
app.get('/api/relatorios/itens-vendidos', (req, res) => {
    try {
        const comandas = readComandas(); 
        
        // 1. Filtra comandas FECHADAS que tenham itens
        const itensVendidos = comandas
            .filter(c => c.status === 'FECHADA' && c.itens && c.itens.length > 0)
            .flatMap(comanda => {
                // 2. Transforma cada item da comanda no formato que o relatorios.js espera
                return comanda.itens
                    .filter(item => item.statusItem !== 'CANCELADO') 
                    .map(item => {
                        // Garante que quantidade e precoUnitario são números
                        const quantidadeNumerica = parseFloat(item.quantidade) || 0;
                        // Prioriza precoUnitario, mas usa 'preco' como fallback (como no seu código original)
                        const precoNumerico = parseFloat(item.precoUnitario || item.preco) || 0; 
                        
                        return {
                            // Campos essenciais para o processamento:
                            dataFechamento: comanda.dataFechamento, // Usado para filtro de data
                            nomeItem: item.nome,                    // Usado em Top 10 e Categoria
                            quantidade: quantidadeNumerica,         // Garante valor numérico
                            precoUnitario: precoNumerico,           // Garante valor numérico
                            // TotalItem é crucial
                            totalItem: precoNumerico * quantidadeNumerica, 
                        };
                    });
            });
            
        // 3. Retorna o array JSON.
        res.json(itensVendidos);

    } catch (error) {
        console.error('Erro na API de Relatórios de Vendas:', error);
        res.status(500).json({ message: 'Erro interno ao gerar dados de vendas.' });
    }
});


// =========================================================================
// NOVOS ENDPOINTS: FORNECEDORES
// =========================================================================

// GET /api/fornecedores - Listar todos os fornecedores
app.get('/api/fornecedores', (req, res) => {
    try {
        const fornecedores = readJsonFile(FORNECEDORES_FILE);
        res.json(fornecedores);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao carregar fornecedores', error: error.message });
    }
});

// POST /api/fornecedores - Adicionar um novo fornecedor
app.post('/api/fornecedores', (req, res) => {
    try {
        const fornecedores = readJsonFile(FORNECEDORES_FILE);
        // Garante que o ID gerado seja um número inteiro
        const novoFornecedor = { id: Date.now(), ...req.body }; 
        fornecedores.push(novoFornecedor);
        writeJsonFile(FORNECEDORES_FILE, fornecedores);
        res.status(201).json(novoFornecedor);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar fornecedor', error: error.message });
    }
});

// PUT /api/fornecedores/:id - Atualizar um fornecedor existente
app.put('/api/fornecedores/:id', (req, res) => {
    try {
        const fornecedorId = parseInt(req.params.id);
        const fornecedores = readJsonFile(FORNECEDORES_FILE);
        const index = fornecedores.findIndex(f => f.id === fornecedorId);

        if (index === -1) {
            return res.status(404).json({ message: 'Fornecedor não encontrado.' });
        }

        fornecedores[index] = { ...fornecedores[index], ...req.body, id: fornecedorId }; // Mantém o ID original
        writeJsonFile(FORNECEDORES_FILE, fornecedores);
        res.json(fornecedores[index]);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar fornecedor', error: error.message });
    }
});

// DELETE /api/fornecedores/:id - Remover um fornecedor
app.delete('/api/fornecedores/:id', (req, res) => {
    try {
        const fornecedorId = parseInt(req.params.id);
        let fornecedores = readJsonFile(FORNECEDORES_FILE);
        const initialLength = fornecedores.length;
        fornecedores = fornecedores.filter(f => f.id !== fornecedorId);

        if (fornecedores.length === initialLength) {
            return res.status(404).json({ message: 'Fornecedor não encontrado.' });
        }

        writeJsonFile(FORNECEDORES_FILE, fornecedores);
        res.status(204).send(); // No Content
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover fornecedor', error: error.message });
    }
});


// =========================================================================
// NOVOS ENDPOINTS: COMPRAS (CORRIGIDO: GARANTE QUE O ARQUIVO É LIDO)
// =========================================================================

// Rota GET /api/compras - Usada para carregar TODOS os dados de Compras na inicialização
app.get('/api/compras', (req, res) => {
    try {
        // Lê o arquivo compras.json (Função readJsonFile garantirá array vazio se arquivo não existir/for inválido)
        const compras = readJsonFile(COMPRAS_FILE); 
        res.json(compras || []); 
    } catch (error) {
        console.error('Erro ao listar compras:', error);
        res.status(500).json({ message: 'Erro interno ao carregar compras.' });
    }
});

// POST /api/compras - Adicionar uma nova compra
app.post('/api/compras', (req, res) => {
    try {
        const compras = readJsonFile(COMPRAS_FILE);
        // Garante que o ID gerado seja um número inteiro
        const novaCompra = { id: Date.now(), ...req.body }; 
        compras.push(novaCompra);
        writeJsonFile(COMPRAS_FILE, compras);
        res.status(201).json(novaCompra);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao adicionar compra', error: error.message });
    }
});

// Rota GET /api/compras/:id - Buscar uma compra específica pelo ID (NOVA ROTA)
app.get('/api/compras/:id', (req, res) => {
    try {
        const compraId = parseInt(req.params.id);
        const compras = readJsonFile(COMPRAS_FILE);
        
        const compra = compras.find(c => c.id === compraId);

        if (!compra) {
            return res.status(404).json({ message: 'Compra não encontrada.' });
        }
        
        res.json(compra);
    } catch (error) {
        console.error(`Erro ao buscar compra ID ${req.params.id}:`, error.message);
        res.status(500).json({ message: 'Erro interno ao buscar compra', error: error.message });
    }
});

// PUT /api/compras/:id - Atualizar uma compra existente
app.put('/api/compras/:id', (req, res) => {
    try {
        const compraId = parseInt(req.params.id);
        const compras = readJsonFile(COMPRAS_FILE);
        const index = compras.findIndex(c => c.id === compraId);

        if (index === -1) {
            return res.status(404).json({ message: 'Compra não encontrada.' });
        }

        compras[index] = { ...compras[index], ...req.body, id: compraId }; // Mantém o ID original
        writeJsonFile(COMPRAS_FILE, compras);
        res.json(compras[index]);
    } catch (error) {
        res.status(500).json({ message: 'Erro ao atualizar compra', error: error.message });
    }
});

// DELETE /api/compras/:id - Remover uma compra
app.delete('/api/compras/:id', (req, res) => {
    try {
        const compraId = parseInt(req.params.id);
        let compras = readJsonFile(COMPRAS_FILE);
        const initialLength = compras.length;
        compras = compras.filter(c => c.id !== compraId);

        if (compras.length === initialLength) {
            return res.status(404).json({ message: 'Compra não encontrada.' });
        }

        writeJsonFile(COMPRAS_FILE, compras);
        res.status(204).send(); // No Content
    } catch (error) {
        res.status(500).json({ message: 'Erro ao remover compra', error: error.message });
    }
});


// =========================================================================
// Rota de Início E TRATAMENTO DE ERRO
// =========================================================================
let uptimeSegundos = 0;
const marcos = {
    30: "30 segundos",
    60: "1 minuto",
    300: "5 minutos",
    900: "15 minutos",
    1800: "30 minutos",
    3600: "uma hora"
};

const server = app.listen(PORT, IP, () => { 
    console.log(`Servidor da API Node.js rodando em ${BASE_URL}/mainpage.html`); 
    
    // =======================================================
    // CHAMADA DA FUNÇÃO DE MOCK PARA POPULAR DADOS DE VENDAS
    // SÓ ADICIONA VENDAS SE O ARQUIVO 'comandas.json' ESTIVER VAZIO
    generateMockVendas(); 
    // =======================================================

    setInterval(() => {
        uptimeSegundos += 1;
        
        if (marcos[uptimeSegundos]) {
            console.log(`O servidor está rodando há ${marcos[uptimeSegundos]}.`);
        } 
        // Adiciona a lógica para marcar horas completas
        else if (uptimeSegundos > 3600 && uptimeSegundos % 3600 === 0) {
            const horasCorridas = uptimeSegundos / 3600;
            console.log(`O servidor está rodando há ${horasCorridas} hora${horasCorridas > 1 ? 's' : ''}.`);
        }
    }, 1000);
});