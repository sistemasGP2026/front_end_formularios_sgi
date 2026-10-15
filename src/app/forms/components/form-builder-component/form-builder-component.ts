import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import {
  BuilderField, BuilderFieldType, BuilderMeta, BuilderSection, CATEGORIES, COLUMN_TYPES, FIELD_TYPES, FORMULAS,
  emptyField, emptyMeta, slug,
} from './form-builder.model';

export interface BuilderResult {
  form: any | null;
  errors: string[];
}

/**
 * Constructor visual de formularios: el usuario arma el formulario cuadro por cuadro
 * (datos generales, secciones y campos) y el componente produce el mismo JSON que
 * acepta la creación por JSON. Emite `formChange` con el JSON válido o `null`.
 */
@Component({
  selector: 'form-builder-component',
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonModule, DialogModule, TooltipModule],
  templateUrl: './form-builder-component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FormBuilderComponent {

  /** JSON de un formulario existente para cargarlo en el constructor (p. ej. al editar). */
  initial = input<any | null>(null);
  /** Al editar, el código no se puede cambiar. */
  lockCode = input<boolean>(false);

  formChange = output<any | null>();

  readonly fieldTypes = FIELD_TYPES;
  readonly columnTypes = COLUMN_TYPES;
  readonly formulas = FORMULAS;
  readonly categories = CATEGORIES;

  meta = signal<BuilderMeta>(emptyMeta());
  sections = signal<BuilderSection[]>([{ id: 'sec1', code: 'S1', title: 'Datos generales', collapsed: false }]);
  fields = signal<BuilderField[]>([]);

  /** Sección en la que se está eligiendo el tipo de campo nuevo. */
  pickingTypeFor = signal<string | null>(null);
  jsonVisible = false;
  importVisible = false;
  importText = '';
  importError = '';
  copied = false;

  private seq = { section: 1, field: 0 };

  result = computed<BuilderResult>(() => this.build(this.meta(), this.sections(), this.fields()));
  jsonText = computed(() => {
    const r = this.result();
    const form = r.form ?? this.build(this.meta(), this.sections(), this.fields(), true).form;
    return JSON.stringify(form, null, 2);
  });
  fieldCount = computed(() => this.fields().length);

  constructor() {
    effect(() => this.formChange.emit(this.result().form));
    effect(() => {
      const ini = this.initial();
      if (ini) this.loadFromJson(ini);
    });
  }

  // ───────────────────────────────────────── metadatos
  updateMeta<K extends keyof BuilderMeta>(key: K, value: BuilderMeta[K]): void {
    this.meta.update(m => ({ ...m, [key]: value }));
  }

  onCodeInput(value: string): void {
    this.updateMeta('code', (value ?? '').toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20));
  }

  // ───────────────────────────────────────── secciones
  addSection(): void {
    this.seq.section += 1;
    const n = this.sections().length + 1;
    this.sections.update(s => [...s, { id: `sec${this.seq.section}`, code: `S${n}`, title: '', collapsed: false }]);
  }

  removeSection(id: string): void {
    if (this.sections().length <= 1) return;
    this.sections.update(s => s.filter(x => x.id !== id));
    this.fields.update(f => f.filter(x => x.sectionId !== id));
    this.renumberSections();
  }

  moveSection(id: string, dir: -1 | 1): void {
    const arr = [...this.sections()];
    const i = arr.findIndex(s => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    this.sections.set(arr);
    this.renumberSections();
  }

  toggleSection(id: string): void {
    this.sections.update(s => s.map(x => x.id === id ? { ...x, collapsed: !x.collapsed } : x));
  }

  private renumberSections(): void {
    this.sections.update(s => s.map((x, i) => ({ ...x, code: `S${i + 1}` })));
  }

  touchSections(): void { this.sections.set([...this.sections()]); }

  // ───────────────────────────────────────── campos
  fieldsOf(sectionId: string): BuilderField[] {
    return this.fields().filter(f => f.sectionId === sectionId);
  }

  numericFields(except?: string): BuilderField[] {
    return this.fields().filter(f => f.type === 'number' && f.id !== except);
  }

  startAddField(sectionId: string): void {
    this.pickingTypeFor.set(this.pickingTypeFor() === sectionId ? null : sectionId);
  }

  addField(sectionId: string, type: BuilderFieldType): void {
    this.seq.field += 1;
    const field = emptyField(`f${this.seq.field}`, sectionId, type);
    this.fields.update(f => [...f.map(x => ({ ...x, open: false })), field]);
    this.pickingTypeFor.set(null);
  }

  removeField(id: string): void {
    this.fields.update(f => f.filter(x => x.id !== id));
  }

  duplicateField(id: string): void {
    const src = this.fields().find(f => f.id === id);
    if (!src) return;
    this.seq.field += 1;
    const copy: BuilderField = JSON.parse(JSON.stringify(src));
    copy.id = `f${this.seq.field}`;
    copy.label = src.label ? `${src.label} (copia)` : '';
    copy.name = src.name ? `${src.name}_copia` : '';
    copy.open = true;
    const arr = [...this.fields()];
    const i = arr.findIndex(f => f.id === id);
    arr.splice(i + 1, 0, copy);
    this.fields.set(arr);
  }

  moveField(id: string, dir: -1 | 1): void {
    const all = [...this.fields()];
    const i = all.findIndex(f => f.id === id);
    if (i < 0) return;
    const sectionId = all[i].sectionId;
    const siblings = all.filter(f => f.sectionId === sectionId);
    const k = siblings.findIndex(f => f.id === id);
    const target = siblings[k + dir];
    if (!target) return;
    const j = all.findIndex(f => f.id === target.id);
    [all[i], all[j]] = [all[j], all[i]];
    this.fields.set(all);
  }

  toggleField(id: string): void {
    this.fields.update(f => f.map(x => x.id === id ? { ...x, open: !x.open } : x));
  }

  onLabelInput(field: BuilderField, value: string): void {
    field.label = value;
    if (!field.nameTouched) field.name = slug(value);
    this.touch();
  }

  onNameInput(field: BuilderField, value: string): void {
    field.name = (value ?? '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 100);
    field.nameTouched = field.name.length > 0;
    this.touch();
  }

  changeType(field: BuilderField, type: BuilderFieldType): void {
    const fresh = emptyField(field.id, field.sectionId, type);
    Object.assign(field, {
      type,
      options: fresh.options, columns: fresh.columns, rows: fresh.rows,
      useSedes: false, formula: fresh.formula, sumSources: [], expression: '', sourceField: '', thresholds: [],
      weight: null, maxScore: null, min: null, max: null, minLength: null, maxLength: null, pattern: '',
    });
    this.touch();
  }

  /** Notifica cambios hechos por ngModel sobre objetos anidados. */
  touch(): void { this.fields.set([...this.fields()]); }

  // opciones (select / checkbox / columnas tipo lista)
  addOption(list: { label: string; value: string }[]): void { list.push({ label: '', value: '' }); this.touch(); }
  removeOption(list: { label: string; value: string }[], i: number): void { list.splice(i, 1); this.touch(); }
  onOptionLabel(opt: { label: string; value: string }, value: string): void {
    const autoValue = !opt.value || opt.value === slug(opt.label, true);
    opt.label = value;
    if (autoValue) opt.value = slug(value, true);
    this.touch();
  }

  // columnas y filas de tablas
  addColumn(field: BuilderField): void {
    field.columns.push({ key: '', label: '', inputType: 'text', required: false, options: [] });
    this.touch();
  }
  removeColumn(field: BuilderField, i: number): void { field.columns.splice(i, 1); this.touch(); }
  onColumnLabel(col: BuilderField['columns'][number], value: string): void {
    const auto = !col.key || col.key === slug(col.label);
    col.label = value;
    if (auto) col.key = slug(value);
    this.touch();
  }
  onColumnType(col: BuilderField['columns'][number], value: string): void {
    col.inputType = value as any;
    if (col.inputType === 'select' && col.options.length === 0) {
      col.options = [{ label: 'Sí', value: 'SI' }, { label: 'No', value: 'NO' }];
    }
    this.touch();
  }
  addRow(field: BuilderField): void {
    field.rows.push({ id: `r${field.rows.length + 1}`, label: '', unitLabel: '', minQuantity: null });
    this.touch();
  }
  removeRow(field: BuilderField, i: number): void {
    field.rows.splice(i, 1);
    field.rows.forEach((r, k) => r.id = `r${k + 1}`);
    this.touch();
  }

  // calculados
  toggleSumSource(field: BuilderField, name: string, checked: boolean): void {
    field.sumSources = checked
      ? [...new Set([...field.sumSources, name])]
      : field.sumSources.filter(n => n !== name);
    this.touch();
  }
  addThreshold(field: BuilderField): void {
    field.thresholds.push({ min: null, max: null, label: '', color: '' });
    this.touch();
  }
  removeThreshold(field: BuilderField, i: number): void { field.thresholds.splice(i, 1); this.touch(); }

  typeInfo(type: BuilderFieldType) { return FIELD_TYPES.find(t => t.type === type)!; }

  // ───────────────────────────────────────── JSON
  openJson(): void { this.copied = false; this.jsonVisible = true; }

  async copyJson(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.jsonText());
      this.copied = true;
    } catch { this.copied = false; }
  }

  openImport(): void { this.importText = ''; this.importError = ''; this.importVisible = true; }

  importJson(): void {
    try {
      const parsed = JSON.parse(this.importText);
      this.loadFromJson(parsed);
      this.importVisible = false;
    } catch {
      this.importError = 'JSON inválido — verifica la sintaxis';
    }
  }

  reset(): void {
    this.meta.set(emptyMeta());
    this.sections.set([{ id: 'sec1', code: 'S1', title: 'Datos generales', collapsed: false }]);
    this.fields.set([]);
    this.seq = { section: 1, field: 0 };
  }

  /** Carga un formulario (JSON del backend o de la creación por JSON) en el constructor. */
  loadFromJson(src: any): void {
    const s = src ?? {};
    const settings = s.settings ?? {};
    let documentDate = '';
    if (s.documentDate) {
      const d = new Date(s.documentDate);
      documentDate = isNaN(d.getTime()) ? String(s.documentDate).slice(0, 10) : d.toISOString().split('T')[0];
    }
    this.meta.set({
      code: String(s.code ?? '').toUpperCase(),
      name: s.name ?? '',
      description: s.description ?? '',
      category: s.category ?? '',
      version: Number(s.version) >= 1 ? Number(s.version) : 1,
      documentDate,
      accessType: s.accessType === 'RESTRICTED' ? 'RESTRICTED' : 'PUBLIC',
      allowDraft: settings.allowDraft ?? true,
      requiresApproval: !!settings.requiresApproval,
      showCompliance: !!settings.showCompliance,
      preventDuplicates: !!settings.preventDuplicates,
      duplicateBy: settings.duplicateBy ?? 'userId',
      requiresSede: !!settings.requiresSede,
      requiresReviewSignature: !!settings.requiresReviewSignature,
    });

    const sections: BuilderSection[] = (Array.isArray(s.sections) ? s.sections : [])
      .slice()
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((sec: any, i: number) => ({
        id: String(sec.id ?? `sec${i + 1}`),
        code: String(sec.code ?? `S${i + 1}`),
        title: sec.title ?? '',
        collapsed: false,
      }));
    if (sections.length === 0) sections.push({ id: 'sec1', code: 'S1', title: 'Datos generales', collapsed: false });

    const fields: BuilderField[] = (Array.isArray(s.fields) ? s.fields : [])
      .slice()
      .sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
      .map((f: any, i: number) => {
        const type: BuilderFieldType = FIELD_TYPES.some(t => t.type === f.type) ? f.type : 'text';
        const ds: string = typeof f.dataSource === 'string' ? f.dataSource : '';
        const base = emptyField(String(f.id ?? `f${i + 1}`), String(f.sectionId ?? sections[0].id), type);
        let formula = base.formula;
        let sumSources: string[] = [];
        let expression = '';
        if (type === 'calculated') {
          formula = FORMULAS.some(x => x.value === f.formula) ? f.formula : (ds.startsWith('sum:') ? 'SUM' : 'SUM');
          if (formula === 'SUM' && ds) sumSources = ds.replace(/^sum:/, '').split(',').map(x => x.trim()).filter(Boolean);
          if (formula === 'EXPRESSION') expression = ds;
        }
        return {
          ...base,
          name: f.name ?? '',
          nameTouched: true,
          label: f.label ?? '',
          required: !!f.required,
          readOnly: !!f.readOnly,
          hidden: !!f.hidden,
          placeholder: f.placeholder ?? '',
          helpText: f.helpText ?? '',
          minLength: f.minLength ?? null,
          maxLength: f.maxLength ?? null,
          pattern: f.pattern ?? '',
          min: f.min ?? null,
          max: f.max ?? null,
          useSedes: type === 'select' && ds === 'sedes',
          options: (f.options ?? []).map((o: any) => ({ label: o.label ?? '', value: o.value ?? '' })),
          columns: (f.columns ?? []).map((c: any) => ({
            key: c.key ?? '', label: c.label ?? '', inputType: c.inputType ?? 'text', required: !!c.required,
            options: (c.options ?? []).map((o: any) => ({ label: o.label ?? '', value: o.value ?? '' })),
          })),
          rows: (f.rows ?? []).map((r: any, k: number) => ({
            id: r.id ?? `r${k + 1}`, label: r.label ?? '', unitLabel: r.unitLabel ?? '', minQuantity: r.minQuantity ?? null,
          })),
          weight: f.weight ?? null,
          maxScore: f.maxScore ?? null,
          formula,
          sumSources,
          expression,
          sourceField: f.sourceField ?? '',
          thresholds: (f.thresholds ?? []).map((t: any) => ({ min: t.min ?? null, max: t.max ?? null, label: t.label ?? '', color: t.color ?? '' })),
          open: false,
        } as BuilderField;
      });

    this.sections.set(sections);
    this.fields.set(fields);
    this.seq = {
      section: Math.max(1, ...sections.map(x => parseInt(x.id.replace(/\D/g, ''), 10) || 0)),
      field: Math.max(0, ...fields.map(x => parseInt(x.id.replace(/\D/g, ''), 10) || 0)),
    };
  }

  // ───────────────────────────────────────── construcción y validación
  private build(meta: BuilderMeta, sections: BuilderSection[], fields: BuilderField[], lenient = false): BuilderResult {
    const errors: string[] = [];
    const num = (v: number | null | undefined) => (v === null || v === undefined || isNaN(Number(v))) ? null : Number(v);

    if (!meta.code.trim()) errors.push('Falta el código del formulario');
    else if (!/^[A-Z0-9-]+$/.test(meta.code)) errors.push('El código solo admite mayúsculas, números y guiones');
    if (!meta.name.trim()) errors.push('Falta el nombre del formulario');
    if (!meta.category) errors.push('Selecciona la categoría');
    if (!(meta.version >= 1)) errors.push('La versión debe ser 1 o mayor');
    if (sections.length === 0) errors.push('Agrega al menos una sección');
    sections.forEach((s, i) => { if (!s.title.trim()) errors.push(`La sección ${i + 1} no tiene título`); });
    if (fields.length === 0) errors.push('Agrega al menos un campo');

    const names = new Map<string, number>();
    fields.forEach(f => names.set(f.name, (names.get(f.name) ?? 0) + 1));

    const outFields = fields.map((f, i) => {
      const where = f.label.trim() ? `"${f.label.trim()}"` : `campo ${i + 1}`;
      if (!f.label.trim()) errors.push(`El campo ${i + 1} no tiene etiqueta`);
      if (!f.name.trim()) errors.push(`El campo ${where} no tiene nombre interno`);
      else if (!/^[a-zA-Z0-9_]+$/.test(f.name)) errors.push(`El nombre interno de ${where} solo admite letras, números y guion bajo`);
      else if ((names.get(f.name) ?? 0) > 1) errors.push(`El nombre interno "${f.name}" está repetido`);
      if (!sections.some(s => s.id === f.sectionId)) errors.push(`El campo ${where} no pertenece a ninguna sección`);

      const out: any = {
        id: f.id,
        name: f.name,
        label: f.label.trim(),
        type: f.type,
        sectionId: f.sectionId,
        required: !!f.required,
        readOnly: !!f.readOnly,
        hidden: !!f.hidden,
        order: i + 1,
      };
      if (f.placeholder.trim()) out.placeholder = f.placeholder.trim();
      if (f.helpText.trim()) out.helpText = f.helpText.trim();

      switch (f.type) {
        case 'text':
        case 'textarea':
          if (num(f.minLength) !== null) out.minLength = num(f.minLength);
          if (num(f.maxLength) !== null) out.maxLength = num(f.maxLength);
          if (f.pattern.trim()) out.pattern = f.pattern.trim();
          break;
        case 'number':
          if (num(f.min) !== null) out.min = num(f.min);
          if (num(f.max) !== null) out.max = num(f.max);
          if (num(f.weight) !== null) out.weight = num(f.weight);
          if (num(f.maxScore) !== null) out.maxScore = num(f.maxScore);
          if ((num(f.weight) !== null) !== (num(f.maxScore) !== null)) errors.push(`En ${where} indica peso y puntaje máximo (ambos) o ninguno`);
          break;
        case 'select':
        case 'checkbox':
          if (f.type === 'select' && f.useSedes) {
            out.dataSource = 'sedes';
            out.options = [];
          } else {
            const opts = f.options.filter(o => o.label.trim() || o.value.trim());
            if (opts.length === 0) errors.push(`${where} necesita al menos una opción`);
            opts.forEach(o => { if (!o.label.trim() || !o.value.trim()) errors.push(`${where}: toda opción necesita etiqueta y valor`); });
            out.options = opts.map((o, k) => ({ label: o.label.trim(), value: o.value.trim(), order: k + 1 }));
          }
          break;
        case 'checklist-table':
        case 'inventory-table': {
          const cols = f.columns.filter(c => c.label.trim() || c.key.trim());
          const rows = f.rows.filter(r => r.label.trim());
          if (cols.length === 0) errors.push(`${where} necesita al menos una columna`);
          if (rows.length === 0) errors.push(`${where} necesita al menos un ítem (fila)`);
          out.columns = cols.map((c, k) => {
            if (!c.key.trim() || !c.label.trim()) errors.push(`${where}: toda columna necesita nombre y clave`);
            const col: any = { key: c.key.trim(), label: c.label.trim(), inputType: c.inputType, required: !!c.required, order: k + 1 };
            if (c.inputType === 'select') {
              const opts = c.options.filter(o => o.label.trim() || o.value.trim());
              if (opts.length === 0) errors.push(`${where}: la columna "${c.label}" necesita opciones`);
              col.options = opts.map((o, j) => ({ label: o.label.trim(), value: o.value.trim() || slug(o.label, true), order: j + 1 }));
            }
            return col;
          });
          out.rows = rows.map((r, k) => {
            const row: any = { id: r.id || `r${k + 1}`, label: r.label.trim(), order: k + 1 };
            if (f.type === 'inventory-table') {
              if (r.unitLabel.trim()) row.unitLabel = r.unitLabel.trim();
              if (num(r.minQuantity) !== null) row.minQuantity = num(r.minQuantity);
            }
            return row;
          });
          break;
        }
        case 'calculated':
          out.formula = f.formula;
          out.readOnly = true;
          if (f.formula === 'SUM') {
            if (f.sumSources.length === 0) errors.push(`${where}: selecciona los campos numéricos a sumar`);
            out.dataSource = `sum:${f.sumSources.join(',')}`;
          } else if (f.formula === 'EXPRESSION') {
            if (!f.expression.trim()) errors.push(`${where}: escribe la expresión`);
            out.dataSource = f.expression.trim();
          } else if (f.formula === 'THRESHOLD') {
            if (!f.sourceField) errors.push(`${where}: selecciona el campo de referencia`);
            const th = f.thresholds.filter(t => t.label.trim() || num(t.min) !== null || num(t.max) !== null);
            if (th.length === 0) errors.push(`${where}: agrega al menos un rango`);
            th.forEach(t => {
              if (num(t.min) === null || num(t.max) === null || !t.label.trim()) errors.push(`${where}: cada rango necesita mínimo, máximo y etiqueta`);
            });
            out.sourceField = f.sourceField;
            out.thresholds = th.map(t => ({ min: num(t.min) ?? 0, max: num(t.max) ?? 0, label: t.label.trim(), color: t.color.trim() || null }));
          } else if (f.formula === 'WEIGHTED_SCORE') {
            const weighted = fields.filter(x => x.type === 'number' && num(x.weight) !== null && num(x.maxScore) !== null);
            if (weighted.length === 0) errors.push(`${where}: el puntaje ponderado necesita campos numéricos con peso y puntaje máximo`);
          }
          break;
      }
      return out;
    });

    const form: any = {
      code: meta.code.trim().toUpperCase(),
      name: meta.name.trim(),
      description: meta.description.trim() || undefined,
      category: meta.category,
      version: Number(meta.version) || 1,
      documentDate: meta.documentDate || undefined,
      accessType: meta.accessType,
      settings: {
        allowDraft: !!meta.allowDraft,
        requiresApproval: !!meta.requiresApproval,
        showCompliance: !!meta.showCompliance,
        preventDuplicates: !!meta.preventDuplicates,
        duplicateBy: meta.preventDuplicates ? meta.duplicateBy : undefined,
        requiresSede: !!meta.requiresSede,
        requiresReviewSignature: !!meta.requiresReviewSignature,
      },
      sections: sections.map((s, i) => ({ id: s.id, code: s.code, title: s.title.trim(), order: i + 1 })),
      fields: outFields,
    };
    if (form.description === undefined) delete form.description;
    if (form.documentDate === undefined) delete form.documentDate;
    if (form.settings.duplicateBy === undefined) delete form.settings.duplicateBy;

    return { form: errors.length === 0 || lenient ? form : null, errors };
  }
}
