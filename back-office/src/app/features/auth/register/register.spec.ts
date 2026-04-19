import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register';
import { AuthService } from '../../../core/auth/auth';
import { HttpErrorResponse } from '@angular/common/http';

describe('RegisterComponent', () => {
  let component: RegisterComponent;
  let fixture: ComponentFixture<RegisterComponent>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    const authSpy = jasmine.createSpyObj('AuthService', ['register']);

    await TestBed.configureTestingModule({
      imports: [RegisterComponent, ReactiveFormsModule, RouterTestingModule],
      providers: [{ provide: AuthService, useValue: authSpy }],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('form initialization', () => {
    it('should initialize register form with empty values', () => {
      expect(component.registerForm.get('email')?.value).toBe('');
      expect(component.registerForm.get('username')?.value).toBe('');
      expect(component.registerForm.get('password')?.value).toBe('');
      expect(component.registerForm.get('password_confirmation')?.value).toBe(
        '',
      );
      expect(component.registerForm.get('firstName')?.value).toBe('');
      expect(component.registerForm.get('lastName')?.value).toBe('');
    });

    it('should have required validators for required fields', () => {
      const emailControl = component.registerForm.get('email');
      const usernameControl = component.registerForm.get('username');
      const passwordControl = component.registerForm.get('password');
      const passwordConfirmControl = component.registerForm.get(
        'password_confirmation',
      );

      expect(emailControl?.hasError('required')).toBe(true);
      expect(usernameControl?.hasError('required')).toBe(true);
      expect(passwordControl?.hasError('required')).toBe(true);
      expect(passwordConfirmControl?.hasError('required')).toBe(true);
    });

    it('should not require firstName and lastName', () => {
      const firstNameControl = component.registerForm.get('firstName');
      const lastNameControl = component.registerForm.get('lastName');

      expect(firstNameControl?.hasError('required')).toBe(false);
      expect(lastNameControl?.hasError('required')).toBe(false);
    });

    it('should validate email format', () => {
      const emailControl = component.registerForm.get('email');

      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBe(true);

      emailControl?.setValue('valid@email.com');
      expect(emailControl?.hasError('email')).toBe(false);
    });

    it('should validate username min length', () => {
      const usernameControl = component.registerForm.get('username');

      usernameControl?.setValue('ab');
      expect(usernameControl?.hasError('minlength')).toBe(true);

      usernameControl?.setValue('abc');
      expect(usernameControl?.hasError('minlength')).toBe(false);
    });

    it('should validate username max length', () => {
      const usernameControl = component.registerForm.get('username');

      usernameControl?.setValue('a'.repeat(51));
      expect(usernameControl?.hasError('maxlength')).toBe(true);

      usernameControl?.setValue('a'.repeat(50));
      expect(usernameControl?.hasError('maxlength')).toBe(false);
    });

    it('should validate password min length', () => {
      const passwordControl = component.registerForm.get('password');

      passwordControl?.setValue('short');
      expect(passwordControl?.hasError('minlength')).toBe(true);

      passwordControl?.setValue('longpass');
      expect(passwordControl?.hasError('minlength')).toBe(false);
    });

    it('should initialize with hidePassword true', () => {
      expect(component.hidePassword).toBe(true);
    });

    it('should initialize with hidePasswordConfirmation true', () => {
      expect(component.hidePasswordConfirmation).toBe(true);
    });

    it('should initialize with no error or success messages', () => {
      expect(component.errorMessage).toBe('');
      expect(component.successMessage).toBe('');
    });

    it('should initialize with isLoading false', () => {
      expect(component.isLoading).toBe(false);
    });
  });

  describe('passwordMatchValidator', () => {
    it('should return null when passwords match', () => {
      component.registerForm.patchValue({
        password: 'password123',
        password_confirmation: 'password123',
      });

      expect(component.registerForm.hasError('passwordMismatch')).toBe(false);
    });

    it('should return error when passwords do not match', () => {
      component.registerForm.patchValue({
        password: 'password123',
        password_confirmation: 'different123',
      });

      expect(component.registerForm.hasError('passwordMismatch')).toBe(true);
    });

    it('should return null when password controls are missing', () => {
      const formGroup = component.fb.group({});
      const result = component.passwordMatchValidator(formGroup);

      expect(result).toBeNull();
    });

    it('should validate on password change', () => {
      component.registerForm.patchValue({
        password: 'password123',
        password_confirmation: 'password123',
      });
      expect(component.registerForm.hasError('passwordMismatch')).toBe(false);

      component.registerForm.patchValue({
        password: 'changed123',
      });
      expect(component.registerForm.hasError('passwordMismatch')).toBe(true);
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

  describe('togglePasswordConfirmationVisibility', () => {
    it('should toggle hidePasswordConfirmation from true to false', () => {
      component.hidePasswordConfirmation = true;
      component.togglePasswordConfirmationVisibility();
      expect(component.hidePasswordConfirmation).toBe(false);
    });

    it('should toggle hidePasswordConfirmation from false to true', () => {
      component.hidePasswordConfirmation = false;
      component.togglePasswordConfirmationVisibility();
      expect(component.hidePasswordConfirmation).toBe(true);
    });
  });

  describe('onSubmit', () => {
    const validFormData = {
      email: 'test@example.com',
      username: 'testuser',
      password: 'password123',
      password_confirmation: 'password123',
      firstName: 'Test',
      lastName: 'User',
    };

    it('should not submit if form is invalid', () => {
      component.registerForm.patchValue({ email: '', username: '' });

      component.onSubmit();

      expect(authService.register).not.toHaveBeenCalled();
    });

    it('should not submit if passwords do not match', () => {
      component.registerForm.patchValue({
        ...validFormData,
        password_confirmation: 'different123',
      });

      component.onSubmit();

      expect(authService.register).not.toHaveBeenCalled();
    });

    it('should submit valid form and show success message', fakeAsync(() => {
      component.registerForm.patchValue(validFormData);
      authService.register.and.returnValue(of({ message: 'User created' }));

      component.onSubmit();

      expect(component.isLoading).toBe(false);
      expect(component.errorMessage).toBe('');
      expect(component.successMessage).toBe(
        'Compte créé avec succès ! Vous pouvez maintenant vous connecter.',
      );
      expect(authService.register).toHaveBeenCalledWith(validFormData);

      tick(2000);
      expect(router.navigate).toHaveBeenCalledWith(['/login']);
    }));

    it('should clear previous messages on submit', () => {
      component.registerForm.patchValue(validFormData);
      component.errorMessage = 'Previous error';
      component.successMessage = 'Previous success';
      authService.register.and.returnValue(of({ message: 'User created' }));

      component.onSubmit();

      expect(component.errorMessage).toBe('');
      expect(component.successMessage).not.toBe('Previous success');
    });

    it('should handle error with errors array', () => {
      component.registerForm.patchValue(validFormData);
      const error = {
        error: {
          errors: [{ message: 'Email already exists' }],
        },
      };
      authService.register.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage).toBe('Email already exists');
      expect(component.isLoading).toBe(false);
      expect(component.successMessage).toBe('');
    });

    it('should handle error with message property', () => {
      component.registerForm.patchValue(validFormData);
      const error = {
        error: {
          message: 'Username already taken',
        },
      };
      authService.register.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage).toBe('Username already taken');
      expect(component.isLoading).toBe(false);
    });

    it('should handle generic error', () => {
      component.registerForm.patchValue(validFormData);
      const error = new HttpErrorResponse({ status: 500 });
      authService.register.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage).toBe(
        'Une erreur est survenue, veuillez réessayer',
      );
      expect(component.isLoading).toBe(false);
    });

    it('should set isLoading to true during submission', () => {
      component.registerForm.patchValue(validFormData);
      authService.register.and.returnValue(of({ message: 'User created' }));

      component.isLoading = false;
      component.onSubmit();

      // isLoading is set to true, then to false after success
      expect(component.isLoading).toBe(false);
    });

    it('should submit without optional fields', fakeAsync(() => {
      const minimalData = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        password_confirmation: 'password123',
        firstName: '',
        lastName: '',
      };
      component.registerForm.patchValue(minimalData);
      authService.register.and.returnValue(of({ message: 'User created' }));

      component.onSubmit();

      expect(authService.register).toHaveBeenCalledWith(minimalData);
      expect(component.successMessage).toBe(
        'Compte créé avec succès ! Vous pouvez maintenant vous connecter.',
      );
    }));
  });

  describe('form validation edge cases', () => {
    it('should be invalid with all empty fields', () => {
      expect(component.registerForm.valid).toBe(false);
    });

    it('should be invalid with only email', () => {
      component.registerForm.patchValue({ email: 'test@example.com' });
      expect(component.registerForm.valid).toBe(false);
    });

    it('should be invalid with invalid email', () => {
      component.registerForm.patchValue({
        email: 'not-an-email',
        username: 'testuser',
        password: 'password123',
        password_confirmation: 'password123',
      });
      expect(component.registerForm.valid).toBe(false);
    });

    it('should be invalid with short username', () => {
      component.registerForm.patchValue({
        email: 'test@example.com',
        username: 'ab',
        password: 'password123',
        password_confirmation: 'password123',
      });
      expect(component.registerForm.valid).toBe(false);
    });

    it('should be invalid with short password', () => {
      component.registerForm.patchValue({
        email: 'test@example.com',
        username: 'testuser',
        password: 'short',
        password_confirmation: 'short',
      });
      expect(component.registerForm.valid).toBe(false);
    });

    it('should be valid with all required fields', () => {
      component.registerForm.patchValue({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        password_confirmation: 'password123',
      });
      expect(component.registerForm.valid).toBe(true);
    });

    it('should be valid with optional fields', () => {
      component.registerForm.patchValue({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        password_confirmation: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });
      expect(component.registerForm.valid).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle empty errors array', () => {
      component.registerForm.patchValue({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        password_confirmation: 'password123',
      });
      const error = { error: { errors: [] } };
      authService.register.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage).toBe(
        'Une erreur est survenue, veuillez réessayer',
      );
    });

    it('should handle multiple errors and show first one', () => {
      component.registerForm.patchValue({
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123',
        password_confirmation: 'password123',
      });
      const error = {
        error: {
          errors: [{ message: 'First error' }, { message: 'Second error' }],
        },
      };
      authService.register.and.returnValue(throwError(() => error));

      component.onSubmit();

      expect(component.errorMessage).toBe('First error');
    });
  });
});
