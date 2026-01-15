import { DeezerAPIError } from "../types/errors";

interface RetryOptions {
  maxAttempts?: number;
  baseDelay?: number;
  maxDelay?: number;
  shouldRetry?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 seconde
  maxDelay: 10000, // 10 secondes
  shouldRetry: (error: any) => {
    if (error instanceof DeezerAPIError) {
      return error.isRetryable();
    }
    return false;
  },
};

/**
 * Fonction de retry avec backoff exponentiel
 *
 * @param fn - Fonction à exécuter
 * @param options - Options de retry
 * @returns Résultat de la fonction
 *
 * @example
 * const data = await retryWithBackoff(
 *   async () => fetch('/api/data'),
 *   { maxAttempts: 3, baseDelay: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Dernier essai, lancer l'erreur
      if (attempt === opts.maxAttempts) {
        throw error;
      }

      // Vérifier si on doit retry
      if (!opts.shouldRetry(error)) {
        throw error;
      }

      // Calculer le délai avec backoff exponentiel
      const delay = Math.min(
        opts.baseDelay * Math.pow(2, attempt - 1),
        opts.maxDelay,
      );

      console.log(
        `Retry attempt ${attempt}/${opts.maxAttempts} after ${delay}ms`,
        error,
      );

      // Attendre avant le prochain essai
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Fonction utilitaire pour attendre un certain délai
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Créer une fonction fetch avec timeout
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 10000,
): Promise<Response> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<Response>((_, reject) => {
    timeoutId = setTimeout(() => reject(DeezerAPIError.timeout()), timeout);
  });

  return Promise.race([
    fetch(url, options).finally(() => clearTimeout(timeoutId)),
    timeoutPromise,
  ]);
}
