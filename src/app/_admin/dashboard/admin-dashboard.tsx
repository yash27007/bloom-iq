'use client';

import { useState } from 'react';
import {
  Users,
  BookOpen,
  Menu,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import UserManagement from './user-management';
import CourseManagement from './course-management';

type SidebarItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  component: React.ComponentType;
};

const sidebarItems: SidebarItem[] = [
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    component: UserManagement,
  },
  {
    id: 'courses',
    label: 'Course Management',
    icon: BookOpen,
    component: CourseManagement,
  },
];

export default function AdminDashboard() {
  const [activeItem, setActiveItem] = useState('users');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const ActiveComponent = sidebarItems.find(item => item.id === activeItem)?.component || (() => null);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white shadow-sm border-gray-200"
        >
          {sidebarOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">BI</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Bloom IQ</h1>
              <p className="text-xs text-gray-500">Admin Panel</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <nav className="p-4 space-y-1">
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveItem(item.id);
                  setSidebarOpen(false);
                }}
                className={cn(
                  "w-full flex items-center space-x-3 px-3 py-2 text-left rounded-lg transition-colors duration-150 text-sm font-medium",
                  activeItem === item.id
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className={cn(
                  "h-5 w-5",
                  activeItem === item.id ? "text-white" : "text-gray-500"
                )} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200/50">
          <div className="text-xs text-gray-500 text-center">
            © 2025 Bloom IQ. All rights reserved.
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="min-h-full">
          {/* Top bar */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {sidebarItems.find(item => item.id === activeItem)?.label}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {activeItem === 'users'
                      ? 'Manage system users and their roles'
                      : 'Manage courses and coordinators'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
