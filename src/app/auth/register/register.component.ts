import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: false,
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  name = '';
  email = '';
  password = '';
  errorMessage = '';
  form: FormGroup;
  returnUrl = "";


  constructor(   
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private auth: AuthService, 
    private router: Router) {


    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      name: ['', [Validators.required, Validators.minLength(2)]],


    });
  }
  ngOnInit(): void {
  this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/map';
  }

  register() {
    if (this.form.invalid) return;
    const { email, password , name} = this.form.value;

    this.auth.register(name, email, password).subscribe({
      next: () =>  this.router.navigateByUrl(this.returnUrl),
      error: err => (this.errorMessage = err.message)
    });
  }
}

