/**
 * Utility functions for role-based authentication and routing
 */

export type UserRole = 
  | "ADMIN"
  | "COURSE_COORDINATOR"
  | "MODULE_COORDINATOR" 
  | "PROGRAM_COORDINATOR"
  | "CONTROLLER_OF_EXAMINATION";

export const coordinatorRoles: UserRole[] = [
  "COURSE_COORDINATOR",
  "MODULE_COORDINATOR",
  "PROGRAM_COORDINATOR",
  "CONTROLLER_OF_EXAMINATION",
];

/**
 * Get the appropriate dashboard route for a user based on their role
 */
export function getDashboardRoute(role: UserRole): string {
  if (role === "ADMIN") {
    return "/admin/dashboard";
  }
  
  if (coordinatorRoles.includes(role)) {
    return "/coordinator/dashboard";
  }
  
  // Fallback to general dashboard
  return "/dashboard";
}

/**
 * Check if a user role can access admin routes
 */
export function canAccessAdminRoutes(role: UserRole): boolean {
  return role === "ADMIN";
}

/**
 * Check if a user role can access coordinator routes
 */
export function canAccessCoordinatorRoutes(role: UserRole): boolean {
  return coordinatorRoles.includes(role);
}

/**
 * Get display name for a role
 */
export function getRoleDisplayName(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "COURSE_COORDINATOR":
      return "Course Coordinator";
    case "MODULE_COORDINATOR":
      return "Module Coordinator";
    case "PROGRAM_COORDINATOR":
      return "Program Coordinator";
    case "CONTROLLER_OF_EXAMINATION":
      return "Controller of Examination";
    default:
      return role;
  }
}

/**
 * Get role-specific color classes for UI components
 */
export function getRoleColorClass(role: UserRole): string {
  switch (role) {
    case "ADMIN":
      return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
    case "COURSE_COORDINATOR":
      return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
    case "MODULE_COORDINATOR":
      return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
    case "PROGRAM_COORDINATOR":
      return "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200";
    case "CONTROLLER_OF_EXAMINATION":
      return "bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200";
    default:
      return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
  }
}