// frontend/src/app/guards/student.guard.ts
import { inject } from '@angular/core';
import {
  CanActivateFn,
  Router
} from '@angular/router';

export const studentGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token  = localStorage.getItem('token');
  const role   = localStorage.getItem('role');
  if (token && role === 'student') {
    return true;
  }
  router.navigate(['login']);
  return false;
};
