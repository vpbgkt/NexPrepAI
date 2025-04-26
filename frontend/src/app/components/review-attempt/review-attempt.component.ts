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
  error = '';
  attempt: any;

  constructor(
    private route: ActivatedRoute,
    private testSvc: TestService
  ) {}

  ngOnInit() {
    this.attemptId = this.route.snapshot.paramMap.get('attemptId')!;
    this.testSvc.reviewAttempt(this.attemptId).subscribe({
      next: data => this.attempt = data,
      error: err => alert(err.error?.message || 'Failed to load review')
    });
  }

  // Helper to render the student’s answer text
  getAnswerText(r: any): string {
    if (!r.selected?.length) return 'No answer';
    return r.selected
      .map((i: number) => r.question.options[i].text)
      .join(', ');
  }

  // Helper to render the correct answer texts
  getCorrectText(r: any): string {
    // r.question.correctOptions is an array of strings
    if (!r.question.correctOptions?.length) {
      return 'N/A';
    }
    // Join the stored correct-texts
    return r.question.correctOptions.join(', ');
  }
}
