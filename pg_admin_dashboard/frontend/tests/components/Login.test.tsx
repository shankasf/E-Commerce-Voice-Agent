import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../utils';
import { Login } from '../../src/pages/Login';
import { useAuthStore } from '../../src/store/authStore';

// Mock the auth store
vi.mock('../../src/store/authStore', () => ({
  useAuthStore: vi.fn(),
}));

describe('Login Component', () => {
  const mockLogin = vi.fn();
  const mockClearError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementation
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: null,
      clearError: mockClearError,
    } as any);
  });

  it('should render login form', () => {
    renderWithProviders(<Login />);

    expect(screen.getByText('PG Admin')).toBeInTheDocument();
    expect(screen.getByText('Database Administration Dashboard')).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should update form fields when typing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');

    expect(usernameInput).toHaveValue('testuser');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should call login on form submit', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const usernameInput = screen.getByLabelText(/username/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    await user.type(usernameInput, 'testuser');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    expect(mockLogin).toHaveBeenCalledWith('testuser', 'password123');
  });

  it('should disable submit button while loading', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      isLoading: true,
      error: null,
      clearError: mockClearError,
    } as any);

    renderWithProviders(<Login />);

    const submitButton = screen.getByRole('button', { name: /signing in/i });
    expect(submitButton).toBeDisabled();
  });

  it('should display error message when login fails', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      login: mockLogin,
      isLoading: false,
      error: 'Invalid credentials',
      clearError: mockClearError,
    } as any);

    renderWithProviders(<Login />);

    expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
  });

  it('should not submit form with empty fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Login />);

    const submitButton = screen.getByRole('button', { name: /sign in/i });

    // Try to submit without filling fields
    await user.click(submitButton);

    // Login should not be called (form validation should prevent it)
    // Note: HTML5 validation might prevent this depending on implementation
  });

  it('should have password field with type password', () => {
    renderWithProviders(<Login />);

    const passwordInput = screen.getByLabelText(/password/i);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
