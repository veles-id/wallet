import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { AvatarSize } from './avatar.types';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './avatar.component.html',
  styleUrl: './avatar.component.scss',
})
export class AvatarComponent {
  initials = input.required<string>();
  size = input<AvatarSize>(AvatarSize.MEDIUM);
  backgroundColor = input<string>('');

  avatarClasses = computed(() => {
    const classes = ['avatar'];
    classes.push(`avatar--${this.size()}`);
    return classes.join(' ');
  });

  avatarStyles = computed(() => {
    const styles: Record<string, string> = {};
    const customBackground = this.backgroundColor();

    if (customBackground) {
      styles['background-color'] = customBackground;
    }

    return styles;
  });
}
