export interface User {
  id: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  email: string;
  password?: string;
  role?: 'user' | 'admin';
  createdAt: Date;
  updatedAt?: Date | null;
  deletedAt?: Date | null;
  status: 'active' |'inactive' | 'deleted'
}

export interface CreateUserDto {
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password: string;
  role?: 'user' | 'admin';
}

export interface UpdateUserDto {
  username?: string;
  firstName?: string;
  lastName?: string;
  role?: 'user' | 'admin';
}

export interface UserFilters {
  search?: string;
  role?: 'user' | 'admin';
  includeDeleted?: boolean;
}
