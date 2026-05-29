import { Component, inject, OnInit, signal } from '@angular/core';
import { ResponseInterface } from '../../interfaces/response.interface';
import { InputIconModule } from 'primeng/inputicon';
import { IconFieldModule } from 'primeng/iconfield';
import { CommonModule, } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AvatarModule } from 'primeng/avatar';
import { SkeletonModule } from 'primeng/skeleton';
import { TooltipModule } from 'primeng/tooltip';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { BadgeModule } from 'primeng/badge';
import { FormService } from '../../../forms/services/form.service';
import { Form } from '../../../forms/interfaces/form.interface';
import { ResponseService } from '../../services/response.service';
import { CheckboxModule } from 'primeng/checkbox';
import { PdfService } from '../../../shared/services/pdf.service';

export interface FormGroup {
  formCode: string,
  count: number,
  responses: ResponseInterface[]
}

@Component({
  selector: 'responses-component',
  imports: [
    CommonModule,
    CheckboxModule,
    FormsModule,
    RouterModule,
    TagModule,
    ButtonModule,
    InputTextModule,
    AvatarModule,
    BadgeModule,
    SkeletonModule,
    TooltipModule,
    ToggleSwitchModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './responses-component.html',
})
export class ResponsesComponent implements OnInit {

  private readonly formService = inject(FormService);
  private readonly responseService = inject(ResponseService);
  private readonly pdfService = inject(PdfService);

  loading = signal(true)
  responses = signal<ResponseInterface[]>([])
  forms = signal<Form[]>([])
  selectedFormCode = signal<string | null>(null)
  form = signal<Form | null>(null)
  selectedResponse = signal<ResponseInterface | null>(null);
  selectedResponses = signal<string[]>([]);
  selectAll = signal(false);

  // TODO: hacer que esto funcione POR MI MISMO!!!!!
  searchSidebar = signal('');
  searchList = signal('');

  ngOnInit(): void {
    this.getAllForms()
  }
  private getAllForms() {
    this.formService.getAllForms().subscribe({
      next: (resp) => {
        this.forms.set(resp)
        this.getResponses();
      }
    })
  }

  selectedForm(code: string) {
    this.form.set(null);
    this.responses.set([]);
    this.selectedResponse.set(null);

    this.formService.getFormByCode(code).subscribe({
      next: (resp) => {
        this.form.set(resp)
      }
    });

    this.responseService.getResponsesByForm(code).subscribe({
      next: (resp) => this.responses.set(resp),
      error: (err) => console.log(err),
    });
  }

  selectResponse(response: ResponseInterface): void {
    this.selectedResponse.set(response);
  }

  getResponses() {
    const code = this.selectedFormCode()
    if (code) {
      this.responseService.getResponsesByForm(code).subscribe({
        next: (resp) => {
          this.responses.set(resp)
        },
        error: (err) => {
          console.log(err);
        }
      })
    }
  }

  getDataEntries(data: Record<string, unknown>): { key: string; value: unknown }[] {
    return Object.entries(data ?? {}).map(([key, value]) => ({ key, value }));
  }

  toggleResponse(responseId: string, checked: boolean) {

    if (checked) {

      this.selectedResponses.update(ids => [...ids, responseId]);

    } else {

      this.selectedResponses.update(ids =>
        ids.filter(id => id !== responseId)
      );

      this.selectAll.set(false);
    }
  }

  toggleAllResponses(checked: boolean) {

    this.selectAll.set(checked);

    if (checked) {

      this.selectedResponses.set(
        this.responses().map(r => r._id)
      );

    } else {

      this.selectedResponses.set([]);
    }
  }

  isSelected(responseId: string): boolean {
    return this.selectedResponses().includes(responseId);
  }

  downloadResponse(response: ResponseInterface | null) {
    const form = this.form();

    const target = response ?? this.responses().find(
      r => this.selectedResponses().includes(r._id)
    ) ?? null;

    if (!target || !form) return;
    this.pdfService.generateResponsePdf(target, form);
  }





  // Generar un helper para estas funciones

  getInitials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  isArray(value: unknown): boolean {
    return Array.isArray(value);
  }

  isStringArray(value: unknown): boolean {
    return Array.isArray(value) && value.every((v) => typeof v === 'string' || typeof v === 'number');
  }

  asArray(value: unknown): unknown[] {
    return value as unknown[];
  }

  asObjectArray(value: unknown): Record<string, unknown>[] {
    return value as Record<string, unknown>[];
  }

  getObjectEntries(obj: Record<string, unknown>): { key: string; value: unknown }[] {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
  }

  getFieldLabel(fieldId: string): string {
    const field = this.form()?.fields?.find((f) => f.id === fieldId);
    return field?.label ?? fieldId; // si no encuentra el campo, muestra el id
  }

}
