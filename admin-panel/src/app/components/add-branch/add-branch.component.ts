import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { BranchService } from '../../services/branch.service';

@Component({
  selector: 'app-add-branch',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-branch.component.html',
  styleUrls: ['./add-branch.component.scss']
})
export class AddBranchComponent {

  // Holds the new branch name entered by admin
  branchName = '';

  // Manages UI loading state
  isLoading = false;

  constructor(
    private branchService: BranchService,
    private router: Router
  ) {}

  // Called on form submission
  addBranch(form: NgForm) {
    if (form.invalid) {
      form.control.markAllAsTouched();
      return;
    }

    this.isLoading = true;

    this.branchService.createBranch(this.branchName).subscribe({
      next: () => {
        alert('Branch created successfully!');
        this.router.navigate(['/questions']);
      },
      error: (error) => {
        console.error('Error creating branch:', error);
        alert('Error creating branch. Please try again.');
        this.isLoading = false;
      }
    });
  }

  // Allows the admin to cancel and return to question list
  cancel() {
    this.router.navigate(['/questions']);
  }
}
