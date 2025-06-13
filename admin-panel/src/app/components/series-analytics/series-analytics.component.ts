import { Component, OnInit } from '@angular/core';
import { CommonModule }       from '@angular/common';
import { ActivatedRoute }     from '@angular/router';
import { HttpClient }         from '@angular/common/http';
import { saveAs }             from 'file-saver';
import { environment }        from '../../../environments/environment';

import { ChartData, ChartOptions } from 'chart.js';
// import { NgChartsModule }          from 'ng2-charts';

interface ScoreBin { _id: number; count: number; }
interface SeriesAnalytics {
  totalAttempts:    number;
  scoreDistribution: ScoreBin[];
  averageTimeMs:     number;
}

@Component({
  standalone: true,
  selector: 'app-series-analytics',
  templateUrl: './series-analytics.component.html',
  styleUrls: ['./series-analytics.component.scss'],
  imports: [ CommonModule ] // NgChartsModule temporarily disabled
})
export class SeriesAnalyticsComponent implements OnInit {
  seriesId = '';
  totalAttempts = 0;
  averageTimeMs = 0;

  // chart data & options
  barData: ChartData<'bar'> = { labels: [], datasets: [] };
  barOpts: ChartOptions<'bar'> = {
    responsive: true,
    plugins: { legend: { display: false } }
  };

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient
  ) {}
  ngOnInit() {
    this.seriesId = this.route.snapshot.paramMap.get('seriesId') || '';
    this.http.get<SeriesAnalytics>(
      `${environment.apiUrl}/analytics/series/${this.seriesId}`
    ).subscribe({
      next: data => {
        this.totalAttempts = data.totalAttempts;
        this.averageTimeMs = data.averageTimeMs;

        // build bar-chart dataset
        this.barData = {
          labels: data.scoreDistribution.map(b => b._id.toString()),
          datasets: [{
            data: data.scoreDistribution.map(b => b.count)
          }]
        };
      },
      error: err => console.error('Failed analytics', err)
    });
  }

  get averageTimeMin() {
    return (this.averageTimeMs / 1000 / 60).toFixed(1);
  }
  downloadCsv() {
    const url = `${environment.apiUrl}/analytics/series/${this.seriesId}/attempts.csv`;
    this.http.get(url, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` }
      })
      .subscribe({
        next: blob => saveAs(blob, `series-${this.seriesId}-attempts.csv`),
        error: err => alert(err.error?.message || 'CSV export failed')
      });
  }
}
