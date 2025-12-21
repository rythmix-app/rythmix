import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login';
import { AuthService } from '../../../core/auth/auth';
import { HttpErrorResponse } from '@angular/common/http';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['login']);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    await TestBed.configureTestingModule({
      imports: [LoginComponent, ReactiveFormsModule],
      providers: [
        { provide: AuthService, useValue: authSpy },
        { provide: Router, useValue: routerSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    it('should initialize login form with empty values', () => {
      expect(component.loginForm.get('email')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
    });

    it('should have required validators', () => {
      const emailControl = component.loginForm.get('email');
      const passwordControl = component.loginForm.get('password');

      expect(emailControl?.hasError('required')).toBe(true);
      expect(passwordControl?.hasError('required')).toBe(true);
    });

    it('should validate email format', () => {
      const emailControl = component.loginForm.get('email');

      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBe(true);

      emailControl?.setValue('valid@email.com');
      expect(emailControl?.hasError('email')).toBe(false);
    });

    it('should validate password minimum length', () => {
      const passwordControl = component.loginForm.get('password');

      passwordControl?.setValue('short');
      expect(passwordControl?.hasError('minlength')).toBe(true);

      passwordControl?.setValue('longpassword');
      expect(passwordControl?.hasError('minlength')).toBe(false);
    });

    it('should initialize with hidePassword true', () => {
      expect(component.hidePassword).toBe(true);
    });

    it('should initialize with no error message', () => {
      expect(component.errorMessage).toBe('');
    });

    it('should initialize with isLoading false', () => {
      expect(component.isLoading).toBe(false);
    });
  });

  describe('togglePasswordVisibility', () => {
    it('should toggle hidePassword from true to false', () => {
      component.hidePassword = true;
      component.togglePasswordVisibility();
      expect(component.hidePassword).toBe(false);
    });

    it('should toggle hidePassword from false to true', () => {
      component.hidePassword = false;
      component.togglePasswordVisibility();
      expect(component.hidePassword).toBe(true);
    });
  });

  describe('onSubmit', () => {
    it('should not submit if form is invalid', () => {
      component.loginForm.patchValue({ email: '', password: '' });

      component.onSubmit();

      expect(authService.login).not.toHaveBeenCalled();
    });

    it('should submit valid credentials and navigate on success', () => {
      const credentials = { email: 'test@example.com', password: 'password123' };
      component.loginForm.patchValue(credentials);
      authService.login.and.returnValue(of({ accessToken: 'token', refreshToken: 'refresh' }));

      component.onSubmit();

      expect(component.isLoading).toBe(true);
      expect(component.errorMessage).toBe('');
      expect(authService.login).toHaveBeenCalledWith(credentials);
      expect(router.navigate).toHaveBeenCalledWith(['/users']);
    });

    it('should clear error message before submit', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });
      component.errorMessage = 'Previous error';
      authService.login.and.returnValue(of({ accessToken: 'token', refreshToken: 'refresh' }));

      component.onSubmit();

      expect(component.errorMessage).toBe('');
    });

    it('should handle 401 unauthorized error', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'wrongpassword'
      });
      const error = new HttpErrorResponse({ status: 401 });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage).toBe('Email ou mot de passe incorrect');
      expect(component.isLoading).toBe(false);
    });

    it('should handle 403 forbidden error (unverified email)', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });
      const error = new HttpErrorResponse({ status: 403 });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage).toBe('Veuillez vérifier votre email avant de vous connecter');
      expect(component.isLoading).toBe(false);
    });

    it('should handle other errors with generic message', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });
      const error = new HttpErrorResponse({ status: 500 });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage).toBe('Une erreur est survenue, veuillez réessayer');
      expect(component.isLoading).toBe(false);
    });

    it('should set isLoading to true during submission', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });
      authService.login.and.returnValue(of({ accessToken: 'token', refreshToken: 'refresh' }));

      component.isLoading = false;
      component.onSubmit();

      expect(component.isLoading).toBe(true);
    });

    it('should reset isLoading to false on error', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });
      const error = new HttpErrorResponse({ status: 500 });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.isLoading).toBe(false);
    });
  });

  describe('form validation edge cases', () => {
    it('should be invalid with empty email and valid password', () => {
      component.loginForm.patchValue({
        email: '',
        password: 'validpassword'
      });

      expect(component.loginForm.valid).toBe(false);
    });

    it('should be invalid with valid email and empty password', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: ''
      });

      expect(component.loginForm.valid).toBe(false);
    });

    it('should be invalid with invalid email format', () => {
      component.loginForm.patchValue({
        email: 'not-an-email',
        password: 'validpassword'
      });

      expect(component.loginForm.valid).toBe(false);
    });

    it('should be invalid with password less than 8 characters', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'short'
      });

      expect(component.loginForm.valid).toBe(false);
    });

    it('should be valid with correct email and password', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'validpassword123'
      });

      expect(component.loginForm.valid).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should clear previous errors on new submission', () => {
      component.loginForm.patchValue({
        email: 'test@example.com',
        password: 'password123'
      });
      component.errorMessage = 'Previous error';
      authService.login.and.returnValue(of({ accessToken: 'token', refreshToken: 'refresh' }));

      component.onSubmit();

      expect(component.errorMessage).toBe('');
    });

    it('should display error without clearing form', () => {
      const credentials = { email: 'test@example.com', password: 'wrongpass12' };
      component.loginForm.patchValue(credentials);
      const error = new HttpErrorResponse({ status: 401 });
      authService.login.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.loginForm.get('email')?.value).toBe(credentials.email);
      expect(component.loginForm.get('password')?.value).toBe(credentials.password);
    });
  });
});
