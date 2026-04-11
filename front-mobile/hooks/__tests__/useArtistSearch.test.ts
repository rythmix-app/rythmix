import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useArtistSearch } from "../useArtistSearch";
import { deezerAPI, DeezerArtist } from "@/services/deezer-api";
import { useToast } from "@/components/Toast";

jest.mock("@/services/deezer-api");
jest.mock("@/components/Toast");

const mockDeezerAPI = deezerAPI as jest.Mocked<typeof deezerAPI>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

const buildArtist = (id: number, name = `Artist ${id}`): DeezerArtist =>
  ({
    id,
    name,
    link: "",
    picture: "",
    picture_small: "",
    picture_medium: `pic-m-${id}`,
    picture_big: "",
    picture_xl: "",
    nb_album: 0,
    nb_fan: 0,
    type: "artist",
  }) as DeezerArtist;

describe("useArtistSearch", () => {
  const mockShow = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUseToast.mockReturnValue({ show: mockShow });
    jest.spyOn(console, "error").mockImplementation(() => {});
    mockDeezerAPI.getTopArtists.mockResolvedValue({
      data: [buildArtist(1), buildArtist(2)],
    });
    mockDeezerAPI.searchArtists.mockResolvedValue({
      data: [buildArtist(99, "Daft Punk")],
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("loads top artists on mount", async () => {
    const { result } = renderHook(() => useArtistSearch(""));

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    expect(mockDeezerAPI.getTopArtists).toHaveBeenCalledWith(20);
    expect(result.current.topArtists).toHaveLength(2);
    expect(result.current.searchResults).toEqual([]);
  });

  it("shows a toast error when top artists fetch fails", async () => {
    mockDeezerAPI.getTopArtists.mockRejectedValueOnce(new Error("down"));

    const { result } = renderHook(() => useArtistSearch(""));

    await waitFor(() => {
      expect(result.current.isInitialLoading).toBe(false);
    });

    expect(result.current.topArtists).toEqual([]);
    expect(mockShow).toHaveBeenCalledWith({
      type: "error",
      message: "Impossible de charger les suggestions d'artistes",
    });
  });

  it("does not search when query is shorter than 3 characters", async () => {
    const { rerender } = renderHook<
      ReturnType<typeof useArtistSearch>,
      { q: string }
    >(({ q }) => useArtistSearch(q), {
      initialProps: { q: "" },
    });

    await waitFor(() => {
      expect(mockDeezerAPI.getTopArtists).toHaveBeenCalled();
    });

    rerender({ q: "ab" });

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(mockDeezerAPI.searchArtists).not.toHaveBeenCalled();
  });

  it("debounces the search by 400ms and returns results", async () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useArtistSearch>,
      { q: string }
    >(({ q }) => useArtistSearch(q), {
      initialProps: { q: "" },
    });

    await waitFor(() => {
      expect(mockDeezerAPI.getTopArtists).toHaveBeenCalled();
    });

    rerender({ q: "daf" });

    await act(async () => {
      jest.advanceTimersByTime(399);
    });
    expect(mockDeezerAPI.searchArtists).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(mockDeezerAPI.searchArtists).toHaveBeenCalledWith("daf", 20);
    });

    await waitFor(() => {
      expect(result.current.searchResults).toHaveLength(1);
    });
    expect(result.current.searchResults[0].name).toBe("Daft Punk");
  });

  it("resets search results when query drops below 3 characters", async () => {
    const { result, rerender } = renderHook<
      ReturnType<typeof useArtistSearch>,
      { q: string }
    >(({ q }) => useArtistSearch(q), {
      initialProps: { q: "daft" },
    });

    await waitFor(() => {
      expect(mockDeezerAPI.getTopArtists).toHaveBeenCalled();
    });

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(result.current.searchResults).toHaveLength(1);
    });

    rerender({ q: "da" });

    await waitFor(() => {
      expect(result.current.searchResults).toEqual([]);
    });
  });

  it("shows a toast error when search fails", async () => {
    mockDeezerAPI.searchArtists.mockRejectedValueOnce(new Error("search down"));

    const { rerender } = renderHook<
      ReturnType<typeof useArtistSearch>,
      { q: string }
    >(({ q }) => useArtistSearch(q), {
      initialProps: { q: "" },
    });

    await waitFor(() => {
      expect(mockDeezerAPI.getTopArtists).toHaveBeenCalled();
    });

    rerender({ q: "daft" });

    await act(async () => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(mockShow).toHaveBeenCalledWith({
        type: "error",
        message: "Échec de la recherche d'artistes",
      });
    });
  });
});
