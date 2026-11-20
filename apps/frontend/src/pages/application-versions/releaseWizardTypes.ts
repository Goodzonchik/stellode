import type { ComponentVersionApplicationUsage } from '@stellode/models';
import type { VersionStatus } from '@stellode/models';

export type ReleaseWizardTeam = { id: string; name: string } | null;

export type ReleaseNewerVersion = {
  id: string;
  version: string;
  versionNumber: number;
  status: VersionStatus;
};

export type ReleaseComponentRow = {
  component: { id: string; name: string };
  team: ReleaseWizardTeam;
  componentVersion: {
    id: string;
    componentId: string;
    version: string;
    versionNumber: number;
    status: VersionStatus;
  };
  applicationStatus: 'active' | 'deprecated';
  otherApplications: ComponentVersionApplicationUsage[];
  hasNewerVersion: boolean;
  newerVersions: ReleaseNewerVersion[];
};
