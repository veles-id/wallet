import { TemplateRef } from '@angular/core';

export interface HeaderConfig {
  title?: string;
  showBackButton?: boolean;
  backButtonHandler?: () => void;
  contentTemplate?: TemplateRef<any>;
  contentContext?: any;
}
