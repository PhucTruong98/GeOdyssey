import { Component } from '@angular/core';
import { AuthService } from './auth/auth.service';
import { Router } from '@angular/router';
import { Auth, user } from '@angular/fire/auth';
import { Observable, of, switchMap } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  user$: Observable<any>;
  profileName$: Observable<any>;
  menuOpen = false;


  constructor(
    public translate: TranslateService,
    private auth: AuthService,
    private router: Router,
    private afAuth: Auth) {


    this.user$ = user(this.afAuth);
    this.profileName$ = this.user$.pipe(
      switchMap(u => (u ? this.auth.getUserDoc(u.uid) : of(null)))
    );
    translate.addLangs(['en', 'es']);
    translate.setDefaultLang('en');

    const browserLang = translate.getBrowserLang() ?? "en";
    translate.use(browserLang.match(/en|es/) ? browserLang : 'en');
  }
  logout() {
    this.auth.logout().subscribe(() => {
      this.router.navigate(['/auth/login']);
    });
  }

  toggleMenu() { this.menuOpen = !this.menuOpen; }
  switchLang(event: Event) {
    const lang = (event.target as HTMLSelectElement).value;
    this.translate.use(lang);
  }
  title = 'geodyssey';
}
