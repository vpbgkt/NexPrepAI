import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSubtopicComponent } from './add-subtopic.component';

describe('AddSubtopicComponent', () => {
  let component: AddSubtopicComponent;
  let fixture: ComponentFixture<AddSubtopicComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSubtopicComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddSubtopicComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
