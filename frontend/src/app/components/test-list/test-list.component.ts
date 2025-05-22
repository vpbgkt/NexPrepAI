import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { TestService, TestSeries } from '../../services/test.service';

interface GroupedTests {
  familyId: string;
  familyName: string;
  familyCode: string;
  tests: TestSeries[];
}

@Component({
  selector: 'app-test-list',
  standalone: true,
  templateUrl: './test-list.component.html',
  styleUrls: ['./test-list.component.scss'],
  imports: [CommonModule, RouterModule]
})
export class TestListComponent implements OnInit {
  series: TestSeries[] = [];
  groupedSeries: GroupedTests[] = [];
  now = new Date();

  constructor(private svc: TestService, private router: Router) {}

  ngOnInit() {
    this.svc.getSeries().subscribe(data => {
      this.series = data;
      this.groupTestsByFamily();
    });
  }

  // Group tests by exam family
  groupTestsByFamily() {
    // Create a map to store tests by family ID
    const familyMap = new Map<string, GroupedTests>();
    
    // Group tests by family
    this.series.forEach(test => {
      if (test.family && test.family._id) {
        if (!familyMap.has(test.family._id)) {
          familyMap.set(test.family._id, {
            familyId: test.family._id,
            familyName: test.family.name || 'Unknown Family',
            familyCode: test.family.code || '',
            tests: []
          });
        }
        familyMap.get(test.family._id)?.tests.push(test);
      } else {
        // Handle tests without a family
        if (!familyMap.has('uncategorized')) {
          familyMap.set('uncategorized', {
            familyId: 'uncategorized',
            familyName: 'Uncategorized',
            familyCode: '',
            tests: []
          });
        }
        familyMap.get('uncategorized')?.tests.push(test);
      }
    });
    
    // Convert map to array
    this.groupedSeries = Array.from(familyMap.values());
    
    // Sort by family name
    this.groupedSeries.sort((a, b) => {
      // Put uncategorized at the end
      if (a.familyId === 'uncategorized') return 1;
      if (b.familyId === 'uncategorized') return -1;
      return a.familyName.localeCompare(b.familyName);
    });
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
