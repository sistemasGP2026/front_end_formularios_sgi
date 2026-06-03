export interface FormCreatedBy {
  userId: string;
  name: string;
  username: string;
  email: string;
}

export interface FormSection {
  id: string;
  code: string;
  title: string;
  order: number;
}

export interface FieldOption {
  label: string;
  value: string;
  isDefault: boolean;
  order: number;
}

export interface TableColumn {
  key: string;
  label: string;
  inputType: string;
  required: boolean;
  order: number;
  options?: FieldOption[];
}

export interface TableRow {
  id: string;
  label: string;
  order: number;
  unitLabel?: string;
  minQuantity?: number;
}

export interface FieldValidation {
  type: string;
  value: string | null;
  errorMessage: string;
}

export interface ConditionalRule {
  triggerFieldId: string;
  operator: string;
  expectedValue: string | null;
  action: string;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: string;
  sectionId: string;
  required: boolean;
  readOnly: boolean;
  hidden: boolean;
  placeholder: string | null;
  helpText: string | null;
  minLength: number | null;
  maxLength: number | null;
  pattern: string | null;
  min: number | null;
  max: number | null;
  options: FieldOption[];
  rows: TableRow[];
  columns: TableColumn[];
  validations: FieldValidation[];
  conditionalRules: ConditionalRule[];
  order: number;
  dataSource?: string | null;
}

export interface FormSettings {
  allowDraft: boolean;
  requiresApproval: boolean;
  showCompliance: boolean;
  preventDuplicates: boolean;
  duplicateBy: string | null;
  requiresSede: boolean;          
  requiresReviewSignature: boolean;
}

export interface FormUserPermission {
  userId: string;
  name: string;
  username: string;
  email: string;
}

export interface FormPermissions {
  users: FormUserPermission[];
}

export interface Form {
  _id: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  accessType: string;
  version: number;
  documentDate?: string | null;
  settings: FormSettings;
  permissions: FormPermissions;
  sections: FormSection[];
  fields: FormField[];
  createdBy: FormCreatedBy;
  createdAt: string;
  updatedAt: string;
  deleted: boolean;             
}

export interface SectionPreview {
  title: string;
  fields: { label: string; type: string }[];
}