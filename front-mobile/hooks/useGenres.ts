import { useCallback, useEffect, useState } from "react";
import { deezerAPI, DeezerGenre } from "@/services/deezer-api";
import { useToast } from "@/components/Toast";

export function useGenres() {
  const [genres, setGenres] = useState<DeezerGenre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const { show } = useToast();

  const loadGenres = useCallback(async () => {
    setLoadingGenres(true);
    try {
      const response = await deezerAPI.getGenres();
      setGenres(response.data.filter((g) => g.id !== 0));
    } catch (error) {
      console.error("Failed to load genres:", error);
      show({
        type: "error",
        message: "Impossible de charger les genres musicaux",
      });
    } finally {
      setLoadingGenres(false);
    }
  }, [show]);

  useEffect(() => {
    void loadGenres();
  }, [loadGenres]);

  return { genres, loadingGenres, reloadGenres: loadGenres };
}
