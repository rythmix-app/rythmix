import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  Achievement,
  CreateAchievementDto,
  UpdateAchievementDto,
} from '../../../../core/models/achievement.model';
import { AchievementService } from '../../../../core/services/achievement.service';

export const ACHIEVEMENT_TYPES = [
  { value: 'first_game', label: 'Première partie' },
  { value: 'first_win', label: 'Première victoire' },
  { value: 'first_like', label: 'Premier like' },
  { value: 'blind_test_correct', label: 'Blind test correct' },
  { value: 'cover_guess_correct', label: 'Pochette devinée' },
  { value: 'fast_answer', label: 'Réponse rapide' },
  { value: 'perfect_game', label: 'Partie parfaite' },
  { value: 'games_played', label: 'Parties jouées' },
  { value: 'instant_answer', label: 'Réponse instantanée' },
  { value: 'no_like_session', label: 'Session sans like' },
  { value: 'same_mode_streak', label: 'Même mode en série' },
  { value: 'total_correct_answers', label: 'Total bonnes réponses' },
  { value: 'total_games_played', label: 'Total parties jouées' },
  { value: 'total_likes', label: 'Total likes' },
  { value: 'likes_milestone', label: 'Palier de likes' },
  { value: 'genre_diversity', label: 'Diversité de genres' },
  { value: 'country_diversity', label: 'Diversité de pays' },
  { value: 'artist_fan', label: "Fan d'artiste" },
  { value: 'launch_day_signup', label: 'Inscription jour de lancement' },
  { value: 'max_blur_guess', label: 'Devinette flou maximum' },
  { value: 'comeback', label: 'Retour' },
];

@Component({
  standalone: false,
  selector: 'app-achievement-detail',
  templateUrl: './achievement-detail.html',
  styleUrls: ['./achievement-detail.scss'],
})
export class AchievementDetail implements OnInit {
  achievementForm!: FormGroup;
  mode: 'view' | 'edit' | 'create' = 'view';
  achievementId?: number;
  achievement?: Achievement;
  isLoading = false;
  isSubmitting = false;
  achievementTypes = ACHIEVEMENT_TYPES;

  route = inject(ActivatedRoute);
  router = inject(Router);
  fb = inject(FormBuilder);
  achievementService = inject(AchievementService);

  private snackbarTimeout: ReturnType<typeof setTimeout> | undefined;

  ngOnInit(): void {
    this.mode = this.route.snapshot.data['mode'] || 'view';
    const idParam = this.route.snapshot.paramMap.get('id');
    this.achievementId = idParam ? Number(idParam) : undefined;

    this.initForm();

    if (this.mode !== 'create') {
      this.loadAchievement();
    }
  }

  initForm(): void {
    this.achievementForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      description: [''],
      type: ['', [Validators.required]],
    });

    if (this.mode === 'view') {
      this.achievementForm.disable();
    }
  }

  loadAchievement(): void {
    if (!this.achievementId) return;

    this.isLoading = true;
    this.achievementService.getAchievementById(this.achievementId).subscribe({
      next: (achievement) => {
        this.achievement = achievement;
        this.achievementForm.patchValue({
          name: achievement.name,
          description: achievement.description,
          type: achievement.type,
        });
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading achievement:', error);
        this.showSnackbar('Erreur lors du chargement du succès', 'error');
        this.isLoading = false;
        this.router.navigate(['/achievements']);
      },
    });
  }

  onSubmit(): void {
    if (this.achievementForm.invalid) {
      this.achievementForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    const formValue = this.achievementForm.value;

    if (this.mode === 'create') {
      const createDto: CreateAchievementDto = {
        name: formValue.name,
        description: formValue.description || undefined,
        type: formValue.type,
      };

      this.achievementService.createAchievement(createDto).subscribe({
        next: () => {
          this.showSnackbar('Succès créé avec succès', 'success');
          setTimeout(() => {
            this.router.navigate(['/achievements']);
          }, 1000);
        },
        error: (error) => {
          console.error('Error creating achievement:', error);
          this.showSnackbar('Erreur lors de la création', 'error');
          this.isSubmitting = false;
        },
      });
    } else if (this.mode === 'edit' && this.achievementId) {
      const updateDto: UpdateAchievementDto = {
        name: formValue.name,
        description: formValue.description || undefined,
        type: formValue.type,
      };

      this.achievementService
        .updateAchievement(this.achievementId, updateDto)
        .subscribe({
          next: () => {
            this.showSnackbar('Succès modifié avec succès', 'success');
            setTimeout(() => {
              this.router.navigate(['/achievements']);
            }, 1000);
          },
          error: (error) => {
            console.error('Error updating achievement:', error);
            this.showSnackbar('Erreur lors de la modification', 'error');
            this.isSubmitting = false;
          },
        });
    }
  }

  onCancel(): void {
    this.router.navigate(['/achievements']);
  }

  get title(): string {
    switch (this.mode) {
      case 'create':
        return 'CRÉER UN SUCCÈS';
      case 'edit':
        return 'MODIFIER LE SUCCÈS';
      case 'view':
      default:
        return 'DÉTAILS DU SUCCÈS';
    }
  }

  getTypeLabel(type: string): string {
    return this.achievementTypes.find((t) => t.value === type)?.label || type;
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
