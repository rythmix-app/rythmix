import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  GAME_SESSION_STATUSES,
  GameSession,
  GameSessionStatus,
  UpdateGameSessionDto,
} from '../../../../core/models/game-session.model';
import { GameSessionService } from '../../../../core/services/game-session.service';
import { UserService } from '../../../../core/services/user.service';

@Component({
  standalone: false,
  selector: 'app-game-session-detail',
  templateUrl: './game-session-detail.html',
  styleUrls: ['./game-session-detail.scss'],
})
export class GameSessionDetail implements OnInit {
  sessionForm!: FormGroup;
  mode: 'view' | 'edit' = 'view';
  sessionId?: string;
  session?: GameSession;
  isLoading = false;
  isSubmitting = false;

  statusOptions = GAME_SESSION_STATUSES;

  route = inject(ActivatedRoute);
  router = inject(Router);
  fb = inject(FormBuilder);
  gameSessionService = inject(GameSessionService);
  userService = inject(UserService);

  usernameByUserId = new Map<string, string>();

  private snackbarTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] || 'view';
    this.sessionId = this.route.snapshot.paramMap.get('id') || undefined;

    this.initForm();

    if (this.sessionId) {
      this.loadSession();
    }
  }

  initForm(): void {
    this.sessionForm = this.fb.group({
      status: ['' as GameSessionStatus, [Validators.required]],
    });

    if (this.mode === 'view') {
      this.sessionForm.disable();
    }
  }

  loadSession(): void {
    if (!this.sessionId) return;

    this.isLoading = true;
    forkJoin({
      session: this.gameSessionService.getGameSessionById(this.sessionId),
      users: this.userService.getUsers({ includeDeleted: true }),
    }).subscribe({
      next: ({ session, users }) => {
        this.usernameByUserId = new Map(users.map((u) => [u.id, u.username]));
        this.session = session;
        this.sessionForm.patchValue({ status: session.status });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading session:', error);
        this.showSnackbar('Erreur lors du chargement de la session', 'error');
        this.isLoading = false;
        this.router.navigate(['/sessions']);
      },
    });
  }

  getUsername(userId: string): string | null {
    return this.usernameByUserId.get(userId) ?? null;
  }

  onSubmit(): void {
    if (this.mode !== 'edit' || !this.sessionId) return;

    if (this.sessionForm.invalid) {
      this.sessionForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const dto: UpdateGameSessionDto = {
      status: this.sessionForm.value.status,
    };

    this.gameSessionService.updateGameSession(this.sessionId, dto).subscribe({
      next: () => {
        this.showSnackbar('Session modifiée avec succès', 'success');
        setTimeout(() => {
          this.router.navigate(['/sessions']);
        }, 1000);
      },
      error: (error) => {
        console.error('Error updating session:', error);
        this.showSnackbar('Erreur lors de la modification', 'error');
        this.isSubmitting = false;
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/sessions']);
  }

  get title(): string {
    return this.mode === 'edit' ? 'MODIFIER LA SESSION' : 'DÉTAILS DE LA SESSION';
  }

  prettyJson(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
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
          snackbar.remove();
        }
      }, 300);
    }, 3000);
  }
}
