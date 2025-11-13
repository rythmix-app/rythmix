import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User, CreateUserDto, UpdateUserDto } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';

@Component({
  standalone: false,
  selector: 'app-user-detail',
  templateUrl: './user-detail.html',
  styleUrls: ['./user-detail.scss']
})
export class UserDetail implements OnInit {
  userForm!: FormGroup;
  mode: 'view' | 'edit' | 'create' = 'view';
  userId?: string;
  user?: User;
  isLoading = false;
  isSubmitting = false;

  constructor(
    private route: ActivatedRoute,
    protected router: Router,
    private fb: FormBuilder,
    private userService: UserService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] || 'view';
    this.userId = this.route.snapshot.paramMap.get('id') || undefined;

    this.initForm();

    // Ne charger que si on n'est pas en mode création
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
      password: ['', this.mode === 'create' ? [Validators.required, Validators.minLength(6)] : []],
      role: ['user', [Validators.required]]
    });

    if (this.mode === 'view') {
      this.userForm.disable();
    }
  }

  loadUser(): void {
    if (!this.userId) return;

    this.isLoading = true; // ✅ Active le spinner
    this.userService.getUserById(this.userId).subscribe({
      next: (user) => {
        this.user = user;
        this.userForm.patchValue({
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role || 'user'
        });
        this.isLoading = false; // ✅ Désactive le spinner
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.snackBar.open('Erreur lors du chargement de l\'utilisateur', 'Fermer', {
          duration: 3000
        });
        this.isLoading = false;
        this.router.navigate(['/users']);
      }
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
        role: formValue.role
      };

      this.userService.createUser(createDto).subscribe({
        next: (user) => {
          this.snackBar.open('Utilisateur créé avec succès', 'Fermer', {
            duration: 3000
          });
          this.router.navigate(['/users']);
        },
        error: (error) => {
          console.error('Error creating user:', error);
          this.snackBar.open('Erreur lors de la création', 'Fermer', {
            duration: 3000
          });
          this.isSubmitting = false;
        }
      });
    } else if (this.mode === 'edit' && this.userId) {
      const updateDto: UpdateUserDto = {
        username: formValue.username,
        firstName: formValue.firstName,
        lastName: formValue.lastName,
        role: formValue.role
      };

      this.userService.updateUser(this.userId, updateDto).subscribe({
        next: (user) => {
          this.snackBar.open('Utilisateur modifié avec succès', 'Fermer', {
            duration: 3000
          });
          this.router.navigate(['/users']);
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.snackBar.open('Erreur lors de la modification', 'Fermer', {
            duration: 3000
          });
          this.isSubmitting = false;
        }
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
        return 'MODIFIER L\'UTILISATEUR';
      case 'view':
      default:
        return 'DÉTAILS DE L\'UTILISATEUR';
    }
  }
}
