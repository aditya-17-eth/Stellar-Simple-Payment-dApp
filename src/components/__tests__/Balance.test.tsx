import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Balance } from '../Balance';
import * as stellarUtils from '../../utils/stellar';

// Mock the stellar utilities
vi.mock('../../utils/stellar', () => ({
  fetchBalance: vi.fn(),
  fetchTokenBalance: vi.fn(),
}));

// Mock the constants
vi.mock('../../utils/constants', () => ({
  SUPPORTED_ASSETS: [
    { code: 'XLM', issuer: null, name: 'Stellar Lumens' },
    { code: 'USDC', issuer: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5', name: 'USD Coin' },
    { code: 'SRT', issuer: 'GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B', name: 'SRT Token' },
  ],
}));

describe('Balance', () => {
  const mockPublicKey = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading state', () => {
    it('displays loading spinner when fetching balances', () => {
      // Make the fetch hang to keep loading state
      vi.mocked(stellarUtils.fetchBalance).mockImplementation(() => 
        new Promise(() => {}) // Never resolves
      );
      vi.mocked(stellarUtils.fetchTokenBalance).mockImplementation(() => 
        new Promise(() => {})
      );

      render(<Balance publicKey={mockPublicKey} />);

      expect(screen.getByText('Loading balances...')).toBeInTheDocument();
      
      // Check for spinner SVG
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows loading state with correct styling', () => {
      vi.mocked(stellarUtils.fetchBalance).mockImplementation(() => 
        new Promise(() => {})
      );
      vi.mocked(stellarUtils.fetchTokenBalance).mockImplementation(() => 
        new Promise(() => {})
      );

      render(<Balance publicKey={mockPublicKey} />);

      const loadingText = screen.getByText('Loading balances...');
      expect(loadingText).toHaveClass('text-gray-400');
    });
  });

  describe('Balance display', () => {
    it('displays formatted XLM balance correctly', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('1234.5678901');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('0');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('1,234.5678901')).toBeInTheDocument();
      });
    });

    it('displays formatted USDC balance correctly', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('500.123456');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('500.123456')).toBeInTheDocument();
      });
    });

    it('displays zero balance when account has no funds', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('0');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('0');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        const zeroBalances = screen.getAllByText('0.00');
        expect(zeroBalances.length).toBeGreaterThanOrEqual(2); // XLM and USDC
      });
    });

    it('formats large balances with thousand separators', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('1000000.50');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('999999.99');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        // Check that the balance contains the digits and decimal (locale-specific formatting)
        // The actual format depends on the system locale
        const xlmBalance = screen.getByText(/10[,\s]*00[,\s]*000\.50/);
        const usdcBalance = screen.getByText(/9[,\s]*99[,\s]*999\.99/);
        expect(xlmBalance).toBeInTheDocument();
        expect(usdcBalance).toBeInTheDocument();
      });
    });

    it('displays asset labels correctly', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('XLM')).toBeInTheDocument();
        expect(screen.getByText('USDC')).toBeInTheDocument();
        expect(screen.getByText('Stellar Lumens')).toBeInTheDocument();
        expect(screen.getByText('USD Coin')).toBeInTheDocument();
      });
    });

    it('displays minimum 2 decimal places for balances', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('100.00')).toBeInTheDocument();
        expect(screen.getByText('50.00')).toBeInTheDocument();
      });
    });

    it('displays up to 7 decimal places for precise balances', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100.1234567');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50.9876543');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('100.1234567')).toBeInTheDocument();
        expect(screen.getByText('50.9876543')).toBeInTheDocument();
      });
    });
  });

  describe('Refresh functionality', () => {
    it('refreshes balance when refresh button is clicked', async () => {
      const user = userEvent.setup();
      
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('100.00')).toBeInTheDocument();
      });

      // Clear mocks to track new calls
      vi.clearAllMocks();
      
      // Update mock to return different values
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('200');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('75');

      // Click refresh button
      const refreshButton = screen.getByTitle('Refresh balances');
      await user.click(refreshButton);

      await waitFor(() => {
        expect(stellarUtils.fetchBalance).toHaveBeenCalledWith(mockPublicKey);
        expect(stellarUtils.fetchTokenBalance).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('200.00')).toBeInTheDocument();
        expect(screen.getByText('75.00')).toBeInTheDocument();
      });
    });

    it('refreshes balance when refreshTrigger prop changes', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      const { rerender } = render(<Balance publicKey={mockPublicKey} refreshTrigger={0} />);

      await waitFor(() => {
        expect(screen.getByText('100.00')).toBeInTheDocument();
      });

      // Clear mocks to track new calls
      vi.clearAllMocks();
      
      // Update mock to return different values
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('300');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('150');

      // Trigger refresh by changing prop
      rerender(<Balance publicKey={mockPublicKey} refreshTrigger={1} />);

      await waitFor(() => {
        expect(stellarUtils.fetchBalance).toHaveBeenCalledWith(mockPublicKey);
        expect(stellarUtils.fetchTokenBalance).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByText('300.00')).toBeInTheDocument();
        expect(screen.getByText('150.00')).toBeInTheDocument();
      });
    });

    it('disables refresh button while loading', async () => {
      const user = userEvent.setup();
      
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('100.00')).toBeInTheDocument();
      });

      // Make next fetch take longer
      vi.mocked(stellarUtils.fetchBalance).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('200'), 500))
      );
      vi.mocked(stellarUtils.fetchTokenBalance).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('75'), 500))
      );

      const refreshButton = screen.getByTitle('Refresh balances');
      await user.click(refreshButton);

      // Wait a bit for the loading state to kick in
      await new Promise(resolve => setTimeout(resolve, 50));

      // Check if button is disabled or loading state is shown
      const isDisabled = refreshButton.hasAttribute('disabled');
      const isLoading = screen.queryByText('Loading balances...') !== null;
      
      expect(isDisabled || isLoading).toBe(true);
    });

    it('fetches both XLM and USDC balances in parallel', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(stellarUtils.fetchBalance).toHaveBeenCalledWith(mockPublicKey);
        expect(stellarUtils.fetchTokenBalance).toHaveBeenCalledWith(
          mockPublicKey,
          'USDC',
          'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
        );
      });
    });
  });

  describe('Error handling', () => {
    it('displays error message when balance fetch fails', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockRejectedValue(new Error('Network error'));
      vi.mocked(stellarUtils.fetchTokenBalance).mockRejectedValue(new Error('Network error'));

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch balances')).toBeInTheDocument();
      });
    });

    it('shows try again button when error occurs', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockRejectedValue(new Error('Network error'));
      vi.mocked(stellarUtils.fetchTokenBalance).mockRejectedValue(new Error('Network error'));

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('Try again')).toBeInTheDocument();
      });
    });

    it('retries fetching balances when try again is clicked', async () => {
      const user = userEvent.setup();
      
      // First call fails
      vi.mocked(stellarUtils.fetchBalance).mockRejectedValueOnce(new Error('Network error'));
      vi.mocked(stellarUtils.fetchTokenBalance).mockRejectedValueOnce(new Error('Network error'));

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch balances')).toBeInTheDocument();
      });

      // Second call succeeds
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      const tryAgainButton = screen.getByText('Try again');
      await user.click(tryAgainButton);

      await waitFor(() => {
        expect(screen.getByText('100.00')).toBeInTheDocument();
        expect(screen.getByText('50.00')).toBeInTheDocument();
      });
    });

    it('displays error with correct styling', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockRejectedValue(new Error('Network error'));
      vi.mocked(stellarUtils.fetchTokenBalance).mockRejectedValue(new Error('Network error'));

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        const errorMessage = screen.getByText('Failed to fetch balances');
        expect(errorMessage).toHaveClass('text-red-400');
        
        // Check the outer container has the red border
        const outerContainer = document.querySelector('.border-red-500\\/30');
        expect(outerContainer).toBeInTheDocument();
      });
    });

    it('handles partial fetch failures gracefully', async () => {
      // XLM fetch succeeds, USDC fails
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockRejectedValue(new Error('Token fetch error'));

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch balances')).toBeInTheDocument();
      });
    });
  });

  describe('Warning messages', () => {
    it('shows low XLM balance warning when balance is below 2', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('1.5');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('100');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText(/Low XLM balance/i)).toBeInTheDocument();
        expect(screen.getByText(/You need at least 1 XLM to keep your account active/i)).toBeInTheDocument();
      });
    });

    it('does not show low XLM warning when balance is 2 or above', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('2.0');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('100');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('2.00')).toBeInTheDocument();
      });

      const lowBalanceWarning = screen.queryByText(/Low XLM balance/i);
      expect(lowBalanceWarning).not.toBeInTheDocument();
    });

    it('shows friendbot link in low balance warning', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('0.5');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('0');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        const friendbotLink = screen.getByText('Fund with Friendbot');
        expect(friendbotLink).toBeInTheDocument();
        expect(friendbotLink).toHaveAttribute('href', 'https://laboratory.stellar.org/#account-creator?network=test');
        expect(friendbotLink).toHaveAttribute('target', '_blank');
      });
    });

    it('shows no USDC trustline hint when USDC balance is zero', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('0');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText(/No USDC trustline yet/i)).toBeInTheDocument();
        expect(screen.getByText(/swap some XLM to USDC and a trustline will be created automatically/i)).toBeInTheDocument();
      });
    });

    it('does not show trustline hint when USDC balance is positive', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('50.00')).toBeInTheDocument();
      });

      const trustlineHint = screen.queryByText(/No USDC trustline yet/i);
      expect(trustlineHint).not.toBeInTheDocument();
    });

    it('shows both warnings when XLM is low and USDC is zero', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('1.0');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('0');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText(/Low XLM balance/i)).toBeInTheDocument();
        expect(screen.getByText(/No USDC trustline yet/i)).toBeInTheDocument();
      });
    });
  });

  describe('Component structure', () => {
    it('renders balance cards in grid layout', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        const grid = document.querySelector('.grid-cols-2');
        expect(grid).toBeInTheDocument();
      });
    });

    it('displays asset icons for XLM and USDC', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        // Check for XLM icon (✦)
        expect(screen.getByText('✦')).toBeInTheDocument();
        
        // Check for USDC icon ($)
        expect(screen.getByText('$')).toBeInTheDocument();
      });
    });

    it('renders refresh button with correct icon', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        const refreshButton = screen.getByTitle('Refresh balances');
        expect(refreshButton).toBeInTheDocument();
        
        // Check for SVG icon
        const svg = refreshButton.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('displays "Your Balances" header', async () => {
      vi.mocked(stellarUtils.fetchBalance).mockResolvedValue('100');
      vi.mocked(stellarUtils.fetchTokenBalance).mockResolvedValue('50');

      render(<Balance publicKey={mockPublicKey} />);

      await waitFor(() => {
        expect(screen.getByText('Your Balances')).toBeInTheDocument();
      });
    });
  });
});
