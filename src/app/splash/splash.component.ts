import { Component } from "@angular/core";
import { Router } from "@angular/router";

@Component({
  selector: "app-splash",
  imports: [],
  templateUrl: "./splash.component.html",
  styleUrl: "./splash.component.scss",
  standalone: true,
})
export class SplashComponent {
  constructor(private router: Router) {}

  onClick() {
    this.router.navigate(["/onboarding"]);
  }
}
