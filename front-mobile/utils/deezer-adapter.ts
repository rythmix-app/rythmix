import { DeezerTrack } from "@/services/deezer-api";
import { MusicCardData } from "@/components/swipe";

/**
 * Mapping des genres vers des tags appropriés
 * Note: L'API Deezer ne retourne pas toujours les genres directement,
 * donc on utilise des tags génériques pour le moment
 */
const DEFAULT_TAGS = {
  primary: "MUSIQUE",
  secondary: "DÉCOUVERTE",
};

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
    tags: DEFAULT_TAGS,
    color: getColorForCard(index),
  };
}

/**
 * Convertit un tableau de DeezerTrack en tableau de MusicCardData
 */
export function deezerTracksToCardData(tracks: DeezerTrack[]): MusicCardData[] {
  return tracks.map((track, index) => deezerTrackToCardData(track, index));
}
