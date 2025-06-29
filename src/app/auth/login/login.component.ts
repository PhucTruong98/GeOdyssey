
import { Component } from '@angular/core';
import { AuthService } from '../auth.service';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: false,
  styleUrl: './login.component.scss'

})
export class LoginComponent {
  email = '';
  password = '';
  form: FormGroup;
  errorMessage = '';


  constructor(
    private fb: FormBuilder,
    private auth: AuthService, 
    private router: Router) {


      this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
    }

  login() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    this.auth.login(email, password).subscribe({
      next: () => this.router.navigate(['/map']),
      error: err => this.errorMessage = err.message
    });
  }
}
