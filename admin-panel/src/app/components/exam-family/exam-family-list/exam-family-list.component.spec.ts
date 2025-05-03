import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamFamilyListComponent } from './exam-family-list.component';

describe('ExamFamilyListComponent', () => {
  let component: ExamFamilyListComponent;
  let fixture: ComponentFixture<ExamFamilyListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamFamilyListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamFamilyListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
