import { DeezerTrack } from "./deezer-api";

interface AudioCacheEntry {
  track: DeezerTrack;
  timestamp: number;
}

class AudioCache {
  private cache: Map<number, AudioCacheEntry> = new Map();
  private readonly MAX_ENTRIES = 20;
  private readonly PRELOAD_COUNT = 3;

  /**
   * Ajoute un track au cache
   */
  add(track: DeezerTrack): void {
    // Si le cache est plein, supprimer l'entrée la plus ancienne
    if (this.cache.size >= this.MAX_ENTRIES) {
      this.removeOldest();
    }

    this.cache.set(track.id, {
      track,
      timestamp: Date.now(),
    });
  }

  /**
   * Récupère un track du cache
   */
  get(trackId: number): DeezerTrack | null {
    const entry = this.cache.get(trackId);
    return entry ? entry.track : null;
  }

  /**
   * Vérifie si un track est dans le cache
   */
  has(trackId: number): boolean {
    return this.cache.has(trackId);
  }

  /**
   * Supprime l'entrée la plus ancienne du cache
   */
  private removeOldest(): void {
    let oldestKey: number | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey !== null) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Précharge les N prochains tracks
   * Cette fonction ne fait que marquer les tracks comme "à précharger"
   * Le vrai préchargement devrait être fait par le player audio
   */
  preloadNext(tracks: DeezerTrack[], currentIndex: number): DeezerTrack[] {
    const tracksToPreload: DeezerTrack[] = [];

    for (let i = 1; i <= this.PRELOAD_COUNT; i++) {
      const nextIndex = currentIndex + i;
      if (nextIndex < tracks.length) {
        const nextTrack = tracks[nextIndex];

        // Vérifier d'abord si le track existe dans le cache
        if (!this.has(nextTrack.id)) {
          tracksToPreload.push(nextTrack);
          // Ajouter au cache après vérification
          this.add(nextTrack);
        }
      }
    }

    return tracksToPreload;
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Récupère la taille actuelle du cache
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Supprime un track du cache
   */
  remove(trackId: number): void {
    this.cache.delete(trackId);
  }

  /**
   * Nettoie les entrées anciennes (plus de 1 heure)
   */
  cleanOld(): void {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 heure

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Récupère tous les tracks du cache
   */
  getAll(): DeezerTrack[] {
    return Array.from(this.cache.values()).map((entry) => entry.track);
  }

  /**
   * Récupère les statistiques du cache
   */
  getStats(): {
    size: number;
    maxSize: number;
    usage: number;
  } {
    const size = this.cache.size;
    return {
      size,
      maxSize: this.MAX_ENTRIES,
      usage: (size / this.MAX_ENTRIES) * 100,
    };
  }
}

export const audioCache = new AudioCache();
