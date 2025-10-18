import { CommonModule } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { AvatarComponent } from '../avatar/avatar.component';
import { AvatarSize } from '../avatar/avatar.types';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent {
  initials = input.required<string>();
  name = input.required<string>();
  type = input.required<string>();
  avatarSize = input<AvatarSize>(AvatarSize.MEDIUM);

  profileSizeClass = computed(() => {
    return `profile--${this.avatarSize()}`;
  });
}
