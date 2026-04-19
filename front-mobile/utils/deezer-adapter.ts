import { DeezerTrack } from "@/services/deezer-api";
import { MusicCardData } from "@/components/swipe";

/**
 * Détermine une couleur pour la carte en fonction de l'index
 * On alterne entre les couleurs disponibles
 */
function getColorForCard(index: number): "darkGreen" | "cyan" | "lightBlue" {
  const colors: ("darkGreen" | "cyan" | "lightBlue")[] = [
    "darkGreen",
    "cyan",
    "lightBlue",
  ];
  return colors[index % colors.length];
}

/**
 * Convertit un DeezerTrack en MusicCardData
 */
export function deezerTrackToCardData(
  track: DeezerTrack,
  index: number = 0,
  genreName?: string,
  secondaryGenreName?: string,
): MusicCardData {
  return {
    id: track.id.toString(),
    coverImage:
      track.album.cover_xl ||
      track.album.cover_big ||
      track.album.cover_medium ||
      track.album.cover,
    title: track.title_short || track.title,
    artist: track.artist.name,
    album: track.album.title,
    tags: {
      primary: genreName || "MUSIQUE",
      secondary: secondaryGenreName || "DÉCOUVERTE",
    },
    color: getColorForCard(index),
  };
}

/**
 * Convertit un tableau de DeezerTrack en tableau de MusicCardData
 * @param tracks Liste des morceaux
 * @param genreMapping Optionnel: Mapping genreId -> Nom du genre
 * @param albumGenresMapping Optionnel: Mapping albumId -> Liste des noms de genres
 */
export function deezerTracksToCardData(
  tracks: DeezerTrack[],
  genreMapping?: Record<number, string>,
  albumGenresMapping?: Record<number, string[]>,
): MusicCardData[] {
  return tracks.map((track, index) => {
    const albumGenres = albumGenresMapping?.[track.album.id];
    const genreName =
      albumGenres?.[0] ||
      (genreMapping?.[track.album.id]
        ? genreMapping[track.album.id]
        : undefined);
    const secondaryGenreName = albumGenres?.[1];

    return deezerTrackToCardData(track, index, genreName, secondaryGenreName);
  });
}
