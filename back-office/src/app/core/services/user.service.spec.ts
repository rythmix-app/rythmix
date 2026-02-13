import { TestBed } from '@angular/core/testing';
import { UserService } from './user.service';
import { ApiService } from './api.service';
import { of, throwError } from 'rxjs';
import {
  User,
  CreateUserDto,
  UpdateUserDto,
  UserFilters,
} from '../models/user.model';

describe('UserService', () => {
  let service: UserService;
  let apiService: jasmine.SpyObj<ApiService>;

  const mockUser: User = {
    id: '1',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: 'user',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
  };

  const mockUsers: User[] = [
    mockUser,
    {
      id: '2',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      role: 'admin',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      deletedAt: null,
    },
  ];

  beforeEach(() => {
    const apiSpy = jasmine.createSpyObj('ApiService', [
      'get',
      'post',
      'patch',
      'delete',
    ]);

    TestBed.configureTestingModule({
      providers: [UserService, { provide: ApiService, useValue: apiSpy }],
    });

    service = TestBed.inject(UserService);
    apiService = TestBed.inject(ApiService) as jasmine.SpyObj<ApiService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getUsers', () => {
    it('should fetch users without filters', (done) => {
      apiService.get.and.returnValue(of({ users: mockUsers }));

      service.getUsers().subscribe({
        next: (users) => {
          expect(users).toEqual(mockUsers);
          expect(apiService.get).toHaveBeenCalledWith('/users', undefined);
          done();
        },
      });
    });

    it('should fetch users with search filter', (done) => {
      const filters: UserFilters = { search: 'test' };
      apiService.get.and.returnValue(of({ users: [mockUser] }));

      service.getUsers(filters).subscribe({
        next: (users) => {
          expect(users).toEqual([mockUser]);
          expect(apiService.get).toHaveBeenCalledWith('/users', filters);
          done();
        },
      });
    });

    it('should fetch users with role filter', (done) => {
      const filters: UserFilters = { role: 'admin' };
      const adminUser = mockUsers.find((u) => u.role === 'admin')!;
      apiService.get.and.returnValue(of({ users: [adminUser] }));

      service.getUsers(filters).subscribe({
        next: (users) => {
          expect(users).toEqual([adminUser]);
          expect(apiService.get).toHaveBeenCalledWith('/users', filters);
          done();
        },
      });
    });

    it('should fetch users with includeDeleted filter', (done) => {
      const filters: UserFilters = { includeDeleted: true };
      apiService.get.and.returnValue(of({ users: mockUsers }));

      service.getUsers(filters).subscribe({
        next: (users) => {
          expect(users).toEqual(mockUsers);
          expect(apiService.get).toHaveBeenCalledWith('/users', filters);
          done();
        },
      });
    });

    it('should handle errors when fetching users', (done) => {
      const error = new Error('Network error');
      apiService.get.and.returnValue(throwError(() => error));

      service.getUsers().subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('getUserById', () => {
    it('should fetch a user by id', (done) => {
      apiService.get.and.returnValue(of({ user: mockUser }));

      service.getUserById('1').subscribe({
        next: (user) => {
          expect(user).toEqual(mockUser);
          expect(apiService.get).toHaveBeenCalledWith('/users/1');
          done();
        },
      });
    });

    it('should handle errors when fetching user by id', (done) => {
      const error = new Error('User not found');
      apiService.get.and.returnValue(throwError(() => error));

      service.getUserById('999').subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('createUser', () => {
    it('should create a new user', (done) => {
      const createDto: CreateUserDto = {
        username: 'newuser',
        firstName: 'New',
        lastName: 'User',
        email: 'new@example.com',
        password: 'password123',
        role: 'user',
      };
      const createdUser: User = { ...mockUser, ...createDto, id: '3' };
      apiService.post.and.returnValue(of({ user: createdUser }));

      service.createUser(createDto).subscribe({
        next: (user) => {
          expect(user).toEqual(createdUser);
          expect(apiService.post).toHaveBeenCalledWith('/users', createDto);
          done();
        },
      });
    });

    it('should create user with minimal data', (done) => {
      const createDto: CreateUserDto = {
        username: 'minimal',
        email: 'minimal@example.com',
        password: 'password123',
      };
      const createdUser: User = {
        id: '4',
        username: 'minimal',
        email: 'minimal@example.com',
        role: 'user',
        createdAt: new Date(),
        updatedAt: null,
        deletedAt: null,
      };
      apiService.post.and.returnValue(of({ user: createdUser }));

      service.createUser(createDto).subscribe({
        next: (user) => {
          expect(user).toEqual(createdUser);
          expect(apiService.post).toHaveBeenCalledWith('/users', createDto);
          done();
        },
      });
    });

    it('should handle errors when creating user', (done) => {
      const createDto: CreateUserDto = {
        username: 'duplicate',
        email: 'duplicate@example.com',
        password: 'password123',
      };
      const error = new Error('Email already exists');
      apiService.post.and.returnValue(throwError(() => error));

      service.createUser(createDto).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('updateUser', () => {
    it('should update a user', (done) => {
      const updateDto: UpdateUserDto = {
        username: 'updated',
        firstName: 'Updated',
        lastName: 'Name',
      };
      const updatedUser: User = { ...mockUser, ...updateDto };
      apiService.patch.and.returnValue(of({ user: updatedUser }));

      service.updateUser('1', updateDto).subscribe({
        next: (user) => {
          expect(user).toEqual(updatedUser);
          expect(apiService.patch).toHaveBeenCalledWith('/users/1', updateDto);
          done();
        },
      });
    });

    it('should update only role', (done) => {
      const updateDto: UpdateUserDto = { role: 'admin' };
      const updatedUser: User = { ...mockUser, role: 'admin' };
      apiService.patch.and.returnValue(of({ user: updatedUser }));

      service.updateUser('1', updateDto).subscribe({
        next: (user) => {
          expect(user.role).toBe('admin');
          expect(apiService.patch).toHaveBeenCalledWith('/users/1', updateDto);
          done();
        },
      });
    });

    it('should handle errors when updating user', (done) => {
      const updateDto: UpdateUserDto = { username: 'taken' };
      const error = new Error('Username already taken');
      apiService.patch.and.returnValue(throwError(() => error));

      service.updateUser('1', updateDto).subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('deleteUser', () => {
    it('should soft delete a user', (done) => {
      apiService.delete.and.returnValue(of(undefined));

      service.deleteUser('1').subscribe({
        next: () => {
          expect(apiService.delete).toHaveBeenCalledWith('/users/1');
          done();
        },
      });
    });

    it('should handle errors when deleting user', (done) => {
      const error = new Error('Cannot delete user');
      apiService.delete.and.returnValue(throwError(() => error));

      service.deleteUser('1').subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('restoreUser', () => {
    it('should restore a deleted user', (done) => {
      const restoredUser: User = { ...mockUser, deletedAt: null };
      apiService.post.and.returnValue(of({ user: restoredUser }));

      service.restoreUser('1').subscribe({
        next: (user) => {
          expect(user).toEqual(restoredUser);
          expect(user.deletedAt).toBeNull();
          expect(apiService.post).toHaveBeenCalledWith('/users/1/restore', {});
          done();
        },
      });
    });

    it('should handle errors when restoring user', (done) => {
      const error = new Error('User not found');
      apiService.post.and.returnValue(throwError(() => error));

      service.restoreUser('999').subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('permanentDeleteUser', () => {
    it('should permanently delete a user', (done) => {
      apiService.delete.and.returnValue(of(undefined));

      service.permanentDeleteUser('1').subscribe({
        next: () => {
          expect(apiService.delete).toHaveBeenCalledWith('/users/1/permanent');
          done();
        },
      });
    });

    it('should handle errors when permanently deleting user', (done) => {
      const error = new Error('Cannot permanently delete user');
      apiService.delete.and.returnValue(throwError(() => error));

      service.permanentDeleteUser('1').subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });

  describe('getTrashedUsers', () => {
    it('should fetch trashed users', (done) => {
      const trashedUser: User = { ...mockUser, deletedAt: new Date() };
      apiService.get.and.returnValue(of({ users: [trashedUser] }));

      service.getTrashedUsers().subscribe({
        next: (users) => {
          expect(users).toEqual([trashedUser]);
          expect(apiService.get).toHaveBeenCalledWith('/users/trashed');
          done();
        },
      });
    });

    it('should return empty array when no trashed users', (done) => {
      apiService.get.and.returnValue(of({ users: [] }));

      service.getTrashedUsers().subscribe({
        next: (users) => {
          expect(users).toEqual([]);
          expect(apiService.get).toHaveBeenCalledWith('/users/trashed');
          done();
        },
      });
    });

    it('should handle errors when fetching trashed users', (done) => {
      const error = new Error('Network error');
      apiService.get.and.returnValue(throwError(() => error));

      service.getTrashedUsers().subscribe({
        error: (err) => {
          expect(err).toBe(error);
          done();
        },
      });
    });
  });
});
