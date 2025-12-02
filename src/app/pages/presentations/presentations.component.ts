import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { Router } from '@angular/router';
import { HeaderService } from '@core/services/header.service';
import { PresentationService } from '@core/services/presentation.service';
import { VPShareRecord, VPTemplate } from '@core/services/presentation.types';

@Component({
  selector: 'app-presentations',
  standalone: true,
  imports: [DatePipe, MatTabsModule, MatButtonModule, MatIconModule, MatCardModule],
  templateUrl: './presentations.component.html',
  styleUrl: './presentations.component.scss',
})
export class PresentationsComponent implements OnInit {
  private _presentationService = inject(PresentationService);
  private _router = inject(Router);
  private _headerService = inject(HeaderService);

  templates = signal<VPTemplate[]>([]);
  shareHistory = signal<VPShareRecord[]>([]);
  selectedTab = signal(0);

  ngOnInit(): void {
    this._headerService.setHeader({
      title: 'Presentations',
      showBackButton: false,
    });
    this._loadData();
  }

  private _loadData(): void {
    this.templates.set(this._presentationService.getTemplates());
    this.shareHistory.set(this._presentationService.getShareHistory());
  }

  createTemplate(): void {
    this._router.navigate(['/presentations/create-template']);
  }

  viewTemplate(template: VPTemplate): void {
    this._router.navigate(['/presentations/template', template.id]);
  }

  deleteTemplate(template: VPTemplate, event: Event): void {
    event.stopPropagation();
    if (confirm(`Delete template "${template.name}"?`)) {
      this._presentationService.deleteTemplate(template.id);
      this._loadData();
    }
  }
}
