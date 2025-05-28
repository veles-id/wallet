import { Routes } from "@angular/router";
import { SplashComponent } from "./splash/splash.component";
import { OnboardingComponent } from "./onboarding/onboarding.component";

export const routes: Routes = [
  { path: "", component: SplashComponent },
  { path: "onboarding", component: OnboardingComponent },
  { path: "**", redirectTo: "" },
];
