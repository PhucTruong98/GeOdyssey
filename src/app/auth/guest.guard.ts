import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { SessionService } from './session.service';
import { map, take } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class GuestGuard implements CanActivate {
  constructor(
    private session: SessionService,
    private router: Router
  ) {}

  canActivate() {
    return this.session.isLoggedIn$.pipe(
      take(1),
      map(isLoggedIn => {
        if (isLoggedIn) {
          this.router.navigate(['/map']); // Or dashboard/home
          return false;
        }
        return true;
      })
    );
  }
}
