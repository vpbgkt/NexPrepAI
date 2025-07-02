import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgForm, FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionService } from '../services/question.service';
import { NotificationService } from '../services/notification.service';

@Component({
  selector: 'app-add-subject',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-subject.component.html',
  styleUrls: ['./add-subject.component.scss']
})
export class AddSubjectComponent implements OnInit {
  branches: any[] = [];
  selectedBranchId = '';
  subjectName = '';
  isLoading = false;
  
  // Cascade flow properties
  cascadeFlow = false;
  hierarchyData: any = {};

  constructor(
    private questionService: QuestionService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {}
  ngOnInit(): void {
    // Check for cascade flow parameters
    this.route.queryParams.subscribe(params => {
      this.cascadeFlow = params['cascade'] === 'true';
      
      if (this.cascadeFlow && params['branchId']) {
        this.hierarchyData = {
          branchId: params['branchId'],
          branchName: params['branchName'],
          step: params['step']
        };
        // Pre-select the branch from cascade flow
        this.selectedBranchId = params['branchId'];
      }
    });

    this.questionService.getBranches().subscribe({
      next: (res) => {
        this.branches = Array.isArray(res) ? res : res.branches || [];
      },
      error: (err) => {
        console.error('Failed to load branches', err);
      }
    });
  }

  submitSubject(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const payload = {
      name: this.subjectName,
      branchId: this.selectedBranchId === 'none' ? null : this.selectedBranchId
    };    this.questionService.createSubject(payload).subscribe({
      next: (response: any) => {
        console.log('✅ Subject created successfully:', response);
        
        if (this.cascadeFlow) {
          // 🚀 Redirect to Add Topic with hierarchy data for cascade flow
          this.router.navigate(['/topics/new'], {
            queryParams: {
              branchId: this.hierarchyData.branchId,
              branchName: this.hierarchyData.branchName,
              subjectId: response._id || response.id,
              subjectName: response.name,
              cascade: 'true',
              step: 'topic'
            }
          });
        } else {
          // Normal flow - redirect to questions
          this.notificationService.showSuccess('Subject Created Successfully!', `Subject "${this.subjectName}" has been created successfully.`);
          this.router.navigate(['/questions']);
        }
      },
      error: (err) => {
        console.error('Error creating subject:', err);
        this.notificationService.showError('Creation Failed', 'Error creating subject. Please try again.');
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/questions']);
  }
}
