import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncateWords',
  standalone: true
})
export class TruncateWordsPipe implements PipeTransform {
  transform(value: string, limit: number = 2): string {
    if (!value) return '';
    const words = value.split(' ');
    return words.slice(0, limit).join(' ');
  }
}
