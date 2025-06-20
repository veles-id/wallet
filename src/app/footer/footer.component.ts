import { BreakpointObserver, Breakpoints } from "@angular/cdk/layout";
import { Component, DestroyRef, inject, OnInit, signal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { MatButtonModule } from "@angular/material/button";

@Component({
  selector: "app-footer",
  imports: [MatButtonModule],
  templateUrl: "./footer.component.html",
  styleUrl: "./footer.component.scss",
})
export class FooterComponent implements OnInit {
  private _destroyRef = inject(DestroyRef);
  private _breakpoint = inject(BreakpointObserver);
  private _displayNameMap = new Map([
    [Breakpoints.XSmall, "XSmall"],
    [Breakpoints.Small, "Small"],
    [Breakpoints.Medium, "Medium"],
    [Breakpoints.Large, "Large"],
    [Breakpoints.XLarge, "XLarge"],
  ]);

  breakpoint = signal<string | undefined>("");

  ngOnInit(): void {
    this._breakpoint
      .observe([
        Breakpoints.XSmall,
        Breakpoints.Small,
        Breakpoints.Medium,
        Breakpoints.Large,
        Breakpoints.XLarge,
      ])
      .pipe(takeUntilDestroyed(this._destroyRef))
      .subscribe((result: any) => {
        for (const query of Object.keys(result.breakpoints)) {
          if (result.breakpoints[query]) {
            const layout = this._displayNameMap.get(query);
            console.log("layout:", layout);
            this.breakpoint.set(layout);
          }
        }
      });
  }
}
