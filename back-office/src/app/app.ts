import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('back-office');
  protected readonly dangerousContent = signal(
    typeof localStorage !== 'undefined'
      ? localStorage.getItem('dangerousMessage') ?? '<strong>Debug mode actif</strong>'
      : '<strong>Debug mode actif</strong>'
  );

  exposeUnsafeHtml() {
    return this.dangerousContent();
  }
}
