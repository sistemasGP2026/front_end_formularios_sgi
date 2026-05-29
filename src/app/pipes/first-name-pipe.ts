import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'firstName',
})
export class FirstNamePipe implements PipeTransform {
  transform(value:string): unknown {
    return value.trim().split(' ')[0];
  }
}
