import winston from 'winston';

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const level = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'development' ? 'debug' : 'info';
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Format spécifique pour Google Cloud Run (et Azure Log Analytics qui parse le JSON)
const cloudFormat = winston.format.printf((info) => {
  const { level, message, timestamp, ...meta } = info;
  
  // Mapping des niveaux Winston vers Google Cloud Severity
  // https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#LogSeverity
  const severityMap: Record<string, string> = {
    error: 'ERROR',
    warn: 'WARNING',
    info: 'INFO',
    http: 'NOTICE', // Les logs HTTP sont souvent considérés comme NOTICE
    debug: 'DEBUG',
  };

  return JSON.stringify({
    severity: severityMap[level] || 'DEFAULT',
    level, // On garde le niveau d'origine au cas où
    message,
    timestamp,
    ...meta,
  });
});

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  // En prod, on veut du JSON pour que GCP/Azure parsents les logs
  process.env.NODE_ENV === 'production' 
    ? cloudFormat
    : winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf(
          (info) => `${info.timestamp} ${info.level}: ${info.message}`
        )
      )
);

const transports = [
  new winston.transports.Console(),
  // On pourrait ajouter des fichiers ici, mais en container/cloud c'est mieux stdout
];

export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
});
