import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service'; 
import { Router, ActivatedRoute } from '@angular/router'; // Import ActivatedRoute

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  userName: string | null = null;
  hierarchySection: string | null = null;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute
  ) {} // Inject ActivatedRoute

  ngOnInit(): void {
    this.userName = this.authService.getUserName(); 
    
    // Get data from route
    this.route.data.subscribe(data => {
      this.hierarchySection = data['hierarchySection'] || null;
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
  
  navigateToCreate(): void {
    if (this.hierarchySection) {
      this.router.navigate([`/${this.hierarchySection}/new`]);
    }
  }
}
