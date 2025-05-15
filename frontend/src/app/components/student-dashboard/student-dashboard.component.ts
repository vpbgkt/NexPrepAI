import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TestService } from '../../services/test.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.scss']
})
export class StudentDashboardComponent implements OnInit {
  attempts: any[] = [];
  loading = true;
  error = '';

  constructor(private testSvc: TestService) {}

  ngOnInit() {
    this.testSvc.getMyAttempts().subscribe({
      next: data => {
        // Filter out null/undefined items or items without required properties
        this.attempts = (data || []).filter(item => item && item.series);
        this.loading = false;
        console.log('Loaded attempts:', this.attempts);
      },
      error: err => {
        this.error = err.message || 'An error occurred while loading your test attempts.';
        console.error('Error loading attempts:', err);
        this.loading = false;
      }
    });
  }
}
