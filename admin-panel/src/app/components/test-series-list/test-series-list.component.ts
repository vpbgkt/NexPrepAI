import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TestSeries, TestSeriesService } from '../../services/test-series.service';

@Component({
  standalone: true,
  selector: 'app-test-series-list',
  templateUrl: './test-series-list.component.html',
  imports: [ CommonModule, RouterModule ]
})
export class TestSeriesListComponent implements OnInit {
  testSeriesList: TestSeries[] = [];

  constructor(private testSeriesService: TestSeriesService) {}

  ngOnInit() {
    this.loadAllSeries();
  }

  loadAllSeries(): void {
    this.testSeriesService.getAll().subscribe(data => this.testSeriesList = data);
  }

  cloneSeries(id?: string): void {
    if (!id) return; // guard against undefined
    this.testSeriesService.clone(id).subscribe(() => {
      alert('Test series cloned successfully!');
      this.loadAllSeries();
    });
  }
}
