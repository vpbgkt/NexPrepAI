import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExamShiftService, ExamShift } from '../../../services/exam-shift.service';

@Component({
  standalone: true,
  selector: 'app-exam-shift-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './exam-shift-list.component.html',
  styleUrls: ['./exam-shift-list.component.scss']
})
export class ExamShiftListComponent implements OnInit {
  shifts: ExamShift[] = [];

  constructor(private svc: ExamShiftService) {}
  ngOnInit() {
    this.svc.getAll().subscribe(data => this.shifts = data);
  }

  getPaperName(paper: string | { _id: string; name: string; code: string }): string {
    return typeof paper === 'object' ? paper.name : paper;
  }
}
