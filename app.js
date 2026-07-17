// app.js
// Ponto Único de Entrada (Entry Point) da Aplicação
// Garante o carregamento determinístico e estruturado dos módulos do sistema.

import './core.js';
import './firebase.js';
import './auth.js';
import './clientes.js';
import './marketing.js';
import './totem.js';
import './dashboard.js';

// Como todos os módulos acima se auto-anexam ao objeto global (window),
// a simples importação estática garante que a ordem de execução seja 100% respeitada
// antes que o sistema libere a interface para o utilizador.
