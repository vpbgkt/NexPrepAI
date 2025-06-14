import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionService } from '../services/question.service';

@Component({
  selector: 'app-add-subtopic',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-subtopic.component.html',
  styleUrls: ['./add-subtopic.component.scss']
})
export class AddSubtopicComponent implements OnInit {
  branches: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  selectedBranchId = '';
  selectedSubjectId = '';
  selectedTopicId = '';
  subtopicName = '';
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
      
      if (this.cascadeFlow && params['branchId'] && params['subjectId'] && params['topicId']) {
        this.hierarchyData = {
          branchId: params['branchId'],
          branchName: params['branchName'],
          subjectId: params['subjectId'],
          subjectName: params['subjectName'],
          topicId: params['topicId'],
          topicName: params['topicName'],
          step: params['step']
        };
        // Pre-select all hierarchy levels from cascade flow
        this.selectedBranchId = params['branchId'];
        this.selectedSubjectId = params['subjectId'];
        this.selectedTopicId = params['topicId'];
      }
    });

    this.questionService.getBranches().subscribe({
      next: (res: any) => {
        this.branches = Array.isArray(res) ? res : res.branches || [];
        
        // If cascade flow, automatically load hierarchy
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
    }    this.questionService.getSubjects(this.selectedBranchId).subscribe({
      next: (res: any) => {
        this.subjects = res.subjects || res;
        
        // If cascade flow, automatically load subjects and then topics
        if (this.cascadeFlow && this.selectedSubjectId) {
          setTimeout(() => this.onSubjectChange(), 100);
        }
      },
      error: (err: any) => {
        console.error('Failed to load subjects', err);
      }
    });
  }

  onSubjectChange(): void {
    if (this.selectedSubjectId === 'none') {
      this.topics = [];
      this.selectedTopicId = '';
      return;
    }    this.questionService.getTopics(this.selectedSubjectId).subscribe({
      next: (res: any) => {
        this.topics = res.topics || res;
        
        // If cascade flow and topic is pre-selected, no need to do anything more
        // The topic dropdown will automatically show the correct value
      },
      error: (err: any) => {
        console.error('Failed to load topics', err);
      }
    });
  }

  submitSubtopic(form: NgForm): void {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    const payload = {
      name: this.subtopicName,
      topicId: this.selectedTopicId === 'none' ? null : this.selectedTopicId
    };    this.questionService.createSubtopic(payload).subscribe({
      next: (response: any) => {
        console.log('✅ Subtopic created successfully:', response);
        
        if (this.cascadeFlow) {
          // 🎉 Show success message with complete hierarchy
          const hierarchyComplete = `
            ✅ Complete Hierarchy Created Successfully!
            
            📁 Branch: ${this.hierarchyData.branchName}
            📚 Subject: ${this.hierarchyData.subjectName}
            📖 Topic: ${this.hierarchyData.topicName}
            📄 Subtopic: ${response.name}
            
            You can now create questions using this hierarchy.
          `;
          
          alert(hierarchyComplete);
          
          // Redirect to questions with the full hierarchy pre-selected
          this.router.navigate(['/add-question'], {
            queryParams: {
              branchId: this.hierarchyData.branchId,
              branchName: this.hierarchyData.branchName,
              subjectId: this.hierarchyData.subjectId,
              subjectName: this.hierarchyData.subjectName,
              topicId: this.hierarchyData.topicId,
              topicName: this.hierarchyData.topicName,
              subtopicId: response._id || response.id,
              subtopicName: response.name
            }
          });
        } else {
          // Normal flow - redirect to questions
          alert('Subtopic created successfully!');
          this.router.navigate(['/questions']);
        }
      },
      error: (err: any) => {
        console.error('Error creating subtopic:', err);
        alert('Error creating subtopic. Please try again.');
        this.isLoading = false;
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/questions']);
  }
}
