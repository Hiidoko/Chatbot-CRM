const app = require('./server');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  // Log único e enxuto
  console.log(`Servidor iniciado em ${url}`);
});

server.on('error', (err) => {
  if (err && err.code === 'EADDRINUSE') {
    const url = `http://localhost:${PORT}`;
    // Mensagem amigável sem stack gigante
    console.error(`\n⚠ Porta ${PORT} já está em uso. Talvez outro processo da aplicação esteja rodando.\n` +
      `Acesse o processo anterior (janela onde iniciou primeiro) ou finalize-o e tente novamente.\n` +
      `Alternativas:\n  1) Encerrar processo anterior (CTRL+C).\n  2) Iniciar em outra porta: $env:PORT=${PORT+1}; npm start\n` +
      `  3) Verificar processos Node: Get-Process -Name node\n` +
      `URL esperada: ${url}\n`);
    process.exit(1);
  } else {
    logger.error({ err }, 'Falha ao iniciar o servidor HTTP');
  }
});

// Monitora sinais para logar encerramentos intencionais
['SIGINT','SIGTERM','SIGUSR2'].forEach(sig => {
  process.once(sig, () => {
    console.log(`Encerrando (${sig})...`);
    server.close(() => process.exit(0));
  });
});

// Diagnóstico: loga a cada 30s que está vivo (remover em produção se quiser)
// Removido heartbeat para saída mais limpa
