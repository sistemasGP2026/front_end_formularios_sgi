import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { switchMap } from 'rxjs';
import { ResponseService } from '../../services/response.service';
import { FormService } from '../../../forms/services/form.service';
import { ResponseInterface } from '../../interfaces/response.interface';
import { Form } from '../../../forms/interfaces/form.interface';
import { FormPreviewComponent } from '../../../forms/components/pages/form-preview/form-preview';
import { SectionWithFields } from '../../../forms/components/form-detail-component/form-detail-component';

@Component({
  selector: 'app-responses-detail-component',
  standalone: true,
  imports: [DatePipe, FormPreviewComponent, TagModule],
  templateUrl: './responses-detail-component.html',
})
export class ResponsesDetailComponent implements OnInit {

  readonly mode = 'view' as const;

  responses = signal<ResponseInterface | null>(null);
  form = signal<Form | null>(null);
  sectionsWithFields = signal<SectionWithFields[]>([]);
  ready = signal(false);

  private readonly responseService = inject(ResponseService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formService = inject(FormService);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.router.navigateByUrl('/respuestas'); return; }
    this.loadData(id);
  }

  private loadData(id: string): void {
    this.responseService.getResponseDetail(id).pipe(
      switchMap((resp) => {
        this.responses.set(resp);
        return this.formService.getFormByCode(resp.formCode);
      }),
    ).subscribe({
      next: (form) => {
        this.form.set(form);
        this.sectionsWithFields.set(this.buildSectionsWithFields(form));
        this.ready.set(true);
      },
      error: (error) => {
        console.error(error);
        this.router.navigate(['/respuestas']);
      },
    });
  }

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

  goBack(): void { this.router.navigate(['/respuestas']); }
}