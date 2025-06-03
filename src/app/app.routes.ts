import { Routes } from "@angular/router";
import { SplashComponent } from "./splash/splash.component";
import { DidManagementComponent } from "./did-management/did-management.component";
import { LoginComponent } from "./login/login.component";
import { BoardingComponent } from "./boarding/boarding.component";
import { CreateDidComponent } from "./create-did/create-did.component";
import { DashboardComponent } from "./dashboard/dashboard.component";
import { AuthGuard } from "./guards/auth.guard";

export const routes: Routes = [
  { path: "", component: SplashComponent },
  { path: "login", component: LoginComponent },
  { path: "boarding", component: BoardingComponent, canActivate: [AuthGuard] },
  {
    path: "create-did",
    component: CreateDidComponent,
    canActivate: [AuthGuard],
  },
  {
    path: "dashboard",
    component: DashboardComponent,
    canActivate: [AuthGuard],
  },
  { path: "did-management", component: DidManagementComponent },
  { path: "**", redirectTo: "" },
];
