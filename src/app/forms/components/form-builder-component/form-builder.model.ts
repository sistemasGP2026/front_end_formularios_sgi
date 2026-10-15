/**
 * Modelo interno del constructor visual de formularios ("cuadro por cuadro").
 * Se convierte al JSON que ya acepta POST /forms (CreateFormDto del backend).
 */

export type BuilderFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'checklist-table'
  | 'inventory-table'
  | 'calculated';

export type ColumnInputType = 'text' | 'number' | 'select' | 'date' | 'checkbox' | 'textarea';

export type Formula = 'SUM' | 'WEIGHTED_SCORE' | 'THRESHOLD' | 'EXPRESSION';

export interface BuilderOption {
  label: string;
  value: string;
}

export interface BuilderColumn {
  key: string;
  label: string;
  inputType: ColumnInputType;
  required: boolean;
  options: BuilderOption[];
}

export interface BuilderRow {
  id: string;
  label: string;
  unitLabel: string;
  minQuantity: number | null;
}

export interface BuilderThreshold {
  min: number | null;
  max: number | null;
  label: string;
  color: string;
}

export interface BuilderSection {
  id: string;
  code: string;
  title: string;
  /** Solo interfaz: sección contraída. */
  collapsed: boolean;
}

export interface BuilderField {
  id: string;
  name: string;
  /** true cuando el usuario escribió el nombre a mano (ya no se deriva de la etiqueta). */
  nameTouched: boolean;
  label: string;
  type: BuilderFieldType;
  sectionId: string;
  required: boolean;
  readOnly: boolean;
  hidden: boolean;
  placeholder: string;
  helpText: string;
  minLength: number | null;
  maxLength: number | null;
  pattern: string;
  min: number | null;
  max: number | null;
  /** select: usar las sedes registradas como opciones (dataSource = 'sedes'). */
  useSedes: boolean;
  options: BuilderOption[];
  columns: BuilderColumn[];
  rows: BuilderRow[];
  /** number: ponderación para la fórmula WEIGHTED_SCORE. */
  weight: number | null;
  maxScore: number | null;
  /** calculated */
  formula: Formula;
  sumSources: string[];
  expression: string;
  sourceField: string;
  thresholds: BuilderThreshold[];
  /** Solo interfaz: tarjeta expandida. */
  open: boolean;
}

export interface BuilderMeta {
  code: string;
  name: string;
  description: string;
  category: string;
  version: number;
  documentDate: string;
  accessType: 'PUBLIC' | 'RESTRICTED';
  allowDraft: boolean;
  requiresApproval: boolean;
  showCompliance: boolean;
  preventDuplicates: boolean;
  duplicateBy: 'userId' | 'email' | 'document';
  requiresSede: boolean;
  requiresReviewSignature: boolean;
}

export const FIELD_TYPES: { type: BuilderFieldType; label: string; icon: string; hint: string }[] = [
  { type: 'text',            label: 'Texto corto',          icon: 'pi pi-minus',       hint: 'Una línea de texto' },
  { type: 'textarea',        label: 'Párrafo',              icon: 'pi pi-align-left',  hint: 'Texto largo' },
  { type: 'number',          label: 'Número',               icon: 'pi pi-hashtag',     hint: 'Valor numérico' },
  { type: 'date',            label: 'Fecha',                icon: 'pi pi-calendar',    hint: 'Selector de fecha' },
  { type: 'select',          label: 'Lista desplegable',    icon: 'pi pi-list',        hint: 'Una opción entre varias' },
  { type: 'checkbox',        label: 'Casillas',             icon: 'pi pi-check-square', hint: 'Varias opciones' },
  { type: 'checklist-table', label: 'Tabla de verificación', icon: 'pi pi-table',      hint: 'Ítems con columnas' },
  { type: 'inventory-table', label: 'Tabla de inventario',  icon: 'pi pi-box',         hint: 'Ítems con unidad y cantidad' },
  { type: 'calculated',      label: 'Campo calculado',      icon: 'pi pi-calculator',  hint: 'Suma, puntaje o rango' },
];

export const COLUMN_TYPES: { value: ColumnInputType; label: string }[] = [
  { value: 'text',     label: 'Texto' },
  { value: 'number',   label: 'Número' },
  { value: 'select',   label: 'Lista' },
  { value: 'date',     label: 'Fecha' },
  { value: 'checkbox', label: 'Casilla' },
  { value: 'textarea', label: 'Párrafo' },
];

export const FORMULAS: { value: Formula; label: string; hint: string }[] = [
  { value: 'SUM',            label: 'Suma',                  hint: 'Suma de campos numéricos' },
  { value: 'WEIGHTED_SCORE', label: 'Puntaje ponderado (%)', hint: 'Usa el peso y puntaje máximo de los campos numéricos' },
  { value: 'THRESHOLD',      label: 'Rango / clasificación', hint: 'Etiqueta según el valor de otro campo' },
  { value: 'EXPRESSION',     label: 'Expresión',             hint: 'Fórmula con los nombres de los campos' },
];

export const CATEGORIES: { value: string; label: string }[] = [
  { value: 'GESTION_DIRECCION',         label: 'Gestión de Dirección' },
  { value: 'GESTION_INTEGRAL',          label: 'Gestión Integral' },
  { value: 'GESTION_COMERCIAL',         label: 'Gestión Comercial' },
  { value: 'GESTION_COMPRAS',           label: 'Gestión de Compras' },
  { value: 'OPERACION_LOGISTICA',       label: 'Operación Logística del Servicio Farmacéutico' },
  { value: 'MANTENIMIENTO',             label: 'Mantenimiento' },
  { value: 'GESTION_FINANCIERA',        label: 'Gestión Financiera' },
  { value: 'GESTION_HUMANA',            label: 'Gestión Humana' },
  { value: 'PREPARADOS_ESTERILES',      label: 'Elaboración y Adecuación de Preparados Estériles y no Estériles' },
  { value: 'DISTRIBUCION_MEDICAMENTOS', label: 'Distribución de Medicamentos, Dispositivos Médicos e Insumos' },
];

export function emptyMeta(): BuilderMeta {
  return {
    code: '',
    name: '',
    description: '',
    category: '',
    version: 1,
    documentDate: new Date().toISOString().split('T')[0],
    accessType: 'PUBLIC',
    allowDraft: true,
    requiresApproval: false,
    showCompliance: false,
    preventDuplicates: false,
    duplicateBy: 'userId',
    requiresSede: false,
    requiresReviewSignature: false,
  };
}

export function emptyField(id: string, sectionId: string, type: BuilderFieldType): BuilderField {
  return {
    id,
    name: '',
    nameTouched: false,
    label: '',
    type,
    sectionId,
    required: false,
    readOnly: false,
    hidden: false,
    placeholder: '',
    helpText: '',
    minLength: null,
    maxLength: null,
    pattern: '',
    min: null,
    max: null,
    useSedes: false,
    options: type === 'select' || type === 'checkbox' ? [{ label: '', value: '' }, { label: '', value: '' }] : [],
    columns: type === 'checklist-table'
      ? [
          { key: 'cumple', label: 'Cumple', inputType: 'select', required: false,
            options: [{ label: 'Sí', value: 'SI' }, { label: 'No', value: 'NO' }, { label: 'N/A', value: 'NA' }] },
          { key: 'observacion', label: 'Observación', inputType: 'text', required: false, options: [] },
        ]
      : type === 'inventory-table'
        ? [{ key: 'cantidad', label: 'Cantidad', inputType: 'number', required: false, options: [] }]
        : [],
    rows: type === 'checklist-table' || type === 'inventory-table' ? [{ id: 'r1', label: '', unitLabel: '', minQuantity: null }] : [],
    weight: null,
    maxScore: null,
    formula: 'SUM',
    sumSources: [],
    expression: '',
    sourceField: '',
    thresholds: [],
    open: true,
  };
}

/** Convierte una etiqueta en un identificador válido: minúsculas, sin tildes, guion bajo. */
export function slug(text: string, upper = false): string {
  const s = (text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ñ/gi, 'n')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
    .slice(0, 60);
  return upper ? s.toUpperCase() : s;
}
