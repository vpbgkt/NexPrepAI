import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MathDisplayComponent } from './math-display.component';

describe('MathDisplayComponent', () => {
  let component: MathDisplayComponent;
  let fixture: ComponentFixture<MathDisplayComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MathDisplayComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MathDisplayComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
