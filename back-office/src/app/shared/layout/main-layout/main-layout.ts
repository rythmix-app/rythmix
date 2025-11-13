import { Component } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-main-layout',
  templateUrl: './main-layout.html',
  styleUrls: ['./main-layout.scss']
})
export class MainLayoutComponent {
  menuItems = [
    {
      title: 'UTILISATEURS',
      icon: 'people',
      items: [
        { label: 'Utilisateurs', route: '/users', icon: 'person' },
        { label: 'Rôles', route: '/roles', icon: 'admin_panel_settings' }
      ]
    },
    {
      title: 'CONTENU',
      icon: 'library_music',
      items: [
        { label: 'Tracks', route: '/tracks', icon: 'audiotrack' },
        { label: 'Achievements', route: '/achievements', icon: 'emoji_events' }
      ]
    },
    {
      title: 'JEUX',
      icon: 'gamepad',
      items: [
        { label: 'Games', route: '/games', icon: 'videogame_asset' },
        { label: 'Sessions', route: '/sessions', icon: 'history' }
      ]
    }
  ];
}
