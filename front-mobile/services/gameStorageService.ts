import AsyncStorage from "@react-native-async-storage/async-storage";

const GAME_SAVE_PREFIX = "game_save_";
const EXPIRATION_DAYS = 7;

export interface GameSave<T = any> {
  gameId: string;
  state: T;
  timestamp: number;
}

export const saveGameState = async <T>(
  gameId: string,
  state: T,
): Promise<void> => {
  try {
    const save: GameSave<T> = {
      gameId,
      state,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      `${GAME_SAVE_PREFIX}${gameId}`,
      JSON.stringify(save),
    );
  } catch (error) {
    console.error(`Error saving game state for ${gameId}:`, error);
  }
};

export const getGameState = async <T>(gameId: string): Promise<T | null> => {
  try {
    const saveJson = await AsyncStorage.getItem(`${GAME_SAVE_PREFIX}${gameId}`);
    if (!saveJson) return null;

    const save: GameSave<T> = JSON.parse(saveJson);

    const now = Date.now();
    const expirationMs = EXPIRATION_DAYS * 24 * 60 * 60 * 1000;
    if (now - save.timestamp > expirationMs) {
      await deleteGameState(gameId);
      return null;
    }

    return save.state;
  } catch (error) {
    console.error(`Error getting game state for ${gameId}:`, error);
    return null;
  }
};

export const deleteGameState = async (gameId: string): Promise<void> => {
  try {
    await AsyncStorage.removeItem(`${GAME_SAVE_PREFIX}${gameId}`);
  } catch (error) {
    console.error(`Error deleting game state for ${gameId}:`, error);
  }
};

export const hasGameState = async (gameId: string): Promise<boolean> => {
  const state = await getGameState(gameId);
  return state !== null;
};
