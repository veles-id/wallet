import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { Router } from '@angular/router';
import { HeaderService } from '../../core/services/header.service';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './onboarding.component.html',
  styleUrl: './onboarding.component.scss',
})
export class OnboardingComponent implements OnInit {
  private _router = inject(Router);
  private _headerService = inject(HeaderService);

  ngOnInit(): void {
    this._headerService.clearHeader();
  }
  continue(): void {
    this._router.navigate(['/create-did']);
  }
}
