import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { Router } from "@angular/router";

@Component({
  selector: "app-boarding",
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: "./boarding.component.html",
  styleUrl: "./boarding.component.scss",
})
export class BoardingComponent {
  private _router = inject(Router);

  continue(): void {
    this._router.navigate(["/create-did"]);
  }
}
