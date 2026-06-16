import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

// Mock scrollTo as it's not implemented in JSDOM
const scrollToMock = vi.fn();
Object.defineProperty(window, 'scrollTo', { value: scrollToMock, writable: true });

// Mock matchMedia for prefers-reduced-motion
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

import { ScrollToTop } from '../components/ScrollToTop';

describe('Scroll Restoration Logic', () => {
  beforeEach(() => {
    sessionStorage.clear();
    scrollToMock.mockClear();
  });

  it('isolates scroll positions between routes during navigation', async () => {
    sessionStorage.setItem('scroll_position_/route-a', '100');
    sessionStorage.setItem('scroll_position_/route-b', '800');

    let navigate: (path: string) => void;
    
    const NavigationHelper = () => {
      const nav = useNavigate();
      useEffect(() => { navigate = nav; }, [nav]);
      return null;
    };

    render(
      <MemoryRouter initialEntries={['/route-a']}>
        <ScrollToTop />
        <NavigationHelper />
        <Routes>
          <Route path="/route-a" element={<div>Route A</div>} />
          <Route path="/route-b" element={<div>Route B</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Initial check for route A
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith(expect.objectContaining({ top: 100 }));
    });

    scrollToMock.mockClear();

    // Navigate to Route B
    await act(async () => {
      navigate('/route-b');
    });

    // Check for route B restoration
    await waitFor(() => {
      expect(scrollToMock).toHaveBeenCalledWith(expect.objectContaining({ top: 800 }));
    }, { timeout: 1000 });
  });
});
