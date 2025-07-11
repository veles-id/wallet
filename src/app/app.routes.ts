import { Routes } from "@angular/router";
import { SplashComponent } from "./pages/splash/splash.component";
import { LoginComponent } from "./pages/login/login.component";
import { OnboardingComponent } from "./pages/onboarding/onboarding.component";
import { PersonasComponent } from "./pages/personas/personas.component";
import { PersonaDetailsComponent } from "./pages/personas/persona-details/persona-details.component";
import { PersonaEditComponent } from "./pages/personas/persona-edit/persona-edit.component";
import { PersonaUnpublishedComponent } from "./pages/personas/persona-unpublished/persona-unpublished.component";
import { CredentialsComponent } from "./pages/credentials/credentials.component";
import { CredentialCreateComponent } from "./pages/credentials/credential-create/credential-create.component";
import { CredentialDetailsComponent } from "./pages/credentials/credential-details/credential-details.component";
import { AuthGuard } from "./core/guards/auth.guard";
import { CreateDidComponent } from "./pages/personas/create-did/create-did.component";
import { DidManagementComponent } from "./pages/personas/did-management/did-management.component";

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
  {
    path: "credentials",
    component: CredentialsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "credentials/create",
    component: CredentialCreateComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "credentials/:id",
    component: CredentialDetailsComponent,
    canActivate: [AuthGuard],
  },
  { path: "did-management", component: DidManagementComponent },
  { path: "**", redirectTo: "" },
];
