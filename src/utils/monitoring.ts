import client from 'prom-client';

// Initialisation du registre
const register = new client.Registry();

// Collection des métriques par défaut du process (CPU, RAM, Event Loop...)
client.collectDefaultMetrics({
  register,
  labels: { 
    app: 'dungeon-desk-backend',
    // Labels spécifiques Cloud Run (si disponibles)
    revision: process.env.K_REVISION || 'local',
    service: process.env.K_SERVICE || 'unknown'
  }
});

// Métrique pour le temps de réponse HTTP (Histogramme) en secondes
export const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10] // Buckets en secondes
});

register.registerMetric(httpRequestDurationSeconds);

export { register };
