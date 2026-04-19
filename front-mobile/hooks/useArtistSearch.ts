import { useCallback, useEffect, useRef, useState } from "react";
import { deezerAPI, DeezerArtist } from "@/services/deezer-api";
import { useToast } from "@/components/Toast";

const SEARCH_DEBOUNCE_MS = 400;
const MIN_QUERY_LENGTH = 3;
const TOP_ARTISTS_LIMIT = 20;
const SEARCH_RESULTS_LIMIT = 20;

export function useArtistSearch(query: string) {
  const [topArtists, setTopArtists] = useState<DeezerArtist[]>([]);
  const [searchResults, setSearchResults] = useState<DeezerArtist[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);

  const { show } = useToast();
  const isMountedRef = useRef(true);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchRequestIdRef = useRef(0);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchTopArtists = useCallback(async () => {
    if (isMountedRef.current) setIsInitialLoading(true);
    try {
      const response = await deezerAPI.getTopArtists(TOP_ARTISTS_LIMIT);
      if (isMountedRef.current) setTopArtists(response.data);
    } catch (error) {
      console.error("Failed to fetch top artists:", error);
      if (isMountedRef.current) {
        show({
          type: "error",
          message: "Impossible de charger les suggestions d'artistes",
        });
      }
    } finally {
      if (isMountedRef.current) setIsInitialLoading(false);
    }
  }, [show]);

  useEffect(() => {
    void fetchTopArtists();
  }, [fetchTopArtists]);

  const performSearch = useCallback(
    async (q: string) => {
      const requestId = ++latestSearchRequestIdRef.current;
      if (isMountedRef.current) setIsSearching(true);
      try {
        const response = await deezerAPI.searchArtists(q, SEARCH_RESULTS_LIMIT);
        if (!isMountedRef.current) return;
        if (requestId !== latestSearchRequestIdRef.current) return;
        setSearchResults(response.data);
      } catch (error) {
        if (!isMountedRef.current) return;
        if (requestId !== latestSearchRequestIdRef.current) return;
        console.error("Search failed:", error);
        show({ type: "error", message: "Échec de la recherche d'artistes" });
      } finally {
        if (
          isMountedRef.current &&
          requestId === latestSearchRequestIdRef.current
        ) {
          setIsSearching(false);
        }
      }
    },
    [show],
  );

  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;

  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (hasQuery) {
      searchTimeoutRef.current = setTimeout(() => {
        void performSearch(query);
      }, SEARCH_DEBOUNCE_MS);
    } else {
      latestSearchRequestIdRef.current += 1;
      setSearchResults([]);
      setIsSearching(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, hasQuery, performSearch]);

  return { topArtists, searchResults, isSearching, isInitialLoading, hasQuery };
}
