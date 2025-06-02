import { Component } from "@angular/core";
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
  constructor(private router: Router) {}

  continue(): void {
    // Navigate to DID creation
    this.router.navigate(["/did-creation"]);
  }
}
