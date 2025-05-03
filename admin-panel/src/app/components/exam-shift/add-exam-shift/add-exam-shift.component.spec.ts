import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamShiftComponent } from './add-exam-shift.component';

describe('AddExamShiftComponent', () => {
  let component: AddExamShiftComponent;
  let fixture: ComponentFixture<AddExamShiftComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddExamShiftComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddExamShiftComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
