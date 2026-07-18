// marketing.js
// Módulo 5: Robô do WhatsApp, Automações e Disparos em Massa (Alinhado ao index.html original)

// ==========================================================================
// CORE DO ROBÔ DE MARKETING: ENVIAR PARA A FILA FIREBASE
// ==========================================================================
window.enviarParaFilaRobo = (cpf, telefone, textoMensagem) => {
    if(!telefone || !textoMensagem) return;
    const telLimpo = telefone.toString().replace(/\D/g, '');
    if(telLimpo.length < 10) return; // Garante que é um celular válido
    
    window.firebasePush(window.firebaseRef(window.db, 'fila_mensagens'), {
        cpf: cpf,
        telefone: telLimpo,
        texto: textoMensagem,
        timestamp: Date.now()
    }).then(() => {
        console.log("Ordem despachada para o Robô Node.js");
    });
};

window.checarEAvisarAlmoco = (c) => {
    const faltam = 10 - (c.almocos || 0);
    if(faltam > 0 && faltam < 10) {
        const msg = `Olá *${(c.nome||'').split(' ')[0]}*, seu almoço de hoje foi contabilizado no Top Haus! 🍽️\nVocê tem *${c.almocos} almoço(s)* acumulados.\nFaltam apenas *${faltam}* para você ganhar seus *R$ 50,00 de desconto*!`;
        window.enviarParaFilaRobo(c.cpf, c.telefone, msg);
    } else if (c.almocos === 10) {
        const txtPremio = window.msgsMarketing.premio || "Parabéns [Nome]! Você completou 10 almoços. No próximo você ganha R$ 50 de desconto!";
        const msg = txtPremio.replace(/\[Nome\]/g, (c.nome||'').split(' ')[0]).replace(/\[Acumulados\]/g, c.almocos);
        window.enviarParaFilaRobo(c.cpf, c.telefone, msg);
        window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES+`/${c.cpf}/notificadoPremio`), true);
    }
};

// ==========================================================================
// CENTRAL GERENCIAL DE MARKETING (MODAL GLOBAL)
// ==========================================================================
window.abrirCentralMarketing = () => {
    document.getElementById('mkt-msg-niver').value = window.msgsMarketing.aniversario || '';
    document.getElementById('mkt-msg-premio').value = window.msgsMarketing.premio || '';
    document.getElementById('mkt-msg-inativo').value = window.msgsMarketing.inativo || '';
    
    window.renderizarMensagensCustomizadas();
    
    const modal = document.getElementById('modal-marketing'); 
    modal.classList.remove('hidden'); 
    if(window.prenderFocoModal) window.prenderFocoModal(modal);
};

window.renderizarMensagensCustomizadas = () => {
    // 1. Renderizar Agendamentos (Disparos em Massa)
    const areaAg = document.getElementById('area-agendamentos'); 
    if(areaAg) {
        areaAg.innerHTML = '';
        const listaAg = Array.isArray(window.msgsMarketing.agendadas) ? window.msgsMarketing.agendadas : Object.values(window.msgsMarketing.agendadas || {});
        
        listaAg.forEach((m, idx) => {
            areaAg.innerHTML += `
                <div class="bg-white border border-indigo-200 p-3 rounded-xl shadow-sm relative">
                    <button onclick="removerAgendamento(${idx})" class="absolute top-2 right-2 text-red-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    <p class="font-bold text-sm text-indigo-900 mb-1 flex items-center gap-1"><i data-lucide="calendar" class="w-3 h-3"></i> ${m.data.split('-').reverse().join('/')} - ${window.escapeHTML(m.titulo)}</p>
                    <p class="text-xs text-gray-600 text-left">${window.escapeHTML(m.texto)}</p>
                </div>`;
        });
    }

    // 2. Renderizar Mensagens Customizadas (Botões Individuais)
    const areaCs = document.getElementById('area-mensagens-custom'); 
    if(areaCs) {
        areaCs.innerHTML = '';
        const listaCs = Array.isArray(window.msgsMarketing.personalizadas) ? window.msgsMarketing.personalizadas : Object.values(window.msgsMarketing.personalizadas || {});
        
        listaCs.forEach((m, idx) => {
            areaCs.innerHTML += `
                <div class="bg-white border border-gray-200 p-4 rounded-xl shadow-sm relative">
                    <button onclick="removerMsgCustom(${idx})" class="absolute top-2 right-2 text-red-400 hover:text-red-600"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                    <input type="text" id="mkt-custom-titulo-${idx}" value="${window.escapeHTML(m.titulo)}" placeholder="Nome do Botão" class="font-bold text-sm mb-2 w-3/4 outline-none border-b border-gray-200 text-center">
                    <textarea id="mkt-custom-texto-${idx}" rows="2" class="w-full bg-gray-50 border border-gray-100 rounded-lg p-2 text-sm outline-none text-center">${window.escapeHTML(m.texto)}</textarea>
                </div>`;
        });
    }
    
    if(window.lucide) window.lucide.createIcons();
};

window.adicionarAgendamento = () => {
    const data = document.getElementById('mkt-agenda-data').value;
    const titulo = document.getElementById('mkt-agenda-titulo').value;
    const texto = document.getElementById('mkt-agenda-texto').value;
    
    if(!data || !titulo || !texto) return window.mostrarToast("Preencha todos os campos do agendamento!", "erro");
    
    if(!Array.isArray(window.msgsMarketing.agendadas)) window.msgsMarketing.agendadas = Object.values(window.msgsMarketing.agendadas||{}); 
    window.msgsMarketing.agendadas.push({ data: data, titulo: titulo, texto: texto });
    
    document.getElementById('mkt-agenda-data').value = '';
    document.getElementById('mkt-agenda-titulo').value = '';
    document.getElementById('mkt-agenda-texto').value = '';
    window.renderizarMensagensCustomizadas(); 
};

window.removerAgendamento = (idx) => { 
    window.msgsMarketing.agendadas.splice(idx, 1); 
    window.renderizarMensagensCustomizadas(); 
};

window.adicionarMsgCustom = () => { 
    if(!Array.isArray(window.msgsMarketing.personalizadas)) window.msgsMarketing.personalizadas = Object.values(window.msgsMarketing.personalizadas||{}); 
    window.msgsMarketing.personalizadas.push({ titulo: "", texto: "" }); 
    window.renderizarMensagensCustomizadas(); 
};

window.removerMsgCustom = (idx) => { 
    window.msgsMarketing.personalizadas.splice(idx, 1); 
    window.renderizarMensagensCustomizadas(); 
};

window.salvarCentralMarketing = () => {
    window.msgsMarketing.aniversario = document.getElementById('mkt-msg-niver').value;
    window.msgsMarketing.premio = document.getElementById('mkt-msg-premio').value;
    window.msgsMarketing.inativo = document.getElementById('mkt-msg-inativo').value;
    
    window.msgsMarketing.agendadas = Array.isArray(window.msgsMarketing.agendadas) ? window.msgsMarketing.agendadas : Object.values(window.msgsMarketing.agendadas||{});
    
    const lista = Array.isArray(window.msgsMarketing.personalizadas) ? window.msgsMarketing.personalizadas : Object.values(window.msgsMarketing.personalizadas||{});
    lista.forEach((m, idx) => { 
        m.titulo = document.getElementById(`mkt-custom-titulo-${idx}`).value; 
        m.texto = document.getElementById(`mkt-custom-texto-${idx}`).value; 
    });
    window.msgsMarketing.personalizadas = lista;
    
    window.firebaseSet(window.firebaseRef(window.db, window.PATH_MENSAGENS), window.msgsMarketing).then(() => { 
        window.mostrarToast("Salvo e Integrado com o Robô!"); 
        if(window.fecharModal) window.fecharModal('modal-marketing'); 
    });
};

// ==========================================================================
// DISPARO INDIVIDUAL NA TABELA (MODAL WHATSAPP)
// ==========================================================================
window.abrirModalWhatsApp = (cpf) => {
    const cliente = window.clientesMap[cpf]; 
    if(!cliente) return;
    
    document.getElementById('whats-cliente-nome').innerText = (cliente.nome || 'Cliente').split(' ')[0];
    const area = document.getElementById('lista-opcoes-whats'); 
    if(!area) return;
    area.innerHTML = '';

    const ehNiverSemana = window.diasParaAniversario(cliente.nascimento) >= 0 && window.diasParaAniversario(cliente.nascimento) <= 7;

    if(ehNiverSemana) {
        area.innerHTML += `<button onclick="dispararWhatsApp('${cpf}', 'aniversario')" class="flex items-center gap-3 p-3 rounded-xl border border-green-200 bg-green-50 hover:bg-green-100 w-full text-left"><div class="bg-red-500 text-white p-2 rounded-lg"><i data-lucide="cake" class="w-4 h-4"></i></div><div class="flex-1"><p class="text-sm font-bold text-gray-800">Forçar Aniversário</p><p class="text-xs text-gray-600">Disparar agora</p></div></button>`;
    } 

    const listaMkt = Array.isArray(window.msgsMarketing.personalizadas) ? window.msgsMarketing.personalizadas : Object.values(window.msgsMarketing.personalizadas || {});
    listaMkt.forEach((m, idx) => { 
        if(m.titulo) area.innerHTML += `<button onclick="dispararWhatsApp('${cpf}', 'custom', ${idx})" class="flex items-center gap-3 p-3 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 w-full text-left mt-2"><div class="bg-indigo-500 text-white p-2 rounded-lg"><i data-lucide="send" class="w-4 h-4"></i></div><div class="flex-1"><p class="text-sm font-bold text-gray-800">${window.escapeHTML(m.titulo)}</p></div></button>`; 
    });

    const modal = document.getElementById('modal-whatsapp'); 
    modal.classList.remove('hidden'); 
    if(window.prenderFocoModal) window.prenderFocoModal(modal); 
    if(window.lucide) window.lucide.createIcons();
};

window.dispararWhatsApp = (cpf, tipo, idx = -1) => {
    const cliente = window.clientesMap[cpf]; 
    if(!cliente || !cliente.telefone) return window.mostrarToast("Sem telefone válido", "erro");
    
    let t = ""; 
    
    if (tipo === 'aniversario') { 
        t = window.msgsMarketing.aniversario; 
        window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES+`/${cpf}/notificadoAniversarioAno`), new Date().getFullYear()); 
    } else if (tipo === 'custom') { 
        const l = Array.isArray(window.msgsMarketing.personalizadas) ? window.msgsMarketing.personalizadas : Object.values(window.msgsMarketing.personalizadas||{}); 
        t = l[idx].texto; 
    }

    t = t.replace(/\[Nome\]/g, (cliente.nome||'').split(' ')[0]).replace(/\[Acumulados\]/g, (cliente.almocos||0));
    
    // Joga para a fila do Firebase e o Robô Node.js consome silenciosamente
    window.enviarParaFilaRobo(cliente.cpf, cliente.telefone, t);
    
    window.mostrarToast("A ordem foi para a fila do Robô!");
    if(window.fecharModal) window.fecharModal('modal-whatsapp'); 
};
