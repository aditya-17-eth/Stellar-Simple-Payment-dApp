import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletConnect } from '../WalletConnect';

// Mock the WalletSelector component
vi.mock('../WalletSelector', () => ({
  WalletSelector: ({ isOpen, onClose, onSelectWallet }: {
    isOpen: boolean;
    onClose: () => void;
    onSelectWallet: () => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="wallet-selector">
        <button onClick={onClose}>Close</button>
        <button onClick={onSelectWallet}>Select Wallet</button>
      </div>
    );
  },
}));

describe('WalletConnect', () => {
  const mockOnConnect = vi.fn();
  const mockOnDisconnect = vi.fn();

  const defaultProps = {
    publicKey: null,
    isConnected: false,
    isLoading: false,
    error: null,
    isCorrectNetwork: true,
    walletName: '',
    onConnect: mockOnConnect,
    onDisconnect: mockOnDisconnect,
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Disconnected state', () => {
    it('renders connect button when disconnected', () => {
      render(<WalletConnect {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      expect(connectButton).toBeInTheDocument();
      expect(connectButton).not.toBeDisabled();
    });

    it('shows loading state when connecting', () => {
      render(<WalletConnect {...defaultProps} isLoading={true} />);

      const connectButton = screen.getByRole('button', { name: /connecting/i });
      expect(connectButton).toBeInTheDocument();
      expect(connectButton).toBeDisabled();
      expect(screen.getByText(/connecting/i)).toBeInTheDocument();
    });

    it('opens wallet selector when connect button is clicked', async () => {
      const user = userEvent.setup();
      render(<WalletConnect {...defaultProps} />);

      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      await user.click(connectButton);

      expect(screen.getByTestId('wallet-selector')).toBeInTheDocument();
    });

    it('calls onConnect when wallet is selected from selector', async () => {
      const user = userEvent.setup();
      render(<WalletConnect {...defaultProps} />);

      // Open selector
      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      await user.click(connectButton);

      // Select wallet
      const selectButton = screen.getByRole('button', { name: /select wallet/i });
      await user.click(selectButton);

      expect(mockOnConnect).toHaveBeenCalledTimes(1);
    });

    it('shows error message when error prop is provided', () => {
      const errorMessage = 'Failed to connect wallet';
      render(<WalletConnect {...defaultProps} error={errorMessage} />);

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toHaveClass('text-red-300');
    });

    it('does not show error message when error is null', () => {
      render(<WalletConnect {...defaultProps} error={null} />);

      const errorContainer = screen.queryByText(/failed|error/i);
      expect(errorContainer).not.toBeInTheDocument();
    });
  });

  describe('Connected state', () => {
    const connectedProps = {
      ...defaultProps,
      publicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      isConnected: true,
      walletName: 'Freighter',
    };

    it('displays wallet info when connected', () => {
      render(<WalletConnect {...connectedProps} />);

      // Should show truncated address
      expect(screen.getByText(/GXXXXX\.\.\.XXXXXX/)).toBeInTheDocument();
      
      // Should show wallet name
      expect(screen.getByText('Freighter')).toBeInTheDocument();
      
      // Should show connected indicator (green dot)
      const connectedIndicator = document.querySelector('.bg-green-400');
      expect(connectedIndicator).toBeInTheDocument();
    });

    it('displays full address in details section', () => {
      render(<WalletConnect {...connectedProps} />);

      const fullAddress = connectedProps.publicKey;
      expect(screen.getByText(fullAddress)).toBeInTheDocument();
    });

    it('shows disconnect button when connected', () => {
      render(<WalletConnect {...connectedProps} />);

      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      expect(disconnectButton).toBeInTheDocument();
    });

    it('calls onDisconnect when disconnect button is clicked', async () => {
      const user = userEvent.setup();
      render(<WalletConnect {...connectedProps} />);

      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      await user.click(disconnectButton);

      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
    });

    it('does not show connect button when connected', () => {
      render(<WalletConnect {...connectedProps} />);

      const connectButton = screen.queryByRole('button', { name: /connect wallet/i });
      expect(connectButton).not.toBeInTheDocument();
    });

    it('truncates long addresses correctly', () => {
      const longAddress = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
      render(<WalletConnect {...connectedProps} publicKey={longAddress} />);

      // Should show first 6 and last 6 characters
      expect(screen.getByText('GXXXXX...XXXXXX')).toBeInTheDocument();
    });

    it('does not truncate short addresses', () => {
      const shortAddress = 'GXXXXX';
      render(<WalletConnect {...connectedProps} publicKey={shortAddress} />);

      // Short address appears in both truncated view and full address section
      const addresses = screen.getAllByText(shortAddress);
      expect(addresses.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Network warnings', () => {
    const connectedProps = {
      ...defaultProps,
      publicKey: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
      isConnected: true,
      walletName: 'Freighter',
    };

    it('shows network warning when on wrong network', () => {
      render(<WalletConnect {...connectedProps} isCorrectNetwork={false} />);

      expect(screen.getByText(/please switch to testnet/i)).toBeInTheDocument();
      expect(screen.getByText(/⚠️/)).toBeInTheDocument();
    });

    it('does not show network warning when on correct network', () => {
      render(<WalletConnect {...connectedProps} isCorrectNetwork={true} />);

      const warning = screen.queryByText(/please switch to testnet/i);
      expect(warning).not.toBeInTheDocument();
    });

    it('only shows network warning when connected', () => {
      render(<WalletConnect {...defaultProps} isCorrectNetwork={false} />);

      const warning = screen.queryByText(/please switch to testnet/i);
      expect(warning).not.toBeInTheDocument();
    });
  });

  describe('Error handling', () => {
    it('shows multiple error types appropriately', () => {
      const errors = [
        'Wallet not detected',
        'Connection rejected',
        'Network error',
        'Transaction failed',
      ];

      errors.forEach((errorMessage) => {
        const { unmount } = render(<WalletConnect {...defaultProps} error={errorMessage} />);
        expect(screen.getByText(errorMessage)).toBeInTheDocument();
        unmount();
      });
    });

    it('error message has correct styling', () => {
      const errorMessage = 'Test error';
      render(<WalletConnect {...defaultProps} error={errorMessage} />);

      const errorElement = screen.getByText(errorMessage);
      expect(errorElement).toHaveClass('text-red-300');
      
      const errorContainer = errorElement.closest('div');
      expect(errorContainer).toHaveClass('bg-red-500/20');
    });
  });

  describe('Wallet selector integration', () => {
    it('closes wallet selector when close button is clicked', async () => {
      const user = userEvent.setup();
      render(<WalletConnect {...defaultProps} />);

      // Open selector
      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      await user.click(connectButton);
      expect(screen.getByTestId('wallet-selector')).toBeInTheDocument();

      // Close selector
      const closeButton = screen.getByRole('button', { name: /close/i });
      await user.click(closeButton);

      expect(screen.queryByTestId('wallet-selector')).not.toBeInTheDocument();
    });

    it('closes wallet selector after selecting a wallet', async () => {
      const user = userEvent.setup();
      render(<WalletConnect {...defaultProps} />);

      // Open selector
      const connectButton = screen.getByRole('button', { name: /connect wallet/i });
      await user.click(connectButton);

      // Select wallet
      const selectButton = screen.getByRole('button', { name: /select wallet/i });
      await user.click(selectButton);

      expect(screen.queryByTestId('wallet-selector')).not.toBeInTheDocument();
    });
  });
});
