export interface UserPrivateState<Workspace, Listing, History> {
  ownerUserId: string | null;
  workspace: Workspace | null;
  savedListings: Listing[];
  searchHistory: History[];
}

export function createEmptyUserPrivateState<Workspace, Listing, History>(
  ownerUserId: string | null = null
): UserPrivateState<Workspace, Listing, History> {
  return {
    ownerUserId,
    workspace: null,
    savedListings: [],
    searchHistory: []
  };
}

export function createAuthoritativeUserPrivateState<Workspace, Listing, History>(
  ownerUserId: string,
  workspace: Workspace,
  savedListings: Listing[] | null | undefined,
  searchHistory: History[] | null | undefined
): UserPrivateState<Workspace, Listing, History> {
  return {
    ownerUserId,
    workspace,
    savedListings: savedListings ? [...savedListings] : [],
    searchHistory: searchHistory ? [...searchHistory] : []
  };
}

export function didAuthenticatedUserChange(
  previousUserId: string | null,
  nextUserId: string | null
): boolean {
  return previousUserId !== nextUserId;
}

export function canApplyPrivateStateLoad(
  activeUserId: string | null,
  activeVersion: number,
  requestedUserId: string,
  requestedVersion: number
): boolean {
  return activeUserId === requestedUserId && activeVersion === requestedVersion;
}
