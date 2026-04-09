import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
  flush,
} from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UserDetail } from './user-detail';
import { UserService } from '../../../../core/services/user.service';
import { LikedTrackService } from '../../../../core/services/liked-track.service';
import { User } from '../../../../core/models/user.model';
import { LikedTrack } from '../../../../core/models/liked-track.model';

describe('UserDetail', () => {
  let component: UserDetail;
  let fixture: ComponentFixture<UserDetail>;
  let userService: jasmine.SpyObj<UserService>;
  let likedTrackService: jasmine.SpyObj<LikedTrackService>;
  let router: jasmine.SpyObj<Router>;
  let activatedRoute: {
    snapshot: {
      data: { mode: string };
      paramMap: { get: jasmine.Spy };
    };
  };

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

  beforeEach(async () => {
    const userServiceSpy = jasmine.createSpyObj('UserService', [
      'getUserById',
      'createUser',
      'updateUser',
    ]);
    const likedTrackServiceSpy = jasmine.createSpyObj('LikedTrackService', [
      'getByUserId',
      'deleteLikedTrack',
    ]);
    const routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    activatedRoute = {
      snapshot: {
        data: { mode: 'view' },
        paramMap: {
          get: jasmine.createSpy('get').and.returnValue('1'),
        },
      },
    };

    await TestBed.configureTestingModule({
      declarations: [UserDetail],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: UserService, useValue: userServiceSpy },
        { provide: LikedTrackService, useValue: likedTrackServiceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRoute },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(UserDetail);
    component = fixture.componentInstance;
    userService = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    likedTrackService = TestBed.inject(
      LikedTrackService,
    ) as jasmine.SpyObj<LikedTrackService>;
    router = TestBed.inject(Router) as jasmine.SpyObj<Router>;

    // Set default mock return values to prevent errors in tests
    userService.getUserById.and.returnValue(of(mockUser));
    likedTrackService.getByUserId.and.returnValue(of([]));
  });

  afterEach(() => {
    // Clean up any snackbars added to DOM
    const snackbars = document.querySelectorAll('.custom-snackbar');
    snackbars.forEach((snackbar) => snackbar.remove());

    // Destroy the component fixture to clean up any pending timers
    if (fixture) {
      fixture.destroy();
    }
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should initialize in view mode', () => {
      userService.getUserById.and.returnValue(of(mockUser));

      component.ngOnInit();

      expect(component.mode).toBe('view');
      expect(component.userId).toBe('1');
      expect(component.userForm.disabled).toBe(true);
    });

    it('should initialize in edit mode', () => {
      activatedRoute.snapshot.data.mode = 'edit';
      userService.getUserById.and.returnValue(of(mockUser));

      component.ngOnInit();

      expect(component.mode).toBe('edit');
      expect(component.userForm.enabled).toBe(true);
    });

    it('should initialize in create mode without loading user', () => {
      activatedRoute.snapshot.data.mode = 'create';
      activatedRoute.snapshot.paramMap.get.and.returnValue(null);

      component.ngOnInit();

      expect(component.mode).toBe('create');
      expect(component.userId).toBeUndefined();
      expect(userService.getUserById).not.toHaveBeenCalled();
    });
  });

  describe('initForm', () => {
    it('should initialize form with validators for view mode', () => {
      component.mode = 'view';
      component.initForm();
      expect(component.userForm.disabled).toBe(true);

      component.userForm.enable();
      expect(component.userForm.get('username')?.hasError('required')).toBe(
        true,
      );
      expect(component.userForm.get('email')?.hasError('required')).toBe(true);
    });

    it('should require password in create mode', () => {
      component.mode = 'create';
      component.initForm();

      expect(component.userForm.get('password')?.hasError('required')).toBe(
        true,
      );
    });

    it('should not require password in edit mode', () => {
      component.mode = 'edit';
      component.initForm();

      const passwordControl = component.userForm.get('password');
      passwordControl?.setValue('');
      expect(passwordControl?.hasError('required')).toBe(false);
    });

    it('should validate email format', () => {
      component.mode = 'create'; // Set mode to create to ensure form is enabled
      component.initForm();
      const emailControl = component.userForm.get('email');

      emailControl?.setValue('invalid-email');
      expect(emailControl?.hasError('email')).toBe(true);

      emailControl?.setValue('valid@email.com');
      expect(emailControl?.hasError('email')).toBe(false);
    });

    it('should validate username min length', () => {
      component.mode = 'create'; // Set mode to create to ensure form is enabled
      component.initForm();
      const usernameControl = component.userForm.get('username');

      usernameControl?.setValue('ab');
      expect(usernameControl?.hasError('minlength')).toBe(true);

      usernameControl?.setValue('abc');
      expect(usernameControl?.hasError('minlength')).toBe(false);
    });

    it('should validate password min length in create mode', () => {
      component.mode = 'create';
      component.initForm();
      const passwordControl = component.userForm.get('password');

      passwordControl?.setValue('12345');
      expect(passwordControl?.hasError('minlength')).toBe(true);

      passwordControl?.setValue('123456');
      expect(passwordControl?.hasError('minlength')).toBe(false);
    });
  });

  describe('loadUser', () => {
    it('should load user and populate form', () => {
      component.userId = '1';
      component.mode = 'view';
      component.initForm();
      userService.getUserById.and.returnValue(of(mockUser));

      component.loadUser();

      expect(userService.getUserById).toHaveBeenCalledWith('1');
      expect(component.user).toEqual(mockUser);
      expect(component.userForm.get('username')?.value).toBe('testuser');
      expect(component.userForm.get('email')?.value).toBe('test@example.com');
      expect(component.isLoading).toBe(false);
    });

    it('should handle user without firstName and lastName', () => {
      component.userId = '1';
      component.mode = 'view';
      component.initForm();
      const userWithoutNames = { ...mockUser, firstName: null, lastName: null };
      userService.getUserById.and.returnValue(of(userWithoutNames));

      component.loadUser();

      expect(component.userForm.get('firstName')?.value).toBeNull();
      expect(component.userForm.get('lastName')?.value).toBeNull();
    });

    it('should handle error and navigate to users list', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      spyOn(component as any, 'showSnackbar');
      component.userId = '1';
      const error = new Error('User not found');
      userService.getUserById.and.returnValue(throwError(() => error));

      component.loadUser();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((component as any).showSnackbar).toHaveBeenCalledWith(
        "Erreur lors du chargement de l'utilisateur",
        'error',
      );
      expect(component.isLoading).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/users']);
    });

    it('should not load user if userId is undefined', () => {
      component.userId = undefined;

      component.loadUser();

      expect(userService.getUserById).not.toHaveBeenCalled();
    });
  });

  describe('onSubmit', () => {
    beforeEach(() => {
      component.initForm();
    });

    it('should not submit if form is invalid', () => {
      component.userForm.patchValue({ username: '', email: '' });

      component.onSubmit();

      expect(userService.createUser).not.toHaveBeenCalled();
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    it('should mark all fields as touched when invalid', () => {
      component.mode = 'create';
      component.initForm();
      component.userForm.patchValue({ username: '', email: '', password: '' });

      component.onSubmit();

      // Verify that fields are marked as touched
      expect(component.userForm.get('username')?.touched).toBe(true);
      expect(component.userForm.get('email')?.touched).toBe(true);
      expect(userService.createUser).not.toHaveBeenCalled();
      expect(userService.updateUser).not.toHaveBeenCalled();
    });

    describe('create mode', () => {
      beforeEach(() => {
        component.mode = 'create';
        component.initForm();
      });

      it('should create user successfully', fakeAsync(() => {
        spyOn(component as never, 'showSnackbar');
        const formValue = {
          username: 'newuser',
          firstName: 'New',
          lastName: 'User',
          email: 'new@example.com',
          password: 'password123',
          role: 'user' as 'user' | 'admin',
        };
        component.userForm.patchValue(formValue);
        userService.createUser.and.returnValue(of(mockUser));

        component.onSubmit();

        expect(userService.createUser).toHaveBeenCalledWith(formValue);
        expect(component['showSnackbar']).toHaveBeenCalledWith(
          'Utilisateur créé avec succès',
          'success',
        );

        tick(1000);
        expect(router.navigate).toHaveBeenCalledWith(['/users']);
        flush(); // Clean up any remaining timers
      }));

      it('should handle create error', () => {
        spyOn(component as never, 'showSnackbar');
        component.userForm.patchValue({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
          role: 'user',
        });
        const error = new Error('Email already exists');
        userService.createUser.and.returnValue(throwError(() => error));

        component.onSubmit();

        expect(component['showSnackbar']).toHaveBeenCalledWith(
          'Erreur lors de la création',
          'error',
        );
        expect(component.isSubmitting).toBe(false);
      });
    });

    describe('edit mode', () => {
      beforeEach(() => {
        component.mode = 'edit';
        component.userId = '1';
        component.initForm();
      });

      it('should update user successfully', fakeAsync(() => {
        spyOn(component as never, 'showSnackbar');
        const formValue = {
          username: 'updated',
          firstName: 'Updated',
          lastName: 'User',
          email: 'updated@example.com', // Email is required by form validators
          role: 'admin' as 'user' | 'admin',
        };
        component.userForm.patchValue(formValue);
        userService.updateUser.and.returnValue(of(mockUser));

        component.onSubmit();

        const expectedDto = {
          username: 'updated',
          firstName: 'Updated',
          lastName: 'User',
          role: 'admin' as 'user' | 'admin',
        };
        expect(userService.updateUser).toHaveBeenCalledWith('1', expectedDto);
        expect(component['showSnackbar']).toHaveBeenCalledWith(
          'Utilisateur modifié avec succès',
          'success',
        );

        tick(1000);
        expect(router.navigate).toHaveBeenCalledWith(['/users']);
        flush(); // Clean up any remaining timers
      }));

      it('should handle update error', () => {
        spyOn(component as never, 'showSnackbar');
        component.userForm.patchValue({
          username: 'updated',
          email: 'updated@example.com', // Email is required by form validators
          role: 'admin',
        });
        const error = new Error('Username taken');
        userService.updateUser.and.returnValue(throwError(() => error));

        component.onSubmit();

        expect(component['showSnackbar']).toHaveBeenCalledWith(
          'Erreur lors de la modification',
          'error',
        );
        expect(component.isSubmitting).toBe(false);
      });

      it('should not update if userId is missing', () => {
        component.userId = undefined;
        component.userForm.patchValue({
          username: 'updated',
          email: 'test@example.com',
          role: 'user',
        });

        component.onSubmit();

        expect(userService.updateUser).not.toHaveBeenCalled();
      });
    });
  });

  describe('onCancel', () => {
    it('should navigate back to users list', () => {
      component.onCancel();

      expect(router.navigate).toHaveBeenCalledWith(['/users']);
    });
  });

  describe('title', () => {
    it('should return correct title for create mode', () => {
      component.mode = 'create';

      expect(component.title).toBe('CRÉER UN UTILISATEUR');
    });

    it('should return correct title for edit mode', () => {
      component.mode = 'edit';

      expect(component.title).toBe("MODIFIER L'UTILISATEUR");
    });

    it('should return correct title for view mode', () => {
      component.mode = 'view';

      expect(component.title).toBe("DÉTAILS DE L'UTILISATEUR");
    });
  });

  describe('form state', () => {
    it('should disable form in view mode', () => {
      component.mode = 'view';
      component.initForm();

      expect(component.userForm.disabled).toBe(true);
    });

    it('should enable form in edit mode', () => {
      component.mode = 'edit';
      component.initForm();

      expect(component.userForm.enabled).toBe(true);
    });

    it('should enable form in create mode', () => {
      component.mode = 'create';
      component.initForm();

      expect(component.userForm.enabled).toBe(true);
    });
  });

  describe('loading state', () => {
    it('should set isLoading during user load', () => {
      component.userId = '1';
      component.mode = 'view';
      component.initForm();
      userService.getUserById.and.returnValue(of(mockUser));

      component.isLoading = false;
      component.loadUser();

      // isLoading should be set to false after completion
      expect(component.isLoading).toBe(false);
    });

    it('should set isSubmitting during form submission', () => {
      component.mode = 'create';
      component.initForm();
      component.userForm.patchValue({
        username: 'test',
        email: 'test@example.com',
        password: 'password123',
        role: 'user',
      });
      userService.createUser.and.returnValue(of(mockUser));

      component.onSubmit();

      expect(component.isSubmitting).toBe(true);
    });
  });

  describe('loadLikedTracks', () => {
    const mockTracks: LikedTrack[] = [
      {
        id: 1,
        userId: '1',
        deezerTrackId: '123456',
        title: 'Test Track',
        artist: 'Test Artist',
        type: 'track',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    it('should load liked tracks for a user', () => {
      likedTrackService.getByUserId.and.returnValue(of(mockTracks));

      component.loadLikedTracks('1');

      expect(likedTrackService.getByUserId).toHaveBeenCalledWith('1');
      expect(component.likedTracks).toEqual(mockTracks);
    });

    it('should initialize likedTracks to empty array on error', () => {
      likedTrackService.getByUserId.and.returnValue(
        throwError(() => new Error('Error')),
      );

      component.loadLikedTracks('1');

      expect(component.likedTracks).toEqual([]);
    });

    it('should be called after loadUser succeeds', () => {
      userService.getUserById.and.returnValue(of(mockUser));
      likedTrackService.getByUserId.and.returnValue(of(mockTracks));
      component.userId = '1';
      component.mode = 'view';
      component.initForm();

      component.loadUser();

      expect(likedTrackService.getByUserId).toHaveBeenCalledWith('1');
    });
  });

  describe('deleteLikedTrack', () => {
    const mockTrack: LikedTrack = {
      id: 1,
      userId: '1',
      deezerTrackId: '123456',
      title: 'Test Track',
      artist: 'Test Artist',
      type: 'track',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      component.likedTracks = [mockTrack];
    });

    it('should delete track when confirmed', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(component as never, 'showSnackbar');
      likedTrackService.deleteLikedTrack.and.returnValue(of(undefined));

      component.deleteLikedTrack(mockTrack);

      expect(likedTrackService.deleteLikedTrack).toHaveBeenCalledWith(1);
      expect(component.likedTracks.length).toBe(0);
      expect(component['showSnackbar']).toHaveBeenCalledWith(
        'Track supprimé',
        'success',
      );
    });

    it('should not delete track when cancelled', () => {
      spyOn(window, 'confirm').and.returnValue(false);

      component.deleteLikedTrack(mockTrack);

      expect(likedTrackService.deleteLikedTrack).not.toHaveBeenCalled();
      expect(component.likedTracks.length).toBe(1);
    });

    it('should handle delete error', () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(component as never, 'showSnackbar');
      likedTrackService.deleteLikedTrack.and.returnValue(
        throwError(() => new Error('Error')),
      );

      component.deleteLikedTrack(mockTrack);

      expect(component['showSnackbar']).toHaveBeenCalledWith(
        'Erreur lors de la suppression',
        'error',
      );
      expect(component.likedTracks.length).toBe(1);
    });

    it('should use deezerTrackId in confirm when title is null', () => {
      spyOn(window, 'confirm').and.returnValue(false);
      const trackNoTitle = { ...mockTrack, title: null };

      component.deleteLikedTrack(trackNoTitle);

      expect(window.confirm).toHaveBeenCalledWith('Supprimer "123456" ?');
    });
  });
});
