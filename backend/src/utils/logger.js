import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Logger que só exibe em desenvolvimento
export const logger = {
  log: (...args) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  info: (...args) => {
    if (!isProduction) {
      console.info(...args);
    }
  },
  warn: (...args) => {
    // Warnings sempre são exibidos
    console.warn(...args);
  },
  error: (...args) => {
    // Errors sempre são exibidos
    console.error(...args);
  },
  debug: (...args) => {
    if (!isProduction) {
      console.debug(...args);
    }
  }
};

// Logger para produção com níveis
export const productionLogger = {
  error: (message, meta = {}) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  warn: (message, meta = {}) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  },
  info: (message, meta = {}) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...meta
    }));
  }
};
