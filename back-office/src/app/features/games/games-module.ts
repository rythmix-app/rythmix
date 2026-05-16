import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GamesRoutingModule } from './games-routing-module';

import { GamesList } from './pages/games-list/games-list';
import { GameDetail } from './pages/game-detail/game-detail';

@NgModule({
  declarations: [GamesList, GameDetail],
  imports: [CommonModule, FormsModule, ReactiveFormsModule, GamesRoutingModule],
})
export class GamesModule {}
