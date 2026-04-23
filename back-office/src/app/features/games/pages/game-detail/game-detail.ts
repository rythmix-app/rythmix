import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Game } from '../../../../core/models/game.model';
import { GameService } from '../../../../core/services/game.service';

@Component({
  selector: 'app-game-detail',
  templateUrl: './game-detail.html',
  styleUrls: ['./game-detail.scss'],
})
export class GameDetail implements OnInit {
  gameId?: number;
  game?: Game;
  isLoading = false;

  route = inject(ActivatedRoute);
  router = inject(Router);
  gameService = inject(GameService);

  private snackbarTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.gameId = idParam ? Number(idParam) : undefined;

    if (this.gameId) {
      this.loadGame();
    }
  }

  loadGame(): void {
    if (!this.gameId) return;

    this.isLoading = true;
    this.gameService.getGameById(this.gameId).subscribe({
      next: (game) => {
        this.game = game;
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

  onBack(): void {
    this.router.navigate(['/games']);
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
