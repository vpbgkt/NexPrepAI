import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamShiftListComponent } from './exam-shift-list.component';

describe('ExamShiftListComponent', () => {
  let component: ExamShiftListComponent;
  let fixture: ComponentFixture<ExamShiftListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamShiftListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamShiftListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
