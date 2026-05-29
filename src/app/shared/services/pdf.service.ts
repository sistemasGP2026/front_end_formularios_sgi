import { Injectable } from '@angular/core';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { Form } from '../../forms/interfaces/form.interface';
import { ResponseInterface } from '../../responses/interfaces/response.interface';
import {BASE64LOGO} from '../../assets/base64-logo'

(pdfMake as any).addVirtualFileSystem(pdfFonts);

@Injectable({
  providedIn: 'root',
})
export class PdfService {
  private readonly base64Img = BASE64LOGO;

  private primary = '#002E42';
  private secondary = '#00649B';
  private accent = '#CCBA86'

  generateFormPdf(form: Form) {

    const docDefinition: any = {

      pageSize: 'A4',

      pageMargins: [40, 110, 40, 60],

      header: () => ({
        margin: [40, 25, 40, 0],

        stack: [

          {
            columns: [
              {
                width: 70,
                image: this.base64Img,
                fit: [60, 60]
              },

              // INFO
              {
                width: '*',
                stack: [
                  {
                    text: 'SISTEMA DE GESTIÓN INTEGRAL',
                    fontSize: 16,
                    bold: true,
                    color: this.primary
                  },

                  {
                    text: form.name,
                    fontSize: 13,
                    margin: [0, 4, 0, 0],
                    color: this.secondary
                  },

                  {
                    text: `Código: ${form.code}   |   Versión: ${form.version}`,
                    fontSize: 9,
                    color: '#666',
                    margin: [0, 4, 0, 0]
                  }
                ]
              }

            ]
          },

          {
            canvas: [
              {
                type: 'line',
                x1: 0,
                y1: 10,
                x2: 515,
                y2: 10,
                lineWidth: 1,
                lineColor: '#DCE7EC'
              }
            ]
          }

        ]
      }),

      footer: (currentPage: number, pageCount: number) => ({
        margin: [40, 10],

        columns: [

          {
            text: 'Documento generado automáticamente por SGI',
            fontSize: 8,
            color: '#777'
          },

          {
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: 'right',
            fontSize: 8,
            color: '#777'
          }

        ]
      }),

      content: [

        {
          text: 'FORMULARIO',
          style: 'title'
        },

        {
          text: form.description,
          style: 'description'
        },

        ...this.buildFormSections(form)

      ],

      styles: {

        title: {
          fontSize: 20,
          bold: true,
          color: this.primary,
          margin: [0, 10, 0, 15]
        },

        description: {
          fontSize: 10,
          color: '#555',
          margin: [0, 0, 0, 20]
        },

        sectionTitle: {
          fontSize: 13,
          bold: true,
          color: '#fff',
          fillColor: this.secondary,
          margin: [0, 15, 0, 8]
        },

        fieldLabel: {
          bold: true,
          color: this.primary,
          margin: [0, 8, 0, 3]
        },

        fieldBox: {
          margin: [0, 0, 0, 10],
          color: '#444'
        }

      }
    };

    pdfMake.createPdf(docDefinition).download(
      `${form.code}.pdf`
    );
  }

  //generar pdf para respuesta  
  generateResponsePdf(response: ResponseInterface, form: Form) {

    const docDefinition: any = {

      pageSize: 'A4',

      pageMargins: [40, 110, 40, 60],

      header: () => ({
        margin: [40, 25, 40, 0],

        stack: [

          {
            columns: [

              {
                width: 70,
                image: this.base64Img || '',
                fit: [60, 60]
              },

              {
                width: '*',

                stack: [

                  {
                    text: 'RESPUESTA DE FORMULARIO',
                    fontSize: 16,
                    bold: true,
                    color: this.primary
                  },

                  {
                    text: form.name,
                    fontSize: 12,
                    color: this.secondary,
                    margin: [0, 4, 0, 0]
                  },

                  {
                    text: `Código: ${form.code}`,
                    fontSize: 9,
                    color: '#666'
                  }

                ]
              }

            ]
          }

        ]
      }),

      content: [

        // RESPONDENTE
        {
          columns: [

            {
              width: '*',

              stack: [

                {
                  text: 'Respondido por',
                  style: 'metaLabel'
                },

                {
                  text: response.filledBy.fullName || '',
                  style: 'metaValue'
                }

              ]
            },

            {
              width: '*',

              stack: [

                {
                  text: 'Correo',
                  style: 'metaLabel'
                },

                {
                  text: response.filledBy.email,
                  style: 'metaValue'
                }

              ]
            },

            {
              width: '*',

              stack: [

                {
                  text: 'Fecha',
                  style: 'metaLabel'
                },

                {
                  text: new Date(response.submittedAt).toLocaleString(),
                  style: 'metaValue'
                }

              ]
            }

          ],

          margin: [0, 0, 0, 20]
        },

        // RESPUESTAS
        ...this.buildResponseContent(response, form)

      ],

      styles: {

        metaLabel: {
          fontSize: 9,
          bold: true,
          color: '#777'
        },

        metaValue: {
          fontSize: 11,
          color: this.primary
        },

        question: {
          bold: true,
          color: this.primary,
          margin: [0, 10, 0, 4]
        },

        answerBox: {
          margin: [0, 0, 0, 10],
          fillColor: '#F8FAFB'
        }

      }

    };

    pdfMake.createPdf(docDefinition).download(
      `RESPUESTA_${form.code}_${response.filledBy.fullName}.pdf`
    );
  }

  private buildFormSections(form: Form): Form[] {

    const content: any[] = [];

    form.sections.forEach((section: any) => {

      content.push({
        text: section.name,
        style: 'sectionTitle'
      });

      const fields = form.fields.filter(
        (f: any) => f.sectionId === section.id
      );

      fields.forEach((field: any) => {

        content.push({
          text: field.label,
          style: 'fieldLabel'
        });

        content.push({
          table: {
            widths: ['*'],
            body: [
              [
                {
                  text: ' ',
                  height: 25,
                  border: [true, true, true, true],
                  borderColor: ['#DCE7EC', '#DCE7EC', '#DCE7EC', '#DCE7EC']
                }
              ]
            ]
          },
          layout: 'noHorizontalLines',
          margin: [0, 0, 0, 8]
        });

      });

    });

    return content;
  }

  private buildResponseContent(response: ResponseInterface, form: Form): any[] {
  const content: any[] = [];

  // Crear mapa de field.name → field para lookup rápido
  const fieldMap = new Map<string, any>();
  (form.fields ?? []).forEach(f => fieldMap.set(f.name, f));

  // Ordenar secciones
  const sections = (form.sections ?? []).sort((a, b) => a.order - b.order);

  for (const section of sections) {
    // Campos de esta sección ordenados
    const fields = (form.fields ?? [])
      .filter(f => f.sectionId === section.id)
      .sort((a, b) => a.order - b.order);

    // Solo agregar sección si tiene al menos un campo con respuesta
    const fieldsWithData = fields.filter(f => response.data[f.name] !== undefined);
    if (fieldsWithData.length === 0) continue;

    // Título de sección
    content.push({
      table: {
        widths: ['*'],
        body: [[{
          text: section.title,
          bold: true,
          color: '#fff',
          fillColor: '#00649B',
          margin: [8, 6, 8, 6],
          border: [false, false, false, false]
        }]]
      },
      margin: [0, 15, 0, 8]
    });

    for (const field of fieldsWithData) {
      const value = response.data[field.name];

      content.push({
        stack: [
          {
            text: field.label,
            fontSize: 9,
            bold: true,
            color: '#666',
            margin: [0, 4, 0, 2]
          },
          this.buildFieldValue(value, field)
        ]
      });
    }
  }

  return content;
}

private buildFieldValue(value: unknown, field: any): any {
  // Tabla (array de objetos)
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && !Array.isArray(value[0])) {
    const rows = value as Record<string, unknown>[];
    const keys = Object.keys(rows[0]).filter(k => k !== 'rowId');

    // Usar labels de columnas del field si existen
    const headerRow = keys.map(k => {
      const col = field.columns?.find((c: any) => c.key === k);
      return {
        text: col?.label ?? k.toUpperCase(),
        bold: true,
        fontSize: 8,
        color: '#fff',
        fillColor: '#002E42',
        margin: [4, 4, 4, 4]
      };
    });

    const dataRows = rows.map((row, i) => {
      // Primera columna: label de la fila si existe
      const rowDef = field.rows?.[i];
      return keys.map((k, ki) => ({
        text: ki === 0 && rowDef?.label ? rowDef.label : String(row[k] ?? ''),
        fontSize: 8,
        margin: [4, 3, 4, 3]
      }));
    });

    return {
      table: {
        widths: keys.map(() => '*'),
        body: [headerRow, ...dataRows]
      },
      margin: [0, 0, 0, 10]
    };
  }

  // Array de strings (checkbox)
  if (Array.isArray(value)) {
    return {
      text: (value as string[]).join(', ') || 'Sin respuesta',
      fontSize: 10,
      color: '#002E42',
      margin: [0, 0, 0, 8]
    };
  }

  // Valor simple
  return {
    table: {
      widths: ['*'],
      body: [[{
        text: String(value ?? ''),
        fontSize: 10,
        color: '#002E42',
        margin: [6, 5, 6, 5]
      }]]
    },
    layout: {
      hLineColor: () => '#E6EEF2',
      vLineColor: () => '#E6EEF2',
    },
    margin: [0, 0, 0, 8]
  };
}

  private formatValue(value: any): string {

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }

    return value ?? 'Sin respuesta';
  }


  printForm(form: any) {
    const pdf = this.generateFormDefinition(form);
    pdfMake.createPdf(pdf).print();
  }

  private generateFormDefinition(form: any) {
    return {
      content: [
        {
          text: form.name
        }
      ]
    };
  }

}