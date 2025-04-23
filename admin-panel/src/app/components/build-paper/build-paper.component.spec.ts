import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BuildPaperComponent } from './build-paper.component';

describe('BuildPaperComponent', () => {
  let component: BuildPaperComponent;
  let fixture: ComponentFixture<BuildPaperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BuildPaperComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BuildPaperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
