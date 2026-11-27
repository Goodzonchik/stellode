import { Neo4jService } from './neo4j.service';

describe('Neo4jService.writeInTransaction', () => {
  const createService = (executeWriteImpl: jest.Mock) => {
    const session = {
      executeWrite: executeWriteImpl,
      close: jest.fn().mockResolvedValue(undefined),
    };
    const driver = {
      session: jest.fn().mockReturnValue(session),
      close: jest.fn().mockResolvedValue(undefined),
    };
    const service = new Neo4jService(driver as never);
    return { service, session, driver };
  };

  it('runs work with run bound to the same transaction and returns the result', async () => {
    const txRun = jest.fn().mockResolvedValue({
      records: [{ keys: ['value'], get: () => 1 }],
    });
    const executeWrite = jest.fn(async (work: (tx: { run: typeof txRun }) => Promise<unknown>) =>
      work({ run: txRun }),
    );
    const { service, session, driver } = createService(executeWrite);

    const result = await service.writeInTransaction(async (run) => {
      const queryResult = await run('RETURN 1 AS value');
      return { ok: true, value: queryResult.records[0]?.get('value') };
    });

    expect(driver.session).toHaveBeenCalledWith({ defaultAccessMode: 'WRITE' });
    expect(executeWrite).toHaveBeenCalledTimes(1);
    expect(txRun).toHaveBeenCalledWith('RETURN 1 AS value', {});
    expect(result).toEqual({ ok: true, value: 1 });
    expect(session.close).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from work so the driver can roll back', async () => {
    const executeWrite = jest.fn(async (work: (tx: { run: jest.Mock }) => Promise<unknown>) =>
      work({ run: jest.fn() }),
    );
    const { service, session } = createService(executeWrite);

    await expect(
      service.writeInTransaction(async () => {
        throw new Error('mid-op failure');
      }),
    ).rejects.toThrow('mid-op failure');
    expect(session.close).toHaveBeenCalledTimes(1);
  });
});
