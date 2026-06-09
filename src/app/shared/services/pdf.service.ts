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
  private accent    = '#CCBA86';

  //FORMULARIO VACÍO

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

  printForm(form: Form): void {
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
    pdfMake.createPdf(doc).print();
  }

  //RESPUESTA
  generateResponsePdf(response: ResponseInterface, form: Form): void {
    const doc: any = {
      pageSize: 'A4',
      pageMargins: [40, 110, 40, 60],
      header: () => this.buildHeader(form, 'RESPUESTA DE FORMULARIO'),
      footer: (cur: number, total: number) => this.buildFooter(cur, total),
      content: [
        this.buildResponseMeta(response),
        ...this.buildResponseContent(response, form),
      ],
      styles: {
        ...this.baseStyles(),
        metaLabel: { fontSize: 9,  bold: true, color: '#777' },
        metaValue: { fontSize: 11, color: this.primary },
      },
    };
    pdfMake.createPdf(doc).download(
      `RESPUESTA_${form.code}_${response.filledBy.fullName}.pdf`
    );
  }

  //HEADER
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
                { text: title,     fontSize: 15, bold: true,  color: this.primary },
                { text: form.name, fontSize: 11, color: this.secondary, margin: [0, 3, 0, 0] },
                {
                  text: `Código: ${form.code}   |   Versión: v${form.version}` +
                        (form.documentDate ? `   |   Fecha doc: ${new Date(form.documentDate).toLocaleDateString('es-CO')}` : ''),
                  fontSize: 8, color: '#666', margin: [0, 3, 0, 0]
                },
              ],
            },
          ],
        },
        {
          canvas: [{
            type: 'line', x1: 0, y1: 10, x2: 515, y2: 10,
            lineWidth: 1, lineColor: '#DCE7EC',
          }],
        },
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

  //FORMULARIO VACÍO — SECCIONES
  private buildFormSections(form: Form): any[] {
    const content: any[] = [];

    const sections = (form.sections ?? []).sort((a, b) => a.order - b.order);

    for (const section of sections) {
      // Título sección
      content.push({
        table: {
          widths: ['*'],
          body: [[{
            text: section.title,
            bold: true, fontSize: 11,
            color: '#fff', fillColor: this.secondary,
            margin: [8, 6, 8, 6],
            border: [false, false, false, false],
          }]],
        },
        margin: [0, 15, 0, 8],
      });

      // Campos de la sección — usa section.id no section.name
      const fields = (form.fields ?? [])
        .filter(f => f.sectionId === section.id) // ← corregido
        .sort((a, b) => a.order - b.order);

      for (const field of fields) {
        content.push({ text: field.label, style: 'fieldLabel' });

        if (field.type === 'checklist-table' || field.type === 'inventory-table') {
          content.push(this.buildEmptyTable(field));
        } else if (field.type === 'textarea') {
          content.push(this.buildEmptyBox(40));
        } else {
          content.push(this.buildEmptyBox(20));
        }
      }
    }

    return content;
  }

  private buildEmptyBox(height: number): any {
    return {
      table: {
        widths: ['*'],
        body: [[{ text: ' ', margin: [4, height / 2, 4, height / 2] }]],
      },
      layout: {
        hLineColor: () => '#DCE7EC',
        vLineColor: () => '#DCE7EC',
      },
      margin: [0, 0, 0, 8],
    };
  }

  private buildEmptyTable(field: any): any {
    const cols   = field.columns ?? [];
    const rows   = field.rows   ?? [];

    const headerRow = [
      { text: 'Ítem', bold: true, fontSize: 8, color: '#fff', fillColor: this.primary, margin: [4, 4, 4, 4] },
      ...cols.map((c: any) => ({
        text: c.label, bold: true, fontSize: 8,
        color: '#fff', fillColor: this.primary, margin: [4, 4, 4, 4],
      })),
    ];

    const dataRows = rows.map((row: any) => [
      { text: row.label, fontSize: 8, margin: [4, 3, 4, 3] },
      ...cols.map(() => ({ text: ' ', margin: [4, 3, 4, 3] })),
    ]);

    return {
      table: {
        widths: ['*', ...cols.map(() => 60)],
        body: [headerRow, ...dataRows],
      },
      layout: {
        hLineColor: () => '#DCE7EC',
        vLineColor: () => '#DCE7EC',
      },
      margin: [0, 0, 0, 10],
    };
  }

  //RESPUESTA CONTENIDO

  private buildResponseMeta(response: ResponseInterface): any {
    return {
      columns: [
        {
          width: '*',
          stack: [
            { text: 'Respondido por', style: 'metaLabel' },
            { text: response.filledBy.fullName ?? '', style: 'metaValue' },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Correo', style: 'metaLabel' },
            { text: response.filledBy.email, style: 'metaValue' },
          ],
        },
        {
          width: '*',
          stack: [
            { text: 'Fecha de envío', style: 'metaLabel' },
            { text: new Date(response.submittedAt).toLocaleString('es-CO'), style: 'metaValue' },
          ],
        },
      ],
      margin: [0, 0, 0, 20],
    };
  }

  private buildResponseContent(response: ResponseInterface, form: Form): any[] {
    const content: any[] = [];
    const sections = (form.sections ?? []).sort((a, b) => a.order - b.order);

    for (const section of sections) {
      const fields = (form.fields ?? [])
        .filter(f => f.sectionId === section.id)
        .sort((a, b) => a.order - b.order)
        .filter(f => response.data[f.name] !== undefined);

      if (fields.length === 0) continue;

      // Título sección
      content.push({
        table: {
          widths: ['*'],
          body: [[{
            text: section.title,
            bold: true, fontSize: 11,
            color: '#fff', fillColor: this.secondary,
            margin: [8, 6, 8, 6],
            border: [false, false, false, false],
          }]],
        },
        margin: [0, 15, 0, 8],
      });

      for (const field of fields) {
        const value = response.data[field.name];

        content.push({
          text: field.label,
          fontSize: 9, bold: true,
          color: '#555', margin: [0, 4, 0, 2],
        });

        content.push(this.buildFieldValue(value, field));
      }
    }

    return content;
  }

  private buildFieldValue(value: unknown, field: any): any {

    //Tabla (checklist-table / inventory-table)
    if (Array.isArray(value) && value.length > 0 &&
        typeof value[0] === 'object' && !Array.isArray(value[0])) {

      const rows   = value as Record<string, unknown>[];
      const cols   = (field.columns ?? []) as any[];
      const rowDefs = (field.rows ?? []) as any[];

      // Mapa rowId → label
      const rowLabelMap = new Map<string, string>(
        rowDefs.map((r: any) => [r.id, r.label])
      );

      const headerRow = [
        {
          text: 'Ítem', bold: true, fontSize: 8,
          color: '#fff', fillColor: this.primary, margin: [4, 4, 4, 4],
        },
        ...cols.map((c: any) => ({
          text: c.label, bold: true, fontSize: 8,
          color: '#fff', fillColor: this.primary, margin: [4, 4, 4, 4],
        })),
      ];

      const dataRows = rows.map((row) => {
        const rowId    = row['rowId'] as string;
        const rowLabel = rowLabelMap.get(rowId) ?? rowId; // ← label real de la fila

        return [
          { text: rowLabel, fontSize: 8, margin: [4, 3, 4, 3] },
          ...cols.map((c: any) => ({
            text: String(row[c.key] ?? '—'),
            fontSize: 8, margin: [4, 3, 4, 3],
          })),
        ];
      });

      return {
        table: {
          widths: ['*', ...cols.map(() => 70)],
          body: [headerRow, ...dataRows],
        },
        layout: {
          hLineColor: () => '#DCE7EC',
          vLineColor: () => '#DCE7EC',
        },
        margin: [0, 0, 0, 10],
      };
    }

    //Array de strings (checkbox
    if (Array.isArray(value)) {
      return {
        text: (value as string[]).join(', ') || '—',
        fontSize: 10, color: this.primary, margin: [0, 0, 0, 8],
      };
    }

    //Valor simple
    return {
      table: {
        widths: ['*'],
        body: [[{
          text: String(value ?? '—'),
          fontSize: 10, color: this.primary, margin: [6, 5, 6, 5],
        }]],
      },
      layout: {
        hLineColor: () => '#E6EEF2',
        vLineColor: () => '#E6EEF2',
      },
      margin: [0, 0, 0, 8],
    };
  }

  //ESTILOS BASE

  private baseStyles(): any {
    return {
      description: { fontSize: 10, color: '#555', margin: [0, 0, 0, 16] },
      fieldLabel:  { bold: true, fontSize: 10, color: this.primary, margin: [0, 8, 0, 3] },
    };
  }
}