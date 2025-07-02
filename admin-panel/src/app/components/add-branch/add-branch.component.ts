import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { BranchService } from '../../services/branch.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-add-branch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-branch.component.html',
  styleUrls: ['./add-branch.component.scss']
})
export class AddBranchComponent implements OnInit {

  // Holds the new branch name entered by admin
  branchName = '';

  // Manages UI loading state
  isLoading = false;
  
  // Cascade flow properties
  cascadeFlow = false;

  constructor(
    private branchService: BranchService,
    private router: Router,
    private route: ActivatedRoute,
    private notificationService: NotificationService
  ) {}
  ngOnInit(): void {
    // Check for cascade flow parameters
    this.route.queryParams.subscribe(params => {
      this.cascadeFlow = params['cascade'] === 'true';
    });
  }

  // Called on form submission
  addBranch(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.branchService.createBranch(this.branchName).subscribe({
      next: (response) => {
        console.log('✅ Branch created successfully:', response);
        
        if (this.cascadeFlow) {
          // 🚀 Redirect to Add Subject with branch data for cascade flow
          this.router.navigate(['/subjects/new'], {
            queryParams: {
              branchId: response._id || response.id,
              branchName: response.name,
              cascade: 'true',
              step: 'subject'
            }
          });
        } else {
          // Normal flow - redirect to questions
          this.notificationService.showSuccess('Branch Created Successfully!', `Branch "${response.name}" has been created successfully.`);
          this.router.navigate(['/questions']);
        }
      },
      error: (error) => {
        console.error('Error creating branch:', error);
        this.notificationService.showError('Creation Failed', 'Error creating branch. Please try again.');
        this.isLoading = false;
      }
    });
  }

  // Allows the admin to cancel and return to question list
  cancel() {
    this.router.navigate(['/questions']);
  }
}
