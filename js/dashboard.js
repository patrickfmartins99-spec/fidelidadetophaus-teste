// dashboard.js
// Módulo 7: Maestro de Inicialização, Listeners do Firebase e Renderização de UI

// ==========================================================================
// INICIALIZAÇÃO DA CACHE E ESTADO GLOBAL
// ==========================================================================
window.clientesMap = {};
window.clientesArray = [];
window.historicoCampanhas = [];
window.auditoriaLogs = [];
window.configuracoesAutomacao = { niver: true, inativo: true, posAlmoco: true, campanhas: true };

// Resgata o estado de simulação do armazenamento local (definido no core.js)
window.isModoSimulacao = localStorage.getItem('modoSimulacao') === 'true';

// ==========================================================================
// ARRANQUE DO SISTEMA
// ==========================================================================
window.addEventListener('DOMContentLoaded', () => {
    if(window.lucide) window.lucide.createIcons();
    
    // Verifica se a simulação está ativa para mostrar o banner visual
    if(window.isModoSimulacao) {
        const banner = document.getElementById('banner-simulacao');
        if(banner) banner.classList.remove('hidden');
    }

    iniciarListenersFirebase();
});

// ==========================================================================
// LISTENERS DO FIREBASE (Reatividade)
// ==========================================================================
function iniciarListenersFirebase() {
    // 1. Escutar Clientes (Redireciona para o nó fantasma se for simulação)
    const noClientes = window.isModoSimulacao ? 'simulacao/clientes' : 'clientes';
    
    window.firebaseOnValue(window.firebaseRef(window.db, noClientes), (snap) => {
        window.clientesMap = snap.val() || {};
        window.clientesArray = Object.values(window.clientesMap);
        
        window.atualizarDashboardExecutivo();
        
        const subCli = document.getElementById('sub-aba-clientes');
        if(subCli && !subCli.classList.contains('hidden')) window.renderizarTabelaClientes();
        
        const subRank = document.getElementById('sub-aba-ranking');
        if(subRank && !subRank.classList.contains('hidden')) window.atualizarRanking();
    });

    // 2. Escutar Automações
    window.firebaseOnValue(window.firebaseRef(window.db, 'config/automacoes'), (snap) => {
        if(snap.exists()) {
            window.configuracoesAutomacao = snap.val();
            const niver = document.getElementById('auto-niver'); if(niver) niver.checked = window.configuracoesAutomacao.niver;
            const inativo = document.getElementById('auto-inativo'); if(inativo) inativo.checked = window.configuracoesAutomacao.inativo;
            const posAlmoco = document.getElementById('auto-pos-almoco'); if(posAlmoco) posAlmoco.checked = window.configuracoesAutomacao.posAlmoco;
            const camp = document.getElementById('auto-campanhas'); if(camp) camp.checked = window.configuracoesAutomacao.campanhas;
        }
    });

    // 3. Escutar Status do Robô Node.js
    window.firebaseOnValue(window.firebaseRef(window.db, 'status_robo'), (snap) => {
        const s = snap.val() || { online: false, enviadasHoje: 0, enviadasMes: 0, erros: 0 };
        const textoRobo = document.getElementById('ind-robo-texto');
        const corRobo = document.getElementById('ind-robo-cor');
        const tituloStatus = document.getElementById('robo-titulo-status');
        
        if(s.online) { 
            if(textoRobo) textoRobo.innerText = 'Robô On'; 
            if(corRobo) corRobo.classList.replace('bg-red-500', 'bg-indigo-500'); 
            if(tituloStatus) tituloStatus.innerText = 'Robô Conectado';
        } else { 
            if(textoRobo) textoRobo.innerText = 'Robô Off'; 
            if(corRobo) corRobo.classList.replace('bg-indigo-500', 'bg-red-500'); 
            if(tituloStatus) tituloStatus.innerText = 'Robô Offline';
        }
        
        const envHoje = document.getElementById('robo-enviadas-hoje'); if(envHoje) envHoje.innerText = s.enviadasHoje;
        const envMes = document.getElementById('robo-enviadas-mes'); if(envMes) envMes.innerText = s.enviadasMes;
        const errQtd = document.getElementById('robo-erros-qtd'); if(errQtd) errQtd.innerText = s.erros;
    });

    // 4. Escutar Fila de Mensagens
    window.firebaseOnValue(window.firebaseRef(window.db, 'fila_mensagens'), (snap) => {
        const qtd = snap.exists() ? Object.keys(snap.val()).length : 0;
        const kpiFila = document.getElementById('kpi-fila'); if(kpiFila) kpiFila.innerText = qtd;
        const filaQtd = document.getElementById('robo-fila-qtd'); if(filaQtd) filaQtd.innerText = qtd;
    });

    // 5. Escutar Histórico de Campanhas
    window.firebaseOnValue(window.firebaseRef(window.db, 'historico_disparos'), (snap) => {
        window.historicoCampanhas = snap.exists() ? Object.values(snap.val()).reverse() : [];
        window.renderizarHistoricoCampanhas();
    });

    // 6. Escutar Auditoria
    window.firebaseOnValue(window.firebaseRef(window.db, 'auditoria'), (snap) => {
        window.auditoriaLogs = snap.exists() ? Object.values(snap.val()).sort((a,b)=>b.timestamp - a.timestamp) : [];
        window.renderizarAuditoria();
    });
}

// ==========================================================================
// CONTROLO DE NAVEGAÇÃO DE ABAS (UI)
// ==========================================================================
window.alternarAba = (abaId) => {
    document.querySelectorAll('main > section').forEach(secao => secao.classList.add('hidden'));
    const el = document.getElementById(`aba-${abaId}`);
    if(el) el.classList.remove('hidden');
    
    document.querySelectorAll('.aba-btn').forEach(btn => {
        if(btn.id === `btn-aba-${abaId}`) {
            btn.classList.add('bg-gray-800', 'border-gray-600');
            btn.classList.remove('bg-black', 'border-gray-800');
        } else {
            btn.classList.remove('bg-gray-800', 'border-gray-600');
            btn.classList.add('bg-black', 'border-gray-800');
        }
    });
    
    if(abaId === 'admin') window.abrirSubAba('dashboard');
};

window.abrirSubAba = (subId) => {
    document.querySelectorAll('.sub-aba-content').forEach(el => el.classList.add('hidden'));
    const el = document.getElementById(`sub-aba-${subId}`);
    if(el) el.classList.remove('hidden');
    
    document.querySelectorAll('.sub-aba-btn').forEach(btn => {
        if(btn.id === `btn-sub-${subId}`) {
            btn.classList.add('bg-slate-900', 'text-white');
            btn.classList.remove('text-slate-600', 'hover:bg-slate-100');
        } else {
            btn.classList.remove('bg-slate-900', 'text-white');
            btn.classList.add('text-slate-600', 'hover:bg-slate-100');
        }
    });
    
    if(subId === 'clientes') window.renderizarTabelaClientes();
    if(subId === 'ranking') window.atualizarRanking();
};

// ==========================================================================
// RENDERIZADORES DE TABELAS E DASHBOARDS
// ==========================================================================
window.atualizarDashboardExecutivo = () => {
    const hj = new Date().toLocaleDateString('pt-BR');
    let cadHj=0, almHj=0, resHj=0, niv7d=0, inat=0, vips=0;
    
    window.clientesArray.forEach(c => {
        if(c.dataCadastro === hj) cadHj++;
        if(c.historico && c.historico.some(h => h.startsWith(hj))) almHj++;
        if(c.historicoResgates && c.historicoResgates.some(h => h.dataResgate.startsWith(hj))) resHj++;
        if((c.premiosResgatados||0) > 0) vips++;
        
        if(window.diasDesdeUltimaVisita(c) > 15) inat++;
        const dNiv = window.diasParaAniversario(c.nascimento);
        if(dNiv >= 0 && dNiv <= 7) niv7d++;
    });
    
    const kpiCad = document.getElementById('kpi-cad-hoje'); if(kpiCad) kpiCad.innerText = cadHj;
    const kpiAlm = document.getElementById('kpi-alm-hoje'); if(kpiAlm) kpiAlm.innerText = almHj;
    const kpiRes = document.getElementById('kpi-res-hoje'); if(kpiRes) kpiRes.innerText = resHj;
    const kpiNiv = document.getElementById('kpi-niv-7d'); if(kpiNiv) kpiNiv.innerText = niv7d;
    const kpiInat = document.getElementById('kpi-inativos'); if(kpiInat) kpiInat.innerText = inat;
    const kpiVips = document.getElementById('kpi-vips'); if(kpiVips) kpiVips.innerText = vips;
};

window.renderizarTabelaClientes = () => {
    const tbody = document.getElementById('tabela-clientes-body');
    if(!tbody) return;
    
    const txtEl = document.getElementById('filtro-texto-cli');
    const tipoEl = document.getElementById('filtro-tipo-cli');
    const txt = txtEl ? txtEl.value.toLowerCase() : '';
    const tipo = tipoEl ? tipoEl.value : 'todos';
    
    let lista = window.clientesArray.filter(c => {
        const matchTxt = (c.nome||'').toLowerCase().includes(txt) || (c.cpf||'').includes(txt) || (c.telefone||'').includes(txt);
        if(!matchTxt) return false;
        if(tipo === 'vips' && (c.premiosResgatados||0) === 0) return false;
        if(tipo === 'premios' && (c.almocos||0) < 10) return false;
        if(tipo === 'inativos' && window.diasDesdeUltimaVisita(c) <= 15) return false;
        if(tipo === 'niver_mes' && !window.isNiverMesCheck(c.nascimento)) return false;
        return true;
    }).sort((a,b) => b.ultimaVisitaTimestamp - a.ultimaVisitaTimestamp).slice(0, 100); 
    
    tbody.innerHTML = lista.map(c => {
        const perc = Math.min(100, ((c.almocos||0)%10)*10);
        const badge = (c.premiosResgatados||0)>0 ? `<span class="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded ml-2">VIP</span>` : '';
        return `
        <tr class="hover:bg-slate-50 transition cursor-pointer" onclick="abrirModalCliente('${c.cpf}')">
            <td class="py-4 px-6"><p class="font-bold text-slate-800">${window.escapeHTML(c.nome)} ${badge}</p><p class="text-xs text-slate-400">Cad: ${c.dataCadastro||'--'}</p></td>
            <td class="py-4 px-6 text-center"><p class="font-mono text-sm text-slate-600">${window.formatarCPF(c.cpf)}</p><p class="font-mono text-xs text-slate-400">${window.formatarTel(c.telefone)}</p></td>
            <td class="py-4 px-6">
                <div class="flex items-center gap-3 justify-center">
                    <span class="font-black text-slate-700 text-lg w-6 text-right">${c.almocos||0}</span>
                    <div class="w-24 bg-slate-200 h-2 rounded-full overflow-hidden"><div class="bg-slate-900 h-full rounded-full" style="width:${perc}%"></div></div>
                </div>
            </td>
            <td class="py-4 px-6 text-center"><button onclick="event.stopPropagation(); abrirModalWhatsAppManual('${c.cpf}')" class="p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg"><i data-lucide="message-circle" class="w-4 h-4"></i></button></td>
        </tr>`;
    }).join('');
    
    if(window.lucide) window.lucide.createIcons();
};

window.atualizarRanking = () => {
    const listAlm = [...window.clientesArray].sort((a,b)=>(b.almocos||0)-(a.almocos||0)).slice(0,10);
    const listRes = [...window.clientesArray].filter(c=>(c.premiosResgatados||0)>0).sort((a,b)=>(b.premiosResgatados||0)-(a.premiosResgatados||0)).slice(0,10);
    
    const ulAlm = document.getElementById('lista-ranking-almocos');
    if(ulAlm) {
        ulAlm.innerHTML = listAlm.map((c,i) => `
        <li class="flex items-center justify-between p-4 hover:bg-white transition cursor-pointer" onclick="abrirModalCliente('${c.cpf}')">
            <div class="flex items-center gap-4"><span class="w-6 text-center font-black text-slate-300 text-xl">${i+1}</span><div class="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500">${c.nome.charAt(0).toUpperCase()}</div><div><p class="font-bold text-slate-800">${window.escapeHTML(c.nome)}</p><p class="text-xs text-slate-400">Última: ${c.ultimaVisitaTimestamp ? new Date(c.ultimaVisitaTimestamp).toLocaleDateString('pt-BR') : '--'}</p></div></div>
            <div class="text-right"><p class="text-2xl font-black text-amber-500">${c.almocos||0}</p><p class="text-[10px] font-bold text-slate-400 uppercase">Almoços</p></div>
        </li>`).join('');
    }
        
    const ulRes = document.getElementById('lista-ranking-resgates');
    if(ulRes) {
        ulRes.innerHTML = listRes.map((c,i) => `
        <li class="flex items-center justify-between p-4 hover:bg-slate-800 transition cursor-pointer" onclick="abrirModalCliente('${c.cpf}')">
            <div class="flex items-center gap-4"><span class="w-6 text-center font-black text-slate-600 text-xl">${i+1}</span><div class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-amber-400"><i data-lucide="crown" class="w-5 h-5"></i></div><div><p class="font-bold text-white">${window.escapeHTML(c.nome)}</p><p class="text-xs text-slate-400">Cliente VIP</p></div></div>
            <div class="text-right"><p class="text-2xl font-black text-amber-400">${c.premiosResgatados||0}</p><p class="text-[10px] font-bold text-slate-400 uppercase">Resgates</p></div>
        </li>`).join('');
    }
    
    if(window.lucide) window.lucide.createIcons();
};

window.renderizarHistoricoCampanhas = () => {
    const tb = document.getElementById('tabela-historico-campanhas');
    if(!tb) return;
    tb.innerHTML = window.historicoCampanhas.map(h => {
        const badge = h.status === 'Agendado' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';
        return `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-bold text-slate-800">${window.escapeHTML(h.nome)}<br><span class="text-[10px] text-slate-400 font-normal uppercase">${h.segmento}</span></td>
            <td class="p-4 text-slate-600 text-xs">${h.gatilho}</td>
            <td class="p-4 text-center font-mono text-slate-600 text-xs">${h.horario}</td>
            <td class="p-4 text-center font-black text-slate-700">${h.destinatariosCount}</td>
            <td class="p-4 text-center"><span class="px-2 py-1 rounded text-xs font-bold ${badge}">${h.status}</span></td>
        </tr>`;
    }).join('');
};

window.renderizarAuditoria = () => {
    const tb = document.getElementById('tabela-auditoria');
    if(!tb) return;
    tb.innerHTML = window.auditoriaLogs.map(l => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-mono text-xs text-slate-500">${new Date(l.timestamp).toLocaleString('pt-BR')}</td>
            <td class="p-4 font-bold text-slate-700">${l.usuario}</td>
            <td class="p-4"><span class="bg-slate-200 text-slate-700 text-[10px] font-black uppercase px-2 py-1 rounded">${l.acao}</span></td>
            <td class="p-4 text-slate-600 truncate max-w-xs">${l.detalhes}</td>
        </tr>`).join('');
};

window.limparAuditoria = () => { 
    if(confirm('Apagar histórico de auditoria?')) {
        window.firebaseSet(window.firebaseRef(window.db, 'auditoria'), null);
    }
};