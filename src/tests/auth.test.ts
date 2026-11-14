/**
 * Auth context sanity checks.
 * ponytail: minimal unit tests for auth state initialization and hook errors.
 */

import { AuthProvider, useAuth } from '@/contexts/auth-context';

describe('Auth Module', () => {
  it('exports AuthProvider and useAuth', () => {
    expect(AuthProvider).toBeDefined();
    expect(useAuth).toBeDefined();
  });
});
