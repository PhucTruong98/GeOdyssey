
import { Component, OnInit } from '@angular/core';
import { AuthService } from '../auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: false,
  styleUrl: './login.component.scss'

})
export class LoginComponent implements OnInit{
  email = '';
  password = '';
  form: FormGroup;
  errorMessage = '';
  returnUrl = "";


  constructor(
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private auth: AuthService, 
    private router: Router) {


      this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
    }

ngOnInit() {
  this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/map';
}


  login() {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    this.auth.login(email, password).subscribe({
      next: () =>  this.router.navigateByUrl(this.returnUrl),
      error: err => this.errorMessage = err.message
    });
  }
}
