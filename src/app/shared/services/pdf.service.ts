import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Form } from '../../forms/interfaces/form.interface';
import { ResponseInterface } from '../../responses/interfaces/response.interface';
import { BASE64LOGO } from '../../assets/base64-logo';

(pdfMake as any).addVirtualFileSystem(pdfFonts);

@Injectable({ providedIn: 'root' })
export class PdfService {

  private readonly base64Img = BASE64LOGO;
  private primary   = '#002E42';
  private secondary = '#00649B';

  // GENERAR PDF DE FORMULARIO VACÍO
  generateFormPdf(form: Form): void {
    const doc: any = {
      pageSize: 'A4',
      pageMargins: [40, 110, 40, 60],
      header: () => this.buildHeader(form),
      footer: (cur: number, total: number) => this.buildFooter(cur, total),
      content: [
        { text: form.description ?? '', style: 'description' },
        ...this.buildFormSections(form),
      ],
      styles: this.baseStyles(),
    };
    pdfMake.createPdf(doc).download(`${form.code}.pdf`);
  }

  // GENERAR PDF DE RESPUESTA
  generateResponsePdf(response: ResponseInterface, form: Form): void {
    const doc: any = {
      pageSize: 'A4',
      pageMargins: [40, 110, 40, 60],
      header: () => this.buildHeader(form, 'RESPUESTA DE FORMULARIO'),
      footer: (cur: number, total: number) => this.buildFooter(cur, total),
      content: [
        this.buildResponseMeta(response, form),
        ...this.buildResponseContent(response, form),
      ],
      styles: {
        ...this.baseStyles(),
        metaLabel: { fontSize: 9, bold: true, color: '#777' },
        metaValue: { fontSize: 11, color: this.primary },
      },
    };
    pdfMake.createPdf(doc).download(
      `RESPUESTA_${form.code}_${response.filledBy.fullName}.pdf`
    );
  }

  // HEADER
  private buildHeader(form: Form, title = 'SISTEMA DE GESTIÓN INTEGRAL'): any {
    return {
      margin: [40, 25, 40, 0],
      stack: [
        {
          columns: [
            { width: 70, image: this.base64Img, fit: [60, 60] },
            {
              width: '*',
              stack: [
                { text: title, fontSize: 15, bold: true, color: this.primary },
                { text: form.name, fontSize: 11, color: this.secondary, margin: [0, 3, 0, 0] },
                {
                  text: `Código: ${form.code}   |   Versión: ${form.version}` +
                        (form.documentDate ? `   |   Fecha doc: ${new Date(form.documentDate).toLocaleDateString('es-CO')}` : ''),
                  fontSize: 8, color: '#666', margin: [0, 3, 0, 0]
                },
              ],
            },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 10, x2: 515, y2: 10, lineWidth: 1, lineColor: '#DCE7EC' }] },
      ],
    };
  }

  private buildFooter(currentPage: number, pageCount: number): any {
    return {
      margin: [40, 10],
      columns: [
        { text: 'Documento generado automáticamente por SGI', fontSize: 8, color: '#777' },
        { text: `Página ${currentPage} de ${pageCount}`, alignment: 'right', fontSize: 8, color: '#777' },
      ],
    };
  }

  // META DE RESPUESTA (Con lógica corregida)
  private buildResponseMeta(response: ResponseInterface, form: Form): any {
    const statusMap: Record<string, string> = { APPROVED: 'Aprobada', PENDING: 'Pendiente de aprobación', REJECTED: 'Rechazada' };
    const statusColors: Record<string, string> = { APPROVED: '#065F46', PENDING: '#92400E', REJECTED: '#991B1B' };
    const statusBg: Record<string, string> = { APPROVED: '#D1FAE5', PENDING: '#FEF3C7', REJECTED: '#FEE2E2' };

    const status = response.status ?? 'PENDING';
    const approval = response.approval;

    // Usamos 'any' explícitamente en la estructura para evitar el conflicto de propiedades desconocidas
    const metaStack: any[] = [
      {
        columns: [
          { width: '*', stack: [{ text: 'Respondido por', style: 'metaLabel' }, { text: response.filledBy.fullName ?? '', style: 'metaValue' }] },
          { width: '*', stack: [{ text: 'Fecha de creación doc.', style: 'metaLabel' }, { text: new Date(response.createdAt).toLocaleString('es-CO'), style: 'metaValue' }] },
          { width: '*', stack: [{ text: 'Fecha envío', style: 'metaLabel' }, { text: new Date(response.submittedAt).toLocaleString('es-CO'), style: 'metaValue' }] },
        ],
        margin: [0, 0, 0, 15],
      }
    ];

    if (form.settings.requiresApproval) {
      metaStack.push({
        table: { // Ahora TypeScript aceptará esto al tratar el contenedor como 'any'
          widths: ['*'],
          body: [[{
            stack: [
              {
                columns: [
                  { width: '*', stack: [{ text: 'Estado', fontSize: 8, bold: true, color: '#555' }, { text: statusMap[status] ?? status, fontSize: 11, bold: true, color: statusColors[status] ?? '#002E42', margin: [0, 2, 0, 0] }] },
                  ...(status !== 'PENDING' && approval?.approverName ? [{
                    width: '*',
                    stack: [
                      { text: status === 'APPROVED' ? 'Aprobado por' : 'Rechazado por', fontSize: 8, bold: true, color: '#555' },
                      { text: approval.approverName, fontSize: 11, bold: true, color: statusColors[status], margin: [0, 2, 0, 0] },
                      { text: new Date(approval.approvedAt!).toLocaleString('es-CO'), fontSize: 8, color: '#777' }
                    ]
                  }] : []),
                  ...(status === 'REJECTED' && approval?.rejectionReason ? [{
                    width: '*',
                    stack: [{ text: 'Razón de rechazo', fontSize: 8, bold: true, color: '#555' }, { text: approval.rejectionReason, fontSize: 10, color: '#991B1B', italics: true, margin: [0, 2, 0, 0] }]
                  }] : [])
                ]
              }
            ],
            fillColor: statusBg[status] ?? '#F9FAFB',
            margin: [10, 8, 10, 8],
            border: [false, false, false, false]
          }]]
        },
        margin: [0, 0, 0, 16]
      });
    }

    return { stack: metaStack };
  }

  // ... (El resto de los métodos buildFormSections, buildResponseContent, etc., se mantienen iguales)
  private buildFormSections(form: Form): any[] {
    const content: any[] = [];
    const sections = (form.sections ?? []).sort((a, b) => a.order - b.order);
    for (const section of sections) {
      content.push({ table: { widths: ['*'], body: [[{ text: section.title, bold: true, fontSize: 11, color: '#fff', fillColor: this.secondary, margin: [8, 6, 8, 6], border: [false, false, false, false] }]] }, margin: [0, 15, 0, 8] });
      const fields = (form.fields ?? []).filter(f => f.sectionId === section.id).sort((a, b) => a.order - b.order);
      for (const field of fields) {
        content.push({ text: field.label, style: 'fieldLabel' });
        content.push(field.type === 'checklist-table' || field.type === 'inventory-table' ? this.buildEmptyTable(field) : this.buildEmptyBox(field.type === 'textarea' ? 40 : 20));
      }
    }
    return content;
  }

  private buildResponseContent(response: ResponseInterface, form: Form): any[] {
    const content: any[] = [];
    const sections = (form.sections ?? []).sort((a, b) => a.order - b.order);
    for (const section of sections) {
      const fields = (form.fields ?? []).filter(f => f.sectionId === section.id && response.data[f.name] !== undefined).sort((a, b) => a.order - b.order);
      if (fields.length === 0) continue;
      content.push({ table: { widths: ['*'], body: [[{ text: section.title, bold: true, fontSize: 11, color: '#fff', fillColor: this.secondary, margin: [8, 6, 8, 6], border: [false, false, false, false] }]] }, margin: [0, 15, 0, 8] });
      for (const field of fields) {
        content.push({ text: field.label, fontSize: 9, bold: true, color: '#555', margin: [0, 4, 0, 2] });
        content.push(this.buildFieldValue(response.data[field.name], field));
      }
    }
    return content;
  }

  private buildFieldValue(value: unknown, field: any): any {
    if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
        const rows = value as Record<string, unknown>[];
        const cols = (field.columns ?? []) as any[];
        const rowDefs = (field.rows ?? []) as any[];
        const rowLabelMap = new Map<string, string>(rowDefs.map((r: any) => [r.id, r.label]));
        const headerRow = [{ text: 'Ítem', bold: true, fontSize: 8, color: '#fff', fillColor: this.primary, margin: [4, 4, 4, 4] }, ...cols.map((c: any) => ({ text: c.label, bold: true, fontSize: 8, color: '#fff', fillColor: this.primary, margin: [4, 4, 4, 4] }))];
        const dataRows = rows.map((row) => [{ text: rowLabelMap.get(row['rowId'] as string) ?? row['rowId'], fontSize: 8, margin: [4, 3, 4, 3] }, ...cols.map((c: any) => ({ text: String(row[c.key] ?? '—'), fontSize: 8, margin: [4, 3, 4, 3] }))]);
        return { table: { widths: ['*', ...cols.map(() => 70)], body: [headerRow, ...dataRows] }, layout: { hLineColor: () => '#DCE7EC', vLineColor: () => '#DCE7EC' }, margin: [0, 0, 0, 10] };
    }
    if (Array.isArray(value)) return { text: (value as string[]).join(', ') || '—', fontSize: 10, color: this.primary, margin: [0, 0, 0, 8] };
    return { table: { widths: ['*'], body: [[{ text: String(value ?? '—'), fontSize: 10, color: this.primary, margin: [6, 5, 6, 5] }]] }, layout: { hLineColor: () => '#E6EEF2', vLineColor: () => '#E6EEF2' }, margin: [0, 0, 0, 8] };
  }

  private buildEmptyBox(height: number): any {
    return { table: { widths: ['*'], body: [[{ text: ' ', margin: [4, height / 2, 4, height / 2] }]] }, layout: { hLineColor: () => '#DCE7EC', vLineColor: () => '#DCE7EC' }, margin: [0, 0, 0, 8] };
  }

  private buildEmptyTable(field: any): any {
    const cols = field.columns ?? [];
    const rows = field.rows ?? [];
    return { table: { widths: ['*', ...cols.map(() => 60)], body: [[{ text: 'Ítem', bold: true, fontSize: 8, color: '#fff', fillColor: this.primary, margin: [4, 4, 4, 4] }, ...cols.map((c: any) => ({ text: c.label, bold: true, fontSize: 8, color: '#fff', fillColor: this.primary, margin: [4, 4, 4, 4] }))], ...rows.map((row: any) => [{ text: row.label, fontSize: 8, margin: [4, 3, 4, 3] }, ...cols.map(() => ({ text: ' ', margin: [4, 3, 4, 3] }))])] }, layout: { hLineColor: () => '#DCE7EC', vLineColor: () => '#DCE7EC' }, margin: [0, 0, 0, 10] };
  }

  private baseStyles(): any {
    return { description: { fontSize: 10, color: '#555', margin: [0, 0, 0, 16] }, fieldLabel: { bold: true, fontSize: 10, color: this.primary, margin: [0, 8, 0, 3] } };
  }
}