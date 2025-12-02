import { Routes } from '@angular/router';
import { AuthGuard } from '@core/guards/auth.guard';
import { CredentialCreateComponent } from './pages/credentials/credential-create/credential-create.component';
import { CredentialDetailsComponent } from './pages/credentials/credential-details/credential-details.component';
import { CredentialsComponent } from './pages/credentials/credentials.component';
import { LoginComponent } from './pages/login/login.component';
import { OnboardingComponent } from './pages/onboarding/onboarding.component';
import { CreateDidComponent } from './pages/personas/create-did/create-did.component';
import { DidManagementComponent } from './pages/personas/did-management/did-management.component';
import { PersonaDetailsComponent } from './pages/personas/persona-details/persona-details.component';
import { PersonaEditComponent } from './pages/personas/persona-edit/persona-edit.component';
import { PersonaUnpublishedComponent } from './pages/personas/persona-unpublished/persona-unpublished.component';
import { PersonasComponent } from './pages/personas/personas.component';
import { SplashComponent } from './pages/splash/splash.component';

export const routes: Routes = [
  { path: '', component: SplashComponent, data: { showHeader: false } },
  { path: 'login', component: LoginComponent, data: { showHeader: false } },
  {
    path: 'onboarding',
    component: OnboardingComponent,
    canActivate: [AuthGuard],
    data: { showHeader: false },
  },
  {
    path: 'create-did',
    component: CreateDidComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'personas',
    component: PersonasComponent,
    canActivate: [AuthGuard],
    data: { showFooter: true },
  },
  {
    path: 'personas/:id/unpublished',
    component: PersonaUnpublishedComponent,
    canActivate: [AuthGuard],
    data: { showFooter: true },
  },
  {
    path: 'personas/:id/edit',
    component: PersonaEditComponent,
    canActivate: [AuthGuard],
    data: { showFooter: true },
  },
  {
    path: 'personas/:id',
    component: PersonaDetailsComponent,
    canActivate: [AuthGuard],
    data: { showFooter: true },
  },
  {
    path: 'credentials',
    component: CredentialsComponent,
    canActivate: [AuthGuard],
    data: { showFooter: true },
  },
  {
    path: 'credentials/create',
    component: CredentialCreateComponent,
    canActivate: [AuthGuard],
    data: { showFooter: true },
  },
  {
    path: 'credentials/:id',
    component: CredentialDetailsComponent,
    canActivate: [AuthGuard],
    data: { showFooter: true },
  },
  {
    path: 'presentations',
    loadComponent: () => import('./pages/presentations/presentations.component').then((m) => m.PresentationsComponent),
    canActivate: [AuthGuard],
    data: { showFooter: true },
  },
  {
    path: 'presentations/create-template',
    loadComponent: () =>
      import('./pages/presentations/template-create/template-create.component').then((m) => m.TemplateCreateComponent),
    canActivate: [AuthGuard],
    data: { showFooter: true },
  },
  {
    path: 'presentations/template/:id',
    loadComponent: () =>
      import('./pages/presentations/template-details/template-details.component').then(
        (m) => m.TemplateDetailsComponent,
      ),
    canActivate: [AuthGuard],
    data: { showFooter: true },
  },
  { path: 'did-management', component: DidManagementComponent },
  { path: '**', redirectTo: '' },
];
