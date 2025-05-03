import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamPaperListComponent } from './exam-paper-list.component';

describe('ExamPaperListComponent', () => {
  let component: ExamPaperListComponent;
  let fixture: ComponentFixture<ExamPaperListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamPaperListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamPaperListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
