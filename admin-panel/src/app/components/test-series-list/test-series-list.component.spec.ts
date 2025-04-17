import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TestSeriesListComponent } from './test-series-list.component';

describe('TestSeriesListComponent', () => {
  let component: TestSeriesListComponent;
  let fixture: ComponentFixture<TestSeriesListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestSeriesListComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TestSeriesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
