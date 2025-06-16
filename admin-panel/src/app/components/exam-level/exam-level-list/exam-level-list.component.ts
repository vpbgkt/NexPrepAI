import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExamLevelService, ExamLevel } from '../../../services/exam-level.service';

@Component({
  standalone: true,
  selector: 'app-exam-level-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './exam-level-list.component.html',
  styleUrls: ['./exam-level-list.component.scss']
})
export class ExamLevelListComponent implements OnInit {
  levels: ExamLevel[] = [];

  constructor(private svc: ExamLevelService) {}

  ngOnInit() {
    this.svc.getAll().subscribe(data => this.levels = data);
  }
}
