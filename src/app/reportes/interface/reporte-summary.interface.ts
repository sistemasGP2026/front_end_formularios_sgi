import { FormStats } from "./form-stats.interface";

export interface ReporteSummary {
  totalRespuestas: number;
  totalAsignados: number;
  totalFormularios: number;
  tasaGlobal: number;
  stats: FormStats[];
}
