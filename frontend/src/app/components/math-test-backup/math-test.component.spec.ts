import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MathTestComponent } from './math-test.component';

describe('MathTestComponent', () => {
  let component: MathTestComponent;
  let fixture: ComponentFixture<MathTestComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MathTestComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MathTestComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
