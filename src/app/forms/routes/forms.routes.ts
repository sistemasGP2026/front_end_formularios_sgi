import { Routes } from "@angular/router";
import { FormDetailComponent } from "../components/form-detail-component/form-detail-component";
import { FormListComponent } from "../components/form-list-component/form-list-component";
import { FormCategoryListPage } from "../components/pages/form-category-list-page/form-category-list-page";
import { CreateFormComponent } from "../components/create-form-component/create-form-component";

export const formsRoutes: Routes = [
  {
    path: '',
    children: [
      { path: '',              component: FormCategoryListPage  }, 
      { path: 'crear/nuevo',   component: CreateFormComponent   }, 
      { path: 'categoria/:category', component: FormListComponent },
      { path: ':code',         component: FormDetailComponent   }, 
    ]
  },
];