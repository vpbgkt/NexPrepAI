import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamStreamListComponent } from './exam-stream-list.component';

describe('ExamStreamListComponent', () => {
  let component: ExamStreamListComponent;
  let fixture: ComponentFixture<ExamStreamListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamStreamListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamStreamListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
