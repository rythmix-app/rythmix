import { ImageSourcePropType } from "react-native";

const GAME_IMAGES: Record<string, ImageSourcePropType> = {
  "blind test": require("@/assets/images/games/blindtest.png"),
  blindtest: require("@/assets/images/games/blindtest.png"),
  blurchette: require("@/assets/images/games/blurchette.png"),
  tracklist: require("@/assets/images/games/tracklist.png"),
  "plus ou moins": require("@/assets/images/games/plusoumoins.png"),
  "higher or lower": require("@/assets/images/games/plusoumoins.png"),
  parkeur: require("@/assets/images/games/parkeur.png"),
};

export function getGameImage(gameName: string): ImageSourcePropType | null {
  const normalizedName = gameName.toLowerCase().trim();
  return GAME_IMAGES[normalizedName] ?? null;
}
