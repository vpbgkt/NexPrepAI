import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExamPaperService, ExamPaper } from '../../../services/exam-paper.service';

@Component({
  standalone: true,
  selector: 'app-exam-paper-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './exam-paper-list.component.html',
  styleUrls: ['./exam-paper-list.component.scss']
})
export class ExamPaperListComponent implements OnInit {
  papers: ExamPaper[] = [];

  constructor(private svc: ExamPaperService) {}
  ngOnInit() {
    this.svc.getAll().subscribe(data => this.papers = data);
  }

  getFamilyName(family: string | { _id: string; name: string; code: string }): string {
    return typeof family === 'object' ? family.name : family;
  }

  getStreamName(stream: string | { _id: string; name: string; code: string }): string {
    return typeof stream === 'object' ? stream.name : stream;
  }
}
