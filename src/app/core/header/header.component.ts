import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../auth/auth.service';
import { Observable } from 'rxjs';
import { Auth, user } from '@angular/fire/auth';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  standalone: false
})
export class HeaderComponent implements OnInit {
  langs = [
    {"value" : "en", "name": "English"}, 
    {"value" : "es", "name": "Spanish"}];


  currentLang = 'en';
  currentUser?: { displayName?: string; email?: string };
  user$: Observable<any>;

  constructor(
    private translate: TranslateService,
    private auth: AuthService,
    private router: Router,
    private afAuth: Auth
  ) {
    this.user$ = user(this.afAuth);
  }

  ngOnInit() {
    this.currentLang = this.translate.currentLang;
    this.translate.onLangChange.subscribe(e => this.currentLang = e.lang);

    this.user$.subscribe(u => {
      this.currentUser = u
        ? { displayName: u.displayName || u.email, email: u.email }
        : undefined;
    });
  }

  switchLang(lang: string) {
    this.translate.use(lang);
  }

  logout() {
    this.auth.logout().subscribe(() => this.router.navigate(['/auth/login']));
  }

  navigateTo(path: string) {
    this.router.navigate([`/${path}`]);
  }
}
