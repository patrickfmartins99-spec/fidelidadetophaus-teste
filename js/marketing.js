// marketing.js
// Módulo 5: Robô do WhatsApp, Campanhas e Automações de Marketing

// ==========================================================================
// TEMPLATES DE MENSAGENS E CONFIGURAÇÕES LOCAIS
// ==========================================================================
const msgTemplates = {
    sushi: "Olá *[Nome]*, hoje é Terça do Sushi no Top Haus! 🍣\nVenha aproveitar nosso buffet.",
    casal: "Olá *[Nome]*, Quarta do Casal no Top Haus! 👩‍❤️‍👨\nTraga seu amor.",
    chopp: "Olá *[Nome]*, Quinta do Chopp em dobro! 🍺\nTe esperamos para o happy hour.",
    promocao: "Olá *[Nome]*, promoção especial hoje no Top Haus!",
    aniversario: "Olá *[Nome]*, feliz mês do seu aniversário! 🎂 Venha comemorar conosco.",
    inativo: "Olá *[Nome]*, faz tempo que não te vemos por aqui! Que tal um almoço hoje?"
};

// ==========================================================================
// GESTÃO DE CAMPANHAS DE MARKETING
// ==========================================================================
window.aplicarModeloCampanha = () => {
    const v = document.getElementById('mkt-modelo').value;
    if(v && msgTemplates[v]) document.getElementById('mkt-texto').value = msgTemplates[v];
    else document.getElementById('mkt-texto').value = '';
};

window.toggleRecorrencia = () => {
    const r = document.getElementById('mkt-recorrencia').value;
    document.getElementById('mkt-data-unica').classList.add('hidden');
    document.getElementById('mkt-dia-semana').classList.add('hidden');
    document.getElementById('mkt-dia-mes').classList.add('hidden');
    
    if(r === 'unica') document.getElementById('mkt-data-unica').classList.remove('hidden');
    else if(r === 'semanal') document.getElementById('mkt-dia-semana').classList.remove('hidden');
    else if(r === 'mensal') document.getElementById('mkt-dia-mes').classList.remove('hidden');
};

window.mudarAbaMkt = (aba) => {
    document.getElementById('mkt-area-nova').classList.add('hidden');
    document.getElementById('mkt-area-historico').classList.add('hidden');
    
    document.getElementById('tab-mkt-nova').classList.remove('border-slate-900', 'text-slate-900'); 
    document.getElementById('tab-mkt-nova').classList.add('border-transparent', 'text-slate-500');
    
    document.getElementById('tab-mkt-historico').classList.remove('border-slate-900', 'text-slate-900'); 
    document.getElementById('tab-mkt-historico').classList.add('border-transparent', 'text-slate-500');
    
    document.getElementById(`mkt-area-${aba}`).classList.remove('hidden');
    document.getElementById(`tab-mkt-${aba}`).classList.remove('border-transparent', 'text-slate-500');
    document.getElementById(`tab-mkt-${aba}`).classList.add('border-slate-900', 'text-slate-900');
};

window.calcularTamanhoPublico = (seg) => {
    if(seg === 'todos') return window.clientesArray.length;
    if(seg === 'vips') return window.clientesArray.filter(c => (c.premiosResgatados||0) > 0).length;
    if(seg === '5_almocos') return window.clientesArray.filter(c => (c.almocos||0) >= 5).length;
    if(seg === '10_almocos') return window.clientesArray.filter(c => (c.almocos||0) >= 10).length;
    
    // As funções matemáticas puras estão expostas no core.js / window
    if(seg === 'inativos') return window.clientesArray.filter(c => window.diasDesdeVisita(c) > 15).length;
    if(seg === 'aniversariantes') return window.clientesArray.filter(c => window.isNiverMes(c.nascimento)).length;
    return 0;
};

window.salvarCampanha = () => {
    const nome = document.getElementById('mkt-nome-campanha').value.trim();
    const texto = document.getElementById('mkt-texto').value.trim();
    const segmento = document.getElementById('mkt-segmento').value;
    const rec = document.getElementById('mkt-recorrencia').value;
    const hor = document.getElementById('mkt-horario').value;
    
    if(!nome || !texto) return window.mostrarToast('Preencha nome e texto', 'erro');
    
    let gatilho = rec;
    if(rec === 'unica') gatilho = document.getElementById('mkt-data-unica').value;
    if(rec === 'semanal') gatilho = `Semanal (Dia ${document.getElementById('mkt-dia-semana').value})`;
    if(rec === 'mensal') gatilho = `Mensal (Dia ${document.getElementById('mkt-dia-mes').value})`;
    
    window.firebasePush(window.firebaseRef(window.db, 'historico_disparos'), {
        nome, texto, segmento, recorrencia: rec, gatilho, horario: hor, timestamp: Date.now(), 
        status: rec === 'imediata' ? 'Em Fila' : 'Agendado', 
        destinatariosCount: window.calcularTamanhoPublico(segmento)
    }).then(() => {
        if(window.logAuditoria) window.logAuditoria('Marketing', `Nova campanha agendada: ${nome}`);
        window.mostrarToast('Campanha Agendada!');
        document.getElementById('mkt-nome-campanha').value = ''; 
        document.getElementById('mkt-texto').value = '';
        window.mudarAbaMkt('historico');
    });
};

// ==========================================================================
// DISPAROS E INTEGRAÇÃO COM O MOTOR DO ROBÔ (NODE.JS)
// ==========================================================================
window.abrirModalWhatsAppManual = (cpf) => {
    window.fecharModal('modal-cliente');
    
    // O TotemClienteTemp resolve a tentativa de disparo para um cliente recém registado no Totem
    const c = window.clientesMap[cpf] || window.totemClienteTemp; 
    if(!c) return;
    
    window.abrirModalAcao('send', 'Disparo Manual', 
        `Enviar mensagem via Robô para <strong>${window.escapeHTML(c.nome)}</strong>.`,
        `<button onclick="dispararFilaRobo('${c.cpf}', 'lembrete'); fecharModal('modal-acao');" class="w-full bg-slate-900 text-white font-bold py-3 rounded-xl mb-2">Aviso "Faltam X Almoços"</button>
         <button onclick="dispararFilaRobo('${c.cpf}', 'aniversario'); fecharModal('modal-acao');" class="w-full bg-pink-500 text-white font-bold py-3 rounded-xl mb-2">Felitações (Niver)</button>
         <button onclick="fecharModal('modal-acao')" class="w-full text-slate-500 font-bold py-2 mt-2">Cancelar</button>`, 
        'border-slate-900', 'text-slate-900', 'bg-slate-100'
    );
};

window.dispararFilaRobo = (cpf, tipo) => {
    const c = window.clientesMap[cpf]; 
    if(!c || !c.telefone) return;
    
    let txt = '';
    const faltam = 10 - ((c.almocos || 0) % 10);
    
    if(tipo === 'pos_almoco' || tipo === 'lembrete') {
        if(faltam > 0 && faltam < 10) txt = `Olá *${c.nome.split(' ')[0]}*, seu almoço foi contabilizado no Top Haus! 🍽️\nVocê tem *${c.almocos}* almoços acumulados. Faltam apenas *${faltam}* para ganhar R$ 50,00 de desconto!`;
        else if((c.almocos || 0) >= 10 && faltam === 10) txt = `Parabéns *${c.nome.split(' ')[0]}*! 🎉\nVocê completou 10 almoços. Na sua próxima visita, você já tem R$ 50,00 de desconto garantido!`;
        else return; 
    } else if(tipo === 'aniversario') {
        txt = msgTemplates.aniversario.replace(/\[Nome\]/g, c.nome.split(' ')[0]);
    }
    
    if(txt) {
        const filaNome = window.isModoSimulacao ? 'simulacao_fila_mensagens' : 'fila_mensagens';
        window.firebasePush(window.firebaseRef(window.db, filaNome), { 
            cpf: c.cpf, 
            telefone: c.telefone.replace(/\D/g,''), 
            texto: txt, 
            timestamp: Date.now() 
        });
        window.mostrarToast('Ordem enviada para a fila do Robô!');
    }
};

window.dispararVarreduraRobo = () => { 
    window.firebasePush(window.firebaseRef(window.db, 'fila_mensagens'), { cmd_interno: 'force_cron', timestamp: Date.now() }); 
    window.mostrarToast('Comando enviado ao Robô'); 
    if(window.logAuditoria) window.logAuditoria('Robô', 'Varredura forçada solicitada no painel'); 
};

// ==========================================================================
// CONFIGURAÇÕES DE AUTOMAÇÃO
// ==========================================================================
window.salvarAutomacoes = () => {
    const conf = {
        niver: document.getElementById('auto-niver').checked,
        inativo: document.getElementById('auto-inativo').checked,
        posAlmoco: document.getElementById('auto-pos-almoco').checked,
        campanhas: document.getElementById('auto-campanhas').checked
    };
    window.firebaseSet(window.firebaseRef(window.db, 'config/automacoes'), conf).then(() => { 
        if(window.logAuditoria) window.logAuditoria('Automação', 'Configurações de automação atualizadas'); 
        window.mostrarToast('Configurações Salvas!'); 
    });
};