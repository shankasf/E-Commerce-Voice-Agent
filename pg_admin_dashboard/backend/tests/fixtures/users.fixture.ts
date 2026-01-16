import jwt from 'jsonwebtoken';

export const testUser = {
  id: 'test-user-id-123',
  username: 'testuser',
  role: 'admin',
};

export const testUserCredentials = {
  username: 'testuser',
  password: 'testpassword123',
};

export const generateTestToken = (user = testUser, expiresIn = '1h') => {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
    { expiresIn }
  );
};

export const generateExpiredToken = (user = testUser) => {
  return jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing',
    { expiresIn: '-1h' }
  );
};

export const invalidToken = 'invalid.jwt.token';
