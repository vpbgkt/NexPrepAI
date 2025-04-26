import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TestSeries, TestSeriesService } from '../../services/test-series.service';

@Component({
  standalone: true,
  selector: 'app-test-series-list',
  templateUrl: './test-series-list.component.html',
  styleUrls: ['./test-series-list.component.scss'],
  imports: [ CommonModule, RouterModule ]
})
export class TestSeriesListComponent implements OnInit {
  seriesList: TestSeries[] = [];

  constructor(private tsSvc: TestSeriesService) {}

  private loadAllSeries() {
    this.tsSvc.getSeries().subscribe({
      next: list => this.seriesList = list,
      error: err  => console.error('Failed to load series', err)
    });
  }

  ngOnInit() {
    this.loadAllSeries();
  }
}
