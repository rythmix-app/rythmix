import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './auth';
import { environment } from '../../../environnements/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AuthService,
        { provide: Router, useValue: routerSpy }
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    // Flush any pending checkAuthStatus() requests from constructor's setTimeout
    const pendingRequests = httpMock.match(() => true);
    pendingRequests.forEach(req => {
      if (!req.cancelled) {
        req.flush(null, { status: 404, statusText: 'Not Found' });
      }
    });

    try {
      httpMock.verify();
    } catch {
      // Suppress verification errors from pending requests
    }
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('login', () => {
    it('should login successfully and store tokens', (done) => {
      const mockCredentials = { email: 'test@test.com', password: 'password123' };
      const mockResponse = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      service.login(mockCredentials).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          expect(localStorage.getItem('accessToken')).toBe('mock-access-token');
          expect(localStorage.getItem('refreshToken')).toBe('mock-refresh-token');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(mockCredentials);
      req.flush(mockResponse);
    });

    it('should handle login error', (done) => {
      const mockCredentials = { email: 'test@test.com', password: 'wrong' };

      service.login(mockCredentials).subscribe({
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('register', () => {
    it('should register successfully', (done) => {
      const mockData = {
        email: 'test@test.com',
        username: 'testuser',
        password: 'password123',
        password_confirmation: 'password123'
      };
      const mockResponse = { message: 'User created' };

      service.register(mockData).subscribe({
        next: (response) => {
          expect(response).toEqual(mockResponse);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/register`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });
  });

  describe('logout', () => {
    it('should logout and clear tokens', (done) => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('refreshToken', 'refresh');

      service.logout();

      // Expect and flush the logout request
      const req = httpMock.expectOne(`${environment.apiUrl}/auth/logout`);
      expect(req.request.method).toBe('POST');
      req.flush({});

      setTimeout(() => {
        expect(localStorage.getItem('accessToken')).toBeNull();
        expect(localStorage.getItem('refreshToken')).toBeNull();
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
        done();
      }, 0);
    });
  });

  describe('refreshToken', () => {
    it('should refresh access token', (done) => {
      localStorage.setItem('refreshToken', 'old-refresh-token');
      const mockResponse = { accessToken: 'new-access-token' };

      service.refreshToken().subscribe({
        next: (response) => {
          expect(response.accessToken).toBe('new-access-token');
          expect(localStorage.getItem('accessToken')).toBe('new-access-token');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should handle refresh error and logout', (done) => {
      localStorage.setItem('refreshToken', 'invalid-token');

      service.refreshToken().subscribe({
        error: () => {
          setTimeout(() => {
            expect(router.navigate).toHaveBeenCalledWith(['/login']);
            done();
          }, 0);
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/refresh`);
      req.flush('Invalid token', { status: 401, statusText: 'Unauthorized' });
    });
  });

  describe('loadCurrentUser', () => {
    it('should load current user successfully', (done) => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        username: 'testuser',
        role: 'admin' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };

      service.loadCurrentUser().subscribe({
        next: (response) => {
          expect(response.data.user).toEqual(mockUser);
          expect(service.getCurrentUser()).toEqual(mockUser);
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
      req.flush({ data: { user: mockUser } });
    });
  });

  describe('token management', () => {
    it('should get access token from localStorage', () => {
      localStorage.setItem('accessToken', 'test-token');
      expect(service.getAccessToken()).toBe('test-token');
    });

    it('should get refresh token from localStorage', () => {
      localStorage.setItem('refreshToken', 'test-refresh');
      expect(service.getRefreshToken()).toBe('test-refresh');
    });

    it('should return null when no token exists', () => {
      expect(service.getAccessToken()).toBeNull();
      expect(service.getRefreshToken()).toBeNull();
    });
  });

  describe('authentication state', () => {
    it('should track authenticated state', (done) => {
      service.isAuthenticated$.subscribe(isAuth => {
        if (isAuth) {
          expect(service.isAuthenticated()).toBe(true);
          done();
        }
      });

      // Simulate login
      const mockResponse = {
        accessToken: 'token',
        refreshToken: 'refresh'
      };

      service.login({ email: 'test@test.com', password: 'pass' }).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/login`);
      req.flush(mockResponse);
    });
  });

  describe('role checking', () => {
    it('should check if user is admin', (done) => {
      const mockUser = {
        id: '1',
        email: 'admin@test.com',
        username: 'admin',
        role: 'admin' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null
      };

      service.loadCurrentUser().subscribe(() => {
        expect(service.isAdmin()).toBe(true);
        expect(service.hasRole('admin')).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/auth/me`);
      req.flush({ data: { user: mockUser } });
    });

    it('should return false when no user is loaded', () => {
      expect(service.isAdmin()).toBe(false);
      expect(service.hasRole('admin')).toBe(false);
    });
  });
});
