import AsyncStorage from "@react-native-async-storage/async-storage";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // en millisecondes
}

interface CacheStats {
  size: number;
  entries: number;
}

// TTL par défaut pour différents types de données
export const DEFAULT_TTL = {
  TRACKS: 60 * 60 * 1000, // 1 heure
  GENRES: 24 * 60 * 60 * 1000, // 24 heures
  PLAYLISTS: 6 * 60 * 60 * 1000, // 6 heures
  SEARCH: 30 * 60 * 1000, // 30 minutes
} as const;

class CacheManager {
  private readonly CACHE_PREFIX = "@rythmix_cache:";
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50 MB
  private readonly STATS_KEY = "@rythmix_cache_stats";

  /**
   * Génère une clé de cache avec le préfixe
   */
  private getCacheKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  /**
   * Récupère une entrée du cache
   * Retourne null si l'entrée n'existe pas ou a expiré
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key);
      const entryString = await AsyncStorage.getItem(cacheKey);

      if (!entryString) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(entryString);
      const now = Date.now();
      const isExpired = now - entry.timestamp > entry.ttl;

      if (isExpired) {
        // Supprimer l'entrée expirée
        await this.remove(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error("Error getting cache entry:", error);
      return null;
    }
  }

  /**
   * Stocke une entrée dans le cache avec un TTL
   */
  async set<T>(key: string, data: T, ttl: number): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      const entryString = JSON.stringify(entry);
      const entrySize = new Blob([entryString]).size;

      // Vérifier la taille du cache avant d'ajouter
      const stats = await this.getStats();
      if (stats.size + entrySize > this.MAX_CACHE_SIZE) {
        // Nettoyer les anciennes entrées
        await this.cleanOldEntries();
      }

      await AsyncStorage.setItem(cacheKey, entryString);
      await this.updateStats(entrySize, 1);
    } catch (error) {
      console.error("Error setting cache entry:", error);
    }
  }

  /**
   * Supprime une entrée du cache
   */
  async remove(key: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      const entryString = await AsyncStorage.getItem(cacheKey);

      if (entryString) {
        const entrySize = new Blob([entryString]).size;
        await AsyncStorage.removeItem(cacheKey);
        await this.updateStats(-entrySize, -1);
      }
    } catch (error) {
      console.error("Error removing cache entry:", error);
    }
  }

  /**
   * Vide tout le cache
   */
  async clear(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) =>
        key.startsWith(this.CACHE_PREFIX),
      );

      await AsyncStorage.multiRemove(cacheKeys);
      await AsyncStorage.setItem(
        this.STATS_KEY,
        JSON.stringify({ size: 0, entries: 0 }),
      );
    } catch (error) {
      console.error("Error clearing cache:", error);
    }
  }

  /**
   * Nettoie les entrées expirées
   */
  async cleanExpired(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) =>
        key.startsWith(this.CACHE_PREFIX),
      );

      const now = Date.now();

      for (const cacheKey of cacheKeys) {
        const entryString = await AsyncStorage.getItem(cacheKey);
        if (!entryString) continue;

        try {
          const entry: CacheEntry<any> = JSON.parse(entryString);
          const isExpired = now - entry.timestamp > entry.ttl;

          if (isExpired) {
            const key = cacheKey.replace(this.CACHE_PREFIX, "");
            await this.remove(key);
          }
        } catch {
          // Entrée corrompue, la supprimer
          await AsyncStorage.removeItem(cacheKey);
        }
      }
    } catch (error) {
      console.error("Error cleaning expired entries:", error);
    }
  }

  /**
   * Nettoie les anciennes entrées pour libérer de l'espace
   * Supprime les 20% les plus anciennes
   */
  private async cleanOldEntries(): Promise<void> {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter((key) =>
        key.startsWith(this.CACHE_PREFIX),
      );

      // Récupérer toutes les entrées avec leur timestamp
      const entries: { key: string; timestamp: number }[] = [];

      for (const cacheKey of cacheKeys) {
        const entryString = await AsyncStorage.getItem(cacheKey);
        if (!entryString) continue;

        try {
          const entry: CacheEntry<any> = JSON.parse(entryString);
          entries.push({
            key: cacheKey.replace(this.CACHE_PREFIX, ""),
            timestamp: entry.timestamp,
          });
        } catch {
          // Ignorer les entrées corrompues
        }
      }

      // Trier par timestamp (les plus anciennes en premier)
      entries.sort((a, b) => a.timestamp - b.timestamp);

      // Supprimer les 20% les plus anciennes
      const entriesToRemove = Math.ceil(entries.length * 0.2);
      for (let i = 0; i < entriesToRemove; i++) {
        await this.remove(entries[i].key);
      }
    } catch (error) {
      console.error("Error cleaning old entries:", error);
    }
  }

  /**
   * Récupère les statistiques du cache
   */
  async getStats(): Promise<CacheStats> {
    try {
      const statsString = await AsyncStorage.getItem(this.STATS_KEY);
      if (!statsString) {
        return { size: 0, entries: 0 };
      }
      return JSON.parse(statsString);
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return { size: 0, entries: 0 };
    }
  }

  /**
   * Met à jour les statistiques du cache
   */
  private async updateStats(
    sizeDelta: number,
    entriesDelta: number,
  ): Promise<void> {
    try {
      const stats = await this.getStats();
      const newStats = {
        size: Math.max(0, stats.size + sizeDelta),
        entries: Math.max(0, stats.entries + entriesDelta),
      };
      await AsyncStorage.setItem(this.STATS_KEY, JSON.stringify(newStats));
    } catch (error) {
      console.error("Error updating cache stats:", error);
    }
  }

  /**
   * Vérifie si une clé existe dans le cache et n'est pas expirée
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Récupère ou stocke une valeur (get or set)
   * Si la valeur est dans le cache et valide, la retourne
   * Sinon, exécute fetchFn, stocke le résultat et le retourne
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl: number,
  ): Promise<T> {
    // Essayer de récupérer depuis le cache
    const cachedData = await this.get<T>(key);
    if (cachedData !== null) {
      return cachedData;
    }

    // Si pas en cache, exécuter fetchFn
    const freshData = await fetchFn();

    // Stocker le résultat
    await this.set(key, freshData, ttl);

    return freshData;
  }
}

export const cacheManager = new CacheManager();
