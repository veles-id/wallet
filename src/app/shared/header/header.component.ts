import { Component, computed, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { MatButtonModule } from "@angular/material/button";
import { MatIconModule } from "@angular/material/icon";
import { HeaderService } from "../../core/services/header.service";

@Component({
  selector: "app-header",
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: "./header.component.html",
  styleUrl: "./header.component.scss",
})
export class HeaderComponent {
  private _headerService = inject(HeaderService);

  config = computed(() => this._headerService.config());
  title = computed(() => this.config().title || "");
  showBackButton = computed(() => this.config().showBackButton || false);
  contentTemplate = computed(() => this.config().contentTemplate);
  contentContext = computed(() => this.config().contentContext);
  showHeader = computed(() => this._headerService.showHeader());

  onBackClick(): void {
    this._headerService.handleBackClick();
  }
}
