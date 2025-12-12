import {Component, HostListener, inject, OnInit} from '@angular/core';
import {Router, RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import { AuthService } from '../../../core/auth/auth';
import { User } from '../../../core/models/user.model';

interface MenuItem {
  label: string;
  route: string;
  icon: string;
}

interface MenuSection {
  title: string;
  icon: string;
  items: MenuItem[];
}

@Component({
  standalone: true,
  selector: 'app-main-layout',
  templateUrl: './main-layout.html',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  styleUrls: ['./main-layout.scss'],
})
export class MainLayoutComponent implements OnInit {
  isSidebarOpen = false;
  showUserMenu = false;
  isDarkMode = true;
  currentUser: User | null = null;

  router = inject(Router);
  authService = inject(AuthService);

  menuItems: MenuSection[] = [
    {
      title: 'UTILISATEURS',
      icon: 'fa-users',
      items: [
        { label: 'Utilisateurs', route: '/users', icon: 'fa-user' },
        { label: 'Rôles', route: '/roles', icon: 'fa-shield-alt' },
      ],
    },
    {
      title: 'CONTENU',
      icon: 'fa-music',
      items: [
        { label: 'Tracks', route: '/tracks', icon: 'fa-compact-disc' },
        { label: 'Achievements', route: '/achievements', icon: 'fa-trophy' },
      ],
    },
    {
      title: 'JEUX',
      icon: 'fa-gamepad',
      items: [
        { label: 'Games', route: '/games', icon: 'fa-dice' },
        { label: 'Sessions', route: '/sessions', icon: 'fa-history' },
      ],
    },
  ];

  ngOnInit(): void {
    const savedTheme = localStorage.getItem('theme');
    this.isDarkMode = savedTheme !== 'light';
    this.applyTheme();

    this.authService.currentUser$.subscribe((user) => {
      this.currentUser = user;
    });
  }

  toggleTheme(): void {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme();
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light');
  }

  private applyTheme(): void {
    document.documentElement.setAttribute(
      'data-theme',
      this.isDarkMode ? 'dark' : 'light',
    );
  }

  getUserDisplayName(): string {
    if (!this.currentUser) return 'Utilisateur';
    if (this.currentUser.firstName && this.currentUser.lastName) {
      return `${this.currentUser.firstName} ${this.currentUser.lastName}`;
    }
    return this.currentUser.username;
  }

  toggleSidebar(): void {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar(): void {
    this.isSidebarOpen = false;
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  onProfile(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = false;
    this.router.navigate(['/profile']);
  }

  onLogout(event: Event): void {
    event.stopPropagation();
    this.showUserMenu = false;
    this.authService.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.user-profile')) {
      this.showUserMenu = false;
    }
  }

  @HostListener('window:resize')
  onResize(): void {
    if (window.innerWidth > 768) {
      this.isSidebarOpen = false;
    }
  }
}
