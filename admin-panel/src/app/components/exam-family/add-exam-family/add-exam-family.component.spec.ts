import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamFamilyComponent } from './add-exam-family.component';

describe('AddExamFamilyComponent', () => {
  let component: AddExamFamilyComponent;
  let fixture: ComponentFixture<AddExamFamilyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddExamFamilyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddExamFamilyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
