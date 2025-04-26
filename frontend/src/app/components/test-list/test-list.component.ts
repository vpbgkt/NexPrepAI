import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TestService, TestSeries } from '../../services/test.service';

@Component({
  selector: 'app-test-list',
  templateUrl: './test-list.component.html',
  styleUrls: ['./test-list.component.scss'],
  imports: [CommonModule]
})
export class TestListComponent implements OnInit {
  seriesList: TestSeries[] = [];
  loading = true;
  error   = '';

  constructor(private testSvc: TestService, private router: Router) {}

  ngOnInit() {
    this.testSvc.getSeries().subscribe({
      next: data => { this.seriesList = data; this.loading = false; },
      error: err => { this.error = err.error?.message || err.message; this.loading = false; }
    });
  }

  start(seriesId: string) {
    this.router.navigate(['/exam', seriesId]);
  }
}
