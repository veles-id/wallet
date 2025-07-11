import { Component, input, output } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: "./header.component.html",
  styleUrl: "./header.component.scss",
})
export class HeaderComponent {
  title = input.required<string>();
  showBackButton = input<boolean>(true);
  backButtonClick = output<void>();

  onBackClick(): void {
    this.backButtonClick.emit();
  }
}
