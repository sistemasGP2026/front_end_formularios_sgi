import { Routes } from '@angular/router';
import { ResponsesLayoutComponent } from '../components/responses-layout-component/responses-layout-component';
import { ResponsesComponent } from '../components/responses-component/responses-component';
import { ResponsesDetailComponent } from '../components/responses-detail-component/responses-detail-component';


export const ResponsesRoutes:Routes = [
  {
    path: '',
    children:[
      {path: '', component: ResponsesComponent},
      {path: ':id', component: ResponsesDetailComponent},
    ]
  }
];
