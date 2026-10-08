import { Bot } from 'lucide-react';
import type { AppModule } from '@/app/module.types';
import { ChatPage } from './pages/ChatPage';

export const chatModule: AppModule = {
  routes: [{ path: '/chat', Component: ChatPage }],
  navItems: [{ to: '/chat', label: 'AI Chat', icon: Bot }],
};
