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
        
        // CORREÇÃO: Delega a manipulação do DOM para a função centralizadora de interface
        if(window.aplicarRegrasNaInterface) {
            window.aplicarRegrasNaInterface(window.cargoLogado, username);
        }
        
        // Preserva a navegação automática para a aba de Gestão se for Gerente ou Admin
        if(window.cargoLogado !== 'caixa' && window.alternarAba) {
            window.alternarAba('admin');
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
            // Restaura o layout flex para centralizar a caixa de login
            document.getElementById('tela-login').classList.add('flex');
        }
    }
});

// ==========================================================================
// FUNÇÕES DISPARADAS PELO HTML
// ==========================================================================
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
    
    // 1. Aplica a regra de persistência para "Apenas Sessão Atual"
    window.firebaseSetPersistence(window.auth, window.firebaseBrowserSessionPersistence)
        .then(() => {
            // 2. Só após configurar a persistência, executa o login
            return window.firebaseSignIn(window.auth, `${user}@tophaus.com.br`, pass);
        })
        .catch((error) => {
            // Captura erros tanto de persistência quanto de credenciais incorretas
            if(window.mostrarToast) window.mostrarToast("Usuário ou senha incorretos!", "erro"); 
            btn.disabled = false; 
            btn.innerText = 'ENTRAR';
        });
};

window.fazerLogout = () => { 
    if(window.logAuditoria) window.logAuditoria('Logout', 'Saída do sistema'); 
    window.firebaseSignOut(window.auth); 
};

// ==========================================================================
// GESTÃO DE USUÁRIOS E ACESSOS (Admin)
// ==========================================================================
window.abrirGerenciadorUsuarios = () => {
    // Trava de segurança garantindo que apenas administradores acessem
    if(window.cargoLogado !== 'admin') return;
    
    const lista = document.getElementById('lista-usuarios-cadastrados');
    if(!lista) return;
    
    lista.innerHTML = '<p class="text-center text-gray-400">Carregando...</p>';
    
    window.firebaseGet(window.firebaseRef(window.db, 'usuarios')).then(snap => {
        lista.innerHTML = '';
        if(snap.exists()) {
            Object.entries(snap.val()).forEach(([user, data]) => {
                lista.innerHTML += `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                        <div>
                            <span class="font-bold text-gray-800">${user}</span> 
                            <span class="px-2 py-0.5 ml-2 bg-gray-200 text-gray-600 rounded text-[10px] font-black uppercase">${data.cargo}</span>
                        </div>
                        <div class="flex gap-2">
                            <button type="button" onclick="alterarCargo('${user}', '${data.cargo}')" class="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition" title="Mudar Cargo"><i data-lucide="edit" class="w-4 h-4"></i></button>
                            <button type="button" onclick="removerAcesso('${user}')" class="text-red-600 hover:bg-red-50 p-1.5 rounded transition" title="Remover Acesso"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                        </div>
                    </div>`;
            });
            if(window.lucide) window.lucide.createIcons();
        }
    });
    
    const modal = document.getElementById('modal-usuarios'); 
    modal.classList.remove('hidden'); 
    if(window.prenderFocoModal) window.prenderFocoModal(modal);
};

window.criarUsuario = (e) => {
    e.preventDefault();
    const user = document.getElementById('novo-user').value.trim().toLowerCase();
    const pass = document.getElementById('novo-senha').value;
    const cargo = document.getElementById('novo-cargo').value;
    const email = `${user}@tophaus.com.br`;

    // Utiliza authSecundario para criar o usuário sem deslogar a sessão do Admin atual
    window.firebaseCreateUser(window.authSecundario, email, pass).then(() => {
        window.firebaseSet(window.firebaseRef(window.db, `usuarios/${user}`), { cargo: cargo }).then(() => {
            window.mostrarToast("Usuário de acesso criado!", "sucesso");
            document.getElementById('novo-user').value = ''; 
            document.getElementById('novo-senha').value = '';
            window.abrirGerenciadorUsuarios();
        });
    }).catch(err => {
        if(err.code === 'auth/email-already-in-use') return window.mostrarToast("Esse usuário já existe!", "erro");
        if(err.code === 'auth/weak-password') return window.mostrarToast("A senha precisa ter 6 números/letras", "erro");
        window.mostrarToast("Erro ao criar: " + err.message, "erro");
    });
};

window.removerAcesso = (username) => {
    if(username === 'admin') return window.mostrarToast("Você não pode remover o administrador principal.", "erro");
    
    if(confirm(`Tem certeza que deseja remover o acesso de "${username}"?\nA conta será deslogada imediatamente.`)) {
        window.firebaseSet(window.firebaseRef(window.db, `usuarios/${username}`), null).then(() => {
            window.mostrarToast("Acesso removido com sucesso!", "sucesso");
            window.abrirGerenciadorUsuarios();
        });
    }
};

window.alterarCargo = (username, cargoAtual) => {
    if(username === 'admin') return window.mostrarToast("Você não pode alterar o administrador.", "erro");
    
    const novoCargo = prompt(`Alterar cargo de "${username}".\nCargos válidos: caixa, gerente, admin\nCargo atual: ${cargoAtual}`, cargoAtual);
    
    if(novoCargo && ['caixa', 'gerente', 'admin'].includes(novoCargo.trim().toLowerCase())) {
        window.firebaseSet(window.firebaseRef(window.db, `usuarios/${username}/cargo`), novoCargo.trim().toLowerCase()).then(() => {
            window.mostrarToast("Cargo atualizado com sucesso!", "sucesso");
            window.abrirGerenciadorUsuarios();
        });
    } else if (novoCargo) {
        window.mostrarToast("Cargo inválido! Operação cancelada.", "erro");
    }
};

// ==========================================================================
// CONTROLO DE ACESSOS E VISIBILIDADE DE INTERFACE
// ==========================================================================
window.aplicarRegrasNaInterface = (cargo, username) => {
    // 1. Liberta o ecrã de login e exibe o painel
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('tela-login').classList.remove('flex');
    document.getElementById('app-dashboard').classList.remove('hidden');
    document.getElementById('nome-usuario-logado').innerText = `(${cargo}) ${username}`;

    // 2. Mapeia os botões restritos
    const btnAdmin = document.getElementById('btn-aba-admin');
    const btnSimulacao = document.getElementById('btn-ativar-simulacao');
    const btnZerar = document.getElementById('btn-zerar-banco');
    const btnAcessos = document.getElementById('btn-gerenciar-acessos');

    // 3. Aplica as regras de visibilidade conforme o cargo
    if (cargo === 'caixa') {
        if(btnAdmin) btnAdmin.classList.add('hidden');
        window.alternarAba('caixa');
        
    } else if (cargo === 'gerente') {
        if(btnAdmin) btnAdmin.classList.remove('hidden');
        if(btnSimulacao) btnSimulacao.classList.add('hidden');
        if(btnZerar) btnZerar.classList.add('hidden');
        if(btnAcessos) btnAcessos.classList.add('hidden');
        
    } else if (cargo === 'admin') {
        if(btnAdmin) btnAdmin.classList.remove('hidden');
        
        // Remove a classe 'hidden' dos botões administrativos
        if(btnSimulacao) btnSimulacao.classList.remove('hidden');
        if(btnZerar) btnZerar.classList.remove('hidden');
        if(btnAcessos) btnAcessos.classList.remove('hidden');
    }
};

