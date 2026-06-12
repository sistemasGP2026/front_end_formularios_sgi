export type ResponseStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ApprovalInfo {
  approvedBy:       string | null;
  approverName:     string | null;
  approverUsername: string | null;
  approvedAt:       string | null;
  rejectionReason:  string | null;
}

export interface FilledByDto {
  userId: string | null;
  fullName: string;
  email: string;
  document: string | null;
}

export interface ResponseInterface {
  _id:         string;
  formId:      string;
  formCode:    string;
  filledBy:    { userId: string; fullName: string; email: string; };
  submittedAt: string;
  data:        Record<string, unknown>;
  status:      ResponseStatus;
  approval:    ApprovalInfo;
  deleted:     boolean;
  createdAt:   string;
  updatedAt:   string;
}