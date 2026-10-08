import type { LucideIcon } from 'lucide-react';
import type { ComponentType } from 'react';
import type { UserRole } from '@/modules/auth/types/auth.types';

/** A page reachable after login. Set `roles` to hide it from other users. */
export interface ModuleRoute {
  path: string;
  Component: ComponentType;
  roles?: UserRole[];
}

/** A link in the top navigation bar. */
export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles?: UserRole[];
}

/** What a feature module contributes to the app. Register it in `src/app/modules.ts`. */
export interface AppModule {
  routes: ModuleRoute[];
  navItems?: NavItem[];
}
