// clientes.js
// Módulo 4: Frente de Caixa, Gestão de Clientes e Fidelidade (Alinhado ao index.html original)

// ==========================================================================
// FRENTE DE CAIXA: FLUXO DE BUSCA E ROTEAMENTO
// ==========================================================================
window.buscarEContabilizar = () => {
    const inputCpf = document.getElementById('busca-cpf');
    if(!inputCpf) return;
    const cpf = inputCpf.value.replace(/\D/g, ''); 
    
    if(!window.validarCPFReal(cpf)) return window.mostrarToast('O CPF informado não é válido.', 'erro');
    if(window.operacoesAtivas && window.operacoesAtivas[cpf]) return;
    
    const c = window.clientesMap[cpf]; 
    if(!c) return window.mostrarToast('Cliente não encontrado. Verifique o CPF digitado.', 'erro');
    
    if (window.diasParaAniversario(c.nascimento) === 0 && c.aniversarioResgatadoAno !== new Date().getFullYear()) { 
        window.acaoPendente = c; 
        window.tipoAcaoPendente = 'busca'; 
        document.getElementById('texto-alerta-aniversario').innerHTML = `Hoje é o aniversário de <br><strong class="text-xl text-black">${window.escapeHTML(c.nome)}</strong>!`; 
        const m = document.getElementById('modal-alerta-aniversario'); 
        m.classList.remove('hidden'); 
        if(window.prenderFocoModal) window.prenderFocoModal(m); 
        return; 
    }
    
    window.processarFluxoNormal(c);
};

window.processarFluxoNormal = (c) => {
    const ja = window.jaRegistrouHoje(c);
    const p = (c.almocos||0) >= 10;
    
    if(p) {
        const m = document.getElementById('modal-trava'); 
        m.classList.remove('hidden'); 
        if(window.prenderFocoModal) window.prenderFocoModal(m);
        
        document.getElementById('btn-trava-resgatar').onclick = () => { 
            if(window.fecharModal) window.fecharModal('modal-trava'); 
            window.efetuarResgateEImprimir(c); 
        };
        
        const bA = document.getElementById('btn-trava-acumular');
        if(ja) { 
            bA.innerText = "Almoço já adicionado hoje"; 
            bA.disabled = true; 
            bA.classList.add('opacity-50'); 
        } else { 
            bA.innerText = "Apenas adicionar 1 almoço"; 
            bA.disabled = false; 
            bA.classList.remove('opacity-50'); 
            bA.onclick = () => { 
                if(window.fecharModal) window.fecharModal('modal-trava'); 
                window.processarConfirmacao(c); 
            }; 
        }
    } else {
        if(ja) return window.mostrarToast('Este cliente já teve um almoço adicionado hoje.', 'erro');
        
        document.getElementById('texto-confirmacao').innerHTML = `Deseja adicionar 1 almoço para ${window.escapeHTML(c.nome)}?`;
        const m = document.getElementById('modal-confirmacao'); 
        m.classList.remove('hidden'); 
        if(window.prenderFocoModal) window.prenderFocoModal(m);
        
        document.getElementById('btn-confirmar-almoco').onclick = () => { 
            if(window.fecharModal) window.fecharModal('modal-confirmacao'); 
            window.processarConfirmacao(c); 
        };
    }
};

// ==========================================================================
// FRENTE DE CAIXA: PROCESSAMENTO E BANCO DE DADOS
// ==========================================================================
window.cadastrarCliente = (e) => {
    e.preventDefault(); 
    if(window.isProcessing) return;
    
    const cpf = document.getElementById('cad-cpf').value.replace(/\D/g, ''); 
    if(!window.validarCPFReal(cpf)) return window.mostrarToast('O CPF informado não é válido.', 'erro');
    if(window.clientesMap[cpf] || (window.operacoesAtivas && window.operacoesAtivas[cpf])) return window.mostrarToast('Este CPF já está cadastrado ou ocorreu um erro.', 'erro');
    
    const tel = document.getElementById('cad-telefone').value.replace(/\D/g, ''); 
    if(!window.telefoneValido(tel)) return window.mostrarToast('O número de telefone informado não é válido.', 'erro');
    const nasc = document.getElementById('cad-nascimento').value; 
    if(!window.validarDataReal(nasc)) return window.mostrarToast('A data de nascimento informada não é válida.', 'erro');

    window.isProcessing = true; 
    if(window.operacoesAtivas) window.operacoesAtivas[cpf] = true; 
    const btn = document.getElementById('btn-caixa-salvar');
    if(btn) btn.disabled = true;
    
    setTimeout(() => { 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[cpf] = false; 
        if(btn) btn.disabled = false; 
    }, 8000);

    const nf = nasc.includes('/') ? `${nasc.split('/')[2]}-${nasc.split('/')[1]}-${nasc.split('/')[0]}` : nasc;
    const nc = { 
        cpf, nome: document.getElementById('cad-nome').value.trim(), 
        nascimento: nf, telefone: tel, 
        almocos: 0, premiosResgatados: 0, historico: [], 
        origemCadastro: 'Caixa', 
        dataCadastro: new Date().toLocaleDateString('pt-BR'), 
        ultimaVisitaTimestamp: null 
    };
    
    window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES + '/' + cpf), nc).then(() => {
        document.getElementById('form-cadastro').reset(); 
        window.mostrarToast('Cliente cadastrado com sucesso.'); 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[cpf] = false; 
        if(btn) btn.disabled = false;
        
        if(window.diasParaAniversario(nc.nascimento) === 0) { 
            window.acaoPendente = nc; 
            window.tipoAcaoPendente = 'cadastro'; 
            document.getElementById('texto-alerta-aniversario').innerHTML = `Hoje é o aniversário de <br><strong class="text-xl text-black">${window.escapeHTML(nc.nome)}</strong>!`; 
            const m = document.getElementById('modal-alerta-aniversario'); 
            m.classList.remove('hidden'); 
            if(window.prenderFocoModal) window.prenderFocoModal(m); 
        } else {
            const b = document.getElementById('busca-cpf');
            if(b) b.focus();
        }
    }).catch(() => { 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[cpf] = false; 
    });
};

window.processarConfirmacao = (c) => {
    if(window.isProcessing) return; 
    window.isProcessing = true; 
    if(window.operacoesAtivas) window.operacoesAtivas[c.cpf] = true; 
    const btn = document.getElementById('btn-confirmar-almoco');
    if(btn) btn.disabled = true; 
    
    setTimeout(()=>{ 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[c.cpf] = false; 
        if(btn) btn.disabled = false; 
    }, 8000);
    
    c.almocos = (c.almocos||0) + 1; 
    if(!c.historico) c.historico = []; 
    c.historico.push(new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'})); 
    c.ultimaVisitaTimestamp = Date.now(); 
    c.historico = window.limitarHistorico(c.historico);
    
    window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES + '/' + c.cpf), c).then(() => { 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[c.cpf] = false; 
        if(btn) btn.disabled = false; 
        const inp = document.getElementById('busca-cpf');
        if(inp) inp.value = ''; 
        window.mostrarToast('Almoço adicionado com sucesso.'); 
        
        if(window.checarEAvisarAlmoco) window.checarEAvisarAlmoco(c); 
    });
};

window.efetuarResgateEImprimir = (c) => {
    if(window.isProcessing) return; 
    window.isProcessing = true; 
    if(window.operacoesAtivas) window.operacoesAtivas[c.cpf] = true; 
    const btn = document.getElementById('btn-trava-resgatar');
    if(btn) btn.disabled = true; 
    
    setTimeout(()=>{ 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[c.cpf] = false; 
    }, 8000);
    
    const dts = (c.historico||[]).slice(0,10); 
    c.historico = (c.historico||[]).slice(10); 
    c.almocos -= 10; 
    c.premiosResgatados = (c.premiosResgatados||0) + 1; 
    c.notificadoPremio = false;
    
    const hr = new Date().toLocaleString('pt-BR'); 
    if(!c.historicoResgates) c.historicoResgates = []; 
    c.historicoResgates.push({dataResgate: hr, datas: dts});
    
    window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES + '/' + c.cpf), c).then(() => { 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[c.cpf] = false; 
        const inp = document.getElementById('busca-cpf');
        if(inp) inp.value = ''; 
        if(btn) btn.disabled = false; 
        window.mostrarToast('Desconto aplicado com sucesso.'); 
        window.dispararImpressao(c.nome, c.cpf, dts, hr); 
    });
};

// ==========================================================================
// AÇÕES SECUNDÁRIAS (ANIVERSÁRIO E IMPRESSÃO)
// ==========================================================================
window.confirmarCortesiaAniversario = () => {
    if(!window.acaoPendente || window.isProcessing) return; 
    
    const c = window.acaoPendente; 
    window.isProcessing = true; 
    if(window.operacoesAtivas) window.operacoesAtivas[c.cpf] = true; 
    setTimeout(()=>{ window.isProcessing = false; if(window.operacoesAtivas) window.operacoesAtivas[c.cpf] = false; }, 8000);
    
    const a = new Date().getFullYear(); 
    c.aniversarioResgatadoAno = a; 
    
    if(!c.historicoAniversarios) c.historicoAniversarios = [];
    c.historicoAniversarios.push({ dataResgate: new Date().toLocaleString('pt-BR'), ano: a });
    
    window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES + '/' + c.cpf), c).then(() => { 
        window.isProcessing = false; 
        if(window.operacoesAtivas) window.operacoesAtivas[c.cpf] = false; 
        window.mostrarToast("Desconto de aniversário aplicado com sucesso."); 
        window.continuarPosAniversario(); 
    });
};

window.continuarPosAniversario = () => { 
    document.getElementById('modal-alerta-aniversario').classList.add('hidden'); 
    if(window.tipoAcaoPendente === 'busca') {
        window.processarFluxoNormal(window.acaoPendente); 
    } else {
        const b = document.getElementById('busca-cpf');
        if(b) b.focus(); 
    }
    window.acaoPendente = null; 
};

window.dispararImpressao = (nome, cpf, dts, hr) => {
    let l = ''; 
    (dts||[]).forEach(d => l += `<li>[+] ${window.escapeHTML(d)}</li>`);
    
    const secaoImp = document.getElementById('secao-impressao');
    if(!secaoImp) return;
    
    secaoImp.innerHTML = `
        <div style="text-align:center;margin-bottom:5px;line-height:1.2;">
            <strong style="font-size:15px;color:#000;">ESPAÇO TOP HAUS LTDA</strong><br>
            CNPJ: 26.845.124/0001-61 | IE: ISENTO<br>
            Avenida Pref. Jose Juvenal Mafra, 7155<br>Navegantes - SC 88372-506<br>
            Fone: (47) 3342-5114<br>
        </div>
        <div class="linha-tracejada"></div>
        <div style="text-align:center;margin-bottom:5px;">
            <strong style="font-size:14px;color:#000;">COMPROVANTE DE DESCONTO</strong><br>
            <span style="font-size:11px;">${hr}</span>
        </div>
        <div class="linha-tracejada"></div>
        <div style="margin-bottom:5px;font-size:12px;color:#000;">
            <p style="margin:2px 0;"><strong>Cliente:</strong> ${window.escapeHTML((nome||'').toUpperCase())}</p>
            <p style="margin:2px 0;"><strong>CPF:</strong> ${window.formatarCPF(cpf)}</p>
        </div>
        <div class="linha-tracejada"></div>
        <div style="margin-bottom:5px;">
            <p style="font-weight:bold;margin:2px 0;color:#000;">ALMOÇOS ACUMULADOS:</p>
            <ol style="padding-left:15px;margin:0;font-size:11px;color:#000;">${l}</ol>
        </div>
        <div class="linha-tracejada"></div>
        <div style="text-align:center;margin-top:5px;">
            <p style="font-weight:900;margin:0;font-size:16px;color:#000;">DESCONTO LIBERADO</p>
            <p style="font-size:11px;margin:2px 0;">Válido para R$ 50,00 de desconto na refeição.</p>
        </div>`; 
    
    window.print();
};

// ==========================================================================
// MODAL ESTÁTICO DE EDIÇÃO (CHAMADO PELA TABELA)
// ==========================================================================
window.abrirEditar = (cpf) => {
    const c = window.clientesMap[cpf]; 
    if(!c) return;
    
    document.getElementById('edit-cpf-raw').value = c.cpf||''; 
    document.getElementById('edit-cpf-display').value = window.formatarCPF(c.cpf);
    document.getElementById('edit-nome').value = c.nome||''; 
    
    document.getElementById('edit-nascimento').value = c.nascimento && c.nascimento.includes('-') ? 
        `${c.nascimento.split('-')[2]}/${c.nascimento.split('-')[1]}/${c.nascimento.split('-')[0]}` : c.nascimento||'';
    
    document.getElementById('edit-telefone').value = window.formatarTel(c.telefone);
    
    const m = document.getElementById('modal-editar'); 
    m.classList.remove('hidden'); 
    if(window.prenderFocoModal) window.prenderFocoModal(m);
};

window.salvarEdicao = (e) => {
    e.preventDefault(); 
    const c = window.clientesMap[document.getElementById('edit-cpf-raw').value]; 
    if(!c) return;
    
    const tel = document.getElementById('edit-telefone').value.replace(/\D/g, ''); 
    if(!window.telefoneValido(tel)) return window.mostrarToast('O número de telefone informado não é válido.', 'erro');
    const nasc = document.getElementById('edit-nascimento').value; 
    if(!window.validarDataReal(nasc)) return window.mostrarToast('A data de nascimento informada não é válida.', 'erro');
    
    c.nome = document.getElementById('edit-nome').value; 
    c.telefone = tel; 
    c.nascimento = nasc.includes('/') ? `${nasc.split('/')[2]}-${nasc.split('/')[1]}-${nasc.split('/')[0]}` : nasc;
    
    window.firebaseSet(window.firebaseRef(window.db, window.PATH_CLIENTES + '/' + c.cpf), c).then(() => { 
        window.mostrarToast("Dados do cliente atualizados com sucesso."); 
        if(window.fecharModal) window.fecharModal('modal-editar'); 
    });
};

// ==========================================================================
// MODAL ESTÁTICO DE HISTÓRICO (CHAMADO PELA TABELA)
// ==========================================================================
window.abrirHistorico = (cpf) => {
    const c = window.clientesMap[cpf];
    const div = document.getElementById('lista-historico'); 
    if(!div) return;
    
    div.innerHTML = ''; 
    if(!c) return;
    
    if(c.historicoResgates && c.historicoResgates.length > 0) { 
        div.innerHTML += `<h4 class="font-bold text-sm mb-2 text-black border-b pb-1">Descontos resgatados (10 almoços)</h4>`; 
        c.historicoResgates.forEach((r, i) => { 
            div.innerHTML += `
                <div class="bg-gray-50 p-3 rounded-lg border flex justify-between items-center mb-2">
                    <div><p class="text-xs font-bold">Resgate #${i+1}</p><p class="text-xs">${r.dataResgate}</p></div>
                    <button onclick="reimprimirCupomPorCpf('${c.cpf}', ${i})" class="bg-black text-white px-3 py-1.5 rounded-lg text-xs font-bold">
                        <i data-lucide="printer" class="w-3.5 h-3.5 inline"></i> Reimprimir cupom
                    </button>
                </div>`; 
        }); 
    }
    if(c.historicoAniversarios && c.historicoAniversarios.length > 0) { 
        div.innerHTML += `<h4 class="font-bold text-sm mb-2 mt-4 text-black border-b pb-1">Descontos de aniversário</h4>`; 
        c.historicoAniversarios.forEach(r => { 
            div.innerHTML += `
                <div class="bg-indigo-50 p-3 rounded-lg border flex justify-between items-center mb-2">
                    <div><p class="text-xs font-bold">Aniversário ${r.ano}</p><p class="text-xs">${r.dataResgate}</p></div>
                </div>`; 
        }); 
    }
    const m = document.getElementById('modal-historico'); 
    m.classList.remove('hidden'); 
    if(window.prenderFocoModal) window.prenderFocoModal(m); 
    if(window.lucide) window.lucide.createIcons();
};

window.reimprimirCupomPorCpf = (c, i) => { 
    if(window.fecharModal) window.fecharModal('modal-historico'); 
    const cl = window.clientesMap[c]; 
    if(cl && cl.historicoResgates && cl.historicoResgates[i]) {
        window.dispararImpressao(cl.nome, cl.cpf, cl.historicoResgates[i].datas, cl.historicoResgates[i].dataResgate + " (Reimpressão)"); 
    }
};
