import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionService } from '../services/question.service';

@Component({
  selector: 'app-add-topic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-topic.component.html',
  styleUrls: ['./add-topic.component.scss']
})
export class AddTopicComponent implements OnInit {
  branches: any[] = [];
  subjects: any[] = [];
  selectedBranchId = '';
  selectedSubjectId = '';
  topicName = '';
  isLoading = false;
  
  // Cascade flow properties
  cascadeFlow = false;
  hierarchyData: any = {};

  constructor(
    private questionService: QuestionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}
  ngOnInit(): void {
    // Check for cascade flow parameters
    this.route.queryParams.subscribe(params => {
      this.cascadeFlow = params['cascade'] === 'true';
      
      if (this.cascadeFlow && params['branchId'] && params['subjectId']) {
        this.hierarchyData = {
          branchId: params['branchId'],
          branchName: params['branchName'],
          subjectId: params['subjectId'],
          subjectName: params['subjectName'],
          step: params['step']
        };
        // Pre-select branch and subject from cascade flow
        this.selectedBranchId = params['branchId'];
        this.selectedSubjectId = params['subjectId'];
      }
    });

    this.questionService.getBranches().subscribe({
      next: (res: any) => {
        this.branches = Array.isArray(res) ? res : res.branches || [];
        
        // If cascade flow, automatically load subjects
        if (this.cascadeFlow && this.selectedBranchId) {
          this.onBranchChange();
        }
      },
      error: (err: any) => {
        console.error('Failed to load branches', err);
      }
    });
  }

  onBranchChange(): void {
    if (this.selectedBranchId === 'none') {
      this.subjects = [];
      this.selectedSubjectId = '';
      return;
    }

    this.questionService.getSubjects(this.selectedBranchId).subscribe({
      next: (res: any) => {
        this.subjects = res.subjects || res;
      },
      error: (err: any) => {
        console.error('Failed to load subjects', err);
      }
    });
  }

  submitTopic(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const payload = {
      name: this.topicName,
      subjectId: this.selectedSubjectId === 'none' ? null : this.selectedSubjectId
    };    this.questionService.createTopic(payload).subscribe({
      next: (response: any) => {
        console.log('✅ Topic created successfully:', response);
        
        if (this.cascadeFlow) {
          // 🚀 Redirect to Add Subtopic with hierarchy data for cascade flow
          this.router.navigate(['/subtopics/new'], {
            queryParams: {
              branchId: this.hierarchyData.branchId,
              branchName: this.hierarchyData.branchName,
              subjectId: this.hierarchyData.subjectId,
              subjectName: this.hierarchyData.subjectName,
              topicId: response._id || response.id,
              topicName: response.name,
              cascade: 'true',
              step: 'subtopic'
            }
          });
        } else {
          // Normal flow - redirect to questions
          alert('Topic created successfully!');
          this.router.navigate(['/questions']);
        }
      },
      error: (err: any) => {
        console.error('Error creating topic:', err);
        alert('Error creating topic. Please try again.');
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/questions']);
  }
}
