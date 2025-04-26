import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SeriesAnalyticsComponent } from './series-analytics.component';

describe('SeriesAnalyticsComponent', () => {
  let component: SeriesAnalyticsComponent;
  let fixture: ComponentFixture<SeriesAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeriesAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SeriesAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
