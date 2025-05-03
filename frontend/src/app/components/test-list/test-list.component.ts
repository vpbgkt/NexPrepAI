import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TestService, TestSeries } from '../../services/test.service';

@Component({
  selector: 'app-test-list',
  standalone: true,
  templateUrl: './test-list.component.html',
  styleUrls: ['./test-list.component.scss'],
  imports: [CommonModule, RouterModule]
})
export class TestListComponent implements OnInit {
  series: TestSeries[] = [];
  now = new Date();

  constructor(private svc: TestService, private router: Router) {}

  ngOnInit() {
    this.svc.getSeries().subscribe(data => (this.series = data));
  }

  // Navigate to the player
  startSeries(s: TestSeries) {
    this.router.navigate(['/exam', s._id]);
  }

  // Disable only for 'live' tests outside their window
  isDisabled(s: TestSeries): boolean {
    if (s.mode !== 'live') {
      // practice & official always enabled
      return false;
    }
    const start = new Date(s.startAt);
    const end   = new Date(s.endAt);
    return this.now < start || this.now > end;
  }

  // Only 'live' tests have reasons to disable
  disabledReason(s: TestSeries): string {
    if (s.mode !== 'live') {
      return '';
    }
    const start = new Date(s.startAt);
    const end   = new Date(s.endAt);
    if (this.now < start) return 'Not started yet';
    if (this.now > end)   return 'Test has ended';
    return '';
  }

  // CSS class for badges
  modeClass(mode: string): string {
    return {
      official:  'badge-official',
      practice:  'badge-practice',
      live:      'badge-live'
    }[mode] || '';
  }
}
