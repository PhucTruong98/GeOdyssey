import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { user } from 'rxfire/auth';
import { map } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router) {}

  canActivate() {
    return user(this.auth).pipe(
      map(u => {
        if (u) return true;
        this.router.navigate(['/login']);
        return false;
      })
    );
  }
}