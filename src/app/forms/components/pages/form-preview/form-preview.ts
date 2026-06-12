import { ChangeDetectorRef, Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, AbstractControl, ValidatorFn } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { Form, FormField, FormSection } from '../../../interfaces/form.interface';
import { ResponseService } from '../../../../responses/services/response.service';
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
  private sedeService = inject(SedesService);
  private router = inject(Router);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);

  @Input() sectionsWithFields: SectionWithFields[] = [];
  @Input() formName = '';
  @Input() form!: Form;
  @Input() mode: 'preview' | 'respond' | 'view' = 'preview';
  @Input() responseData: Record<string, unknown> | null = null;

  formGroup!: FormGroup;
  activeFieldIds = new Set<string>();
  sedesOptions: { label: string; value: string }[] = [];

  private formCode!: string;
  submitting = false;
  submitError = '';
  submitSuccess = false;

  get isPreview(): boolean {
    return this.mode === 'preview' || this.mode === 'view';
  }

  //LIFECYCLE

  ngOnInit(): void {
    this.formCode = this.route.snapshot.paramMap.get('code') ?? '';
    this.loadSedesIfNeeded();
    this.buildFormGroup();
    this.evaluateConditionals();
    this.applyResponseData();

    if (this.isPreview) {
      this.formGroup.disable({ emitEvent: false });
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['sectionsWithFields'] && !changes['sectionsWithFields'].firstChange) {
      this.loadSedesIfNeeded();
      this.buildFormGroup();
      this.evaluateConditionals();
      this.applyResponseData();

      if (this.isPreview) {
        this.formGroup.disable({ emitEvent: false });
      }
      this.evaluateCalculatedFields();
    }
  }

  //PRIVADOS
  private applyResponseData(): void {
    if (!this.responseData || !Object.keys(this.responseData).length) return;

    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);
    const mapped: Record<string, unknown> = {};

    for (const field of allFields) {
      // Los datos vienen por field.name, el formGroup tiene controles por field.id
      if (this.responseData[field.name] !== undefined) {
        mapped[field.id] = this.responseData[field.name];
      }
    }

    this.formGroup.patchValue(mapped, { emitEvent: false });
  }

  private buildFormGroup(): void {
    if (!this.sectionsWithFields?.length) return;

    const controls: Record<string, any> = {};
    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);

    for (const field of allFields) {
      const validators = this.mode === 'respond' ? this.buildValidators(field) : [];

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
        case 'calculated':
          controls[field.id] = this.fb.control({ value: '', disabled: true });
          break;
        default:
          controls[field.id] = this.fb.control('', validators);
      }
    }

    this.formGroup = this.fb.group(controls);

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

  //CONDICIONALES
  evaluateConditionals(): void {
    this.activeFieldIds.clear();
    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);

    for (const field of allFields) {
      const active = !field.conditionalRules?.length
        ? !field.hidden
        : this.evaluateRules(field);

      if (active) {
        this.activeFieldIds.add(field.id);
        if (!this.isPreview) {
          this.formGroup?.get(field.id)?.enable({ emitEvent: false });
        }
      } else {
        this.formGroup?.get(field.id)?.disable({ emitEvent: false });
        if (!this.isPreview) {
          this.formGroup?.get(field.id)?.reset();
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
    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);

    // Primero WEIGHTED_SCORE, luego THRESHOLD, luego EXPRESSION
    const order = ['WEIGHTED_SCORE', 'EXPRESSION', 'THRESHOLD'];
    const calcFields = allFields
      .filter(f => f.type === 'calculated')
      .sort((a, b) => {
        const ai = order.indexOf(a.formula ?? '');
        const bi = order.indexOf(b.formula ?? '');
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });

    for (const field of calcFields) {
      const result = this.evaluateCalculatedField(field, allFields);
      if (result !== null && result !== undefined) {
        this.formGroup.get(field.id)?.setValue(result, { emitEvent: false });
      }
    }

    this.cdr.detectChanges();
  }

  private evaluateCalculatedField(field: FormField, allFields: FormField[]): any {
    switch (field.formula) {

      case 'WEIGHTED_SCORE':
        return this.calcWeightedScore(allFields);

      case 'THRESHOLD':
        return this.calcThreshold(field);

      case 'EXPRESSION':
        return this.evalExpression(field.dataSource ?? '', allFields);

      default:
        return null;
    }
  }

  private calcWeightedScore(allFields: FormField[]): number {
    const weightedFields = allFields.filter(
      f => f.weight != null && f.maxScore != null && f.type !== 'calculated'
    );

    let total = 0;
    for (const f of weightedFields) {
      const raw = parseFloat(this.formGroup.get(f.id)?.value ?? '0');
      if (!isNaN(raw) && raw > 0) {
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

    const value = parseFloat(
      this.formGroup.get(sourceField.id)?.value ?? '0'
    );

    if (isNaN(value) || value === 0) return '';
    const match = field.thresholds.find(t => value >= t.min && value <= t.max);
    return match?.label ?? '';
  }

  private evalExpression(expression: string, allFields: FormField[]): any {
    try {
      const vars: Record<string, number> = {};
      for (const f of allFields) {
        const val = parseFloat(this.formGroup.get(f.id)?.value ?? '0');
        vars[f.name] = isNaN(val) ? 0 : val;
      }
      const fn = new Function(...Object.keys(vars), `return ${expression}`);
      const result = fn(...Object.values(vars));
      return Math.round(result * 100) / 100;
    } catch {
      return null;
    }
  }

  //HELPERS TEMPLATE

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

  isSimpleInput(type: string): boolean {
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

  //EVENTOS
  onFieldChange(fieldId: string, value: unknown, fieldtype?: string): void {
    let parsed = value;
    if (fieldtype === 'number' && value !== '' && value !== null) {
      parsed = Number(value);
    }
    this.formGroup.get(fieldId)?.setValue(parsed);
    this.formGroup.get(fieldId)?.markAsTouched();
    this.evaluateConditionals();
    this.evaluateCalculatedFields();
  }

  onSelectChange(fieldId: string): void {
    this.formGroup.get(fieldId)?.markAsTouched();
    this.evaluateConditionals();
    this.evaluateCalculatedFields();
  }

  onCheckboxChange(fieldId: string, optionValue: string, checked: boolean): void {
    const current = (this.formGroup.get(fieldId)?.value as string[]) ?? [];
    const updated = checked
      ? [...current, optionValue]
      : current.filter(v => v !== optionValue);
    this.formGroup.get(fieldId)?.setValue(updated);
    this.formGroup.get(fieldId)?.markAsTouched();
    this.evaluateConditionals();
    this.evaluateCalculatedFields()
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

  //SUBMIT
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

    const allFields = this.sectionsWithFields.flatMap(sw => sw.fields);
    const fieldMap = new Map(allFields.map(f => [f.id, f]));


    const filteredData: Record<string, unknown> = {};
    for (const fieldId of this.activeFieldIds) {
      const field = fieldMap.get(fieldId);
      if (!field) continue;

      const control = this.formGroup.get(fieldId);
      const value = control?.value;

      filteredData[field.name] = field.type === 'number' && value !== null && value !== ''
        ? Number(value)
        : value;
    }
    for (const field of allFields.filter(f => f.type === 'calculated')) {
      const value = this.formGroup.get(field.id)?.value;
      if (value !== null && value !== undefined && value !== '') {
        filteredData[field.name] = value;
      }
    }
    const payload: CreateResponse = { data: filteredData };

    this.responseService.submitdData(this.formCode, payload).subscribe({
      next: () => {
        this.submitting = false;
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