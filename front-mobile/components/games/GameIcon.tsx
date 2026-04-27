import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { getGameImage } from "@/utils/games";

interface GameIconProps {
  gameName: string;
  size: number;
  fallbackColor: string;
}

export function GameIcon({ gameName, size, fallbackColor }: GameIconProps) {
  const image = getGameImage(gameName);

  if (image) {
    return (
      <Image
        source={image}
        style={{ width: size, height: size }}
        contentFit="contain"
      />
    );
  }

  return <MaterialIcons name="help" size={size} color={fallbackColor} />;
}
