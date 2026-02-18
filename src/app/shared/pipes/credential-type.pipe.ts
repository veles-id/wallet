import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'credentialType',
  standalone: true,
})
export class CredentialTypePipe implements PipeTransform {
  transform(value: string): string {
    return value
      .replace(/Credential$/i, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .trim();
  }
}
