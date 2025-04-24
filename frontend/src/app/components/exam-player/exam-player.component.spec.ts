import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExamPlayerComponent } from './exam-player.component';

describe('ExamPlayerComponent', () => {
  let component: ExamPlayerComponent;
  let fixture: ComponentFixture<ExamPlayerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExamPlayerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExamPlayerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
