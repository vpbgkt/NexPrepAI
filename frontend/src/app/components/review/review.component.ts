import { Component, OnInit } from '@angular/core';
import { CommonModule }      from '@angular/common';
import { ActivatedRoute }    from '@angular/router';
import { TestService }       from '../../services/test.service';

@Component({
  selector: 'app-review',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './review.component.html'
})
export class ReviewComponent implements OnInit {
  attemptId!: string;
  data: any;

  constructor(
    private route: ActivatedRoute,
    private testSvc: TestService
  ) {}

  ngOnInit() {
    this.attemptId = this.route.snapshot.paramMap.get('attemptId')!;
    this.testSvc.reviewAttempt(this.attemptId).subscribe(res => {
      this.data = res;
    });
  }
}
