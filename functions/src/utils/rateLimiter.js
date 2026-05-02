// functions/src/utils/rateLimiter.js
// ═════════════════════════════════════════════════════════════════════════════
// Rate Limiter para Cloud Functions — Firebase Functions v2
// ═════════════════════════════════════════════════════════════════════════════
// Implementa rate limiting por IP y por usuario autenticado
// Usa almacenamiento en memoria (adecuado para funciones con tráfico bajo-medio)
// Para alta carga, usar Redis o Firestore externo
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Rate Limiter simple en memoria
 * Almacena contadores por clave (IP o userId) con timestamps
 */
class RateLimiter {
  constructor() {
    // Almacén en memoria: { key: { count: number, resetTime: number } }
    this.store = new Map();
    // Limpiar entradas expiradas cada 5 minutos
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Verifica si una clave excedió el límite
   * @param {string} key - Identificador único (IP o userId)
   * @param {number} maxRequests - Máximo de requests permitidos
   * @param {number} windowMs - Ventana de tiempo en milisegundos
   * @returns {object} - { allowed: boolean, remaining: number, resetIn: number }
   */
  check(key, maxRequests = 100, windowMs = 60000) {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry) {
      // Primera request en la ventana
      this.store.set(key, { count: 1, resetTime: now + windowMs });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetIn: windowMs,
      };
    }

    // Verificar si la ventana expiró
    if (now >= entry.resetTime) {
      // Reiniciar contador
      this.store.set(key, { count: 1, resetTime: now + windowMs });
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetIn: windowMs,
      };
    }

    // Dentro de la ventana, verificar límite
    if (entry.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetIn: entry.resetTime - now,
      };
    }

    // Incrementar contador
    entry.count += 1;
    this.store.set(key, entry);
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetIn: entry.resetTime - now,
    };
  }

  /**
   * Limpia entradas expiradas del store
   */
  cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now >= entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Cierra el interval de cleanup
   */
  shutdown() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

// Instancia singleton del rate limiter
const rateLimiter = new RateLimiter();

/**
 * Middleware de rate limiting para Cloud Functions
 * @param {object} options - Opciones de configuración
 * @param {number} options.maxRequests - Máximo de requests (default: 100)
 * @param {number} options.windowMs - Ventana en ms (default: 60000 = 1min)
 * @param {string} options.keyType - 'ip' | 'user' | 'both' (default: 'ip')
 * @param {object} options.customKey - Función para clave personalizada
 * @returns {function} - Middleware de Express
 */
function createRateLimitMiddleware(options = {}) {
  const {
    maxRequests = 100,
    windowMs = 60000,
    keyType = 'ip',
    customKey = null,
  } = options;

  return (req, res, next) => {
    let key;

    if (customKey) {
      // Clave personalizada proporcionada
      key = customKey(req);
    } else if (keyType === 'user' && req.headers.authorization) {
      // Usar token de autenticación como clave
      key = `user:${req.headers.authorization}`;
    } else if (keyType === 'both' && req.headers.authorization) {
      // Combinar IP + usuario
      const ip = req.headers['x-forwarded-for'] || req.ip || 'unknown';
      key = `both:${ip}:${req.headers.authorization}`;
    } else {
      // Por defecto, usar IP
      const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
        || req.headers['x-real-ip'] 
        || req.ip 
        || 'unknown';
      key = `ip:${ip}`;
    }

    const result = rateLimiter.check(key, maxRequests, windowMs);

    // Agregar headers de rate limit
    res.set('X-RateLimit-Limit', maxRequests);
    res.set('X-RateLimit-Remaining', result.remaining);
    res.set('X-RateLimit-Reset', Math.ceil(result.resetIn / 1000));

    if (!result.allowed) {
      const err = new Error('Too many requests. Please try again later.');
      err.status = 429;
      err.code = 'RATE_LIMIT_EXCEEDED';
      err.retryAfter = Math.ceil(result.resetIn / 1000);
      return next(err);
    }

    next();
  };
}

/**
 * Rate limit específico para endpoints de escritura
 * Límites más estrictos para operaciones que escriben datos
 */
const writeRateLimit = createRateLimitMiddleware({
  maxRequests: 20,  // 20 writes por minuto
  windowMs: 60000,
  keyType: 'user',
});

/**
 * Rate limit específico para endpoints de lectura
 * Límites más permisivos para operaciones de lectura
 */
const readRateLimit = createRateLimitMiddleware({
  maxRequests: 200,  // 200 reads por minuto
  windowMs: 60000,
  keyType: 'ip',
});

/**
 * Rate limit para autenticación
 * Muy estricto para prevenir ataques de fuerza bruta
 */
const authRateLimit = createRateLimitMiddleware({
  maxRequests: 10,  // 10 intentos por minuto
  windowMs: 60000,
  keyType: 'ip',
});

module.exports = {
  rateLimiter,
  createRateLimitMiddleware,
  writeRateLimit,
  readRateLimit,
  authRateLimit,
};