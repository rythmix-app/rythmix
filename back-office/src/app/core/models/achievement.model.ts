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
  description?: string;
  type: string;
}

export interface UpdateAchievementDto {
  description?: string;
  type?: string;
}
