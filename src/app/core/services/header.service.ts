import { Injectable, signal, computed, TemplateRef } from "@angular/core";

export interface HeaderConfig {
  title?: string;
  showBackButton?: boolean;
  backButtonHandler?: () => void;
  contentTemplate?: TemplateRef<any>;
  contentContext?: any;
  padding?: string;
}

@Injectable({
  providedIn: "root",
})
export class HeaderService {
  private _config = signal<HeaderConfig>({
    title: "",
    showBackButton: false,
    backButtonHandler: undefined,
    contentTemplate: undefined,
    contentContext: undefined,
    padding: "1rem 1.5rem",
  });

  config = computed(() => this._config());

  setHeader(config: HeaderConfig): void {
    this._config.set({
      ...config,
      padding: config.padding || "1rem 1.5rem",
    });
  }

  clearHeader(): void {
    this._config.set({
      title: "",
      showBackButton: false,
      backButtonHandler: undefined,
      contentTemplate: undefined,
      contentContext: undefined,
      padding: "0",
    });
  }

  handleBackClick(): void {
    const backHandler = this._config().backButtonHandler;
    if (backHandler) {
      backHandler();
    }
  }
}
