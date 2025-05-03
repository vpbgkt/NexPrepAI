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
    this.router.navigate(['/exam-player', s._id]);
  }

  // Disable logic: live-not-started OR already-ended
  isDisabled(s: TestSeries): boolean {
    const start = new Date(s.startAt);
    const end   = new Date(s.endAt);
    if (s.mode === 'live' && this.now < start) return true;
    if (this.now > end) return true;
    return false;
  }

  // Tooltip explaining why it’s disabled
  disabledReason(s: TestSeries): string {
    const start = new Date(s.startAt);
    const end   = new Date(s.endAt);
    if (s.mode === 'live' && this.now < start) return 'Not started yet';
    if (this.now > end) return 'Test has ended';
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
