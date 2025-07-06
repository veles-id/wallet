import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatIconModule } from "@angular/material/icon";
import {
  StoredCredential,
  CredentialCategory,
  CredentialColorClass,
  CredentialIconType,
} from "../services/credential.types";

@Component({
  selector: "app-credential-card",
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: "./credential-card.component.html",
  styleUrl: "./credential-card.component.scss",
})
export class CredentialCardComponent {
  credential = input.required<StoredCredential>();
  cardClick = output<StoredCredential>();

  private _getCategoryFromString(input: string): CredentialCategory | null {
    const lowerInput = input.toLowerCase();

    const { EMAIL, EDUCATION, DEVICE, IDENTITY, PROFESSIONAL } =
      CredentialCategory;

    if (lowerInput.includes("email")) return EMAIL;
    if (lowerInput.includes("education") || lowerInput.includes("alumni"))
      return EDUCATION;
    if (lowerInput.includes("device") || lowerInput.includes("phone"))
      return DEVICE;
    if (lowerInput.includes("identity")) return IDENTITY;
    if (lowerInput.includes("professional")) return PROFESSIONAL;

    return null;
  }

  getCredentialType(): string {
    const { credential: cred, metadata } = this.credential();
    const { type } = cred;

    if (type.length > 1) {
      return type.find((t) => t !== "VerifiableCredential") || type[0];
    }
    return metadata?.category || "Credential";
  }

  getCredentialIcon(): string {
    const { metadata } = this.credential();
    const category = metadata?.category?.toLowerCase();
    const type = this.getCredentialType().toLowerCase();

    const detectedCategory =
      this._getCategoryFromString(category || "") ||
      this._getCategoryFromString(type || "");

    const { EMAIL, EDUCATION, DEVICE, IDENTITY, PROFESSIONAL } =
      CredentialCategory;
    const {
      EMAIL_OUTLINED,
      SCHOOL_OUTLINED,
      PHONE_IPHONE_OUTLINED,
      BADGE_OUTLINED,
      WORK_OUTLINE,
    } = CredentialIconType;

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
    const { metadata } = this.credential();
    const category = metadata?.category?.toLowerCase();
    const type = this.getCredentialType().toLowerCase();

    const detectedCategory =
      this._getCategoryFromString(category || "") ||
      this._getCategoryFromString(type || "");

    const { BROWN, DARK, BLACK, BLUE, GREEN } = CredentialColorClass;
    const { EMAIL, EDUCATION, DEVICE, IDENTITY, PROFESSIONAL } =
      CredentialCategory;

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
        const index = Math.abs(id.length) % colors.length;
        return colors[index];
    }
  }

  getCredentialDisplayName(): string {
    const { alias } = this.credential();
    return alias || this.getCredentialType();
  }

  getCredentialCategory(): string {
    const { metadata } = this.credential();
    return metadata?.category || this.getCredentialType();
  }

  onCardClick(): void {
    this.cardClick.emit(this.credential());
  }
}
