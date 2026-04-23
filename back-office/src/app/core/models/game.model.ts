export interface Game {
  id: number;
  name: string;
  description: string;
  isMultiplayer: boolean;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}
