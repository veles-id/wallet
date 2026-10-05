import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CredentialColorClass, CredentialIconType, StoredCredential } from '@core/services/credential.types';
import { CredentialStyleCategory } from './credential-card.types';

@Component({
  selector: 'app-credential-card',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './credential-card.component.html',
  styleUrl: './credential-card.component.scss',
})
export class CredentialCardComponent {
  credential = input.required<StoredCredential>();
  cardClick = output<StoredCredential>();

  private _getCategoryFromString(input: string): CredentialStyleCategory | null {
    const lowerInput = input.toLowerCase();
    const { EMAIL, EDUCATION, DEVICE, IDENTITY, PROFESSIONAL } = CredentialStyleCategory;

    const categoryKeywords: Record<CredentialStyleCategory, string[]> = {
      [EMAIL]: ['email'],
      [EDUCATION]: ['education', 'alumni', 'degree', 'university'],
      [DEVICE]: ['device', 'phone'],
      [IDENTITY]: ['identity'],
      [PROFESSIONAL]: ['professional', 'certification', 'certificate'],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => lowerInput.includes(keyword))) {
        return category as CredentialStyleCategory;
      }
    }

    return null;
  }

  getCredentialType(): string {
    const { credential: cred } = this.credential();
    const { type } = cred;

    if (type.length > 1) {
      return type.find((t) => t !== 'VerifiableCredential') || type[0];
    }
    return 'Credential';
  }

  getCredentialIcon(): string {
    const type = this.getCredentialType().toLowerCase();
    const detectedCategory = this._getCategoryFromString(type);
    const { EMAIL, EDUCATION, DEVICE, IDENTITY, PROFESSIONAL } = CredentialStyleCategory;
    const { EMAIL_OUTLINED, SCHOOL_OUTLINED, PHONE_IPHONE_OUTLINED, BADGE_OUTLINED, WORK_OUTLINE } = CredentialIconType;

    switch (detectedCategory) {
      case EMAIL:
        return EMAIL_OUTLINED;
      case EDUCATION:
        return SCHOOL_OUTLINED;
      case DEVICE:
        return PHONE_IPHONE_OUTLINED;
      case IDENTITY:
        return BADGE_OUTLINED;
      case PROFESSIONAL:
        return WORK_OUTLINE;
      default:
        return BADGE_OUTLINED;
    }
  }

  getCredentialColorClass(): string {
    const type = this.getCredentialType().toLowerCase();
    const detectedCategory = this._getCategoryFromString(type);
    const { EMAIL, EDUCATION, DEVICE, IDENTITY, PROFESSIONAL } = CredentialStyleCategory;
    const { BROWN, DARK, BLACK, BLUE, GREEN } = CredentialColorClass;

    switch (detectedCategory) {
      case EMAIL:
        return GREEN;
      case EDUCATION:
        return DARK;
      case DEVICE:
        return BLACK;
      case IDENTITY:
        return BLUE;
      case PROFESSIONAL:
        return BROWN;
      default:
        const colors = [BROWN, DARK, BLACK, BLUE, GREEN];
        const { credential: cred } = this.credential();
        const { id } = cred;
        const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const index = hash % colors.length;
        return colors[index];
    }
  }

  getCredentialDisplayName(): string {
    const { credential } = this.credential();
    return credential.name || this.getCredentialType();
  }

  getCredentialCategory(): string {
    return this.getCredentialType();
  }

  onCardClick(): void {
    this.cardClick.emit(this.credential());
  }
}
