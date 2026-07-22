// totem.js
// Módulo 6: Interface de Autoatendimento (Totem) e Lógica de Ecrã Fullscreen (Alinhado ao index.html original)

// ==========================================================================
// CONTROLO DE ECRÃ E NAVEGAÇÃO DO TOTEM
// ==========================================================================
window.entrarModoTotemDaTelaLogin = () => {
    document.getElementById('tela-login').classList.add('hidden');
    document.getElementById('app-dashboard').classList.add('hidden');
    if(document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(()=>{});
    }
    document.getElementById('tela-totem').classList.remove('hidden');
    window.totemVoltarInicio();
};

window.sairModoTotem = () => {
    if(document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(()=>{});
    }
    document.getElementById('tela-totem').classList.add('hidden');
    clearTimeout(window.timerInatividade);
    
    if (window.usuarioLogado) { 
        document.getElementById('app-dashboard').classList.remove('hidden'); 
        window.mostrarToast("Painel gerencial liberado."); 
    } else { 
        document.getElementById('tela-login').classList.remove('hidden'); 
        document.getElementById('tela-login').classList.add('flex'); 
    }
};

window.resetarTimerTotem = () => {
    clearTimeout(window.timerInatividade);
    if(document.getElementById('tela-totem').classList.contains('hidden')) return;
    if(!document.getElementById('totem-tela-busca').classList.contains('hidden')) return;
    window.timerInatividade = setTimeout(() => window.totemVoltarInicio(), 45000);
};

window.totemVoltarInicio = () => {
    clearTimeout(window.timeoutTotemMsg); 
    clearTimeout(window.timerInatividade);
    window.totemClienteTemp = null; 
    window.isProcessing = false;
    
    const btnAvancar = document.getElementById('btn-totem-avancar');
    if(btnAvancar) btnAvancar.disabled = false;
    
    ['totem-tela-cadastro', 'totem-tela-opcoes', 'totem-tela-mensagem', 'totem-bottom-bar'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    
    document.getElementById('totem-tela-busca').classList.remove('hidden');
    const inp = document.getElementById('totem-cpf'); 
    if(inp) {
        inp.value = ''; 
        inp.disabled = false;
        inp.blur();
    }
};

// ==========================================================================
// PROCESSAMENTO DA LEITURA DO CPF E FLUXO DE TELAS
// ==========================================================================
window.totemProcessarCPF = () => {
    if(window.isProcessing) return;
    const cpfNum = document.getElementById('totem-cpf').value.replace(/\D/g, '');
    if(!window.validarCPFReal(cpfNum)) return window.totemMostrarMensagem('erro_cpf');
    
    if(window.operacoesAtivas && window.operacoesAtivas[cpfNum]) return window.mostrarToast('Processando informações. Por favor, aguarde.', 'erro');
    
    window.isProcessing = true; 
    if(window.operacoesAtivas) window.operacoesAtivas[cpfNum] = true; 
    document.getElementById('btn-totem-avancar').disabled = true; 
    document.getElementById('totem-cpf').disabled = true;
    if(document.activeElement) document.activeElement.blur(); 
    
    setTimeout(() => { 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[cpfNum] = false; 
    }, 8000); 

    const cliente = window.clientesMap[cpfNum];
    
    if(!cliente) {
        document.getElementById('totem-tela-busca').classList.add('hidden');
        document.getElementById('totem-form').reset();
        document.getElementById('totem-cad-cpf').value = window.formatarCPF(cpfNum);
        document.getElementById('totem-tela-cadastro').classList.remove('hidden');
        setTimeout(() => {
            const cadNome = document.getElementById('totem-cad-nome');
            if(cadNome) cadNome.focus();
        }, 300);
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[cpfNum] = false; 
        window.resetarTimerTotem();
    } else {
        window.totemClienteTemp = cliente;
        
        if((cliente.almocos || 0) >= 10) {
            document.getElementById('totem-tela-busca').classList.add('hidden');
            document.getElementById('totem-tela-opcoes').classList.remove('hidden');
            window.isProcessing = false; 
            if(window.operacoesAtivas) window.operacoesAtivas[cpfNum] = false; 
            window.resetarTimerTotem();
        } else {
            if(window.jaRegistrouHoje(cliente)) { 
                window.isProcessing = false; 
                if(window.operacoesAtivas) window.operacoesAtivas[cpfNum] = false; 
                return window.totemMostrarMensagem('ja_registrado'); 
            }
            window.isProcessing = false; 
            if(window.operacoesAtivas) window.operacoesAtivas[cpfNum] = false; 
            window.totemExecutarAcumulo();
        }
    }
};

window.totemSalvarCadastro = (e) => {
    e.preventDefault(); 
    if(window.isProcessing) return;
    
    const cpf = document.getElementById('totem-cad-cpf').value.replace(/\D/g, '');
    if(window.operacoesAtivas && window.operacoesAtivas[cpf]) return;
    
    const tel = document.getElementById('totem-cad-tel').value.replace(/\D/g, ''); 
    if(!window.telefoneValido(tel)) return window.mostrarToast('O número de telefone informado não é válido.', 'erro');
    const nasc = document.getElementById('totem-cad-nasc').value; 
    if(!window.validarDataReal(nasc)) return window.mostrarToast('A data de nascimento informada não é válida.', 'erro');

    window.isProcessing = true; 
    if(window.operacoesAtivas) window.operacoesAtivas[cpf] = true; 
    const btnSalvar = document.getElementById('btn-totem-salvar');
    if(btnSalvar) btnSalvar.disabled = true; 
    if(document.activeElement) document.activeElement.blur(); 
    
    setTimeout(() => { 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[cpf] = false; 
        if(btnSalvar) btnSalvar.disabled = false; 
    }, 8000); 

    const nome = document.getElementById('totem-cad-nome').value.trim();
    let niverF = nasc.includes('/') ? `${nasc.split('/')[2]}-${nasc.split('/')[1]}-${nasc.split('/')[0]}` : nasc;

    const novoCliente = { 
        cpf, nome, nascimento: niverF, telefone: tel, 
        almocos: 1, premiosResgatados: 0, 
        historico: [new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})], 
        origemCadastro: 'Totem', 
        dataCadastro: new Date().toLocaleDateString('pt-BR'), 
        ultimaVisitaTimestamp: Date.now() 
    };
    
    window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES + '/' + cpf), novoCliente).then(() => {
        window.totemClienteTemp = novoCliente; 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[cpf] = false;
        
        if(window.checarEAvisarAlmoco) window.checarEAvisarAlmoco(novoCliente);
        
        if(window.diasParaAniversario(novoCliente.nascimento) === 0) {
            window.totemMostrarMensagem('aniversario_totem'); 
        } else {
            window.totemMostrarMensagem('cadastro_sucesso');
        }
    }).catch(() => { 
        window.mostrarToast("Ocorreu um erro ao salvar o cadastro. Tente novamente.", "erro"); 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[cpf] = false; 
    });
};

window.totemExecutarAcumulo = () => {
    if(window.isProcessing) return;
    const cliente = window.totemClienteTemp; 
    if(!cliente) return;
    if(window.jaRegistrouHoje(cliente)) return window.totemMostrarMensagem('ja_registrado');
    
    window.isProcessing = true; 
    if(window.operacoesAtivas) window.operacoesAtivas[cliente.cpf] = true; 
    const b = document.getElementById('btn-totem-acumular'); 
    if(b) b.disabled = true;
    
    setTimeout(() => { 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[cliente.cpf] = false; 
        if(b) b.disabled = false; 
    }, 8000); 

    cliente.almocos = (cliente.almocos || 0) + 1;
    if(!cliente.historico) cliente.historico = [];
    cliente.historico.push(new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}));
    cliente.ultimaVisitaTimestamp = Date.now(); 
    if(window.limitarHistorico) cliente.historico = window.limitarHistorico(cliente.historico);

    window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES + '/' + cliente.cpf), cliente).then(() => {
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[cliente.cpf] = false; 
        if(b) b.disabled = false;
        const a = new Date().getFullYear();
        
        if(window.checarEAvisarAlmoco) window.checarEAvisarAlmoco(cliente);
        
        if (window.diasParaAniversario(cliente.nascimento) === 0 && cliente.aniversarioResgatadoAno !== a) {
            window.totemMostrarMensagem('aniversario_totem');
        } else if(cliente.almocos === 10) {
            window.totemMostrarMensagem('meta_atingida'); 
        } else {
            window.totemMostrarMensagem('sucesso_acumulo');
        }
    }).catch(() => { 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[cliente.cpf] = false; 
        if(b) b.disabled = false; 
    });
};

// ==========================================================================
// FUNÇÕES AUXILIARES DE MENSAGENS E TEMPORIZAÇÃO DO TOTEM
// ==========================================================================
window.totemMostrarMensagem = (tipo) => {
    clearTimeout(window.timerInatividade);
    ['totem-tela-busca', 'totem-tela-cadastro', 'totem-tela-opcoes'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.classList.add('hidden');
    });
    
    const ic = document.getElementById('totem-icone-msg');
    const ti = document.getElementById('totem-titulo-msg');
    const te = document.getElementById('totem-texto-msg');
    const lb = document.getElementById('totem-loading-bar');
    
    if(lb) lb.classList.remove('animate-shrink'); 
    let tempo = 10000;
    const nomeC = window.totemClienteTemp && window.totemClienteTemp.nome ? window.escapeHTML(window.totemClienteTemp.nome.split(' ')[0]) : '';

    if(tipo === 'erro_cpf') { 
        if(ic) ic.innerHTML = `<i data-lucide="x" class="w-12 h-12"></i>`; 
        if(ti) ti.innerText = "CPF inválido"; 
        if(te) te.innerText = "Por favor, digite os 11 números do seu CPF."; 
        tempo = 5000; 
    } else if(tipo === 'ja_registrado') { 
        if(ic) ic.innerHTML = `<i data-lucide="check-check" class="w-12 h-12"></i>`; 
        if(ti) ti.innerText = `Tudo certo, ${nomeC}!`; 
        if(te) te.innerText = "O seu almoço de hoje já foi contabilizado."; 
    } else if(tipo === 'aviso_caixa') { 
        if(ic) ic.innerHTML = `<i data-lucide="info" class="w-12 h-12"></i>`; 
        if(ti) ti.innerText = "Desconto solicitado"; 
        if(te) te.innerHTML = `Por favor, avise o caixa para aplicar o seu desconto de <strong>R$ 50,00</strong> na sua refeição, <strong>${nomeC}</strong>!`;
        tempo = 15000; 
    } else if(tipo === 'sucesso_acumulo' || tipo === 'cadastro_sucesso') { 
        if(ic) ic.innerHTML = `<i data-lucide="check" class="w-12 h-12"></i>`; 
        if(ti) ti.innerText = `Almoço registrado, ${nomeC}!`; 
        if(te) te.innerHTML = `Você já tem <strong>${window.totemClienteTemp.almocos||1}</strong> almoço(s) acumulado(s).`; 
    } else if(tipo === 'meta_atingida') { 
        if(ic) ic.innerHTML = `<i data-lucide="star" class="w-12 h-12"></i>`; 
        if(ti) ti.innerText = `Parabéns, ${nomeC}!`; 
        if(te) te.innerHTML = "Você completou 10 almoços! Na sua próxima visita, você ganha <strong>R$ 50,00 de desconto</strong>."; 
        tempo = 15000; 
    } else if(tipo === 'aniversario_totem') { 
        if(ic) ic.innerHTML = `<i data-lucide="cake" class="w-12 h-12"></i>`; 
        if(ti) ti.innerText = `Feliz aniversário, ${nomeC}!`; 
        if(te) te.innerHTML = `🎁 Como hoje é o seu aniversário, você ganhou <strong>R$ 50,00 de desconto</strong>!<br><br>Avise o caixa na hora do pagamento.`; 
        tempo = 15000; 
    }

    const tMsg = document.getElementById('totem-tela-mensagem');
    const tBot = document.getElementById('totem-bottom-bar');
    if(tMsg) tMsg.classList.remove('hidden'); 
    if(tBot) tBot.classList.remove('hidden');
    
    if(window.lucide) window.lucide.createIcons(); 
    
    if(lb) {
        void lb.offsetWidth; 
        lb.style.animationDuration = `${tempo}ms`; 
        lb.classList.add('animate-shrink');
    }
    
    clearTimeout(window.timeoutTotemMsg); 
    window.timeoutTotemMsg = setTimeout(() => window.totemVoltarInicio(), tempo);
};
