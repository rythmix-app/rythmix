import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MainLayoutComponent } from './layout/main-layout/main-layout';

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule, MatIconModule, MainLayoutComponent],
  exports: [MainLayoutComponent],
})
export class SharedModule {}
