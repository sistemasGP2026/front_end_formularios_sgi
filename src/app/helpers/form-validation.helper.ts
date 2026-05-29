import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

export class FormValidation {

  static getErrorMessage(control: AbstractControl | null): string {
    if (!control || !control.errors) return '';

    const errors = control.errors;

    if (errors['required']) {
      return 'Este campo es obligatorio';
    }

    if (errors['email']) {
      return 'Correo inválido';
    }

    if (errors['minlength']) {
      return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    }

    if (errors['maxlength']) {
      return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    }

    if (errors['pattern']) {
      return 'Formato inválido';
    }

    return 'Campo inválido';
  }

  static markFormTouched(form: FormGroup | FormArray) {
    Object.values(form.controls).forEach(control => {

      control.markAsTouched();

      if (control instanceof FormGroup || control instanceof FormArray) {
        this.markFormTouched(control);
      }

    });
  }

}