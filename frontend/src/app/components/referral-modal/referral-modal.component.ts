import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-referral-modal',
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './referral-modal.component.html'
})
export class ReferralModalComponent implements OnInit {
  @Input() isVisible = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<any>();

  referralForm: FormGroup;
  isLoading = false;
  errorMessage: string | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService
  ) {
    this.referralForm = this.fb.group({
      referralCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(10)]]
    });
  }

  ngOnInit(): void {
    // Reset form when modal is opened
    if (this.isVisible) {
      this.referralForm.reset();
      this.errorMessage = null;
    }
  }

  ngOnChanges(): void {
    if (this.isVisible) {
      this.referralForm.reset();
      this.errorMessage = null;
    }
  }

  onSubmit(): void {
    if (this.referralForm.invalid) {
      this.referralForm.markAllAsTouched();
      return;
    }

    const referralCode = this.referralForm.get('referralCode')?.value;
    this.isLoading = true;
    this.errorMessage = null;

    this.authService.applyReferralCode(referralCode).subscribe({
      next: (response: any) => {
        this.isLoading = false;
        this.success.emit(response);
        this.closeModal();
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Failed to apply referral code. Please try again.';
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}
