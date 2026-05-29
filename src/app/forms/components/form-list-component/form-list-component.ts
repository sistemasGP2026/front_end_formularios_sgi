import { ChangeDetectorRef, Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { SharedModule } from 'primeng/api';
import { FormService } from '../../services/form.service';
import { Form, SectionPreview } from '../../interfaces/form.interface';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'form-list-component',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    FormsModule,
    TagModule,
    TooltipModule,
    SkeletonModule,
    RouterModule,
    SharedModule,
  ],
  templateUrl: './form-list-component.html',
})
export class FormListComponent implements OnInit {

  formList = signal<Form[]>([]);
  search = '';
  loading = true;
  skeletons = Array(6);

  constructor(
  ) { }
  private formService = inject(FormService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    const category = this.route.snapshot.paramMap.get('category');
    if (!category) {
      this.router.navigateByUrl('formularios')
      return;
    }
    this.getFormList(category);
  }

  filteredForms = computed(() => {

  const term = this.search.toLowerCase().trim();

  if (!term) {
    return this.formList();
  }

  return this.formList().filter(form =>

    form.name.toLowerCase().includes(term) ||
    form.code.toLowerCase().includes(term) ||
    form.description?.toLowerCase().includes(term) ||
    form.category?.toLowerCase().includes(term) ||
    form.createdBy?.name?.toLowerCase().includes(term)

  );

});

  getFormList(category: string): void {
    this.loading = true;
    this.formService.getFormByCategory(category).subscribe({
      next: (data) => {
        console.log(data);
        this.formList.set( data);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  // ── Helpers ──────────────────────────────────────────────────

  getSectionCount(form: Form): number {
    return form.sections?.length ?? 0;
  }

  getFieldCount(form: Form): number {
    return form.fields?.length ?? 0;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      PUBLISHED: 'success',
      DRAFT: 'warn',
      ARCHIVED: 'secondary',
      CLOSED: 'danger',
    };
    return map[status] ?? 'info';
  }

  getCategorySeverity(category: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary'> = {
      SST: 'danger',
      CALIDAD: 'success',
      RRHH: 'info',
      OPERACIONES: 'warn',
      FINANCIERO: 'success',
      LEGAL: 'secondary',
    };
    return map[category] ?? 'info';
  }

  getStatusLabel(status: string): string {
    const map: Record<string, string> = {
      PUBLISHED: 'Publicado',
      DRAFT: 'Borrador',
      ARCHIVED: 'Archivado',
      CLOSED: 'Cerrado',
    };
    return map[status] ?? status;
  }

  getSectionPreviews(form: Form): SectionPreview[] {
    const sections = (form.sections ?? [])
      .sort((a, b) => a.order - b.order)
      .slice(0, 2);

    return sections.map((section) => {
      const fields = (form.fields ?? [])
        .filter((f) => f.sectionId === section.id)
        .sort((a, b) => a.order - b.order)
        .slice(0, 2)
        .map((f) => ({ label: f.label, type: f.type }));

      return { title: section.title, fields };
    });
  }

  onCardClick(form: Form): void {
    this.router.navigate(['/forms', form.code]);
  }
}