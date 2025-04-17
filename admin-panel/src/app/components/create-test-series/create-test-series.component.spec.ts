import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateTestSeriesComponent } from './create-test-series.component';

describe('CreateTestSeriesComponent', () => {
  let component: CreateTestSeriesComponent;
  let fixture: ComponentFixture<CreateTestSeriesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateTestSeriesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateTestSeriesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
