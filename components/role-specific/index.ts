// Export all role-specific components for easy importing
export {
  PermissionGate,
  SimplePermissionGate,
  ProjectPermissionGate,
  AnyPermissionGate,
  AdminGate,
  UserManagementGate,
  ProjectCreationGate
} from './permission-gate'

// Re-export types for convenience
export type { PermissionGateProps } from './permission-gate'