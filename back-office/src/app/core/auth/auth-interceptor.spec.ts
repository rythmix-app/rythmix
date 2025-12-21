import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth-interceptor';
import { AuthService } from './auth';
import { of, throwError } from 'rxjs';

describe('authInterceptor', () => {
  let httpClient: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getAccessToken', 'refreshToken', 'logout']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization header when token exists', () => {
    authService.getAccessToken.and.returnValue('test-token');

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush({});
  });

  it('should not add Authorization header for auth endpoints', () => {
    authService.getAccessToken.and.returnValue('test-token');

    httpClient.post('/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/auth/login');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should not add Authorization header when no token exists', () => {
    authService.getAccessToken.and.returnValue(null);

    httpClient.get('/api/test').subscribe();

    const req = httpMock.expectOne('/api/test');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('should refresh token on 401 error', (done) => {
    authService.getAccessToken.and.returnValue('expired-token');
    authService.refreshToken.and.returnValue(of({ accessToken: 'new-token' }));

    httpClient.get('/api/test').subscribe({
      next: () => {
        expect(authService.refreshToken).toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    // After refresh, the request should be retried
    authService.getAccessToken.and.returnValue('new-token');
    const retryReq = httpMock.expectOne('/api/test');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-token');
    retryReq.flush({ success: true });
  });

  it('should logout when refresh fails', (done) => {
    authService.getAccessToken.and.returnValue('expired-token');
    authService.refreshToken.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 401 }))
    );

    httpClient.get('/api/test').subscribe({
      error: () => {
        expect(authService.logout).toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne('/api/test');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
  });

  it('should not intercept 401 on login endpoint', (done) => {
    authService.getAccessToken.and.returnValue('token');

    httpClient.post('/auth/login', {}).subscribe({
      error: (error) => {
        expect(error.status).toBe(401);
        expect(authService.refreshToken).not.toHaveBeenCalled();
        done();
      }
    });

    const req = httpMock.expectOne('/auth/login');
    req.flush('Invalid credentials', { status: 401, statusText: 'Unauthorized' });
  });
});
