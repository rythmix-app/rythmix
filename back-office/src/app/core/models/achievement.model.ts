export interface Achievement {
  id: number;
  name: string;
  description: string | null;
  type: string;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAchievementDto {
  name: string;
  description?: string;
  type: string;
}

export interface UpdateAchievementDto {
  name?: string;
  description?: string;
  type?: string;
}
