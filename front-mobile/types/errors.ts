export type DeezerAPIErrorType = "NETWORK" | "NOT_FOUND" | "QUOTA" | "TIMEOUT";

export class DeezerAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public type?: DeezerAPIErrorType,
  ) {
    super(message);
    this.name = "DeezerAPIError";

    // Maintenir la stack trace correcte pour les navigateurs modernes
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DeezerAPIError);
    }
  }

  /**
   * Crée une erreur de timeout
   */
  static timeout(message: string = "Request timeout"): DeezerAPIError {
    return new DeezerAPIError(message, undefined, "TIMEOUT");
  }

  /**
   * Crée une erreur de quota dépassé
   */
  static quota(message: string = "API quota exceeded"): DeezerAPIError {
    return new DeezerAPIError(message, 429, "QUOTA");
  }

  /**
   * Crée une erreur de ressource non trouvée
   */
  static notFound(message: string = "Resource not found"): DeezerAPIError {
    return new DeezerAPIError(message, 404, "NOT_FOUND");
  }

  /**
   * Crée une erreur réseau
   */
  static network(message: string = "Network error"): DeezerAPIError {
    return new DeezerAPIError(message, undefined, "NETWORK");
  }

  /**
   * Crée une erreur depuis une réponse HTTP
   */
  static fromResponse(status: number, message?: string): DeezerAPIError {
    let type: DeezerAPIErrorType | undefined;
    let errorMessage = message || `HTTP error: ${status}`;

    switch (status) {
      case 404:
        type = "NOT_FOUND";
        errorMessage = message || "Resource not found";
        break;
      case 429:
        type = "QUOTA";
        errorMessage = message || "Too many requests. Please try again later.";
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        type = "NETWORK";
        errorMessage = message || "Server error. Please try again later.";
        break;
      default:
        errorMessage = message || `HTTP error: ${status}`;
    }

    return new DeezerAPIError(errorMessage, status, type);
  }

  /**
   * Vérifie si l'erreur peut être retentée
   */
  isRetryable(): boolean {
    return (
      this.type === "NETWORK" ||
      this.type === "TIMEOUT" ||
      this.statusCode === 503
    );
  }

  /**
   * Message user-friendly
   */
  getUserMessage(): string {
    switch (this.type) {
      case "NETWORK":
        return "Problème de connexion. Vérifiez votre connexion internet.";
      case "NOT_FOUND":
        return "Ressource introuvable.";
      case "QUOTA":
        return "Trop de requêtes. Veuillez réessayer dans quelques instants.";
      case "TIMEOUT":
        return "La requête a pris trop de temps. Veuillez réessayer.";
      default:
        return "Une erreur est survenue. Veuillez réessayer.";
    }
  }
}

export type AudioPlayerErrorType = "LOAD_FAILED" | "PLAYBACK_ERROR" | "NETWORK";

export class AudioPlayerError extends Error {
  constructor(
    message: string,
    public type: AudioPlayerErrorType,
  ) {
    super(message);
    this.name = "AudioPlayerError";

    // Maintenir la stack trace correcte pour les navigateurs modernes
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AudioPlayerError);
    }
  }

  /**
   * Crée une erreur de chargement
   */
  static loadFailed(
    message: string = "Failed to load audio",
  ): AudioPlayerError {
    return new AudioPlayerError(message, "LOAD_FAILED");
  }

  /**
   * Crée une erreur de lecture
   */
  static playbackError(message: string = "Playback error"): AudioPlayerError {
    return new AudioPlayerError(message, "PLAYBACK_ERROR");
  }

  /**
   * Crée une erreur réseau
   */
  static network(
    message: string = "Network error while loading audio",
  ): AudioPlayerError {
    return new AudioPlayerError(message, "NETWORK");
  }

  /**
   * Message user-friendly
   */
  getUserMessage(): string {
    switch (this.type) {
      case "LOAD_FAILED":
        return "Impossible de charger l'extrait audio.";
      case "PLAYBACK_ERROR":
        return "Erreur pendant la lecture.";
      case "NETWORK":
        return "Problème de connexion lors du chargement de l'audio.";
      default:
        return "Une erreur est survenue avec le lecteur audio.";
    }
  }
}
