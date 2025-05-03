import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ExamFamilyService, ExamFamily } from '../../../services/exam-family.service';

@Component({
  standalone: true,
  selector: 'app-exam-family-list',
  imports: [CommonModule, RouterModule],
  templateUrl: './exam-family-list.component.html',
  styleUrls: ['./exam-family-list.component.scss']
})
export class ExamFamilyListComponent implements OnInit {
  families: ExamFamily[] = [];

  constructor(private svc: ExamFamilyService) {}

  ngOnInit() {
    this.svc.getAll().subscribe(data => (this.families = data));
  }
}
