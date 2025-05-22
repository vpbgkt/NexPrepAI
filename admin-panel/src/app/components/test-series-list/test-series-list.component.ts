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
  groupedSeries: { [key: string]: TestSeries[] } = {};

  constructor(private tsSvc: TestSeriesService) {}

  private loadAllSeries() {
    this.tsSvc.getSeries().subscribe({
      next: list => {
        this.seriesList = list;
        this.groupSeriesByFamily();
      },
      error: err  => console.error('Failed to load series', err)
    });
  }

  private groupSeriesByFamily() {
    this.groupedSeries = this.seriesList.reduce((acc, series) => {
      const familyName = (typeof series.family === 'object' && series.family?.name) ? series.family.name : 'Uncategorized';
      if (!acc[familyName]) {
        acc[familyName] = [];
      }
      acc[familyName].push(series);
      return acc;
    }, {} as { [key: string]: TestSeries[] });
  }

  // Helper to get keys from groupedSeries for the template
  get familyGroups(): string[] {
    return Object.keys(this.groupedSeries);
  }

  ngOnInit() {
    this.loadAllSeries();
  }
}
