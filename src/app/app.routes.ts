import { Routes } from "@angular/router";
import { SplashComponent } from "./splash/splash.component";
import { DidManagementComponent } from "./did-management/did-management.component";
import { LoginComponent } from "./login/login.component";
import { OnboardingComponent } from "./onboarding/onboarding.component";
import { CreateDidComponent } from "./create-did/create-did.component";
import { PersonasComponent } from "./personas/personas.component";
import { AuthGuard } from "./guards/auth.guard";

export const routes: Routes = [
  { path: "", component: SplashComponent },
  { path: "login", component: LoginComponent },
  {
    path: "onboarding",
    component: OnboardingComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "create-did",
    component: CreateDidComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "personas",
    component: PersonasComponent,
    canActivate: [AuthGuard],
  },
  { path: "did-management", component: DidManagementComponent },
  { path: "**", redirectTo: "" },
];
