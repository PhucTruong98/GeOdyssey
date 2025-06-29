import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from '@angular/fire/auth';
import { from, switchMap } from 'rxjs';
import { Firestore, doc, docData, setDoc } from '@angular/fire/firestore';

@Injectable({ providedIn: 'root' })
export class AuthService {
  constructor(private auth: Auth, private afs: Firestore) {}

  login(email: string, password: string) {
    return from(signInWithEmailAndPassword(this.auth, email, password));
  }

  register(name: string, email: string, password: string) {
    return from(createUserWithEmailAndPassword(this.auth, email, password)).pipe(
      switchMap((userCred) => {
        const userRef = doc(this.afs, `users/${userCred.user.uid}`);
        return setDoc(userRef, { name, email, createdAt: new Date() }).then(() => userCred);
      })
    );
  }

  getUserDoc(uid: string) {
    const userRef = doc(this.afs, `users/${uid}`);
    return docData(userRef);
  }

  updateUser(uid: string, data: Partial<{ name: string }>) {
  const userRef = doc(this.afs, `users/${uid}`);
  return setDoc(userRef, data, { merge: true });
}


  logout() {
    return from(signOut(this.auth));
  }
}