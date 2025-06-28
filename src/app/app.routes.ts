import { Routes } from "@angular/router";
import { SplashComponent } from "./splash/splash.component";
import { DidManagementComponent } from "./did-management/did-management.component";
import { LoginComponent } from "./login/login.component";
import { OnboardingComponent } from "./onboarding/onboarding.component";
import { CreateDidComponent } from "./create-did/create-did.component";
import { PersonasListComponent } from "./personas-list/personas-list.component";
import { PersonaDetailsComponent } from "./persona-details/persona-details.component";
import { PersonaEditComponent } from "./persona-edit/persona-edit.component";
import { PersonaUnpublishedComponent } from "./persona-unpublished/persona-unpublished.component";
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
    component: PersonasListComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "personas/:id/unpublished",
    component: PersonaUnpublishedComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "personas/:id/edit",
    component: PersonaEditComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "personas/:id",
    component: PersonaDetailsComponent,
    canActivate: [AuthGuard],
  },
  { path: "did-management", component: DidManagementComponent },
  { path: "**", redirectTo: "" },
];
