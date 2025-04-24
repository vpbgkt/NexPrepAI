import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { TestService } from '../../services/test.service';

@Component({
  selector: 'app-review-attempt',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './review-attempt.component.html',
  styleUrls: ['./review-attempt.component.scss']
})
export class ReviewAttemptComponent implements OnInit {
  attemptId!: string;
  reviewData: any;
  loading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private testSvc: TestService
  ) {}

  ngOnInit() {
    this.attemptId = this.route.snapshot.paramMap.get('attemptId')!;
    this.testSvc.getReview(this.attemptId).subscribe({
      next: (data) => {
        this.reviewData = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load review data';
        this.loading = false;
      }
    });
  }
}
