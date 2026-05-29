import { Form } from "../../forms/interfaces/form.interface";
import { PendingUser } from "./pending-user.interface";

export interface FormStats {
  form: Form;
  asignados: number;
  respuestas: number;
  pendientes: PendingUser[];
  pct: number;
}
