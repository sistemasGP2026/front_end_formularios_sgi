import { Routes } from '@angular/router';
import { SignInComponent } from '../components/sign-in-component/sign-in-component';


export const authRoutes: Routes = [
  {
    path: 'sign-in',
    component: SignInComponent
  },
  {path:'**', redirectTo: 'sign-in'}
];