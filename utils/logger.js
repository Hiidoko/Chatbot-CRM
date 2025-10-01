const pino = require('pino');
const isProd = process.env.NODE_ENV === 'production';
const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');
let logger;
if (!isProd) {
  let transport;
  try {
    require.resolve('pino-pretty');
    transport = { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' } };
    logger = pino({ level, transport, base: { app: 'chatbot-crm' } });
  } catch (e) {
    logger = pino({ level, base: { app: 'chatbot-crm' } });
  }
} else {
  logger = pino({ level, base: { app: 'chatbot-crm' } });
}
module.exports = { logger };
module.exports = { logger };
