import { useCallback, useEffect, useRef, useState } from "react";
import { deezerAPI, DeezerGenre } from "@/services/deezer-api";
import { useToast } from "@/components/Toast";

export function useGenres() {
  const [genres, setGenres] = useState<DeezerGenre[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const { show } = useToast();
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadGenres = useCallback(async () => {
    if (isMountedRef.current) setLoadingGenres(true);
    try {
      const response = await deezerAPI.getGenres();
      if (isMountedRef.current) {
        setGenres(response.data.filter((g) => g.id !== 0));
      }
    } catch (error) {
      console.error("Failed to load genres:", error);
      if (isMountedRef.current) {
        show({
          type: "error",
          message: "Impossible de charger les genres musicaux",
        });
      }
    } finally {
      if (isMountedRef.current) setLoadingGenres(false);
    }
  }, [show]);

  useEffect(() => {
    void loadGenres();
  }, [loadGenres]);

  return { genres, loadingGenres, reloadGenres: loadGenres };
}
