import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamPaperComponent } from './add-exam-paper.component';

describe('AddExamPaperComponent', () => {
  let component: AddExamPaperComponent;
  let fixture: ComponentFixture<AddExamPaperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddExamPaperComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddExamPaperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
