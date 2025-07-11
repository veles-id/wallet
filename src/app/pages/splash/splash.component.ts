import { Component, inject } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-splash",
  imports: [],
  templateUrl: "./splash.component.html",
  styleUrl: "./splash.component.scss",
  standalone: true,
})
export class SplashComponent {
  private _router = inject(Router);

  onClick() {
    this._router.navigate(["/login"]);
  }
}
