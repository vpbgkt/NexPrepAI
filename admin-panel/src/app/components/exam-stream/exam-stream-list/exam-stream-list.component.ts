import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExamStreamService, ExamStream } from '../../../services/exam-stream.service';

@Component({
  standalone: true,
  selector: 'app-exam-stream-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './exam-stream-list.component.html',
  styleUrls: ['./exam-stream-list.component.scss']
})
export class ExamStreamListComponent implements OnInit {
  streams: ExamStream[] = [];

  constructor(private svc: ExamStreamService) {}

  ngOnInit() {
    this.svc.getAll().subscribe(data => this.streams = data);
  }
}
