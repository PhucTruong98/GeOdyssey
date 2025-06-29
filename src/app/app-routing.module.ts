import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'auth/login', pathMatch: 'full' },
  { path: 'auth', loadChildren: () => import('./auth/auth.module').then(m => m.AuthModule) },
  { path: 'map', canActivate: [AuthGuard], loadChildren: () => import('./map/map.module').then(m => m.MapModule) },
  { path: 'chat', canActivate: [AuthGuard], loadChildren: () => import('./chat/chat.module').then(m => m.ChatModule) },
  { path: 'profile', canActivate: [AuthGuard], loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule) },
  { path: '**', redirectTo: 'auth/login' }
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
