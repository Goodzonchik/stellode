export type ApplicationMemberships = ReadonlyMap<string, string | undefined>;

export type ApplicationGrouping = {
  membershipsByChild: ReadonlyMap<string, ApplicationMemberships>;
  collapsedVersionToApplication: ReadonlyMap<string, string>;
};
