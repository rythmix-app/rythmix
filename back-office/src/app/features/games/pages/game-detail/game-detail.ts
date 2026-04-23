import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Game, UpdateGameDto } from '../../../../core/models/game.model';
import { GameService } from '../../../../core/services/game.service';

@Component({
  standalone: false,
  selector: 'app-game-detail',
  templateUrl: './game-detail.html',
  styleUrls: ['./game-detail.scss'],
})
export class GameDetail implements OnInit {
  gameForm!: FormGroup;
  mode: 'view' | 'edit' = 'view';
  gameId?: number;
  game?: Game;
  isLoading = false;
  isSubmitting = false;

  route = inject(ActivatedRoute);
  router = inject(Router);
  fb = inject(FormBuilder);
  gameService = inject(GameService);

  private snackbarTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] || 'view';
    const idParam = this.route.snapshot.paramMap.get('id');
    this.gameId = idParam ? Number(idParam) : undefined;

    this.initForm();

    if (this.gameId) {
      this.loadGame();
    }
  }

  initForm(): void {
    this.gameForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      isEnabled: [false],
    });

    if (this.mode === 'view') {
      this.gameForm.disable();
    }
  }

  loadGame(): void {
    if (!this.gameId) return;

    this.isLoading = true;
    this.gameService.getGameById(this.gameId).subscribe({
      next: (game) => {
        this.game = game;
        this.gameForm.patchValue({
          name: game.name,
          description: game.description,
          isEnabled: game.isEnabled,
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading game:', error);
        this.showSnackbar('Erreur lors du chargement du jeu', 'error');
        this.isLoading = false;
        this.router.navigate(['/games']);
      },
    });
  }

  onSubmit(): void {
    if (this.mode !== 'edit' || !this.gameId) return;

    if (this.gameForm.invalid) {
      this.gameForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.gameForm.value;
    const updateDto: UpdateGameDto = {
      name: formValue.name,
      description: formValue.description || undefined,
      isEnabled: formValue.isEnabled,
    };

    this.gameService.updateGame(this.gameId, updateDto).subscribe({
      next: () => {
        this.showSnackbar('Jeu modifié avec succès', 'success');
        setTimeout(() => {
          this.router.navigate(['/games']);
        }, 1000);
      },
      error: (error) => {
        console.error('Error updating game:', error);
        this.showSnackbar('Erreur lors de la modification', 'error');
        this.isSubmitting = false;
      },
    });
  }

  onCancel(): void {
    this.router.navigate(['/games']);
  }

  get title(): string {
    return this.mode === 'edit' ? 'MODIFIER LE JEU' : 'DÉTAILS DU JEU';
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
