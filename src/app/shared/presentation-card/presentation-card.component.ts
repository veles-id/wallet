import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { StoredCredential } from '@core/services/credential.types';
import { StoredDID } from '@core/services/did.types';
import { AvatarComponent } from '@shared/avatar/avatar.component';
import { AvatarSize } from '@shared/avatar/avatar.types';

@Component({
  selector: 'app-presentation-card',
  standalone: true,
  imports: [MatIconModule, AvatarComponent],
  templateUrl: './presentation-card.component.html',
  styleUrl: './presentation-card.component.scss',
})
export class PresentationCardComponent {
  credential = input.required<StoredCredential>();
  persona = input.required<StoredDID | null>();
  personaType = input.required<string>();
  personaName = input.required<string>();
  selectiveFields = input.required<string[]>();
  validityMinutes = input.required<number>();

  AvatarSize = AvatarSize;

  personaInitials = computed<string>(() => {
    const persona = this.persona();
    if (!persona?.alias) {
      return '?';
    }
    return persona.alias
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  });

  credentialRawType = computed<string>(() => {
    const { type } = this.credential().credential;
    return type.find(t => t !== 'VerifiableCredential') || type[0];
  });

  credentialDisplayName = computed<string>(() => {
    return this.credential().credential.name || this.credentialRawType();
  });

  formattedExpiration = computed<string>(() => {
    const expires = new Date(Date.now() + this.validityMinutes() * 60_000);
    const today = new Date();
    const isToday =
      expires.getDate() === today.getDate() &&
      expires.getMonth() === today.getMonth() &&
      expires.getFullYear() === today.getFullYear();
    const time = expires.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return isToday ? `Today at ${time}` : expires.toLocaleString();
  });

  getFieldValue(fieldKey: string): string {
    const value = this.credential().credential.credentialSubject[fieldKey];
    return value === null || value === undefined ? '' : String(value);
  }
}
