interface PrivateWorkspaceAccess {
  isSupabaseConfigured: boolean;
  user: unknown;
  workspace: unknown;
}

export function canAccessPrivateWorkspace({
  isSupabaseConfigured,
  user,
  workspace
}: PrivateWorkspaceAccess): boolean {
  return isSupabaseConfigured && Boolean(user) && Boolean(workspace);
}
