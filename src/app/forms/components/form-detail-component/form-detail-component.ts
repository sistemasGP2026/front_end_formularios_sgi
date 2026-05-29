import { ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink, RouterModule } from '@angular/router';
import { CommonModule, DatePipe } from '@angular/common';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { DividerModule } from 'primeng/divider';
import { Form, FormField, FormSection } from '../../interfaces/form.interface';
import { FormService } from '../../services/form.service';
import { ResponseInterface } from '../../../responses/interfaces/response.interface';
import { ResponseService } from '../../../responses/services/response.service';
import { FormPreviewComponent } from '../pages/form-preview/form-preview';
import { AssignUserPermissionPage } from '../assign-user-permission-page/assign-user-permission-page';
import { UserResponse } from '../../../usuarios/interfaces/users.response.interface';
import { UsuarioService } from '../../../usuarios/services/usuario.service';
import { MessageService } from 'primeng/api';

export interface SectionWithFields {
  section: FormSection;
  fields: FormField[];
}

@Component({
  selector: 'form-detail-component',
  standalone: true,
  imports: [
    AssignUserPermissionPage,
    CommonModule,
    DatePipe,
    TagModule,
    TooltipModule,
    SkeletonModule,
    DividerModule,
    FormPreviewComponent,
    RouterLink,
    RouterModule,
    DatePipe
],
providers:[MessageService],
  templateUrl: './form-detail-component.html',
})
export class FormDetailComponent implements OnInit {
  visible: boolean = false
  mode: 'preview' | 'respond' = 'preview';
  form: Form | null = null;
  sectionsWithFields: SectionWithFields[] = [];
  loading = true;

  showResponsesPanel = false;
  responses: ResponseInterface[] = [];
  responsesTotal = 0;

  selectedUsers = signal<string[]>([]);
  userList = signal<UserResponse[]>([])

  private message = inject(MessageService);
  private usuarioService = inject(UsuarioService);
  private route = inject(ActivatedRoute)
  private formService = inject(FormService)
  private cdr = inject(ChangeDetectorRef)
  private router = inject(Router)
  private responseService = inject(ResponseService)

  ngOnInit(): void {
    const code = this.route.snapshot.paramMap.get('code');
    const mode = this.route.snapshot.queryParamMap.get('mode');
    this.mode = mode === 'respond' ? 'respond' : 'preview';

    if (!code) {
      this.router.navigate(['/formularios']);
      return;
    }
    this.loadForm(code.toUpperCase());
  }

  toggleResponsesPanel(): void {
    this.showResponsesPanel = !this.showResponsesPanel;
    if (this.showResponsesPanel && this.responses.length === 0) {
      this.loadResponses();
    }
  }
openAssignModal(): void {

  this.visible = true;

  // evitar volver a cargar si ya existen
  if (this.userList().length > 0) return;

  this.usuarioService.getAllUsers().subscribe({
    next: (users) => {

      this.userList.set(users);

    },
    error: (err) => {
      console.log(err);
    }
  });

}

  loadResponses(): void {
    if (!this.form) return;

    const code = this.route.snapshot.paramMap.get('code');
    if (!code) return;

    this.responseService.getResponsesByForm(this.form.code).subscribe({
      next: (resp) => {
        this.responses = resp;
        this.responsesTotal = resp.length;
        
        if (this.responsesTotal > 0) {
          this.showResponsesPanel = true;
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.responses = []
        this.responsesTotal = 0;
        console.log(err);
      }
    })

  }
  
  closeResponsesPanel(): void {
    this.showResponsesPanel = false;
  }

  getInitials(fullName: string): string {
    return fullName
      .split(' ')
      .slice(0, 2)
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  private loadForm(code: string): void {
    this.loading = true;

    this.formService.getFormByCode(code).subscribe({
      next: (form) => {
        if (!form) {
          this.router.navigate(['/formularios']);
          return;
        }
        this.form = form;
        this.sectionsWithFields = this.buildSectionsWithFields(form);
        this.loading = false;
        
        this.loadResponses()
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
  openModal(){
    this.visible = true;
  }

  assigPermision(usernames: string[]) {
  const code = this.route.snapshot.paramMap.get('code');
  if (!code) return;
  this.formService.assignPermissionToUser(code, usernames).subscribe({
    next: (data) => {
      this.form?.permissions.users.push(...data);
      this.message.add({ severity: 'success', summary: 'Realizado', detail: 'Permiso asignado correctamente' });
    },
    error: (error) => console.log(error)
  });
}

  // Hacer esto en un middleware
  private buildSectionsWithFields(form: Form): SectionWithFields[] {
    return (form.sections ?? [])
      .sort((a, b) => a.order - b.order)
      .map((section) => ({
        section,
        fields: (form.fields ?? [])
          .filter((f) => f.sectionId === section.id)
          .sort((a, b) => a.order - b.order),
      }));
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      PUBLISHED: 'success', DRAFT: 'warn', ARCHIVED: 'secondary', CLOSED: 'danger',
    };
    return map[status] ?? 'info';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PUBLISHED: 'Publicado', DRAFT: 'Borrador', ARCHIVED: 'Archivado', CLOSED: 'Cerrado',
    };
    return map[status] ?? status;
  }

  goBack(): void {
    this.router.navigate(['/formularios']);
  }

}