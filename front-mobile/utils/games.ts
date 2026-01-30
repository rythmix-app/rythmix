import { MaterialIcons } from "@expo/vector-icons";

export type GameIconName = keyof typeof MaterialIcons.glyphMap;

interface GameIconConfig {
  name: GameIconName;
  color?: string;
}

/**
 * Returns the icon configuration for a given game
 * @param gameName - The name of the game (case-insensitive)
 * @returns Icon configuration with name and optional color
 */
export function getGameIcon(gameName: string): GameIconConfig {
  const normalizedName = gameName.toLowerCase().trim();

  const gameIcons: Record<string, GameIconConfig> = {
    blurchette: { name: "blur-on" },
    tracklist: { name: "queue-music" },
    // Add more games here as needed
  };

  return gameIcons[normalizedName] || { name: "help" };
}
