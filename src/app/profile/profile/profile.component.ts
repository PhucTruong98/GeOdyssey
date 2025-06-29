import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SessionService } from '../../auth/session.service';
import { AuthService } from '../../auth/auth.service';
import { switchMap, take } from 'rxjs/operators';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  standalone: false
})
export class ProfileComponent implements OnInit {
  profileForm!: FormGroup;
  loading = true;
  saved = false;

  constructor(
    private fb: FormBuilder,
    private session: SessionService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    this.session.userId$
      .pipe(
        take(1),
        switchMap(uid => this.auth.getUserDoc(uid!))
      )
      .subscribe(user => {
        this.profileForm = this.fb.group({
          name: [user?.['name'] || '', Validators.required],
          email: [{ value: user?.['email'], disabled: true }]
        });
        this.loading = false;
      });
  }

  save() {
    if (this.profileForm.invalid) return;

    this.session.userId$.pipe(take(1)).subscribe(uid => {
      if (uid) {
        this.auth.updateUser(uid, this.profileForm.value).then(() => {
          this.saved = true;
          setTimeout(() => (this.saved = false), 3000);
        });
      }
    });
  }
}
