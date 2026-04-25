export interface Game {
  id: number;
  name: string;
  description: string;
  isMultiplayer: boolean;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateGameDto {
  name?: string;
  description?: string;
  isEnabled?: boolean;
}
