import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Layout from './Layout';

vi.mock('../api/client', () => ({
  getAuth: vi.fn(),
}));

const { getAuth } = await import('../api/client');

describe('Layout', () => {
  beforeEach(() => {
    vi.mocked(getAuth).mockReturnValue({ token: null, user: null });
  });

  it('renders navigation for public routes when unauthenticated', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Layout>
          <div>content</div>
        </Layout>
      </MemoryRouter>
    );

    expect(screen.getByText('SmartBin')).toBeInTheDocument();
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  it('hides navigation for dashboard routes', () => {
    vi.mocked(getAuth).mockReturnValue({ token: '123', user: { role: 'admin', name: 'Ada' } });

    render(
      <MemoryRouter initialEntries={['/dashboard/admin']}>
        <Layout>
          <div>content</div>
        </Layout>
      </MemoryRouter>
    );

    expect(screen.queryByText('SmartBin')).not.toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('shows role-specific link for residents', () => {
    vi.mocked(getAuth).mockReturnValue({ token: 'abc', user: { role: 'resident', name: 'Riya' } });

    render(
      <MemoryRouter initialEntries={['/']}> 
        <Layout>
          <div>content</div>
        </Layout>
      </MemoryRouter>
    );

    expect(screen.getByText('User Panel')).toBeInTheDocument();
    expect(screen.getByText('Hi, Riya')).toBeInTheDocument();
  });
});
