import { renderHook, waitFor, act } from "@testing-library/react-native";
import { useGenres } from "../useGenres";
import { deezerAPI, DeezerGenre } from "@/services/deezer-api";
import { useToast } from "@/components/Toast";

jest.mock("@/services/deezer-api");
jest.mock("@/components/Toast");

const mockDeezerAPI = deezerAPI as jest.Mocked<typeof deezerAPI>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

describe("useGenres", () => {
  const mockShow = jest.fn();

  const buildGenre = (id: number, name = `Genre ${id}`): DeezerGenre => ({
    id,
    name,
    picture: `pic-${id}`,
    picture_small: `pic-s-${id}`,
    picture_medium: `pic-m-${id}`,
    picture_big: `pic-b-${id}`,
    picture_xl: `pic-xl-${id}`,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({ show: mockShow });
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("loads and filters out the 'All' genre (id === 0)", async () => {
    mockDeezerAPI.getGenres.mockResolvedValue({
      data: [
        buildGenre(0, "All"),
        buildGenre(132, "Pop"),
        buildGenre(152, "Rock"),
      ],
    });

    const { result } = renderHook(() => useGenres());

    expect(result.current.loadingGenres).toBe(true);

    await waitFor(() => expect(result.current.loadingGenres).toBe(false));

    expect(result.current.genres).toHaveLength(2);
    expect(result.current.genres.map((g) => g.id)).toEqual([132, 152]);
    expect(mockShow).not.toHaveBeenCalled();
  });

  it("shows a toast error and keeps genres empty when the API fails", async () => {
    mockDeezerAPI.getGenres.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useGenres());

    await waitFor(() => expect(result.current.loadingGenres).toBe(false));

    expect(result.current.genres).toEqual([]);
    expect(mockShow).toHaveBeenCalledWith({
      type: "error",
      message: "Impossible de charger les genres musicaux",
    });
  });

  it("exposes reloadGenres to refetch on demand", async () => {
    mockDeezerAPI.getGenres.mockResolvedValueOnce({
      data: [buildGenre(132, "Pop")],
    });

    const { result } = renderHook(() => useGenres());
    await waitFor(() => expect(result.current.loadingGenres).toBe(false));
    expect(result.current.genres).toHaveLength(1);

    mockDeezerAPI.getGenres.mockResolvedValueOnce({
      data: [buildGenre(132, "Pop"), buildGenre(152, "Rock")],
    });

    await act(async () => {
      await result.current.reloadGenres();
    });

    expect(result.current.genres).toHaveLength(2);
    expect(mockDeezerAPI.getGenres).toHaveBeenCalledTimes(2);
  });
});
