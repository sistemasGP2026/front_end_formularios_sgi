export interface FilledByDto {
  userId: string | null;
  fullName: string;
  email: string;
  document: string | null;
}

export interface ResponseInterface {
  _id: string;
  formId: string;
  formCode: string;
  filledBy: FilledByDto;
  submittedAt: string;
  data: Record<string, unknown>;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}