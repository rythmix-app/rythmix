import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User, UserFilters } from '../../../../core/models/user.model';
import { UserService } from '../../../../core/services/user.service';

@Component({
  standalone: false,
  selector: 'app-users-list',
  templateUrl: './users-list.html',
  styleUrls: ['./users-list.scss']
})
export class UsersList implements OnInit {
  displayedColumns: string[] = ['username', 'email', 'role', 'createdAt', 'status', 'actions'];
  dataSource: MatTableDataSource<User>;
  isLoading = false;
  filters: UserFilters = {
    includeDeleted: false
  };

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(
    private userService: UserService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.dataSource = new MatTableDataSource<User>([]);
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadUsers(): void {
    this.isLoading = true;
    this.userService.getUsers(this.filters).subscribe({
      next: (users) => {
        this.dataSource.data = users;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.snackBar.open('Erreur lors du chargement des utilisateurs', 'Fermer', {
          duration: 3000
        });
        this.isLoading = false;
      }
    });
  }

  applyFilter(event: Event): void {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  toggleIncludeDeleted(): void {
    this.isLoading = true;
    this.loadUsers();
  }

  viewUser(user: User): void {
    this.router.navigate(['/users', user.id]);
  }

  editUser(user: User): void {
    this.router.navigate(['/users', user.id, 'edit']);
  }

  deleteUser(user: User): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur ${user.username} ?`)) {
      this.userService.deleteUser(user.id).subscribe({
        next: () => {
          this.snackBar.open('Utilisateur supprimé avec succès', 'Fermer', {
            duration: 3000
          });
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error deleting user:', error);
          this.snackBar.open('Erreur lors de la suppression', 'Fermer', {
            duration: 3000
          });
        }
      });
    }
  }

  restoreUser(user: User): void {
    this.userService.restoreUser(user.id).subscribe({
      next: () => {
        this.snackBar.open('Utilisateur restauré avec succès', 'Fermer', {
          duration: 3000,
          panelClass: ['custom-snackbar']
        });
        this.loadUsers();
      },
      error: (error) => {
        console.error('Error restoring user:', error);
        this.snackBar.open('Erreur lors de la restauration', 'Fermer', {
          duration: 3000,
          panelClass: ['custom-snackbar']
        });
      }
    });
  }

  createUser(): void {
    this.router.navigate(['/users/new']);
  }

  isUserDeleted(user: User): boolean {
    return user.deletedAt !== null && user.deletedAt !== undefined;
  }

  getUserFullName(user: User): string {
    const parts = [user.firstName, user.lastName].filter(p => p);
    return parts.length > 0 ? parts.join(' ') : '-';
  }
}
