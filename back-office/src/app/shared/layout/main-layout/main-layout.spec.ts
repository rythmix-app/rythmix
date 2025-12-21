import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { BehaviorSubject } from 'rxjs';
import { MainLayoutComponent } from './main-layout';
import { AuthService } from '../../../core/auth/auth';
import { User } from '../../../core/models/user.model';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;
  let currentUserSubject: BehaviorSubject<User | null>;

  const mockUser: User = {
    id: '1',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    currentUserSubject = new BehaviorSubject<User | null>(null);
    const authSpy = jasmine.createSpyObj('AuthService', ['logout'], {
      currentUser$: currentUserSubject.asObservable(),
    });

    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authSpy }],
    }).compileComponents();

    // Clear localStorage before each test
    localStorage.clear();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize with dark mode when no theme saved', () => {
      fixture.detectChanges();

      expect(component.isDarkMode).toBe(true);
    });

    it('should initialize with light mode when saved in localStorage', () => {
      localStorage.setItem('theme', 'light');

      fixture.detectChanges();

      expect(component.isDarkMode).toBe(false);
    });

    it('should initialize with dark mode when saved in localStorage', () => {
      localStorage.setItem('theme', 'dark');

      fixture.detectChanges();

      expect(component.isDarkMode).toBe(true);
    });

    it('should subscribe to currentUser$', () => {
      fixture.detectChanges();
      currentUserSubject.next(mockUser);

      expect(component.currentUser).toEqual(mockUser);
    });

    it('should apply theme on init', () => {
      spyOn(component as never, 'applyTheme');

      fixture.detectChanges();

      expect(component['applyTheme']).toHaveBeenCalled();
    });
  });

  describe('theme management', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('should toggle from dark to light mode', () => {
      component.isDarkMode = true;

      component.toggleTheme();

      expect(component.isDarkMode).toBe(false);
      expect(localStorage.getItem('theme')).toBe('light');
    });

    it('should toggle from light to dark mode', () => {
      component.isDarkMode = false;

      component.toggleTheme();

      expect(component.isDarkMode).toBe(true);
      expect(localStorage.getItem('theme')).toBe('dark');
    });

    it('should apply dark theme to document element', () => {
      component.isDarkMode = true;
      component['applyTheme']();

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('should apply light theme to document element', () => {
      component.isDarkMode = false;
      component['applyTheme']();

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('should save theme preference to localStorage', () => {
      component.isDarkMode = true;
      component.toggleTheme();

      expect(localStorage.getItem('theme')).toBe('light');

      component.toggleTheme();

      expect(localStorage.getItem('theme')).toBe('dark');
    });
  });

  describe('getUserDisplayName', () => {
    it('should return "Utilisateur" when no user', () => {
      component.currentUser = null;

      expect(component.getUserDisplayName()).toBe('Utilisateur');
    });

    it('should return full name when firstName and lastName exist', () => {
      component.currentUser = mockUser;

      expect(component.getUserDisplayName()).toBe('Test User');
    });

    it('should return username when firstName is missing', () => {
      component.currentUser = { ...mockUser, firstName: null };

      expect(component.getUserDisplayName()).toBe('testuser');
    });

    it('should return username when lastName is missing', () => {
      component.currentUser = { ...mockUser, lastName: null };

      expect(component.getUserDisplayName()).toBe('testuser');
    });

    it('should return username when both names are missing', () => {
      component.currentUser = { ...mockUser, firstName: null, lastName: null };

      expect(component.getUserDisplayName()).toBe('testuser');
    });

    it('should return username when firstName is empty string', () => {
      component.currentUser = { ...mockUser, firstName: '' };

      expect(component.getUserDisplayName()).toBe('testuser');
    });
  });

  describe('sidebar management', () => {
    it('should initialize with sidebar closed', () => {
      expect(component.isSidebarOpen).toBe(false);
    });

    it('should toggle sidebar from closed to open', () => {
      component.isSidebarOpen = false;

      component.toggleSidebar();

      expect(component.isSidebarOpen).toBe(true);
    });

    it('should toggle sidebar from open to closed', () => {
      component.isSidebarOpen = true;

      component.toggleSidebar();

      expect(component.isSidebarOpen).toBe(false);
    });

    it('should close sidebar', () => {
      component.isSidebarOpen = true;

      component.closeSidebar();

      expect(component.isSidebarOpen).toBe(false);
    });

    it('should keep sidebar closed when calling closeSidebar', () => {
      component.isSidebarOpen = false;

      component.closeSidebar();

      expect(component.isSidebarOpen).toBe(false);
    });
  });

  describe('user menu management', () => {
    it('should initialize with user menu closed', () => {
      expect(component.showUserMenu).toBe(false);
    });

    it('should toggle user menu from closed to open', () => {
      component.showUserMenu = false;

      component.toggleUserMenu();

      expect(component.showUserMenu).toBe(true);
    });

    it('should toggle user menu from open to closed', () => {
      component.showUserMenu = true;

      component.toggleUserMenu();

      expect(component.showUserMenu).toBe(false);
    });
  });

  describe('onProfile', () => {
    it('should navigate to profile and close user menu', () => {
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);
      component.showUserMenu = true;

      component.onProfile(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showUserMenu).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/profile']);
    });
  });

  describe('onLogout', () => {
    it('should call logout service and close user menu', () => {
      const event = jasmine.createSpyObj('Event', ['stopPropagation']);
      component.showUserMenu = true;

      component.onLogout(event);

      expect(event.stopPropagation).toHaveBeenCalled();
      expect(component.showUserMenu).toBe(false);
      expect(authService.logout).toHaveBeenCalled();
    });
  });

  describe('onDocumentClick', () => {
    it('should close user menu when clicking outside user-profile', () => {
      component.showUserMenu = true;
      const mockTarget = document.createElement('div');
      const mockEvent = { target: mockTarget } as unknown as MouseEvent;

      component.onDocumentClick(mockEvent);

      expect(component.showUserMenu).toBe(false);
    });

    it('should not close user menu when clicking inside user-profile', () => {
      component.showUserMenu = true;
      const mockTarget = document.createElement('div');
      const mockParent = document.createElement('div');
      mockParent.className = 'user-profile';
      mockParent.appendChild(mockTarget);

      spyOn(mockTarget, 'closest').and.returnValue(mockParent);
      const mockEvent = { target: mockTarget } as unknown as MouseEvent;

      component.onDocumentClick(mockEvent);

      expect(component.showUserMenu).toBe(true);
    });
  });

  describe('onResize', () => {
    it('should close sidebar when window width > 768', () => {
      component.isSidebarOpen = true;
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1024);

      component.onResize();

      expect(component.isSidebarOpen).toBe(false);
    });

    it('should keep sidebar closed when window width > 768', () => {
      component.isSidebarOpen = false;
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(1024);

      component.onResize();

      expect(component.isSidebarOpen).toBe(false);
    });

    it('should not close sidebar when window width <= 768', () => {
      component.isSidebarOpen = true;
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(600);

      component.onResize();

      expect(component.isSidebarOpen).toBe(true);
    });

    it('should handle edge case at exactly 768px', () => {
      component.isSidebarOpen = true;
      spyOnProperty(window, 'innerWidth', 'get').and.returnValue(768);

      component.onResize();

      expect(component.isSidebarOpen).toBe(true);
    });
  });

  describe('menu items', () => {
    it('should have UTILISATEURS section', () => {
      const userSection = component.menuItems.find(
        (section) => section.title === 'UTILISATEURS',
      );

      expect(userSection).toBeDefined();
      expect(userSection?.items.length).toBe(2);
    });

    it('should have CONTENU section', () => {
      const contentSection = component.menuItems.find(
        (section) => section.title === 'CONTENU',
      );

      expect(contentSection).toBeDefined();
      expect(contentSection?.items.length).toBe(2);
    });

    it('should have JEUX section', () => {
      const gamesSection = component.menuItems.find(
        (section) => section.title === 'JEUX',
      );

      expect(gamesSection).toBeDefined();
      expect(gamesSection?.items.length).toBe(2);
    });

    it('should have users route in UTILISATEURS section', () => {
      const userSection = component.menuItems.find(
        (section) => section.title === 'UTILISATEURS',
      );
      const usersItem = userSection?.items.find(
        (item) => item.route === '/users',
      );

      expect(usersItem).toBeDefined();
      expect(usersItem?.label).toBe('Utilisateurs');
    });
  });

  describe('initial state', () => {
    it('should initialize with sidebar closed', () => {
      expect(component.isSidebarOpen).toBe(false);
    });

    it('should initialize with user menu closed', () => {
      expect(component.showUserMenu).toBe(false);
    });

    it('should initialize with dark mode enabled', () => {
      expect(component.isDarkMode).toBe(true);
    });

    it('should initialize with null currentUser', () => {
      expect(component.currentUser).toBeNull();
    });
  });

  describe('currentUser$ subscription', () => {
    it('should update currentUser when currentUser$ emits', () => {
      fixture.detectChanges();

      expect(component.currentUser).toBeNull();

      currentUserSubject.next(mockUser);

      expect(component.currentUser).toEqual(mockUser);
    });

    it('should update currentUser when user logs out', () => {
      fixture.detectChanges();
      currentUserSubject.next(mockUser);

      expect(component.currentUser).toEqual(mockUser);

      currentUserSubject.next(null);

      expect(component.currentUser).toBeNull();
    });
  });
});
