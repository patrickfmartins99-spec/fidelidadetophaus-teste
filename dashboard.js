// dashboard.js
// Módulo 7: Maestro de Inicialização e Renderização de UI Estática

// ==========================================================================
// VARIÁVEIS GLOBAIS E ESTADO PARTILHADO (A Fonte da Verdade)
// ==========================================================================
window.isSimulationMode = localStorage.getItem('modoSimulacao') === 'true';

window.getDbPath = (base) => {
    if (base === 'clientes') return window.isSimulationMode ? 'clientes_simulacao' : 'clientes';
    if (base === 'mensagens') return window.isSimulationMode ? 'config/mensagens_simulacao' : 'config/mensagens';
    return base;
};

window.PATH_CLIENTES = window.getDbPath('clientes');
window.PATH_MENSAGENS = window.getDbPath('mensagens');

window.usuarioLogado = null;
window.cargoLogado = null;
window.clientesArray = [];
window.clientesMap = {}; 
window.filtroAtual = 'todos';

window.operacoesAtivas = {}; 
window.acaoPendente = null; 
window.tipoAcaoPendente = null; 
window.isProcessing = false;
window.clienteSimulacaoAtual = null;

window.msgsMarketing = {
    aniversario: "Olá, *[Nome]*! Vimos aqui que o *seu aniversário está chegando*! 🎉\nE a equipe Top Haus faz questão de comemorar com você.\nPreparamos um *Desconto de R$ 50,00* exclusivo para você usar no seu almoço.\nPara resgatar, é só apresentar esta mensagem no nosso caixa no dia exato do seu aniversário!\nTe esperamos para celebrar!",
    premio: "🎉 Parabéns, *[Nome]*!\nVocê acaba de completar 10 almoços.\nNa sua próxima visita, você tem direito a *R$ 50,00 de desconto* na sua refeição!",
    inativo: "Olá *[Nome]*, faz tempo que não te vemos por aqui! Que tal almoçar com a gente essa semana?",
    agendadas: [],
    personalizadas: []
};

window.timeoutTotemMsg = null;
window.timerInatividade = null;
window.totemClienteTemp = null;

// ==========================================================================
// INICIALIZAÇÃO E LISTENERS (DOMContentLoaded)
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
    if(window.lucide) window.lucide.createIcons();
    
    if(window.isSimulationMode) { 
        const banner = document.getElementById('banner-simulacao');
        if(banner) banner.classList.remove('hidden'); 
        document.body.classList.add('pt-12'); 
    }

    // Listener de Marketing
    window.firebaseOnValue(window.firebaseRef(window.db, window.PATH_MENSAGENS), (snapshot) => {
        const data = snapshot.val();
        if (data) { 
            window.msgsMarketing = {...window.msgsMarketing, ...data}; 
            if(!window.msgsMarketing.personalizadas) window.msgsMarketing.personalizadas = []; 
            if(!window.msgsMarketing.agendadas) window.msgsMarketing.agendadas = []; 
        }
    });

    // Listener Principal de Clientes
    window.firebaseOnValue(window.firebaseRef(window.db, window.PATH_CLIENTES), (snapshot) => {
        const data = snapshot.val();
        if (data) { 
            window.clientesMap = data; 
            window.clientesArray = Object.values(data); 
        } else { 
            window.clientesMap = {}; 
            window.clientesArray = []; 
        }
        window.atualizarIndicadores(); 
        window.calcularNotificacoesPainel(); 
        window.filtrarLista(window.filtroAtual);
    });

    // Listener do Totem (Inatividade)
    const areaTotem = document.getElementById('area-totem-interativa') || document.getElementById('totem-dynamic-area');
    if(areaTotem) {
        areaTotem.addEventListener('mousemove', window.resetarTimerTotem);
        areaTotem.addEventListener('touchstart', window.resetarTimerTotem);
        areaTotem.addEventListener('keydown', window.resetarTimerTotem);
    }
});

// ==========================================================================
// NAVEGAÇÃO DE ABAS
// ==========================================================================
window.alternarAba = (a) => {
    const bc = document.getElementById('btn-aba-caixa');
    const ba = document.getElementById('btn-aba-admin');
    
    if(a === 'caixa'){ 
        document.getElementById('aba-caixa').classList.remove('hidden'); 
        document.getElementById('aba-admin').classList.add('hidden'); 
        bc.classList.add('bg-gray-800'); 
        bc.classList.remove('bg-black'); 
        ba.classList.remove('bg-gray-800'); 
        ba.classList.add('bg-black'); 
    } else { 
        document.getElementById('aba-caixa').classList.add('hidden'); 
        document.getElementById('aba-admin').classList.remove('hidden'); 
        ba.classList.add('bg-gray-800'); 
        ba.classList.remove('bg-black'); 
        bc.classList.remove('bg-gray-800'); 
        bc.classList.add('bg-black'); 
        window.filtrarLista('todos'); 
    }
};

// ==========================================================================
// RENDERIZAÇÃO DO PAINEL E INDICADORES ESTÁTICOS
// ==========================================================================
window.atualizarIndicadores = () => { 
    document.getElementById('card-total').innerText = window.clientesArray.length; 
    document.getElementById('card-premios').innerText = window.clientesArray.filter(c => (c.almocos||0) >= 10).length; 
    document.getElementById('card-vips').innerText = window.clientesArray.filter(c => (c.premiosResgatados||0) > 0).length; 
    document.getElementById('card-niver-central').innerText = window.clientesArray.filter(c => window.isNiverMesCheck(c.nascimento)).length; 
};

window.calcularNotificacoesPainel = () => {
    const p = document.getElementById('painel-notificacoes'); 
    p.innerHTML = '';
    
    let nNiv = 0, nPre = 0, nIna = 0; 
    const a = new Date().getFullYear();
    
    window.clientesArray.forEach(c => {
        const dNiv = window.diasParaAniversario(c.nascimento); 
        if (dNiv >= 0 && dNiv <= 7 && c.notificadoAniversarioAno !== a) nNiv++;
        
        if ((c.almocos||0) >= 10 && !c.notificadoPremio) nPre++;
        
        const dSum = window.diasDesdeUltimaVisita(c);
        const dNot = c.notificadoInativoData ? Math.floor((Date.now() - c.notificadoInativoData) / 86400000) : 999;
        
        if (dSum > 15 && dNot > 15) nIna++; 
    });
    
    if(nNiv > 0) {
        p.innerHTML += `
            <div onclick="filtrarLista('alerta_niver')" class="bg-red-50 border border-red-200 p-4 rounded-xl cursor-pointer hover:bg-red-100 transition shadow-sm flex items-center gap-3">
                <i data-lucide="cake" class="w-8 h-8 text-red-500"></i>
                <div><p class="text-sm font-bold text-red-800">Aniversários!</p><p class="text-xs text-red-600"><strong>${nNiv}</strong> pendentes.</p></div>
            </div>`;
    }
    if(nPre > 0) {
        p.innerHTML += `
            <div onclick="filtrarLista('alerta_premio')" class="bg-amber-50 border border-amber-200 p-4 rounded-xl cursor-pointer hover:bg-amber-100 transition shadow-sm flex items-center gap-3">
                <i data-lucide="gift" class="w-8 h-8 text-amber-500"></i>
                <div><p class="text-sm font-bold text-amber-800">Prêmios!</p><p class="text-xs text-amber-600"><strong>${nPre}</strong> pendentes.</p></div>
            </div>`;
    }
    if(nIna > 0) {
        p.innerHTML += `
            <div onclick="filtrarLista('alerta_inativos')" class="bg-blue-50 border border-blue-200 p-4 rounded-xl cursor-pointer hover:bg-blue-100 transition shadow-sm flex items-center gap-3">
                <i data-lucide="user-minus" class="w-8 h-8 text-blue-500"></i>
                <div><p class="text-sm font-bold text-blue-800">Ausentes!</p><p class="text-xs text-blue-600"><strong>${nIna}</strong> (+15 dias).</p></div>
            </div>`;
    }
    if(window.lucide) window.lucide.createIcons();
};

// ==========================================================================
// FILTROS E TABELAS
// ==========================================================================
window.filtrarLista = (t, dI=null, dF=null) => {
    window.filtroAtual = t; 
    const tf = document.getElementById('filtro-atual-texto');
    const sf = document.getElementById('sub-filtros-niver'); 
    let l = [];
    
    if (t.startsWith('niver')) {
        sf.classList.remove('hidden'); 
    } else {
        sf.classList.add('hidden');
    }
    
    const a = new Date().getFullYear();
    
    if (t === 'todos') { 
        tf.innerText = 'Exibindo: Todos'; 
        l = window.clientesArray; 
    } else if (t === 'premios') { 
        tf.innerText = 'Aguardando Resgate'; 
        l = window.clientesArray.filter(c => (c.almocos||0) >= 10); 
    } else if (t === 'vips') { 
        tf.innerText = 'VIPs'; 
        l = window.clientesArray.filter(c => (c.premiosResgatados||0) > 0).sort((x,y) => (y.premiosResgatados||0) - (x.premiosResgatados||0)); 
    } else if (t === 'niver_mes') { 
        tf.innerText = 'Aniversários: Mês'; 
        l = window.clientesArray.filter(c => window.isNiverMesCheck(c.nascimento)); 
    } else if (t === 'niver_periodo') { 
        tf.innerText = `Aniversários: Período`; 
        l = window.clientesArray.filter(c => window.isNiverInPeriod(c.nascimento, dI, dF)); 
    } else if (t === 'alerta_niver') { 
        tf.innerText = 'Aniversários aguardando aviso'; 
        l = window.clientesArray.filter(c => {
            const d = window.diasParaAniversario(c.nascimento);
            return d >= 0 && d <= 7 && c.notificadoAniversarioAno !== a;
        }); 
    } else if (t === 'alerta_premio') { 
        tf.innerText = 'Prêmios aguardando aviso'; 
        l = window.clientesArray.filter(c => (c.almocos||0) >= 10 && !c.notificadoPremio); 
    } else if (t === 'alerta_inativos') { 
        tf.innerText = 'Inativos (+15 dias)'; 
        l = window.clientesArray.filter(c => {
            const dSum = window.diasDesdeUltimaVisita(c);
            const dNot = c.notificadoInativoData ? Math.floor((Date.now() - c.notificadoInativoData)/86400000) : 999; 
            return dSum > 15 && dNot > 15;
        }); 
    }
    
    window.renderizarTabela(l);
};

window.filtrarPorPeriodo = () => { 
    const i = document.getElementById('filtro-data-inicio').value;
    const f = document.getElementById('filtro-data-fim').value; 
    if(!i || !f) return; 
    window.filtrarLista('niver_periodo', i, f); 
};

window.filtrarPorTexto = (v) => { 
    const b = v.toLowerCase(); 
    window.renderizarTabela(window.clientesArray.filter(c => 
        (c.nome||'').toLowerCase().includes(b) || 
        (c.cpf||'').includes(b) || 
        (c.telefone||'').includes(b)
    )); 
};

window.renderizarTabela = (l) => {
    const tb = document.getElementById('tabela-clientes'); 
    tb.innerHTML = '';
    
    if(!l || l.length === 0){ 
        tb.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-slate-400">Nenhum registro encontrado.</td></tr>`; 
        return; 
    }
    
    l.forEach(c => {
        const bHist = ((c.premiosResgatados||0) > 0 || (c.historicoAniversarios && c.historicoAniversarios.length > 0)) ? 
            `<button onclick="abrirHistorico('${c.cpf}')" class="text-gray-500 hover:text-black p-1.5"><i data-lucide="history" class="w-4 h-4"></i></button>` : ``;
        const bEdit = `<button onclick="abrirEditar('${c.cpf}')" class="text-gray-500 hover:text-black p-1.5"><i data-lucide="edit-3" class="w-4 h-4"></i></button>`;
        const bZap = `<button onclick="abrirModalWhatsApp('${c.cpf}')" class="text-green-600 p-1.5"><i data-lucide="message-circle" class="w-4 h-4"></i></button>`;
        const bSim = (window.isSimulationMode && window.permissoesLogado && window.permissoesLogado.simulacao) ? 
            `<button onclick="abrirSimulador('${c.cpf}')" class="text-orange-600 p-1.5"><i data-lucide="flask-conical" class="w-4 h-4"></i></button>` : ``;
        
        const tr = document.createElement('tr'); 
        tr.className = 'border-b hover:bg-gray-50 transition';
        tr.innerHTML = `
            <td class="py-3 px-6 text-center font-bold">${window.escapeHTML(c.nome)}</td>
            <td class="py-3 px-6 text-center text-xs font-mono text-gray-500">${window.formatarCPF(c.cpf)}<br>${window.formatarTel(c.telefone)}</td>
            <td class="py-3 px-6 text-center font-bold text-base ${(c.almocos||0) >= 10 ? 'text-black' : 'text-gray-500'}">${c.almocos||0}</td>
            <td class="py-3 px-6 text-center font-bold text-gray-500">${c.premiosResgatados||0}</td>
            <td class="py-3 px-6 text-right"><div class="flex justify-end items-center">${bSim}${bZap}${bEdit}${bHist}</div></td>`;
        tb.appendChild(tr);
    }); 
    if(window.lucide) window.lucide.createIcons();
};

// ==========================================================================
// EXPORTAÇÃO E RESET DO SISTEMA
// ==========================================================================
window.exportarExcel = () => { 
    // Nova trava
    if(!window.permissoesLogado || !window.permissoesLogado.clientes) return window.mostrarToast("Acesso Negado", "erro");

    let c = "\ufeffNome;CPF;Nascimento;WhatsApp;Acumulados;Resgates\n"; 
    // ... restante do código original
};

window.resetarSistema = () => { 
    // Nova trava
    if(!window.permissoesLogado || !window.permissoesLogado.reset) return window.mostrarToast("Acesso Negado", "erro");

    const msgAlerta = window.isSimulationMode 
        ? "Resetar SIMULAÇÃO? Digite APAGAR:" 
        : "ALERTA! Digite APAGAR para excluir clientes REAIS:";
    // ... restante do código original
};

// ==========================================================================
// FUNÇÕES DE AMBIENTE DE SIMULAÇÃO (LABORATÓRIO)
// ==========================================================================
window.ativarSimulacao = () => { localStorage.setItem('modoSimulacao', 'true'); window.location.reload(); };
window.desativarSimulacao = () => { localStorage.setItem('modoSimulacao', 'false'); window.location.reload(); };

window.abrirSimulador = (cpf) => {
    window.clienteSimulacaoAtual = window.clientesMap[cpf];
    if(!window.clienteSimulacaoAtual) return;
    document.getElementById('sim-cliente-nome').innerText = window.clienteSimulacaoAtual.nome.split(' ')[0];
    document.getElementById('sim-qtd-atual').innerText = window.clienteSimulacaoAtual.almocos || 0;
    document.getElementById('sim-input-almocos').value = window.clienteSimulacaoAtual.almocos || 0;
    const modal = document.getElementById('modal-simulacao'); 
    modal.classList.remove('hidden'); 
    if(window.prenderFocoModal) window.prenderFocoModal(modal);
};

window.salvarSimulacaoAlmocos = () => {
    if(!window.clienteSimulacaoAtual) return;
    window.clienteSimulacaoAtual.almocos = parseInt(document.getElementById('sim-input-almocos').value) || 0;
    window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES + '/' + window.clienteSimulacaoAtual.cpf), window.clienteSimulacaoAtual).then(() => { 
        window.mostrarToast("Saldo de almoços ajustado!", "sucesso"); 
        if(window.fecharModal) window.fecharModal('modal-simulacao'); 
    });
};

window.simularAniversarioHoje = () => {
    if(!window.clienteSimulacaoAtual) return;
    const hoje = new Date(); const dia = String(hoje.getDate()).padStart(2, '0'); const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    window.clienteSimulacaoAtual.nascimento = `${hoje.getFullYear() - 30}-${mes}-${dia}`;
    window.clienteSimulacaoAtual.aniversarioResgatadoAno = null;
    if(window.clienteSimulacaoAtual.historicoAniversarios) {
        window.clienteSimulacaoAtual.historicoAniversarios = window.clienteSimulacaoAtual.historicoAniversarios.filter(h => h.ano !== hoje.getFullYear());
    }
    window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES + '/' + window.clienteSimulacaoAtual.cpf), window.clienteSimulacaoAtual).then(() => { 
        window.mostrarToast("Data Festiva configurada!", "sucesso"); 
        if(window.fecharModal) window.fecharModal('modal-simulacao'); 
    });
};

window.simularInatividade = () => {
    if(!window.clienteSimulacaoAtual) return;
    window.clienteSimulacaoAtual.ultimaVisitaTimestamp = Date.now() - (16 * 24 * 60 * 60 * 1000); 
    window.clienteSimulacaoAtual.notificadoInativoData = null;
    window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES + '/' + window.clienteSimulacaoAtual.cpf), window.clienteSimulacaoAtual).then(() => { 
        window.mostrarToast("Ausência retrocedida!", "sucesso"); 
        if(window.fecharModal) window.fecharModal('modal-simulacao'); 
    });
};

// ==========================================================================
// CONTROLES GLOBAIS DE AMBIENTE E DADOS
// ==========================================================================
window.ativarSimulacao = () => { 
    localStorage.setItem('modoSimulacao', 'true'); 
    window.location.reload(); 
};

window.desativarSimulacao = () => { 
    localStorage.setItem('modoSimulacao', 'false'); 
    window.location.reload(); 
};

window.resetarSistema = () => { 
    // Adapta o alerta dependendo do ambiente em que o Admin está operando
    const msgAlerta = window.isSimulationMode 
        ? "Resetar SIMULAÇÃO? Digite APAGAR:" 
        : "ALERTA! Digite APAGAR para excluir clientes REAIS:";

    if(prompt(msgAlerta) === "APAGAR") {
        window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES), null).then(() => {
            window.mostrarToast("Banco de Dados Resetado");
        }); 
    } else {
        window.mostrarToast("Ação Cancelada", "erro");
    }
};
