import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExamBranchService, ExamBranch } from '../../../services/exam-branch.service';

@Component({
  standalone: true,
  selector: 'app-exam-branch-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './exam-branch-list.component.html',
  styleUrls: ['./exam-branch-list.component.scss']
})
export class ExamBranchListComponent implements OnInit {
  branches: ExamBranch[] = [];

  constructor(private svc: ExamBranchService) {}

  ngOnInit() {
    this.svc.getAll().subscribe(data => this.branches = data);
  }

  getLevelName(level: string | { _id: string; name: string; code: string }): string {
    return typeof level === 'object' ? level.name : level;
  }
}
