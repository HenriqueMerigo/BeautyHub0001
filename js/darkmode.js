document.addEventListener('DOMContentLoaded', () => {
    const toggleButton = document.getElementById('darkModeToggle');
    const body = document.body;

    if (!toggleButton) return;

    /**
     * Define o tema e atualiza o ícone.
     * @param {string} theme - 'dark' ou 'light'
     */
    function applyTheme(theme) {
        const icon = toggleButton.querySelector('i');
        if (theme === 'dark') {
            body.classList.add('dark-mode');
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
            localStorage.setItem('theme', 'dark');
        } else {
            body.classList.remove('dark-mode');
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
            localStorage.setItem('theme', 'light');
        }
    }

    // 1. Carregar a preferência salva ou usar a do sistema operacional
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        applyTheme(savedTheme);
    } else if (prefersDark) {
        // Se a preferência do sistema for Dark, aplique o DM por padrão
        applyTheme('dark');
    } else {
        // Padrão Light
        applyTheme('light');
    }

    // 2. Lógica do Toggle (Clique)
    toggleButton.addEventListener('click', () => {
        // Se o body tiver a classe dark-mode, mude para light, senão mude para dark
        if (body.classList.contains('dark-mode')) {
            applyTheme('light');
        } else {
            applyTheme('dark');
        }
    });
});