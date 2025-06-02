import { Routes } from "@angular/router";
import { SplashComponent } from "./splash/splash.component";
import { OnboardingComponent } from "./onboarding/onboarding.component";
import { DidCreationComponent } from "./did-creation/did-creation.component";
import { DidManagementComponent } from "./did-management/did-management.component";
import { LoginComponent } from "./login/login.component";
import { BoardingComponent } from "./boarding/boarding.component";
import { AuthGuard } from "./guards/auth.guard";

export const routes: Routes = [
  { path: "", component: SplashComponent },
  { path: "login", component: LoginComponent },
  { path: "boarding", component: BoardingComponent, canActivate: [AuthGuard] },
  { path: "onboarding", component: OnboardingComponent },
  { path: "did-creation", component: DidCreationComponent },
  { path: "did-management", component: DidManagementComponent },
  { path: "**", redirectTo: "" },
];
