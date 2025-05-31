import { Component, OnInit, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/auth.service';
import { Router } from '@angular/router';
import { ClickOutsideDirective } from './directives/click-outside.directive';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule, ClickOutsideDirective],
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
      if (window.innerWidth > 992 && this.mobileMenuOpen) {
        this.mobileMenuOpen = false;
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
  }

  toggleDropdown(dropdown: string) {
    this.activeDropdown = this.activeDropdown === dropdown ? null : dropdown;
  }

  closeDropdown() {
    this.activeDropdown = null;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Close mobile menu when clicking on a link
  @HostListener('window:click', ['$event'])
  onClick(event: MouseEvent) {
    // Implement any additional click handling if needed
  }
}
