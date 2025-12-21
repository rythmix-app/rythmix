import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UsersList } from './users-list';
import { UserService } from '../../../../core/services/user.service';
import { User } from '../../../../core/models/user.model';

describe('UsersList', () => {
  let component: UsersList;
  let fixture: ComponentFixture<UsersList>;
  let userService: jasmine.SpyObj<UserService>;
  let router: jasmine.SpyObj<Router>;

  const mockUsers: User[] = [
    {
      id: '1',
      username: 'user1',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'user',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      deletedAt: null
    },
    {
      id: '2',
      username: 'admin',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      role: 'admin',
      createdAt: new Date('2024-01-02'),
      updatedAt: new Date('2024-01-02'),
      deletedAt: null
    },
    {
      id: '3',
      username: 'deleted',
      firstName: 'Bob',
      lastName: 'Johnson',
      email: 'bob@example.com',
      role: 'user',
      createdAt: new Date('2024-01-03'),
      updatedAt: new Date('2024-01-03'),
      deletedAt: new Date('2024-02-01')
    }
  ];

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', [
      'getUsers',
      'deleteUser',
      'restoreUser'
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      declarations: [UsersList],
      providers: [
        { provide: UserService, useValue: userServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsersList);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should load users on init', () => {
      userService.getUsers.and.returnValue(of(mockUsers));
      component.ngOnInit();
      expect(userService.getUsers).toHaveBeenCalled();
      expect(component.allUsers).toEqual(mockUsers);
      expect(component.filteredUsers).toEqual(mockUsers);
    });

    it('should handle error when loading users', () => {
      spyOn(component as never, 'showSnackbar');
      const error = new Error('Load error');
      userService.getUsers.and.returnValue(throwError(() => error));

      component.ngOnInit();

      expect(component['showSnackbar']).toHaveBeenCalledWith('Erreur lors du chargement des utilisateurs', 'error');
      expect(component.isLoading).toBe(false);
    });
  });

  describe('loadUsers', () => {
    it('should load users with filters', () => {
      userService.getUsers.and.returnValue(of(mockUsers));
      component.filters = { includeDeleted: true };

      component.loadUsers();

      expect(userService.getUsers).toHaveBeenCalledWith({ includeDeleted: true });
      expect(component.allUsers.length).toBe(3);
    });

    it('should reset pagination after loading', () => {
      userService.getUsers.and.returnValue(of(mockUsers));
      component.currentPage = 5;

      component.loadUsers();

      expect(component.currentPage).toBe(0);
    });
  });

  describe('applyFilter', () => {
    beforeEach(() => {
      component.allUsers = mockUsers;
      component.filteredUsers = mockUsers;
    });

    it('should filter users by username', () => {
      const event = { target: { value: 'admin' } } as Event;
      component.applyFilter(event);

      expect(component.filteredUsers.length).toBe(1);
      expect(component.filteredUsers[0].username).toBe('admin');
    });

    it('should filter users by email', () => {
      const event = { target: { value: 'john@' } } as Event;
      component.applyFilter(event);

      expect(component.filteredUsers.length).toBe(1);
      expect(component.filteredUsers[0].email).toBe('john@example.com');
    });

    it('should reset filter when search is empty', () => {
      component.filteredUsers = [mockUsers[0]];
      const event = { target: { value: '' } } as Event;

      component.applyFilter(event);

      expect(component.filteredUsers.length).toBe(3);
    });

    it('should be case insensitive', () => {
      const event = { target: { value: 'ADMIN' } } as Event;
      component.applyFilter(event);

      expect(component.filteredUsers.length).toBe(1);
      expect(component.filteredUsers[0].username).toBe('admin');
    });

    it('should reset page to 0 when filtering', () => {
      component.currentPage = 2;
      const event = { target: { value: 'test' } } as Event;

      component.applyFilter(event);

      expect(component.currentPage).toBe(0);
    });
  });

  describe('sortBy', () => {
    beforeEach(() => {
      component.filteredUsers = [...mockUsers];
    });

    it('should sort by username ascending', () => {
      component.sortBy('username');

      expect(component.sortColumn).toBe('username');
      expect(component.sortDirection).toBe('asc');
      expect(component.filteredUsers[0].username).toBe('admin');
    });

    it('should toggle sort direction when sorting same column', () => {
      component.sortBy('username');
      component.sortBy('username');

      expect(component.sortDirection).toBe('desc');
      expect(component.filteredUsers[0].username).toBe('user1');
    });

    it('should sort by createdAt', () => {
      component.sortBy('createdAt');

      expect(component.filteredUsers[0].id).toBe('1');
      expect(component.filteredUsers[2].id).toBe('3');
    });

    it('should handle null values', () => {
      component.filteredUsers = [
        { ...mockUsers[0], firstName: null },
        mockUsers[1]
      ];

      component.sortBy('firstName');

      expect(component.filteredUsers[0].firstName).toBe('Jane');
    });
  });

  describe('getSortIcon', () => {
    it('should return default icon for unsorted column', () => {
      expect(component.getSortIcon('username')).toBe('⇅');
    });

    it('should return ascending icon', () => {
      component.sortColumn = 'username';
      component.sortDirection = 'asc';

      expect(component.getSortIcon('username')).toBe('▲');
    });

    it('should return descending icon', () => {
      component.sortColumn = 'username';
      component.sortDirection = 'desc';

      expect(component.getSortIcon('username')).toBe('▼');
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      component.filteredUsers = mockUsers;
      component.pageSize = 2;
      component.updatePagination();
    });

    it('should update pagination correctly', () => {
      expect(component.totalPages).toBe(2);
      expect(component.paginatedUsers.length).toBe(2);
    });

    it('should navigate to next page', () => {
      component.nextPage();

      expect(component.currentPage).toBe(1);
      expect(component.paginatedUsers[0].id).toBe('3');
    });

    it('should not go beyond last page', () => {
      component.currentPage = 1;
      component.nextPage();

      expect(component.currentPage).toBe(1);
    });

    it('should navigate to previous page', () => {
      component.currentPage = 1;
      component.previousPage();

      expect(component.currentPage).toBe(0);
    });

    it('should not go before first page', () => {
      component.currentPage = 0;
      component.previousPage();

      expect(component.currentPage).toBe(0);
    });

    it('should go to first page', () => {
      component.currentPage = 1;
      component.goToFirstPage();

      expect(component.currentPage).toBe(0);
    });

    it('should go to last page', () => {
      component.currentPage = 0;
      component.goToLastPage();

      expect(component.currentPage).toBe(1);
    });

    it('should reset to first page when page size changes', () => {
      component.currentPage = 1;
      component.pageSize = 5;
      component.onPageSizeChange();

      expect(component.currentPage).toBe(0);
    });

    it('should adjust current page if it exceeds total pages', () => {
      component.currentPage = 5;
      component.filteredUsers = [mockUsers[0]];
      component.updatePagination();

      expect(component.currentPage).toBe(0);
    });
  });

  describe('getPaginationInfo', () => {
    it('should return correct info for first page', () => {
      component.filteredUsers = mockUsers;
      component.pageSize = 2;
      component.currentPage = 0;

      expect(component.getPaginationInfo()).toBe('1 - 2 sur 3');
    });

    it('should return correct info for last page', () => {
      component.filteredUsers = mockUsers;
      component.pageSize = 2;
      component.currentPage = 1;

      expect(component.getPaginationInfo()).toBe('3 - 3 sur 3');
    });

    it('should return "0 sur 0" for empty list', () => {
      component.filteredUsers = [];

      expect(component.getPaginationInfo()).toBe('0 sur 0');
    });
  });

  describe('navigation', () => {
    it('should navigate to view user', () => {
      component.viewUser(mockUsers[0]);

      expect(router.navigate).toHaveBeenCalledWith(['/users', '1']);
    });

    it('should navigate to edit user', () => {
      component.editUser(mockUsers[0]);

      expect(router.navigate).toHaveBeenCalledWith(['/users', '1', 'edit']);
    });

    it('should navigate to create user', () => {
      component.createUser();

      expect(router.navigate).toHaveBeenCalledWith(['/users/new']);
    });
  });

  describe('deleteUser', () => {
    it('should delete user when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(component as never, 'showSnackbar');
      userService.deleteUser.and.returnValue(of(undefined));
      userService.getUsers.and.returnValue(of(mockUsers));

      component.deleteUser(mockUsers[0]);

      expect(userService.deleteUser).toHaveBeenCalledWith('1');
      expect(component['showSnackbar']).toHaveBeenCalledWith('Utilisateur supprimé avec succès', 'success');
    });

    it('should not delete user when cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.deleteUser(mockUsers[0]);

      expect(userService.deleteUser).not.toHaveBeenCalled();
    });

    it('should handle delete error', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(component as never, 'showSnackbar');
      const error = new Error('Delete error');
      userService.deleteUser.and.returnValue(throwError(() => error));

      component.deleteUser(mockUsers[0]);

      expect(component['showSnackbar']).toHaveBeenCalledWith('Erreur lors de la suppression', 'error');
    });
  });

  describe('restoreUser', () => {
    it('should restore deleted user', () => {
      spyOn(component as never, 'showSnackbar');
      userService.restoreUser.and.returnValue(of(mockUsers[2]));
      userService.getUsers.and.returnValue(of(mockUsers));

      component.restoreUser(mockUsers[2]);

      expect(userService.restoreUser).toHaveBeenCalledWith('3');
      expect(component['showSnackbar']).toHaveBeenCalledWith('Utilisateur restauré avec succès', 'success');
    });

    it('should handle restore error', () => {
      spyOn(component as never, 'showSnackbar');
      const error = new Error('Restore error');
      userService.restoreUser.and.returnValue(throwError(() => error));

      component.restoreUser(mockUsers[2]);

      expect(component['showSnackbar']).toHaveBeenCalledWith('Erreur lors de la restauration', 'error');
    });
  });

  describe('helper methods', () => {
    it('should detect deleted user', () => {
      expect(component.isUserDeleted(mockUsers[2])).toBe(true);
      expect(component.isUserDeleted(mockUsers[0])).toBe(false);
    });

    it('should get user full name', () => {
      expect(component.getUserFullName(mockUsers[0])).toBe('John Doe');
    });

    it('should return dash when no name parts', () => {
      const user = { ...mockUsers[0], firstName: null, lastName: null };
      expect(component.getUserFullName(user)).toBe('-');
    });

    it('should handle partial names', () => {
      const user = { ...mockUsers[0], lastName: null };
      expect(component.getUserFullName(user)).toBe('John');
    });
  });

  describe('toggleIncludeDeleted', () => {
    it('should reload users when toggled', () => {
      userService.getUsers.and.returnValue(of(mockUsers));

      component.toggleIncludeDeleted();

      expect(userService.getUsers).toHaveBeenCalled();
    });
  });
});
