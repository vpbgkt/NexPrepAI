import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddExamStreamComponent } from './add-exam-stream.component';

describe('AddExamStreamComponent', () => {
  let component: AddExamStreamComponent;
  let fixture: ComponentFixture<AddExamStreamComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddExamStreamComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddExamStreamComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
