import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { GameSessionsRoutingModule } from './game-sessions-routing-module';

import { GameSessionsList } from './pages/game-sessions-list/game-sessions-list';
import { GameSessionDetail } from './pages/game-session-detail/game-session-detail';

@NgModule({
  declarations: [GameSessionsList, GameSessionDetail],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    GameSessionsRoutingModule,
  ],
})
export class GameSessionsModule {}
