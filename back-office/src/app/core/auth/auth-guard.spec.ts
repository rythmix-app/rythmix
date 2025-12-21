import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth-guard';
import { AuthService } from './auth';
import { of } from 'rxjs';

describe('authGuard', () => {
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', ['getAccessToken', 'isAuthenticated']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
  });

  it('should allow access when token exists', () => {
    authService.getAccessToken.and.returnValue('valid-token');

    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

    expect(result).toBe(true);
    expect(authService.getAccessToken).toHaveBeenCalled();
  });

  it('should redirect to login when no token exists', (done) => {
    authService.getAccessToken.and.returnValue(null);
    (authService as jasmine.SpyObj<AuthService> & { isAuthenticated$: typeof of<boolean> }).isAuthenticated$ = of(false);

    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

    if (typeof result === 'object' && 'subscribe' in result) {
      result.subscribe((canActivate) => {
        expect(canActivate).toBe(false);
        expect(router.navigate).toHaveBeenCalledWith(['/login']);
        done();
      });
    }
  });

  it('should allow access when isAuthenticated is true', (done) => {
    authService.getAccessToken.and.returnValue(null);
    (authService as jasmine.SpyObj<AuthService> & { isAuthenticated$: typeof of<boolean> }).isAuthenticated$ = of(true);

    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

    if (typeof result === 'object' && 'subscribe' in result) {
      result.subscribe((canActivate) => {
        expect(canActivate).toBe(true);
        done();
      });
    }
  });
});
