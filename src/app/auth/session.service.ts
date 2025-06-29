//this provide quick lookup for current user logged in

// src/app/auth/session.service.ts
import { Injectable } from '@angular/core';
import { Auth, user as firebaseUser } from '@angular/fire/auth';
import { Observable, map, of, shareReplay } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly user$: Observable<any>;
  readonly isLoggedIn$: Observable<boolean>;
  readonly userId$: Observable<string | null>;
  readonly displayName$: Observable<string | null>;

  constructor(private auth: Auth) {
    //retrive the current user from firebase, shareReplay(1) means that only 1 subscription connect to firebase listener, better performance
    this.user$ = firebaseUser(this.auth).pipe(shareReplay(1));

    this.isLoggedIn$ = this.user$.pipe(map(user => !!user));
    this.userId$ = this.user$.pipe(map(user => user?.uid ?? null));
    //get the displayed name, if doesnt exist then show the email instead
    this.displayName$ = this.user$.pipe(map(user => user?.displayName ?? user?.email ?? null));
  }

  // Optional helpers
  get currentUser() {
    return this.auth.currentUser;
  }
}
