// auth.js
// Módulo 3: Autenticação, Controle de Sessão e Gestão Granular de Permissões

// ==========================================================================
// ESTADO GLOBAL E MATRIZ DE PERMISSÕES
// ==========================================================================
window.usuarioLogado = null;
window.cargoLogado = null;
window.permissoesLogado = null;

// Matriz de permissões padrão para retrocompatibilidade e auto-preenchimento
window.permissoesPadrao = {
    caixa: { dashboard: false, caixa: true, clientes: false, marketing: false, auditoria: false, simulacao: false, reset: false, usuarios: false, totem: true, configuracoes: false },
    gerente: { dashboard: true, caixa: true, clientes: true, marketing: true, auditoria: true, simulacao: false, reset: false, usuarios: false, totem: true, configuracoes: true },
    admin: { dashboard: true, caixa: true, clientes: true, marketing: true, auditoria: true, simulacao: true, reset: true, usuarios: true, totem: true, configuracoes: true }
};

// ==========================================================================
// OBSERVADOR DE SESSÃO (Disparado automaticamente ao entrar/sair)
// ==========================================================================
window.firebaseOnAuthStateChanged(window.auth, async (user) => {
    if (user) {
        window.usuarioLogado = user;
        const username = user.email.split('@')[0];
        
        // Busca o documento do utilizador
        const snap = await window.firebaseGet(window.firebaseRef(window.db, `usuarios/${username}`));
        
        if (snap.exists()) {
            const data = snap.val();
            window.cargoLogado = data.cargo;
            // Fallback: Se o usuário é antigo e não tem o objeto 'permissoes', recebe o padrão do cargo
            window.permissoesLogado = data.permissoes || window.permissoesPadrao[window.cargoLogado] || window.permissoesPadrao['caixa'];
        } else {
            // Fallback para admin mestre invisível no DB
            window.cargoLogado = (username === 'admin' ? 'admin' : 'caixa');
            window.permissoesLogado = window.permissoesPadrao[window.cargoLogado];
        }
        
        if(window.aplicarRegrasNaInterface) {
            window.aplicarRegrasNaInterface(window.cargoLogado, username, window.permissoesLogado);
        }
        
        if(window.logAuditoria) window.logAuditoria('Login', `Acesso ao sistema. Nível primário: ${window.cargoLogado}`);
    } else {
        // Reset global
        window.usuarioLogado = null; 
        window.cargoLogado = null;
        window.permissoesLogado = null;
        
        document.getElementById('app-dashboard').classList.add('hidden');
        if (document.getElementById('tela-totem') && document.getElementById('tela-totem').classList.contains('hidden')) {
            document.getElementById('tela-login').classList.remove('hidden');
            document.getElementById('tela-login').classList.add('flex');
        }
    }
});

// ==========================================================================
// FUNÇÕES DISPARADAS PELO HTML (LOGIN E LOGOUT)
// ==========================================================================
window.fazerLogin = (e) => {
    e.preventDefault();
    const btn = document.getElementById('btn-login'); 
    btn.disabled = true; 
    btn.innerText = 'Autenticando...';
    
    const user = document.getElementById('login-user').value.trim().toLowerCase();
    const pass = document.getElementById('login-senha').value;
    
    // Mantém a persistência de segurança (apenas sessão atual) implementada anteriormente
    window.firebaseSetPersistence(window.auth, window.firebaseBrowserSessionPersistence)
        .then(() => {
            return window.firebaseSignIn(window.auth, `${user}@tophaus.com.br`, pass);
        })
        .catch((error) => {
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
// GESTÃO DE USUÁRIOS E ACESSOS (HÍBRIDO: CARGO + PERMISSÕES)
// ==========================================================================
window.abrirGerenciadorUsuarios = () => {
    // Nova Trava: Em vez de checar se é 'admin', checa se possui a permissão de gestão de usuários
    if(!window.permissoesLogado || !window.permissoesLogado.usuarios) return;
    
    window.injetarCheckboxesPermissoes(); // Chama injeção visual para não quebrar o HTML
    
    const lista = document.getElementById('lista-usuarios-cadastrados');
    if(!lista) return;
    
    lista.innerHTML = '<p class="text-center text-gray-400">Carregando...</p>';
    
    window.firebaseGet(window.firebaseRef(window.db, 'usuarios')).then(snap => {
        lista.innerHTML = '';
        if(snap.exists()) {
            Object.entries(snap.val()).forEach(([user, data]) => {
                // Checa quantas permissões extras o usuário tem
                const isCustom = data.permissoes ? '⭐ CUSTOM' : 'PADRÃO';
                
                lista.innerHTML += `
                    <div class="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-100">
                        <div>
                            <span class="font-bold text-gray-800">${user}</span> 
                            <span class="px-2 py-0.5 ml-2 bg-gray-200 text-gray-600 rounded text-[10px] font-black uppercase">${data.cargo}</span>
                            <span class="px-2 py-0.5 ml-1 bg-indigo-100 text-indigo-700 rounded text-[10px] font-black uppercase">${isCustom}</span>
                        </div>
                        <div class="flex gap-2">
                            <button type="button" onclick="alterarCargo('${user}', '${data.cargo}')" class="text-blue-600 hover:bg-blue-50 p-1.5 rounded transition" title="Mudar Cargo (Reseta Permissões)"><i data-lucide="edit" class="w-4 h-4"></i></button>
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

// Injeta dinamicamente as checkboxes no form do index.html
window.injetarCheckboxesPermissoes = () => {
    if(document.getElementById('container-permissoes')) return;
    
    const selectCargo = document.getElementById('novo-cargo');
    if(!selectCargo) return;

    const container = document.createElement('div');
    container.id = 'container-permissoes';
    container.className = 'grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs mt-3 bg-white p-4 rounded-xl border border-indigo-100 shadow-inner';
    
    const chaves = ['dashboard', 'caixa', 'clientes', 'marketing', 'auditoria', 'simulacao', 'reset', 'usuarios', 'totem', 'configuracoes'];
    
    let html = `<div class="col-span-full text-center text-indigo-900 font-bold mb-2 border-b border-indigo-50 pb-2">Permissões Individuais (Opcional)</div>`;
    
    chaves.forEach(p => {
        html += `
            <label class="flex items-center gap-2 cursor-pointer text-gray-700 hover:text-black">
                <input type="checkbox" id="perm-${p}" class="w-4 h-4 text-indigo-600 rounded border-gray-300">
                <span class="capitalize font-medium">${p}</span>
            </label>`;
    });
    container.innerHTML = html;
    
    // Insere logo abaixo do select de cargo
    selectCargo.parentNode.insertBefore(container, selectCargo.nextSibling);
    
    // Atualiza as caixas automaticamente se o cargo for trocado
    selectCargo.addEventListener('change', (e) => {
        const cargo = e.target.value;
        const padrao = window.permissoesPadrao[cargo] || window.permissoesPadrao['caixa'];
        chaves.forEach(p => {
            const cb = document.getElementById(`perm-${p}`);
            if(cb) cb.checked = !!padrao[p];
        });
    });
    
    // Preenche para o valor inicial
    selectCargo.dispatchEvent(new Event('change'));
};

window.criarUsuario = (e) => {
    e.preventDefault();
    const user = document.getElementById('novo-user').value.trim().toLowerCase();
    const pass = document.getElementById('novo-senha').value;
    const cargo = document.getElementById('novo-cargo').value;
    const email = `${user}@tophaus.com.br`;

    // Captura o estado atual das checkboxes de permissões
    const objPermissoes = {};
    ['dashboard', 'caixa', 'clientes', 'marketing', 'auditoria', 'simulacao', 'reset', 'usuarios', 'totem', 'configuracoes'].forEach(p => {
        const cb = document.getElementById(`perm-${p}`);
        objPermissoes[p] = cb ? cb.checked : false;
    });

    window.firebaseCreateUser(window.authSecundario, email, pass).then(() => {
        // Salva o modelo híbrido (Cargo + Permissões Livres)
        window.firebaseSet(window.firebaseRef(window.db, `usuarios/${user}`), { cargo: cargo, permissoes: objPermissoes }).then(() => {
            window.mostrarToast("Usuário criado com regras específicas!", "sucesso");
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
    
    const novoCargo = prompt(`Modificar o Cargo Base de "${username}".\nCargos válidos: caixa, gerente, admin\n⚠️ ATENÇÃO: Isso irá redefinir as permissões customizadas do usuário para as do novo cargo.`, cargoAtual);
    
    if(novoCargo && ['caixa', 'gerente', 'admin'].includes(novoCargo.trim().toLowerCase())) {
        const cargoFinal = novoCargo.trim().toLowerCase();
        // Substitui a ramificação inteira resgatando as permissões padrão do novo cargo
        window.firebaseSet(window.firebaseRef(window.db, `usuarios/${username}`), { cargo: cargoFinal, permissoes: window.permissoesPadrao[cargoFinal] }).then(() => {
            window.mostrarToast("Cargo e Permissões atualizados!", "sucesso");
            window.abrirGerenciadorUsuarios();
        });
    } else if (novoCargo) {
        window.mostrarToast("Cargo inválido! Operação cancelada.", "erro");
    }
};

// ==========================================================================
// CONTROLO DE VISIBILIDADE DE INTERFACE POR PERMISSÃO INDIVIDUAL
// ==========================================================================
window.aplicarRegrasNaInterface = (cargo, username, permissoes) => {
    // Blindagem de segurança: Se 'permissoes' vier vazio de um carregamento antigo, forçamos os padrões
    if (!permissoes) permissoes = window.permissoesPadrao[cargo] || window.permissoesPadrao['caixa'];

    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('tela-login').classList.remove('flex');
    document.getElementById('app-dashboard').classList.remove('hidden');
    document.getElementById('nome-usuario-logado').innerText = `(${cargo}) ${username}`;

    // Leitura dos nós de interface principais
    const btnAdmin = document.getElementById('btn-aba-admin');
    const btnCaixa = document.getElementById('btn-aba-caixa');
    const btnSimulacao = document.getElementById('btn-ativar-simulacao');
    const btnZerar = document.getElementById('btn-zerar-banco');
    const btnAcessos = document.getElementById('btn-gerenciar-acessos');
    
    // Leitura por atributos CSS/Query (Mapeamento invisível para botões sem ID)
    const botoesTotem = document.querySelectorAll('button[onclick="entrarModoTotemDaTelaLogin()"]');
    const btnMarketing = document.querySelector('button[onclick="abrirCentralMarketing()"]');

    // 1. Aplicação Granular de Permissões
    if (btnAdmin) permissoes.dashboard ? btnAdmin.classList.remove('hidden') : btnAdmin.classList.add('hidden');
    if (btnCaixa) permissoes.caixa ? btnCaixa.classList.remove('hidden') : btnCaixa.classList.add('hidden');
    if (btnSimulacao) permissoes.simulacao ? btnSimulacao.classList.remove('hidden') : btnSimulacao.classList.add('hidden');
    if (btnZerar) permissoes.reset ? btnZerar.classList.remove('hidden') : btnZerar.classList.add('hidden');
    if (btnAcessos) permissoes.usuarios ? btnAcessos.classList.remove('hidden') : btnAcessos.classList.add('hidden');
    
    if (btnMarketing) permissoes.marketing ? btnMarketing.classList.remove('hidden') : btnMarketing.classList.add('hidden');
    
    botoesTotem.forEach(btn => {
        permissoes.totem ? btn.classList.remove('hidden') : btn.classList.add('hidden');
    });

    // 2. Encaminhamento Lógico de Abas (Direciona para a primeira área que o usuário tem acesso)
    if (permissoes.dashboard && window.alternarAba) {
        window.alternarAba('admin');
    } else if (permissoes.caixa && window.alternarAba) {
        window.alternarAba('caixa');
    } else {
        // Caso a pessoa não tenha permissão de dashboard nem de caixa, o sistema não faz nada (tela limpa)
        window.mostrarToast("Sua conta possui acessos severamente restritos.", "erro");
    }
};
