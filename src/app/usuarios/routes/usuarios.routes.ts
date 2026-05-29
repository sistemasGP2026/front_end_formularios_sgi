import { Routes } from '@angular/router';
import { ListUsuariosComponent } from '../components/list-usuarios-component/list-usuarios-component';
import { UsuariosDetailsComponent } from '../components/usuarios-details-component/usuarios-details-component';

export const usuarioRoutes: Routes = [{
    path: '',
    component: ListUsuariosComponent,
    children: [
        {path: ':id', component: UsuariosDetailsComponent}
    ]
}];
