import axios from 'axios';
import { parseFeatureVersionDeletionBlocked } from './parse-feature-version-deletion-blocked';

describe('parseFeatureVersionDeletionBlocked', () => {
  it('returns blocking relations from axios 400 body', () => {
    const error = new axios.AxiosError('Bad Request');
    error.response = {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} } as never,
      data: {
        message: 'Cannot delete featureVersion: blocking links found',
        blockingRelations: [
          {
            relationType: 'PINNED_TO_APPLICATION_VERSION',
            direction: 'outgoing',
            targetId: 'av-1',
            targetKind: 'ApplicationVersion',
            targetName: '1.0',
          },
        ],
      },
    };

    expect(parseFeatureVersionDeletionBlocked(error)).toEqual([
      {
        relationType: 'PINNED_TO_APPLICATION_VERSION',
        direction: 'outgoing',
        targetId: 'av-1',
        targetKind: 'ApplicationVersion',
        targetName: '1.0',
      },
    ]);
  });

  it('returns null when blockingRelations absent', () => {
    const error = new axios.AxiosError('Bad Request');
    error.response = {
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: {} } as never,
      data: { message: 'Cannot delete featureVersion: must be latest draft' },
    };
    expect(parseFeatureVersionDeletionBlocked(error)).toBeNull();
  });

  it('returns null for non-axios errors', () => {
    expect(parseFeatureVersionDeletionBlocked(new Error('x'))).toBeNull();
  });
});
