import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  User,
  CreateUserDto,
  UpdateUserDto,
} from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';

@Component({
  standalone: false,
  selector: 'app-user-detail',
  templateUrl: './user-detail.html',
  styleUrls: ['./user-detail.scss'],
})
export class UserDetail implements OnInit {
  userForm!: FormGroup;
  mode: 'view' | 'edit' | 'create' = 'view';
  userId?: string;
  user?: User;
  isLoading = false;
  isSubmitting = false;
  route = inject(ActivatedRoute);
  router = inject(Router);
  fb = inject(FormBuilder);
  userService = inject(UserService);
  private snackbarTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] || 'view';
    this.userId = this.route.snapshot.paramMap.get('id') || undefined;

    this.initForm();

    if (this.mode !== 'create') {
      this.loadUser();
    }
  }

  initForm(): void {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      firstName: [''],
      lastName: [''],
      email: ['', [Validators.required, Validators.email]],
      password: [
        '',
        this.mode === 'create'
          ? [Validators.required, Validators.minLength(6)]
          : [],
      ],
      role: ['user', [Validators.required]],
    });

    if (this.mode === 'view') {
      this.userForm.disable();
    }
  }

  loadUser(): void {
    if (!this.userId) return;

    this.isLoading = true;
    this.userService.getUserById(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        this.userForm.patchValue({
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role || 'user',
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.showSnackbar(
          "Erreur lors du chargement de l'utilisateur",
          'error',
        );
        this.isLoading = false;
        this.router.navigate(['/users']);
      },
    });
  }

  onSubmit(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.userForm.value;

    if (this.mode === 'create') {
      const createDto: CreateUserDto = {
        username: formValue.username,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        email: formValue.email,
        password: formValue.password,
        role: formValue.role,
      };

      this.userService.createUser(createDto).subscribe({
        next: () => {
          this.showSnackbar('Utilisateur créé avec succès', 'success');
          setTimeout(() => {
            this.router.navigate(['/users']);
          }, 1000);
        },
        error: (error) => {
          console.error('Error creating user:', error);
          this.showSnackbar('Erreur lors de la création', 'error');
          this.isSubmitting = false;
        },
      });
    } else if (this.mode === 'edit' && this.userId) {
      const updateDto: UpdateUserDto = {
        username: formValue.username,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        role: formValue.role,
      };

      this.userService.updateUser(this.userId, updateDto).subscribe({
        next: () => {
          this.showSnackbar('Utilisateur modifié avec succès', 'success');
          setTimeout(() => {
            this.router.navigate(['/users']);
          }, 1000);
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.showSnackbar('Erreur lors de la modification', 'error');
          this.isSubmitting = false;
        },
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/users']);
  }

  get title(): string {
    switch (this.mode) {
      case 'create':
        return 'CRÉER UN UTILISATEUR';
      case 'edit':
        return "MODIFIER L'UTILISATEUR";
      case 'view':
      default:
        return "DÉTAILS DE L'UTILISATEUR";
    }
  }

  private showSnackbar(
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
  ): void {
    const snackbar = document.createElement('div');
    snackbar.className = `custom-snackbar snackbar-${type}`;
    snackbar.textContent = message;
    document.body.appendChild(snackbar);

    setTimeout(() => snackbar.classList.add('show'), 10);

    if (this.snackbarTimeout) {
      clearTimeout(this.snackbarTimeout);
    }

    this.snackbarTimeout = setTimeout(() => {
      snackbar.classList.remove('show');
      setTimeout(() => {
        if (document.body.contains(snackbar)) {
          document.body.removeChild(snackbar);
        }
      }, 300);
    }, 3000);
  }
}
