import { Component, OnInit, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { NotificationComponent } from './components/notification/notification.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule, NotificationComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'admin-panel';
  userName: string | null = null;
  currentYear: number = new Date().getFullYear();
  mobileMenuOpen = false;
  activeDropdown: string | null = null;

  constructor(
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.authService.getUserNameObservable().subscribe(name => {
      this.userName = name;
    });

    // Close mobile menu when window is resized to desktop size
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1024 && this.mobileMenuOpen) {
        this.mobileMenuOpen = false;
        this.activeDropdown = null;
      }
    });
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    if (!this.mobileMenuOpen) {
      this.activeDropdown = null;
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    this.activeDropdown = null;
  }

  isSuperAdmin(): boolean {
    return this.authService.getUserRole() === 'superadmin';
  }  toggleDropdown(dropdown: string) {
    if (this.activeDropdown === dropdown) {
      this.activeDropdown = null;
    } else {
      this.activeDropdown = dropdown;
    }
  }

  closeDropdown() {
    this.activeDropdown = null;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  // Close dropdowns when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    
    // Check if click is on a dropdown button or inside dropdown menu
    if (target.closest('.dropdown') || target.closest('.user-dropdown')) {
      return; // Don't close if clicking inside dropdown area
    }
    
    // Close dropdown if clicking outside
    this.activeDropdown = null;
  }

  // Close mobile menu on escape key
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.mobileMenuOpen) {
      this.closeMobileMenu();
    } else if (this.activeDropdown) {
      this.closeDropdown();
    }
  }

  // Handle keyboard navigation for accessibility
  @HostListener('document:keydown.tab', ['$event'])
  onTabKey(event: KeyboardEvent) {
    // Additional tab handling can be added here for better accessibility
  }
}
