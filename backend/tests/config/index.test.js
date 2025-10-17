jest.mock('dotenv', () => ({
  config: jest.fn(() => ({ parsed: {} }))
}));

const ORIGINAL_ENV = { ...process.env };

const loadConfig = () => {
  jest.resetModules();
  return require('../../src/config');
};

describe('config module', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    jest.resetModules();
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  test('uses sensible defaults when env vars missing', () => {
    delete process.env.PORT;
    delete process.env.LOG_TOKENS;
    delete process.env.ENABLE_ROUTE_OPTIMIZATION;
    delete process.env.BCRYPT_SALT_ROUNDS;

    const config = loadConfig();

    expect(config.port).toBe(5000);
    expect(config.jwt.logTokens).toBe(false);
    expect(config.features.routeOptimization).toBe(true);
    expect(config.bcrypt.saltRounds).toBe(12);
  });

  test('honors explicit environment overrides', () => {
    process.env.PORT = '7000';
    process.env.JWT_SECRET = 'strong-secret';
    process.env.JWT_EXPIRES = '1d';
    process.env.BCRYPT_SALT_ROUNDS = '8';
    process.env.ENABLE_ROUTE_OPTIMIZATION = 'false';

    const config = loadConfig();

    expect(config.port).toBe('7000');
    expect(config.jwt.secret).toBe('strong-secret');
    expect(config.jwt.expiresIn).toBe('1d');
    expect(config.bcrypt.saltRounds).toBe(8);
    expect(config.features.routeOptimization).toBe(false);
  });

  test('warns about unsafe production defaults', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.JWT_SECRET;
    process.env.LOG_TOKENS = 'TRUE';

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const config = loadConfig();

    expect(config.jwt.secret).toBe('devsecret');
    expect(config.jwt.logTokens).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith('WARNING: Using default JWT secret in production!');
    expect(warnSpy).toHaveBeenCalledWith('WARNING: JWT token logging is enabled in production!');

    warnSpy.mockRestore();
  });
});
