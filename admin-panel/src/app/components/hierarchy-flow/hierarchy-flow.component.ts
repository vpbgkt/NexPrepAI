import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { QuestionService } from '../../services/question.service';
import { BranchService } from '../../services/branch.service';
import { NotificationService } from '../../services/notification.service';

interface HierarchyStep {
  step: number;
  name: string;
  completed: boolean;
  data?: any;
}

@Component({
  selector: 'app-hierarchy-flow',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './hierarchy-flow.component.html',
  styleUrls: ['./hierarchy-flow.component.scss']
})
export class HierarchyFlowComponent implements OnInit {
  currentStep = 1;
  isLoading = false;
  errorMessage = '';
  
  // Form data
  branchName = '';
  subjectName = '';
  topicName = '';
  subtopicName = '';
  
  // Selection data
  selectedBranchId = '';
  selectedSubjectId = '';
  selectedTopicId = '';
  // Available options
  branches: any[] = [];
  subjects: any[] = [];
  topics: any[] = [];
  
  // Flow state
  useExistingBranch = false;
  useExistingSubject = false;
  useExistingTopic = false;
  
  // Steps tracking
  steps: HierarchyStep[] = [
    { step: 1, name: 'Branch', completed: false },
    { step: 2, name: 'Subject', completed: false },
    { step: 3, name: 'Topic', completed: false },
    { step: 4, name: 'Subtopic', completed: false }
  ];
  
  // Completed hierarchy data
  hierarchyData: any = {};

  // Similar branches for real-time detection
  similarBranches: any[] = [];

  constructor(
    private questionService: QuestionService,
    private branchService: BranchService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {}
  ngOnInit(): void {
    this.loadBranches();
    // Check if there are query parameters for pre-selection
    this.route.queryParams.subscribe(params => {
      if (params['branchId']) {
        this.selectedBranchId = params['branchId'];
        this.useExistingBranch = true;
        this.autoSelectBranch(params['branchId']);
      }
      if (params['branchName']) {
        this.branchName = params['branchName'];
        this.checkAndSuggestExistingBranch();
      }
    });
  }

  // Auto-detection and smart suggestion methods
  autoSelectBranch(branchId: string): void {
    setTimeout(() => {
      const branch = this.branches.find(b => b._id === branchId);
      if (branch) {
        this.selectedBranchId = branchId;
        this.hierarchyData.branchId = branch._id;
        this.hierarchyData.branchName = branch.name;
        this.steps[0].completed = true;
        this.steps[0].data = branch;
        this.currentStep = 2;
        this.loadSubjects(branchId);
      }
    }, 500); // Wait for branches to load
  }

  checkAndSuggestExistingBranch(): void {
    setTimeout(() => {
      if (this.branchName && this.branches.length > 0) {
        const exactMatch = this.branches.find(b => 
          b.name.toLowerCase() === this.branchName.toLowerCase().trim()
        );
        
        if (exactMatch) {
          // Show suggestion to use existing branch
          this.showBranchSuggestion(exactMatch);
        } else {
          // Check for partial matches
          const partialMatches = this.branches.filter(b =>
            b.name.toLowerCase().includes(this.branchName.toLowerCase().trim()) ||
            this.branchName.toLowerCase().includes(b.name.toLowerCase())
          );
          
          if (partialMatches.length > 0) {
            this.showPartialBranchMatches(partialMatches);
          }
        }
      }
    }, 500);
  }

  showBranchSuggestion(existingBranch: any): void {
    const message = `🔍 Found existing branch: "${existingBranch.name}"\n\n` +
                   `Would you like to use this existing branch instead of creating a new one?\n\n` +
                   `✅ Click "OK" to use existing branch\n` +
                   `❌ Click "Cancel" to create new branch`;
    
    if (confirm(message)) {
      this.useExistingBranch = true;
      this.selectedBranchId = existingBranch._id;
      this.branchName = '';
    }
  }

  showPartialBranchMatches(matches: any[]): void {
    if (matches.length === 1) {
      const match = matches[0];
      const message = `💡 Similar branch found: "${match.name}"\n\n` +
                     `Your input: "${this.branchName}"\n` +
                     `Did you mean: "${match.name}"?\n\n` +
                     `✅ Click "OK" to use "${match.name}"\n` +
                     `❌ Click "Cancel" to continue with "${this.branchName}"`;
      
      if (confirm(message)) {
        this.useExistingBranch = true;
        this.selectedBranchId = match._id;
        this.branchName = '';
      }
    } else if (matches.length <= 3) {
      const matchNames = matches.map(m => m.name).join('", "');
      const message = `💡 Similar branches found:\n"${matchNames}"\n\n` +
                     `Your input: "${this.branchName}"\n\n` +
                     `Switch to "Use Existing Branch" mode to select one of these?`;
      
      if (confirm(message)) {
        this.useExistingBranch = true;
        this.branchName = '';
      }
    }
  }

  // Enhanced branch loading with smart suggestions
  loadBranches(): void {
    this.questionService.getBranches().subscribe({
      next: (res: any) => {
        this.branches = Array.isArray(res) ? res : res.branches || [];
        
        // If we have a branch name from query params, check for suggestions
        if (this.branchName) {
          this.checkAndSuggestExistingBranch();
        }
        
        // Auto-suggest if only one branch exists
        if (this.branches.length === 1 && !this.useExistingBranch && !this.branchName) {
          this.suggestSingleBranch();
        }
      },
      error: (err: any) => {
        console.error('Failed to load branches', err);
        this.errorMessage = 'Failed to load branches';
      }
    });
  }

  suggestSingleBranch(): void {
    const branch = this.branches[0];
    const message = `💡 Only one branch exists: "${branch.name}"\n\n` +
                   `Would you like to use this branch to continue the hierarchy?\n\n` +
                   `✅ Click "OK" to use "${branch.name}"\n` +
                   `❌ Click "Cancel" to create a new branch`;
    
    if (confirm(message)) {
      this.useExistingBranch = true;
      this.selectedBranchId = branch._id;
    }
  }
  loadSubjects(branchId: string): void {
    this.questionService.getSubjects(branchId).subscribe({
      next: (res: any) => {
        this.subjects = res.subjects || res;
        
        // Auto-suggest if only one subject exists
        if (this.subjects.length === 1 && !this.useExistingSubject && !this.subjectName) {
          this.suggestSingleSubject();
        }
      },
      error: (err: any) => {
        console.error('Failed to load subjects', err);
      }
    });
  }

  loadTopics(subjectId: string): void {
    this.questionService.getTopics(subjectId).subscribe({
      next: (res: any) => {
        this.topics = res.topics || res;
        
        // Auto-suggest if only one topic exists
        if (this.topics.length === 1 && !this.useExistingTopic && !this.topicName) {
          this.suggestSingleTopic();
        }
      },
      error: (err: any) => {
        console.error('Failed to load topics', err);
      }
    });
  }

  // Check if branch name already exists
  checkBranchExists(): boolean {
    return this.branches.some(branch => 
      branch.name.toLowerCase() === this.branchName.toLowerCase().trim()
    );
  }

  // Check if subject name already exists for selected branch
  checkSubjectExists(): boolean {
    return this.subjects.some(subject => 
      subject.name.toLowerCase() === this.subjectName.toLowerCase().trim()
    );
  }

  // Check if topic name already exists for selected subject
  checkTopicExists(): boolean {
    return this.topics.some(topic => 
      topic.name.toLowerCase() === this.topicName.toLowerCase().trim()
    );
  }

  // Handle branch step
  handleBranchStep(): void {
    if (this.useExistingBranch && this.selectedBranchId) {
      // Use existing branch
      const selectedBranch = this.branches.find(b => b._id === this.selectedBranchId);
      this.hierarchyData.branchId = selectedBranch._id;
      this.hierarchyData.branchName = selectedBranch.name;
      this.steps[0].completed = true;
      this.steps[0].data = selectedBranch;
      this.currentStep = 2;
      this.loadSubjects(this.selectedBranchId);
    } else if (!this.useExistingBranch && this.branchName.trim()) {
      // Check if branch exists
      if (this.checkBranchExists()) {
        const existingBranch = this.branches.find(b => 
          b.name.toLowerCase() === this.branchName.toLowerCase().trim()
        );
        
        // Show confirmation dialog
        const useExisting = confirm(
          `Branch "${this.branchName}" already exists!\n\n` +
          `Do you want to:\n` +
          `• Click "OK" to use the existing branch\n` +
          `• Click "Cancel" to choose a different name`
        );
        
        if (useExisting) {
          this.selectedBranchId = existingBranch._id;
          this.hierarchyData.branchId = existingBranch._id;
          this.hierarchyData.branchName = existingBranch.name;
          this.steps[0].completed = true;
          this.steps[0].data = existingBranch;
          this.currentStep = 2;
          this.loadSubjects(this.selectedBranchId);
        }
        return;
      }
      
      // Create new branch
      this.createNewBranch();
    }
  }

  createNewBranch(): void {
    this.isLoading = true;
    
    this.branchService.createBranch(this.branchName.trim()).subscribe({
      next: (response: any) => {
        this.hierarchyData.branchId = response._id || response.id;
        this.hierarchyData.branchName = response.name;
        this.steps[0].completed = true;
        this.steps[0].data = response;
        this.currentStep = 2;
        this.selectedBranchId = response._id || response.id;
        this.loadSubjects(this.selectedBranchId);
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error creating branch:', err);
        this.errorMessage = 'Failed to create branch';
        this.isLoading = false;
      }
    });
  }

  // Handle subject step
  handleSubjectStep(): void {
    if (this.useExistingSubject && this.selectedSubjectId) {
      // Use existing subject
      const selectedSubject = this.subjects.find(s => s._id === this.selectedSubjectId);
      this.hierarchyData.subjectId = selectedSubject._id;
      this.hierarchyData.subjectName = selectedSubject.name;
      this.steps[1].completed = true;
      this.steps[1].data = selectedSubject;
      this.currentStep = 3;
      this.loadTopics(this.selectedSubjectId);
    } else if (!this.useExistingSubject && this.subjectName.trim()) {
      // Check if subject exists
      if (this.checkSubjectExists()) {
        const existingSubject = this.subjects.find(s => 
          s.name.toLowerCase() === this.subjectName.toLowerCase().trim()
        );
        
        const useExisting = confirm(
          `Subject "${this.subjectName}" already exists under "${this.hierarchyData.branchName}"!\n\n` +
          `Do you want to use the existing subject?`
        );
        
        if (useExisting) {
          this.selectedSubjectId = existingSubject._id;
          this.hierarchyData.subjectId = existingSubject._id;
          this.hierarchyData.subjectName = existingSubject.name;
          this.steps[1].completed = true;
          this.steps[1].data = existingSubject;
          this.currentStep = 3;
          this.loadTopics(this.selectedSubjectId);
        }
        return;
      }
      
      // Create new subject
      this.createNewSubject();
    }
  }

  createNewSubject(): void {
    this.isLoading = true;
    
    const payload = {
      name: this.subjectName.trim(),
      branchId: this.hierarchyData.branchId
    };
    
    this.questionService.createSubject(payload).subscribe({
      next: (response: any) => {
        this.hierarchyData.subjectId = response._id || response.id;
        this.hierarchyData.subjectName = response.name;
        this.steps[1].completed = true;
        this.steps[1].data = response;
        this.currentStep = 3;
        this.selectedSubjectId = response._id || response.id;
        this.loadTopics(this.selectedSubjectId);
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error creating subject:', err);
        this.errorMessage = 'Failed to create subject';
        this.isLoading = false;
      }
    });
  }

  // Handle topic step
  handleTopicStep(): void {
    if (this.useExistingTopic && this.selectedTopicId) {
      // Use existing topic
      const selectedTopic = this.topics.find(t => t._id === this.selectedTopicId);
      this.hierarchyData.topicId = selectedTopic._id;
      this.hierarchyData.topicName = selectedTopic.name;
      this.steps[2].completed = true;
      this.steps[2].data = selectedTopic;
      this.currentStep = 4;
    } else if (!this.useExistingTopic && this.topicName.trim()) {
      // Check if topic exists
      if (this.checkTopicExists()) {
        const existingTopic = this.topics.find(t => 
          t.name.toLowerCase() === this.topicName.toLowerCase().trim()
        );
        
        const useExisting = confirm(
          `Topic "${this.topicName}" already exists under "${this.hierarchyData.subjectName}"!\n\n` +
          `Do you want to use the existing topic?`
        );
        
        if (useExisting) {
          this.selectedTopicId = existingTopic._id;
          this.hierarchyData.topicId = existingTopic._id;
          this.hierarchyData.topicName = existingTopic.name;
          this.steps[2].completed = true;
          this.steps[2].data = existingTopic;
          this.currentStep = 4;
        }
        return;
      }
      
      // Create new topic
      this.createNewTopic();
    }
  }

  createNewTopic(): void {
    this.isLoading = true;
    
    const payload = {
      name: this.topicName.trim(),
      subjectId: this.hierarchyData.subjectId
    };
    
    this.questionService.createTopic(payload).subscribe({
      next: (response: any) => {
        this.hierarchyData.topicId = response._id || response.id;
        this.hierarchyData.topicName = response.name;
        this.steps[2].completed = true;
        this.steps[2].data = response;
        this.currentStep = 4;
        this.selectedTopicId = response._id || response.id;
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Error creating topic:', err);
        this.errorMessage = 'Failed to create topic';
        this.isLoading = false;
      }
    });
  }

  // Handle subtopic step (final step)
  handleSubtopicStep(): void {
    if (!this.subtopicName.trim()) return;
    
    this.isLoading = true;
    
    const payload = {
      name: this.subtopicName.trim(),
      topicId: this.hierarchyData.topicId
    };
    
    this.questionService.createSubtopic(payload).subscribe({
      next: (response: any) => {
        this.hierarchyData.subtopicId = response._id || response.id;
        this.hierarchyData.subtopicName = response.name;
        this.steps[3].completed = true;
        this.steps[3].data = response;
        
        // Show success and redirect
        this.showSuccessAndRedirect();
      },
      error: (err: any) => {
        console.error('Error creating subtopic:', err);
        this.errorMessage = 'Failed to create subtopic';
        this.isLoading = false;
      }
    });
  }

  showSuccessAndRedirect(): void {
    const successMessage = `Complete Hierarchy Created Successfully!

📁 Branch: ${this.hierarchyData.branchName}
📚 Subject: ${this.hierarchyData.subjectName}
📖 Topic: ${this.hierarchyData.topicName}
📄 Subtopic: ${this.hierarchyData.subtopicName}

You can now create questions using this hierarchy.`;
    
    this.notificationService.showSuccess('Hierarchy Created!', successMessage);
    
    // Redirect to add question with full hierarchy
    this.router.navigate(['/add-question'], {
      queryParams: this.hierarchyData
    });
  }

  // Navigation methods
  goToStep(step: number): void {
    if (step <= this.currentStep) {
      this.currentStep = step;
    }
  }

  cancel(): void {
    this.router.navigate(['/branches']);
  }

  // Toggle methods
  toggleBranchMode(): void {
    this.useExistingBranch = !this.useExistingBranch;
    this.branchName = '';
    this.selectedBranchId = '';
  }

  toggleSubjectMode(): void {
    this.useExistingSubject = !this.useExistingSubject;
    this.subjectName = '';
    this.selectedSubjectId = '';
  }

  toggleTopicMode(): void {
    this.useExistingTopic = !this.useExistingTopic;
    this.topicName = '';
    this.selectedTopicId = '';
  }

  suggestSingleSubject(): void {
    const subject = this.subjects[0];
    const message = `💡 Only one subject exists under "${this.hierarchyData.branchName}": "${subject.name}"\n\n` +
                   `Would you like to use this subject to continue the hierarchy?\n\n` +
                   `✅ Click "OK" to use "${subject.name}"\n` +
                   `❌ Click "Cancel" to create a new subject`;
    
    if (confirm(message)) {
      this.useExistingSubject = true;
      this.selectedSubjectId = subject._id;
    }
  }

  suggestSingleTopic(): void {
    const topic = this.topics[0];
    const message = `💡 Only one topic exists under "${this.hierarchyData.subjectName}": "${topic.name}"\n\n` +
                   `Would you like to use this topic to continue the hierarchy?\n\n` +
                   `✅ Click "OK" to use "${topic.name}"\n` +
                   `❌ Click "Cancel" to create a new topic`;
    
    if (confirm(message)) {
      this.useExistingTopic = true;
      this.selectedTopicId = topic._id;
    }
  }

  // Real-time branch name checking
  onBranchNameChange(): void {
    if (this.branchName && this.branchName.length >= 2) {
      this.checkForSimilarBranches();
    }
  }

  checkForSimilarBranches(): void {
    const inputName = this.branchName.toLowerCase().trim();
    
    // Check for exact match
    const exactMatch = this.branches.find(b => 
      b.name.toLowerCase() === inputName
    );
    
    if (exactMatch) {
      // Don't show popup repeatedly, just visual indicator
      return;
    }
    
    // Check for partial matches (similar names)
    const partialMatches = this.branches.filter(b => {
      const branchName = b.name.toLowerCase();
      return branchName.includes(inputName) || 
             inputName.includes(branchName) ||
             this.calculateSimilarity(branchName, inputName) > 0.6;
    });
    
    // Store similar branches for UI display
    this.similarBranches = partialMatches;
  }

  calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}
