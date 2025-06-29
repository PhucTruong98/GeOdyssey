import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { user } from 'rxfire/auth';
import { map, take } from 'rxjs';
import { SessionService } from './session.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private auth: Auth, private router: Router, private session: SessionService) {}


canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.session.isLoggedIn$.pipe(
      take(1), // Only take the first value
      map(isLoggedIn => {
        if (!isLoggedIn) {
          this.router.navigate(['/auth/login'], {

            queryParams: { returnUrl: state.url}

          });
          return false;
        }
        return true;
      })
    );
  }
}