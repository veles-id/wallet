import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class FooterService {
  private _router = inject(Router);
  private _destroyRef = inject(DestroyRef);
  private _showFooter = signal(false);

  showFooter = computed(() => this._showFooter());

  constructor() {
    this._router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this._destroyRef),
      )
      .subscribe((event: NavigationEnd) => {
        const routeData = this._router.routerState.root.firstChild?.snapshot.data;
        const showFooter = routeData?.['showFooter'] || false;
        this._showFooter.set(showFooter);
      });
  }
}
