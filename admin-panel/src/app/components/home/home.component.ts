import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service'; 
import { Router } from '@angular/router'; // Import Router

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  userName: string | null = null;

  constructor(private authService: AuthService, private router: Router) {} // Inject Router

  ngOnInit(): void {
    this.userName = this.authService.getUserName(); 
    // If you want the name to be reactive to changes (e.g., if it might load asynchronously after login)
    // you could subscribe to the observable:
    // this.authService.getUserNameObservable().subscribe(name => {
    //   this.userName = name;
    // });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
