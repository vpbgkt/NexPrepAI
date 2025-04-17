import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSubjectComponent } from './add-subject.component';

describe('AddSubjectComponent', () => {
  let component: AddSubjectComponent;
  let fixture: ComponentFixture<AddSubjectComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSubjectComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddSubjectComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
