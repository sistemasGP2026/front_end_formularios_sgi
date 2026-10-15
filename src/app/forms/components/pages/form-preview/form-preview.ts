import { ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Form, FormField, FormSection } from '../../../interfaces/form.interface';
import { ResponseService } from '../../../../responses/services/response.service';
import { DraftService } from '../../../../responses/services/draft.service';
import { DraftInterface, DraftProgress } from '../../../../responses/interfaces/draft.interface';
import { SedesService } from '../../../services/sedes.service';
import { CreateResponse } from '../../../interfaces/create-response.dto';

export interface SectionWithFields {
  section: FormSection;
  fields: FormField[];
}

@Component({
  selector: 'form-preview',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './form-preview.html',
})
export class FormPreviewComponent implements OnInit, OnChanges {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private responseService = inject(ResponseService);
  private draftService = inject(DraftService);
  private sedeService = inject(SedesService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  @Input() sectionsWithFields: SectionWithFields[] = [];
  @Input() formName = '';
  @Input() form!: Form;
  @Input() mode: 'preview' | 'respond' | 'view' = 'preview';
  @Input() responseData: Record<string, unknown> | null = null;
  /** Borrador que se está continuando (modo respond). Se actualiza al guardar. */
  @Input() draftId: string | null = null;
  @Input() draftSavedAt: string | null = null;
  /** Avisa al padre cada vez que se guarda el borrador (nuevo o actualizado). */
  @Output() draftSaved = new EventEmitter<DraftInterface>();

  formGroup!: FormGroup;
  activeFieldIds = new Set<string>();
  sedesOptions: { label: string; value: string }[] = [];

  private formCode!: string;
  submitting = false;
  submitError = '';
  submitSuccess = false;
  savingDraft = false;

  get isPreview(): boolean {
    return this.mode === 'preview' || this.mode === 'view';
  }

  ngOnInit(): void {
    this.formCode = this.route.snapshot.paramMap.get('code') ?? '';
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    const sectionsChanged = changes['sectionsWithFields'] && !changes['sectionsWithFields'].firstChange;
    const dataChanged = changes['responseData'] && !changes['responseData'].firstChange;

    // Se reconstruye también cuando llegan datos nuevos (p. ej. al continuar un borrador
    // sobre un formulario que ya está en pantalla).
    if (sectionsChanged || dataChanged) {
      this.initializeForm();
    }
  }

  private initializeForm(): void {
    this.loadSedesIfNeeded();
    this.buildFormGroup();
    this.evaluateConditionals();
    this.applyResponseData();

    if (this.isPreview) {
      this.formGroup.disable({ emitEvent: false });
    }

    this.evaluateCalculatedFields();
  }

  private applyResponseData(): void {
    if (!this.responseData || !Object.keys(this.responseData).length) return;

    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);
    const mapped: Record<string, unknown> = {};

    for (const field of allFields) {
      if (this.responseData[field.name] !== undefined) {
        mapped[field.id] = this.responseData[field.name];
      }
    }

    this.formGroup.patchValue(mapped, { emitEvent: false });

    // Con los valores restaurados, los campos condicionales deben mostrarse/ocultarse
    // como si el usuario los hubiera diligenciado (solo aplica cuando se puede editar).
    if (!this.isPreview) {
      this.evaluateConditionals();
    }

    this.evaluateCalculatedFields();
  }

  private buildFormGroup(): void {
    if (!this.sectionsWithFields?.length) return;

    const controls: Record<string, any> = {};
    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);

    for (const field of allFields) {
      const validators = this.mode === 'respond' ? this.buildValidators(field) : [];

      if (this.isCalculatedField(field)) {
        controls[field.id] = this.fb.control({ value: '0.00', disabled: true });
        continue;
      }

      switch (field.type) {
        case 'checkbox':
        case 'checklist-table':
        case 'inventory-table':
          controls[field.id] = this.fb.control([], validators);
          break;
        case 'number':
        case 'rating':
          controls[field.id] = this.fb.control(null, validators);
          break;
        default:
          controls[field.id] = this.fb.control('', validators);
      }
    }

    this.formGroup = this.fb.group(controls);

    this.formGroup.valueChanges.subscribe(() => {
      this.evaluateCalculatedFields();
    });

    if (this.isPreview) {
      this.formGroup.disable({ emitEvent: false });
    }
  }

  private buildValidators(field: FormField): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    if (field.required) validators.push(Validators.required);

    for (const rule of field.validations ?? []) {
      switch (rule.type) {
        case 'MIN_LENGTH': validators.push(Validators.minLength(Number(rule.value))); break;
        case 'MAX_LENGTH': validators.push(Validators.maxLength(Number(rule.value))); break;
        case 'PATTERN': if (rule.value) validators.push(Validators.pattern(rule.value)); break;
        case 'MIN_VALUE': validators.push(Validators.min(Number(rule.value))); break;
        case 'MAX_VALUE': validators.push(Validators.max(Number(rule.value))); break;
        case 'EMAIL_FORMAT': validators.push(Validators.email); break;
        case 'MIN_SELECTIONS': validators.push(this.minSelectionsValidator(Number(rule.value), rule.errorMessage)); break;
        case 'MAX_SELECTIONS': validators.push(this.maxSelectionsValidator(Number(rule.value), rule.errorMessage)); break;
        case 'FUTURE_DATE_ONLY': validators.push(this.futureDateValidator(rule.errorMessage)); break;
        case 'PAST_DATE_ONLY': validators.push(this.pastDateValidator(rule.errorMessage)); break;
        case 'IS_INTEGER': validators.push(this.integerValidator(rule.errorMessage)); break;
      }
    }

    return validators;
  }

  private minSelectionsValidator(min: number, message: string): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value as string[];
      if (!Array.isArray(value) || value.length < min) return { minSelections: { message } };
      return null;
    };
  }

  private maxSelectionsValidator(max: number, message: string): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value as string[];
      if (Array.isArray(value) && value.length > max) return { maxSelections: { message } };
      return null;
    };
  }

  private futureDateValidator(message: string): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) return null;
      const date = new Date(control.value);
      if (isNaN(date.getTime()) || date <= new Date()) return { futureDate: { message } };
      return null;
    };
  }

  private pastDateValidator(message: string): ValidatorFn {
    return (control: AbstractControl) => {
      if (!control.value) return null;
      const date = new Date(control.value);
      if (isNaN(date.getTime()) || date >= new Date()) return { pastDate: { message } };
      return null;
    };
  }

  private integerValidator(message: string): ValidatorFn {
    return (control: AbstractControl) => {
      if (control.value === null || control.value === '') return null;
      if (!Number.isInteger(Number(control.value))) return { isInteger: { message } };
      return null;
    };
  }

  private loadSedesIfNeeded(): void {
    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);
    const hasSedeField = allFields.some(f => f.dataSource === 'sedes');
    if (!hasSedeField) return;

    this.sedeService.findAll().subscribe({
      next: (sedes) => {
        this.sedesOptions = sedes.map(s => ({ label: s.name, value: s.code }));
      },
    });
  }

  evaluateConditionals(): void {
    this.activeFieldIds.clear();
    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);

    for (const field of allFields) {
      const active = !field.conditionalRules?.length
        ? !field.hidden
        : this.evaluateRules(field);

      if (active) {
        this.activeFieldIds.add(field.id);
        if (!this.isPreview && !this.isCalculatedField(field)) {
          this.formGroup?.get(field.id)?.enable({ emitEvent: false });
        }
      } else {
        this.formGroup?.get(field.id)?.disable({ emitEvent: false });
        if (!this.isPreview) {
          this.formGroup?.get(field.id)?.reset('', { emitEvent: false });
        }
      }
    }
  }

  private evaluateRules(field: FormField): boolean {
    let hasShowRule = false, showTriggered = false, hideTriggered = false;

    for (const rule of field.conditionalRules ?? []) {
      const met = this.evaluateCondition(
        this.formGroup?.get(rule.triggerFieldId)?.value,
        rule.operator,
        rule.expectedValue,
      );
      if (rule.action === 'SHOW') { hasShowRule = true; if (met) showTriggered = true; }
      if (rule.action === 'HIDE' && met) hideTriggered = true;
    }

    if (hideTriggered) return false;
    if (hasShowRule) return showTriggered;
    return !field.hidden;
  }

  private evaluateCondition(actual: unknown, operator: string, expected: string | null): boolean {
    const a = String(actual ?? '').trim().toLowerCase();
    const e = String(expected ?? '').trim().toLowerCase();

    switch (operator) {
      case 'EQUALS': return a === e;
      case 'NOT_EQUALS': return a !== e;
      case 'CONTAINS': return a.includes(e);
      case 'NOT_CONTAINS': return !a.includes(e);
      case 'GREATER_THAN': return Number(actual) > Number(expected);
      case 'LESS_THAN': return Number(actual) < Number(expected);
      case 'GREATER_THAN_OR_EQUAL': return Number(actual) >= Number(expected);
      case 'LESS_THAN_OR_EQUAL': return Number(actual) <= Number(expected);
      case 'IS_EMPTY': return !a;
      case 'IS_NOT_EMPTY': return !!a;
      default: return false;
    }
  }

  evaluateCalculatedFields(): void {
    if (!this.formGroup) return;

    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);
    const calcFields = allFields.filter(f => this.isCalculatedField(f));

    for (const field of calcFields) {
      const result = this.evaluateCalculatedField(field, allFields);
      if (result !== null && result !== undefined) {
        const formatted = typeof result === 'number' ? result.toFixed(2) : String(result);
        const control = this.formGroup.get(field.id);
        if (control) {
          control.setValue(formatted, { emitEvent: false });
        }
      }
    }

    this.cdr.detectChanges();
  }

  private evaluateCalculatedField(field: FormField, allFields: FormField[]): any {
    if (field.dataSource && field.dataSource.startsWith('sum:')) {
      return this.calcSum(field.dataSource, allFields);
    }

    switch (field.formula) {
      case 'SUM':
        return this.calcSumOrSectionSum(field, allFields);

      case 'WEIGHTED_SCORE':
        return this.calcWeightedScore(allFields);

      case 'THRESHOLD':
        return this.calcThreshold(field);

      case 'EXPRESSION':
        return this.evalExpression(field.dataSource ?? '', allFields);

      default:
        return this.calcSumOrSectionSum(field, allFields);
    }
  }

  private getNumericValue(controlId: string): number {
    const rawValue = this.formGroup?.get(controlId)?.value;
    if (rawValue === null || rawValue === undefined || rawValue === '') return 0;
    const normalized = String(rawValue).replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? 0 : parsed;
  }

  private calcSumOrSectionSum(field: FormField, allFields: FormField[]): number {
    if (field.dataSource) {
      return this.calcSum(field.dataSource, allFields);
    }

    const sources = (field as any).sourceFieldIds || (field as any).sourceFields;
    if (Array.isArray(sources) && sources.length > 0) {
      return this.calcSum(sources.join(','), allFields);
    }

    // Algoritmo de respaldo: Suma todos los campos numéricos anteriores en la misma sección
    for (const sw of this.sectionsWithFields) {
      const fieldIdx = sw.fields.findIndex(f => f.id === field.id);
      if (fieldIdx !== -1) {
        let total = 0;
        for (let i = 0; i < fieldIdx; i++) {
          const f = sw.fields[i];
          if (f.type === 'number' || this.isSimpleInput(f.type)) {
            total += this.getNumericValue(f.id);
          }
        }
        return Math.round(total * 100) / 100;
      }
    }

    return 0;
  }

  private calcSum(dataSource: string, allFields: FormField[]): number {
    const cleaned = dataSource.startsWith('sum:') ? dataSource.replace('sum:', '') : dataSource;
    const fieldRefs = cleaned
      .split(',')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    let total = 0;

    for (const ref of fieldRefs) {
      const sourceField = allFields.find(f => 
        f.id.toLowerCase() === ref || 
        f.name?.toLowerCase() === ref ||
        f.label?.toLowerCase().includes(ref) ||
        (f.label && f.label.toLowerCase().includes(`(${ref})`))
      );

      const targetControlId = sourceField ? sourceField.id : ref;
      total += this.getNumericValue(targetControlId);
    }

    return Math.round(total * 100) / 100;
  }

  private calcWeightedScore(allFields: FormField[]): number {
    const weightedFields = allFields.filter(
      f => f.weight != null && f.maxScore != null && !this.isCalculatedField(f)
    );

    let total = 0;
    for (const f of weightedFields) {
      const raw = this.getNumericValue(f.id);
      if (raw > 0) {
        total += (raw / f.maxScore!) * f.weight!;
      }
    }
    return Math.round(total * 100) / 100;
  }

  private calcThreshold(field: FormField): string {
    if (!field.sourceField || !field.thresholds?.length) return '';

    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);
    const sourceField = allFields.find(
      f => f.name === field.sourceField || f.id === field.sourceField
    );

    if (!sourceField) return '';

    const value = this.getNumericValue(sourceField.id);

    if (value === 0) return '';
    const match = field.thresholds.find(t => value >= t.min && value <= t.max);
    return match?.label ?? '';
  }

  private evalExpression(expression: string, allFields: FormField[]): any {
    try {
      const vars: Record<string, number> = {};
      for (const f of allFields) {
        vars[f.name] = this.getNumericValue(f.id);
      }
      const fn = new Function(...Object.keys(vars), `return ${expression}`);
      const result = fn(...Object.values(vars));
      return Math.round(result * 100) / 100;
    } catch {
      return null;
    }
  }

  isFieldActive(fieldId: string): boolean {
    return this.isPreview || this.activeFieldIds.has(fieldId);
  }

  isFieldInvalid(fieldId: string): boolean {
    const control = this.formGroup?.get(fieldId);
    return !!control && control.invalid && control.touched;
  }

  getFieldError(field: FormField): string | null {
    const control = this.formGroup?.get(field.id);
    if (!control || !control.invalid || !control.touched) return null;

    const errors = control.errors;
    if (!errors) return null;

    if (errors['minSelections']) return errors['minSelections'].message;
    if (errors['maxSelections']) return errors['maxSelections'].message;
    if (errors['futureDate']) return errors['futureDate'].message;
    if (errors['pastDate']) return errors['pastDate'].message;
    if (errors['isInteger']) return errors['isInteger'].message;

    const getMsg = (type: string) =>
      field.validations?.find(v => v.type === type)?.errorMessage;

    if (errors['required']) return getMsg('REQUIRED') ?? `El campo "${field.label}" es obligatorio`;
    if (errors['minlength']) return getMsg('MIN_LENGTH') ?? `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return getMsg('MAX_LENGTH') ?? `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['min']) return getMsg('MIN_VALUE') ?? `Valor mínimo: ${errors['min'].min}`;
    if (errors['max']) return getMsg('MAX_VALUE') ?? `Valor máximo: ${errors['max'].max}`;
    if (errors['pattern']) return getMsg('PATTERN') ?? `Formato inválido`;
    if (errors['email']) return getMsg('EMAIL_FORMAT') ?? `Correo inválido`;

    return 'Valor inválido';
  }

  getOptionsForField(field: FormField): { label: string; value: string }[] {
    if (field.dataSource === 'sedes') return this.sedesOptions;
    return field.options ?? [];
  }

  isTableType(type: string): boolean {
    return type === 'checklist-table' || type === 'inventory-table';
  }

  /** Un campo es calculado si su tipo es 'calculated' o si es numérico con una suma automática (dataSource 'sum:...'). */
  isCalculatedField(field: FormField | null | undefined): boolean {
    if (!field) return false;
    return field.type === 'calculated' || (typeof field.dataSource === 'string' && field.dataSource.startsWith('sum:'));
  }

  isSimpleInput(type: string): boolean {
    if (type === 'calculated') return false;
    return ['text', 'email', 'number', 'date', 'time', 'datetime', 'phone', 'url'].includes(type);
  }

  getInputType(fieldType: string): string {
    const map: Record<string, string> = {
      text: 'text', email: 'email', number: 'number',
      date: 'date', time: 'time', datetime: 'datetime-local',
      phone: 'tel', url: 'url',
    };
    return map[fieldType] ?? 'text';
  }

  isOptionChecked(fieldId: string, optionValue: string): boolean {
    return ((this.formGroup.get(fieldId)?.value as string[]) ?? []).includes(optionValue);
  }

  getTableCellValue(fieldId: string, rowId: string, colKey: string): unknown {
    const rows = (this.formGroup.get(fieldId)?.value as Record<string, unknown>[]) ?? [];
    return rows.find(r => r['rowId'] === rowId)?.[colKey] ?? '';
  }

  onFieldChange(fieldId: string, value: unknown, fieldtype?: string): void {
    // Para campos numéricos no se sobrescribe el valor mientras se escribe:
    // al teclear "4." el navegador reporta un valor intermedio vacío y setValue() borraba el punto.
    // formControlName ya mantiene el valor; la conversión a número se hace al enviar.
    if (fieldtype !== 'number') {
      this.formGroup.get(fieldId)?.setValue(value);
    }
    this.formGroup.get(fieldId)?.markAsTouched();
    this.evaluateConditionals();
    this.evaluateCalculatedFields();
  }

  onSelectChange(fieldId: string): void {
    this.formGroup.get(fieldId)?.markAsTouched();
    this.evaluateConditionals();
  }

  onCheckboxChange(fieldId: string, optionValue: string, checked: boolean): void {
    const current = (this.formGroup.get(fieldId)?.value as string[]) ?? [];
    const updated = checked
      ? [...current, optionValue]
      : current.filter(v => v !== optionValue);
    this.formGroup.get(fieldId)?.setValue(updated);
    this.formGroup.get(fieldId)?.markAsTouched();
    this.evaluateConditionals();
  }

  onTableCellChange(fieldId: string, rowId: string, colKey: string, value: unknown): void {
    const rows = (this.formGroup.get(fieldId)?.value as Record<string, unknown>[]) ?? [];
    const row = rows.find(r => r['rowId'] === rowId);

    if (row) {
      row[colKey] = value;
    } else {
      rows.push({ rowId, [colKey]: value });
    }

    this.formGroup.get(fieldId)?.setValue([...rows]);
    this.formGroup.get(fieldId)?.markAsTouched();
    this.evaluateCalculatedFields();
  }

  onSubmit(): void {
    if (this.isPreview) return;

    this.activeFieldIds.forEach(fieldId => {
      this.formGroup.get(fieldId)?.markAsTouched();
    });

    if (this.formGroup.invalid) {
      this.submitError = 'Por favor corrige los errores antes de enviar';
      return;
    }

    this.submitError = '';
    this.submitting = true;

    // Asegura actualizar todos los cálculos antes de compilar la respuesta
    this.evaluateCalculatedFields();

    const payload: CreateResponse = { data: this.collectData() };
    if (this.draftId) payload.draftId = this.draftId;

    this.responseService.submitdData(this.formCode, payload).subscribe({
      next: () => {
        this.submitting = false;
        // La respuesta quedó registrada: se ocultan los botones y el borrador (ya eliminado) deja de aplicar.
        this.submitSuccess = true;
        this.draftId = null;
        this.messageService.add({
          severity: 'success',
          summary: '¡Formulario enviado!',
          detail: 'Tu respuesta fue registrada correctamente',
          life: 3000,
        });
        setTimeout(() => {
          this.formGroup.reset();
          this.router.navigateByUrl('/inicio');
          this.evaluateConditionals();
        }, 3000);
      },
      error: (err) => {
        this.submitting = false;
        this.submitError = err?.error?.message ?? 'Error al enviar el formulario';
      },
    });
  }

  /**
   * Compila lo diligenciado con claves = field.name (formato de las respuestas).
   * Con `forDraft` se omiten los archivos, que no pueden guardarse en un borrador.
   */
  private collectData(forDraft = false): Record<string, unknown> {
    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);
    const fieldMap = new Map(allFields.map(f => [f.id, f]));

    const data: Record<string, unknown> = {};

    // 1. Mapea campos de entrada activos
    for (const fieldId of this.activeFieldIds) {
      const field = fieldMap.get(fieldId);
      if (!field || this.isCalculatedField(field)) continue;

      const value = this.formGroup.get(fieldId)?.value;
      if (forDraft && (field.type === 'file' || value instanceof File)) continue;

      data[field.name] = field.type === 'number' && value !== null && value !== ''
        ? Number(String(value).replace(',', '.'))
        : value;
    }

    // 2. Mapea campos calculados explícitamente al payload
    for (const field of allFields.filter(f => this.isCalculatedField(f))) {
      const value = this.formGroup.get(field.id)?.value;
      data[field.name] = value ?? '0.00';
    }

    return data;
  }

  /** Avance del borrador: campos activos diligenciados sobre el total de campos activos. */
  private computeProgress(): DraftProgress {
    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);
    let filled = 0, total = 0;

    for (const field of allFields) {
      if (!this.activeFieldIds.has(field.id) || this.isCalculatedField(field)) continue;
      // Archivos y firmas no se guardan en el borrador, así que no cuentan para el avance.
      if (field.type === 'file' || field.type === 'signature') continue;
      total++;
      if (this.hasValue(this.formGroup.get(field.id)?.value)) filled++;
    }

    return { filled, total };
  }

  private hasValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (Array.isArray(value)) {
      // Tablas: filas con al menos una celda diligenciada. Checkbox: al menos una opción.
      return value.some(v =>
        typeof v === 'object' && v !== null
          ? Object.entries(v as Record<string, unknown>).some(([k, c]) => k !== 'rowId' && this.hasValue(c))
          : this.hasValue(v),
      );
    }
    return true;
  }

  /** Guarda lo diligenciado hasta ahora sin validar: el usuario puede continuar después. */
  onSaveDraft(): void {
    if (this.isPreview || this.savingDraft || this.submitting) return;

    const progress = this.computeProgress();
    if (progress.filled === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Nada que guardar',
        detail: 'Diligencia al menos un campo para guardar el borrador',
        life: 3000,
      });
      return;
    }

    this.savingDraft = true;
    const payload = { data: this.collectData(true), progress };

    const request$ = this.draftId
      ? this.draftService.updateDraft(this.formCode, this.draftId, payload)
      : this.draftService.createDraft(this.formCode, payload);

    request$.subscribe({
      next: (draft) => {
        this.savingDraft = false;
        this.draftId = draft._id;
        this.draftSavedAt = draft.updatedAt;
        this.draftSaved.emit(draft);

        // Deja el id en la URL: al recargar o volver se continúa este mismo borrador.
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { draft: draft._id },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });

        this.messageService.add({
          severity: 'success',
          summary: 'Borrador guardado',
          detail: `${progress.filled} de ${progress.total} campos diligenciados. Puedes continuarlo desde "Borradores".`,
          life: 4000,
        });
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.savingDraft = false;
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo guardar el borrador',
          detail: err?.error?.message ?? 'Intenta de nuevo',
          life: 4000,
        });
        this.cdr.detectChanges();
      },
    });
  }

  isPositiveResult(field: FormField, value: any): boolean {
    if (field.formula === 'THRESHOLD' && field.thresholds?.length) {
      const match = field.thresholds.find(t => t.label === value);
      return match?.color === 'green';
    }
    if (field.formula === 'WEIGHTED_SCORE') {
      return parseFloat(value) >= 80;
    }
    return false;
  }

  isNegativeResult(field: FormField, value: any): boolean {
    if (field.formula === 'THRESHOLD' && field.thresholds?.length) {
      const match = field.thresholds.find(t => t.label === value);
      return match?.color === 'red';
    }
    if (field.formula === 'WEIGHTED_SCORE') {
      return parseFloat(value) < 60;
    }
    return false;
  }
}