import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReviewAttemptComponent } from './review-attempt.component';

describe('ReviewAttemptComponent', () => {
  let component: ReviewAttemptComponent;
  let fixture: ComponentFixture<ReviewAttemptComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReviewAttemptComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewAttemptComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
