// totem.js
// Módulo 6: Interface de Autoatendimento (Totem) e Lógica de Ecrã Fullscreen

// ==========================================================================
// ESTADO PARTILHADO DO TOTEM
// ==========================================================================
window.totemClienteTemp = null;
window.timeoutTotem = null;

// ==========================================================================
// CONTROLO DE ECRÃ E NAVEGAÇÃO
// ==========================================================================
window.entrarModoTotemDaTelaLogin = () => { 
    document.getElementById('tela-login').classList.add('hidden'); 
    document.getElementById('app-dashboard').classList.add('hidden'); 
    
    // Tenta entrar em fullscreen (pode ser bloqueado pelo navegador se não houver clique prévio)
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
    clearTimeout(window.timeoutTotem); 
    
    // Devolve o utilizador à vista correta consoante o seu estado de autenticação
    if(window.usuarioLogado) {
        document.getElementById('app-dashboard').classList.remove('hidden'); 
    } else {
        document.getElementById('tela-login').classList.remove('hidden'); 
    }
};

window.totemVoltarInicio = () => { 
    clearTimeout(window.timeoutTotem); 
    window.totemClienteTemp = null; 
    window.isProcessing = false; // Liberta o Mutex partilhado com o clientes.js
    
    document.getElementById('totem-info').classList.add('hidden'); 
    document.getElementById('totem-timer').classList.add('hidden'); 
    document.getElementById('totem-busca').classList.remove('hidden'); 
    
    const inputCpf = document.getElementById('totem-cpf'); 
    inputCpf.value = ''; 
    inputCpf.disabled = false; 
    inputCpf.focus(); 
};

// ==========================================================================
// PROCESSAMENTO DA LEITURA DO CPF (Core do Totem)
// ==========================================================================
window.totemProcessar = () => {
    if(window.isProcessing) return;
    const cpf = document.getElementById('totem-cpf').value.replace(/\D/g, '');
    
    if(!window.validarCPFReal(cpf)) { 
        window.mostrarToast('CPF Inválido', 'erro'); 
        return; 
    }
    
    const c = window.clientesMap[cpf];
    
    if(!c) {
        window.abrirModalAcao('user-plus', 'Não Encontrado', 'Por favor, dirija-se ao caixa para o seu primeiro registo e ganhe o seu ponto!', 
        `<button onclick="totemVoltarInicio(); fecharModal('modal-acao')" class="w-full bg-slate-900 text-white font-bold py-4 rounded-xl">Entendi</button>`, 
        'border-slate-900', 'text-slate-900', 'bg-slate-100');
        return;
    }
    
    if(window.jaRegistrouHoje(c) && !window.isModoSimulacao) { 
        window.totemMostrarMsg('check-check', `Tudo Certo, ${c.nome.split(' ')[0]}!`, 'O seu almoço de hoje já está contabilizado.', c, 5000); 
        return; 
    }
    
    window.isProcessing = true; 
    document.getElementById('totem-cpf').disabled = true;
    
    // Regra de Negócio: Incrementa almoço
    c.almocos = (c.almocos || 0) + 1;
    if(!c.historico) c.historico = []; 
    c.historico.push(new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}));
    c.ultimaVisitaTimestamp = Date.now();
    
    const noDb = window.isModoSimulacao ? `simulacao/clientes/${cpf}` : `clientes/${cpf}`;
    
    window.firebaseSet(window.firebaseRef(window.db, noDb), c).then(() => {
        window.isProcessing = false; 
        window.totemClienteTemp = c;
        
        // Automação Pós-Almoço (Robô)
        if(window.configuracoesAutomacao && window.configuracoesAutomacao.posAlmoco && window.dispararFilaRobo) {
            window.dispararFilaRobo(cpf, 'pos_almoco');
        }
        
        const faltam = 10 - ((c.almocos || 0) % 10);
        if((c.almocos || 0) >= 10 && faltam === 10) {
            window.totemMostrarMsg('star', `Parabéns, ${c.nome.split(' ')[0]}!`, 'Completou 10 almoços! O desconto de R$ 50,00 está liberado!', c, 15000, true);
        } else {
            window.totemMostrarMsg('check', `Registado, ${c.nome.split(' ')[0]}!`, 'Bom apetite e obrigado por escolher o Top Haus.', c, 8000);
        }
    });
};

// ==========================================================================
// FUNÇÕES AUXILIARES DE UI DO TOTEM
// ==========================================================================
window.totemMostrarMsg = (icon, tit, txt, c, time, showResgate = false) => {
    document.getElementById('totem-busca').classList.add('hidden');
    document.getElementById('totem-info-icon').innerHTML = `<i data-lucide="${icon}" class="w-12 h-12"></i>`;
    document.getElementById('totem-info-titulo').innerText = tit;
    document.getElementById('totem-info-msg').innerHTML = txt;
    
    const perc = ((c.almocos || 0) % 10) * 10;
    const faltam = 10 - ((c.almocos || 0) % 10);
    
    document.getElementById('totem-prog-txt').innerText = `${c.almocos || 0}/10`;
    document.getElementById('totem-prog-faltam').innerText = ((c.almocos || 0) >= 10 && faltam === 10) ? 'R$ 50 Disponível!' : `Faltam ${faltam}`;
    document.getElementById('totem-prog-bar').style.width = `${perc}%`;
    
    if(showResgate) document.getElementById('totem-botoes-resgate').classList.remove('hidden');
    else document.getElementById('totem-botoes-resgate').classList.add('hidden');

    document.getElementById('totem-info').classList.remove('hidden'); 
    document.getElementById('totem-timer').classList.remove('hidden');
    
    if(window.lucide) window.lucide.createIcons();
    
    const bar = document.getElementById('totem-bar-anim'); 
    bar.classList.remove('animate-shrink'); 
    void bar.offsetWidth; // Força o reflow do CSS para reiniciar a animação
    bar.style.animationDuration = `${time}ms`; 
    bar.classList.add('animate-shrink');
    
    window.timeoutTotem = setTimeout(() => window.totemVoltarInicio(), time);
};

window.totemSolicitarResgate = () => { 
    clearTimeout(window.timeoutTotem); 
    document.getElementById('totem-botoes-resgate').classList.add('hidden'); 
    document.getElementById('totem-info-msg').innerHTML = `Avise o operador de caixa para aplicar o seu desconto de <strong>R$ 50,00</strong>!`; 
    window.timeoutTotem = setTimeout(() => window.totemVoltarInicio(), 10000); 
};