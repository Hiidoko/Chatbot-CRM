const app = require('./server');
const { logger } = require('./utils/logger');

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  logger.info({ port: PORT, env: process.env.NODE_ENV, url }, 'Servidor iniciado');
  if (process.env.NODE_ENV !== 'production' && process.stdout.isTTY) {
    // Linha amigável clicável no terminal
    // Pode desativar definindo NO_PRETTY_START=1
    if (!process.env.NO_PRETTY_START) {
      console.log(`\n➡  Aplicação disponível em: ${url}\nCTRL+C para encerrar.\n`);
    }
  }
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
    logger.warn({ signal: sig }, 'Encerrando servidor (signal)');
    server.close(() => process.exit(0));
  });
});

// Diagnóstico: loga a cada 30s que está vivo (remover em produção se quiser)
if (process.env.NODE_ENV !== 'production') {
  setInterval(() => {
    if (server.listening) logger.debug({ uptime: process.uptime().toFixed(0) }, 'Heartbeat servidor');
  }, 30000).unref();
}
