// auth.js
// Módulo 3: Autenticação, Login e Controle de Sessão

// Inicialização do estado global de utilizador
window.usuarioLogado = null;
window.cargoLogado = null;

// ==========================================================================
// OBSERVADOR DE SESSÃO (Disparado automaticamente ao entrar/sair)
// ==========================================================================
window.firebaseOnAuthStateChanged(window.auth, async (user) => {
    if (user) {
        window.usuarioLogado = user;
        const username = user.email.split('@')[0];
        
        // Busca o nível de permissão na base de dados
        const snap = await window.firebaseGet(window.firebaseRef(window.db, `usuarios/${username}`));
        window.cargoLogado = snap.exists() ? snap.val().cargo : (username === 'admin' ? 'admin' : 'caixa');
        
        // Atualização Visual
        document.getElementById('tela-login').classList.add('hidden');
        document.getElementById('app-dashboard').classList.remove('hidden');
        document.getElementById('nome-usuario-logado').innerText = username.toUpperCase();
        
        // Controlo de Acesso (Caixa vs Admin)
        if(window.cargoLogado === 'caixa') {
            document.getElementById('btn-aba-admin').classList.add('hidden');
            if(window.alternarAba) window.alternarAba('caixa');
        } else {
            document.getElementById('btn-aba-admin').classList.remove('hidden');
            if(window.alternarAba) window.alternarAba('admin');
            if(window.abrirSubAba) window.abrirSubAba('dashboard');
        }
        
        // Registo de Auditoria
        if(window.logAuditoria) window.logAuditoria('Login', `Acesso ao painel. Nível: ${window.cargoLogado}`);
    } else {
        // Reset de estado e retorno ao login
        window.usuarioLogado = null; 
        window.cargoLogado = null;
        document.getElementById('app-dashboard').classList.add('hidden');
        
        // Evita sobrepor a tela do Totem com a tela de login
        if (document.getElementById('tela-totem') && document.getElementById('tela-totem').classList.contains('hidden')) {
            document.getElementById('tela-login').classList.remove('hidden');
        }
    }
});

// ==========================================================================
// FUNÇÕES DISPARADAS PELO HTML
// ==========================================================================
window.fazerLogin = (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login'); 
    btn.disabled = true; 
    btn.innerText = 'Autenticando...';
    
    const user = document.getElementById('login-user').value.trim().toLowerCase();
    const pass = document.getElementById('login-senha').value;
    
    window.firebaseSignIn(window.auth, `${user}@tophaus.com.br`, pass).catch(() => {
        if(window.mostrarToast) window.mostrarToast("Usuário ou senha incorretos!", "erro"); 
        btn.disabled = false; 
        btn.innerText = 'ENTRAR';
    });
};

window.fazerLogout = () => { 
    if(window.logAuditoria) window.logAuditoria('Logout', 'Saída do sistema'); 
    window.firebaseSignOut(window.auth); 
};