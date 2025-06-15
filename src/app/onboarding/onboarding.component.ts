import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { Router } from "@angular/router";

@Component({
  selector: "app-onboarding",
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: "./onboarding.component.html",
  styleUrl: "./onboarding.component.scss",
})
export class OnboardingComponent {
  private _router = inject(Router);

  continue(): void {
    this._router.navigate(["/create-did"]);
  }
}
