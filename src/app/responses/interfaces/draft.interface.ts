export interface DraftProgress {
  filled: number;
  total: number;
}

/** Borrador de respuesta: lo que el usuario lleva diligenciado de un formulario sin enviarlo. */
export interface DraftInterface {
  _id:       string;
  formId:    string;
  formCode:  string;
  formName:  string;
  userId:    string;
  data:      Record<string, unknown>;
  progress:  DraftProgress;
  createdAt: string;
  updatedAt: string;
}

export interface SaveDraftPayload {
  data: Record<string, unknown>;
  progress?: DraftProgress;
}
