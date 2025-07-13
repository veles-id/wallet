import {
  Injectable,
  signal,
  computed,
  TemplateRef,
  inject,
  DestroyRef,
} from "@angular/core";
import { Router, NavigationEnd } from "@angular/router";
import { filter } from "rxjs/operators";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";

export interface HeaderConfig {
  title?: string;
  showBackButton?: boolean;
  backButtonHandler?: () => void;
  contentTemplate?: TemplateRef<any>;
  contentContext?: any;
}

@Injectable({
  providedIn: "root",
})
export class HeaderService {
  private _router = inject(Router);
  private _destroyRef = inject(DestroyRef);

  private _config = signal<HeaderConfig>({
    title: "",
    showBackButton: false,
    backButtonHandler: undefined,
    contentTemplate: undefined,
    contentContext: undefined,
  });

  private _showHeader = signal(true);

  config = computed(() => this._config());
  showHeader = computed(() => this._showHeader());

  constructor() {
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this._destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        const routeData =
          this._router.routerState.root.firstChild?.snapshot.data;
        const showHeader = routeData?.["showHeader"] !== false;
        this._showHeader.set(showHeader);
      });
  }

  setHeader(config: HeaderConfig): void {
    this._config.set(config);
  }

  clearHeader(): void {
    this._config.set({
      title: "",
      showBackButton: false,
      backButtonHandler: undefined,
      contentTemplate: undefined,
      contentContext: undefined,
    });
  }

  handleBackClick(): void {
    const backHandler = this._config().backButtonHandler;
    if (backHandler) {
      backHandler();
    }
  }
}
