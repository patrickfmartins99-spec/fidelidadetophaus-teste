// clientes.js
// Módulo 4: Frente de Caixa, Gestão de Clientes e Fidelidade

// ==========================================================================
// ESTADO PARTILHADO (Mutex e Controlo de Fluxo)
// ==========================================================================
window.isProcessing = false;
window.acaoPendente = null;

// ==========================================================================
// FRENTE DE CAIXA: FLUXO DE BUSCA E CONTABILIZAÇÃO
// ==========================================================================
window.buscarEContabilizar = () => {
    const inputCpf = document.getElementById('busca-cpf');
    const cpf = inputCpf.value.replace(/\D/g, '');
    
    if(!window.validarCPFReal(cpf)) return window.mostrarToast('CPF Inválido', 'erro');
    if(window.isProcessing) return;
    
    const cliente = window.clientesMap[cpf];
    if(!cliente) return window.mostrarToast('Cliente não cadastrado na base!', 'erro');
    
    // Regra: Aniversariante do dia (Aviso Automático no Caixa)
    if(window.diasParaAniversario(cliente.nascimento) === 0 && cliente.aniversarioResgatadoAno !== new Date().getFullYear()) {
        window.acaoPendente = cliente;
        window.abrirModalAcao('cake', 'Aniversariante do Dia!', 
        `Hoje é o aniversário de <strong>${window.escapeHTML(cliente.nome)}</strong>. R$ 50 Liberado!`, 
        `<button onclick="confirmarNiver()" class="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-md">BAIXAR DESCONTO R$ 50</button>
         <button onclick="pularAcaoEContinuar()" class="w-full text-slate-500 font-bold py-2 mt-2">Pular e registrar apenas almoço</button>`, 
        'border-pink-500', 'text-pink-600', 'bg-pink-50');
        return;
    }
    
    window.fluxoNormalCaixa(cliente);
};

window.fluxoNormalCaixa = (cliente) => {
    if(window.jaRegistrouHoje(cliente) && !window.isModoSimulacao) {
        return window.mostrarToast('Este cliente já registrou almoço hoje!', 'erro');
    }
    
    // Cenário: Atingiu 10 almoços (Direito a resgate)
    if((cliente.almocos || 0) >= 10) {
        window.abrirModalAcao('gift', 'Desconto R$ 50 Liberado', 
        `<strong>${window.escapeHTML(cliente.nome)}</strong> já tem ${cliente.almocos} almoços.`,
        `<button onclick="efetuarResgate('${cliente.cpf}')" class="w-full bg-amber-500 hover:bg-amber-600 text-amber-950 font-black py-4 rounded-xl shadow-md">RESGATAR R$ 50 AGORA</button>
         <button onclick="confirmarAlmoco('${cliente.cpf}')" class="w-full border-2 border-slate-200 text-slate-700 font-bold py-4 rounded-xl mt-3">Apenas Acumular (+1)</button>`, 
        'border-amber-500', 'text-amber-500', 'bg-amber-50');
    } else {
        // Cenário Normal: Apenas acumula pontos
        window.abrirModalAcao('utensils', 'Registrar Almoço', 
        `Deseja adicionar +1 almoço para <strong>${window.escapeHTML(cliente.nome)}</strong>?`,
        `<button onclick="confirmarAlmoco('${cliente.cpf}')" class="w-full bg-slate-900 text-white font-black py-4 rounded-xl shadow-md">CONFIRMAR +1 ALMOÇO</button>
         <button onclick="fecharModal('modal-acao')" class="w-full text-slate-500 font-bold py-2 mt-3">Cancelar</button>`, 
        'border-slate-900', 'text-slate-900', 'bg-slate-100');
    }
};

window.confirmarAlmoco = (cpf) => {
    if(window.isProcessing) return; 
    window.isProcessing = true;
    window.fecharModal('modal-acao');
    
    const c = window.clientesMap[cpf];
    c.almocos = (c.almocos || 0) + 1;
    
    if(!c.historico) c.historico = [];
    c.historico.push(new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'}));
    c.ultimaVisitaTimestamp = Date.now();
    
    if(c.historico.length > 50) c.historico = c.historico.slice(-50);
    
    const noDb = window.isModoSimulacao ? `simulacao/clientes/${cpf}` : `clientes/${cpf}`;
    
    window.firebaseSet(window.firebaseRef(window.db, noDb), c).then(() => {
        window.isProcessing = false; 
        document.getElementById('busca-cpf').value = '';
        if(window.logAuditoria) window.logAuditoria('Almoço', `+1 Almoço para ${c.nome}. Total: ${c.almocos}`);
        window.mostrarToast('Almoço Contabilizado!');
        
        // Chamada à Automação do Robô (Declarada no marketing.js)
        if(window.configuracoesAutomacao && window.configuracoesAutomacao.posAlmoco && window.dispararFilaRobo) {
            window.dispararFilaRobo(cpf, 'pos_almoco');
        }
    });
};

window.efetuarResgate = (cpf) => {
    if(window.isProcessing) return; 
    window.isProcessing = true;
    window.fecharModal('modal-acao');
    
    const c = window.clientesMap[cpf];
    const dts = (c.historico || []).slice(0, 10);
    c.historico = (c.historico || []).slice(10);
    c.almocos -= 10; 
    c.premiosResgatados = (c.premiosResgatados || 0) + 1;
    
    const hr = new Date().toLocaleString('pt-BR');
    if(!c.historicoResgates) c.historicoResgates = [];
    c.historicoResgates.push({dataResgate: hr, datas: dts});
    
    const noDb = window.isModoSimulacao ? `simulacao/clientes/${cpf}` : `clientes/${cpf}`;
    
    window.firebaseSet(window.firebaseRef(window.db, noDb), c).then(() => {
        window.isProcessing = false; 
        document.getElementById('busca-cpf').value = '';
        if(window.logAuditoria) window.logAuditoria('Resgate', `Resgate efetuado por ${c.nome}`);
        window.mostrarToast('Resgate Registrado!');
        if(window.imprimirCupom) window.imprimirCupom(c.nome, c.cpf, dts, hr);
    });
};

window.confirmarNiver = () => {
    if(!window.acaoPendente || window.isProcessing) return; 
    window.isProcessing = true;
    window.fecharModal('modal-acao'); 
    
    const c = window.acaoPendente; 
    const ano = new Date().getFullYear();
    c.aniversarioResgatadoAno = ano;
    
    if(!c.historicoAniversarios) c.historicoAniversarios = [];
    c.historicoAniversarios.push({ dataResgate: new Date().toLocaleString('pt-BR'), ano: ano });
    
    const noDb = window.isModoSimulacao ? `simulacao/clientes/${c.cpf}` : `clientes/${c.cpf}`;
    
    window.firebaseSet(window.firebaseRef(window.db, noDb), c).then(() => {
        window.isProcessing = false; 
        if(window.logAuditoria) window.logAuditoria('Aniversário', `Desconto aniversário para ${c.nome}`);
        window.mostrarToast('Desconto de Niver Baixado!'); 
        window.pularAcaoEContinuar();
    });
};

window.pularAcaoEContinuar = () => { 
    window.fecharModal('modal-acao'); 
    window.fluxoNormalCaixa(window.acaoPendente); 
    window.acaoPendente = null; 
};

// ==========================================================================
// FRENTE DE CAIXA: CADASTRO RÁPIDO
// ==========================================================================
window.cadastrarCliente = (e) => {
    e.preventDefault(); 
    if(window.isProcessing) return;
    
    const cpf = document.getElementById('cad-cpf').value.replace(/\D/g, '');
    if(!window.validarCPFReal(cpf)) return window.mostrarToast('CPF Inválido', 'erro');
    if(window.clientesMap[cpf]) return window.mostrarToast('CPF já cadastrado!', 'erro');
    
    const tel = document.getElementById('cad-telefone').value.replace(/\D/g, '');
    if(tel.length < 10) return window.mostrarToast('Telefone Inválido', 'erro');
    
    window.isProcessing = true;
    const nasc = document.getElementById('cad-nascimento').value;
    const nascFormatado = nasc.includes('/') ? `${nasc.split('/')[2]}-${nasc.split('/')[1]}-${nasc.split('/')[0]}` : nasc;
    
    const novoCliente = { 
        cpf: cpf, 
        nome: document.getElementById('cad-nome').value.trim(), 
        nascimento: nascFormatado, 
        telefone: tel, 
        almocos: 0, 
        premiosResgatados: 0, 
        historico: [], 
        origemCadastro: 'Caixa', 
        dataCadastro: new Date().toLocaleDateString('pt-BR'), 
        ultimaVisitaTimestamp: null 
    };
    
    const noDb = window.isModoSimulacao ? `simulacao/clientes/${cpf}` : `clientes/${cpf}`;
    
    window.firebaseSet(window.firebaseRef(window.db, noDb), novoCliente).then(() => {
        window.isProcessing = false; 
        document.getElementById('form-cadastro').reset();
        if(window.logAuditoria) window.logAuditoria('Cadastro', `Novo cliente: ${novoCliente.nome}`);
        window.mostrarToast('Cadastro finalizado!');
        window.fluxoNormalCaixa(novoCliente);
    });
};

// ==========================================================================
// MODAL DE CLIENTE: VISUALIZAÇÃO E EDIÇÃO
// ==========================================================================
window.abrirModalCliente = (cpf) => {
    const c = window.clientesMap[cpf]; 
    if(!c) return;
    
    document.getElementById('mc-nome').innerText = c.nome;
    document.getElementById('mc-cpf').innerText = window.formatarCPF(c.cpf);
    document.getElementById('mc-tel').innerText = window.formatarTel(c.telefone);
    document.getElementById('mc-nasc').innerText = c.nascimento || '--';
    document.getElementById('mc-ultima').innerText = c.ultimaVisitaTimestamp ? new Date(c.ultimaVisitaTimestamp).toLocaleDateString('pt-BR') : '--';
    document.getElementById('mc-resgates').innerText = c.premiosResgatados || 0;
    document.getElementById('mc-cad').innerText = c.dataCadastro || '--';
    document.getElementById('mc-almocos').innerText = c.almocos || 0;
    
    const badge = document.getElementById('mc-vip-badge');
    if((c.premiosResgatados || 0) > 0) badge.classList.remove('hidden'); 
    else badge.classList.add('hidden');
    
    const faltam = 10 - ((c.almocos || 0) % 10);
    const perc = ((c.almocos || 0) % 10) * 10;
    
    document.getElementById('mc-bar').style.width = `${perc}%`;
    document.getElementById('mc-faltam').innerText = (c.almocos >= 10 && faltam === 10) ? 'R$ 50 Liberado!' : `Faltam ${faltam}`;
    
    document.getElementById('mc-lista-almocos').innerHTML = (c.historico || []).slice().reverse().map(h => `<li class="py-2 text-slate-600"><i data-lucide="check" class="w-3 h-3 inline mr-2 text-emerald-500"></i>${h}</li>`).join('') || '<li class="py-2 text-slate-400">Sem registros</li>';
    document.getElementById('mc-lista-resgates').innerHTML = (c.historicoResgates || []).slice().reverse().map(r => `<li class="py-2 text-slate-600"><i data-lucide="gift" class="w-3 h-3 inline mr-2 text-amber-500"></i>${r.dataResgate}</li>`).join('') || '<li class="py-2 text-slate-400">Sem resgates</li>';
    
    document.getElementById('edit-cpf').value = c.cpf;
    document.getElementById('modal-cliente').classList.remove('hidden');
    
    if(window.lucide) window.lucide.createIcons();
};

window.mudarAbaClienteModal = (aba) => {
    document.getElementById('mc-lista-almocos').classList.add('hidden'); 
    document.getElementById('mc-lista-resgates').classList.add('hidden');
    
    document.getElementById('tab-cli-almocos').classList.replace('text-slate-900', 'text-slate-500'); 
    document.getElementById('tab-cli-almocos').classList.replace('border-slate-900', 'border-transparent');
    
    document.getElementById('tab-cli-resgates').classList.replace('text-slate-900', 'text-slate-500'); 
    document.getElementById('tab-cli-resgates').classList.replace('border-slate-900', 'border-transparent');
    
    document.getElementById(`mc-lista-${aba}`).classList.remove('hidden');
    document.getElementById(`tab-cli-${aba}`).classList.replace('text-slate-500', 'text-slate-900'); 
    document.getElementById(`tab-cli-${aba}`).classList.replace('border-transparent', 'border-slate-900');
};

window.editarClienteModal = () => {
    const c = window.clientesMap[document.getElementById('edit-cpf').value]; 
    if(!c) return;
    
    document.getElementById('edit-nome').value = c.nome;
    document.getElementById('edit-tel').value = window.formatarTel(c.telefone);
    
    const nascimento = c.nascimento || '';
    document.getElementById('edit-nasc').value = nascimento.includes('-') ? nascimento.split('-').reverse().join('/') : nascimento;
    
    document.getElementById('modal-editar').classList.remove('hidden');
};

window.salvarEdicao = (e) => {
    e.preventDefault();
    const cpf = document.getElementById('edit-cpf').value;
    const c = window.clientesMap[cpf]; 
    if(!c) return;
    
    c.nome = document.getElementById('edit-nome').value;
    c.telefone = document.getElementById('edit-tel').value.replace(/\D/g, '');
    
    const inputNasc = document.getElementById('edit-nasc').value;
    c.nascimento = inputNasc.includes('/') ? inputNasc.split('/').reverse().join('-') : inputNasc;
    
    const noDb = window.isModoSimulacao ? `simulacao/clientes/${c.cpf}` : `clientes/${c.cpf}`;
    
    window.firebaseSet(window.firebaseRef(window.db, noDb), c).then(() => { 
        if(window.logAuditoria) window.logAuditoria('Edição', `Cadastro alterado: ${c.nome}`); 
        window.mostrarToast('Salvo com sucesso!'); 
        window.fecharModal('modal-editar'); 
        window.abrirModalCliente(c.cpf); 
    });
};