import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SwapForm } from '../SwapForm';

// Mock the stellar/dex module
vi.mock('../../stellar/dex', () => ({
  fetchOrderbook: vi.fn(),
  estimateSwapReceive: vi.fn(),
  executeSwap: vi.fn(),
}));

// Mock the contract/sorobanClient module
vi.mock('../../contract/sorobanClient', () => ({
  recordSwap: vi.fn(),
}));

// Mock the TransactionStatus component
vi.mock('../TransactionStatus', () => ({
  TransactionStatus: ({ status, txHash, errorMessage, onReset }: {
    status: string;
    txHash: string | null;
    errorMessage: string | null;
    onReset: () => void;
  }) => {
    if (status === 'idle') return null;
    return (
      <div data-testid="transaction-status">
        <div data-testid="tx-status">{status}</div>
        {txHash && <div data-testid="tx-hash">{txHash}</div>}
        {errorMessage && <div data-testid="tx-error">{errorMessage}</div>}
        {status === 'success' && <button onClick={onReset}>Reset</button>}
      </div>
    );
  },
}));

describe('SwapForm', () => {
  const mockPublicKey = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';
  const mockSignTransaction = vi.fn();
  const mockOnSwapSuccess = vi.fn();

  const defaultProps = {
    publicKey: mockPublicKey,
    signTransaction: mockSignTransaction,
    onSwapSuccess: mockOnSwapSuccess,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Setup default mock implementations
    const { fetchOrderbook, estimateSwapReceive } = await import('../../stellar/dex');
    vi.mocked(fetchOrderbook).mockResolvedValue({
      bestAskPrice: '1.5',
      bestBidPrice: '1.4',
      askDepth: 10,
      bidDepth: 15,
      estimatedReceive: '0',
    });
    vi.mocked(estimateSwapReceive).mockResolvedValue('140.0000000');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initial rendering', () => {
    it('renders swap form with all essential elements', () => {
      render(<SwapForm {...defaultProps} />);

      expect(screen.getByText('Token Swap')).toBeInTheDocument();
      expect(screen.getByText('You sell')).toBeInTheDocument();
      expect(screen.getByText('You receive (estimated)')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('0.00')).toBeInTheDocument();
    });

    it('renders asset selectors with default values', () => {
      render(<SwapForm {...defaultProps} />);

      const selects = screen.getAllByRole('combobox');
      expect(selects).toHaveLength(2);
      
      // Default: XLM (index 0) to USDC (index 1)
      expect(selects[0]).toHaveValue('0');
      expect(selects[1]).toHaveValue('1');
    });

    it('renders swap button in disabled state initially', () => {
      render(<SwapForm {...defaultProps} />);

      const swapButton = screen.getByRole('button', { name: /enter an amount/i });
      expect(swapButton).toBeInTheDocument();
      expect(swapButton).toBeDisabled();
    });

    it('displays slippage tolerance information', () => {
      render(<SwapForm {...defaultProps} />);

      expect(screen.getByText('Slippage Tolerance')).toBeInTheDocument();
      expect(screen.getByText('2%')).toBeInTheDocument();
    });
  });

  describe('Input validation', () => {
    it('validates positive numbers in amount input', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      
      await user.type(input, '100');
      expect(input).toHaveValue(100);
    });

    it('accepts decimal numbers with proper precision', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      
      await user.type(input, '100.1234567');
      expect(input).toHaveValue(100.1234567);
    });

    it('disables submit button when amount is zero', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '0');

      const swapButton = screen.getByRole('button', { name: /enter an amount/i });
      expect(swapButton).toBeDisabled();
    });

    it('disables submit button when amount is negative', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '-50');

      // Button should remain disabled for negative values
      const swapButton = screen.getByRole('button', { name: /enter an amount/i });
      expect(swapButton).toBeDisabled();
    });

    it('disables submit button when amount is empty', () => {
      render(<SwapForm {...defaultProps} />);

      const swapButton = screen.getByRole('button', { name: /enter an amount/i });
      expect(swapButton).toBeDisabled();
    });

    it('enables submit button when valid amount is entered', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      // Wait for price fetch to complete
      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).not.toBeDisabled();
      });
    });
  });

  describe('Price preview and estimation', () => {
    it('fetches price preview when amount is entered', async () => {
      const user = userEvent.setup();
      const { fetchOrderbook, estimateSwapReceive } = await import('../../stellar/dex');
      
      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      // Wait for debounced fetch (500ms)
      await waitFor(() => {
        expect(fetchOrderbook).toHaveBeenCalled();
        expect(estimateSwapReceive).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('displays estimated receive amount', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        expect(screen.getByText('140.0000')).toBeInTheDocument();
      });
    });

    it('displays best price information', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        expect(screen.getByText('Best Price')).toBeInTheDocument();
        expect(screen.getByText(/1 XLM ≈ 1.400000 USDC/)).toBeInTheDocument();
      });
    });

    it('shows loading state while fetching price', async () => {
      const user = userEvent.setup();
      const { fetchOrderbook } = await import('../../stellar/dex');
      
      // Make the fetch take longer
      vi.mocked(fetchOrderbook).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          bestAskPrice: '1.5',
          bestBidPrice: '1.4',
          askDepth: 10,
          bidDepth: 15,
          estimatedReceive: '0',
        }), 1000))
      );

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      // Should show loading state during debounce and fetch
      await waitFor(() => {
        expect(screen.getByText('Fetching...')).toBeInTheDocument();
      }, { timeout: 600 });
    });

    it('clears price preview when amount is cleared', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        expect(screen.getByText('140.0000')).toBeInTheDocument();
      });

      await user.clear(input);

      await waitFor(() => {
        expect(screen.getByText('0.00')).toBeInTheDocument();
      });
    });
  });

  describe('Asset selection', () => {
    it('allows changing sell asset', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const selects = screen.getAllByRole('combobox');
      const sellSelect = selects[0];

      await user.selectOptions(sellSelect, '1'); // Select USDC
      expect(sellSelect).toHaveValue('1');
    });

    it('allows changing buy asset', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const selects = screen.getAllByRole('combobox');
      const buySelect = selects[1];

      await user.selectOptions(buySelect, '2'); // Select SRT
      expect(buySelect).toHaveValue('2');
    });

    it('swaps assets when same asset is selected for both sides', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const selects = screen.getAllByRole('combobox');
      const sellSelect = selects[0];
      const buySelect = selects[1];

      // Initially: sell=0 (XLM), buy=1 (USDC)
      expect(sellSelect).toHaveValue('0');
      expect(buySelect).toHaveValue('1');

      // Select USDC for sell (same as buy)
      await user.selectOptions(sellSelect, '1');

      // Should swap: sell=1 (USDC), buy=0 (XLM)
      expect(sellSelect).toHaveValue('1');
      expect(buySelect).toHaveValue('0');
    });

    it('flips assets when flip button is clicked', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const selects = screen.getAllByRole('combobox');
      const sellSelect = selects[0];
      const buySelect = selects[1];

      // Initially: sell=0 (XLM), buy=1 (USDC)
      expect(sellSelect).toHaveValue('0');
      expect(buySelect).toHaveValue('1');

      // Click flip button
      const flipButton = screen.getByRole('button', { name: '' }); // SVG button
      await user.click(flipButton);

      // Should flip: sell=1 (USDC), buy=0 (XLM)
      expect(sellSelect).toHaveValue('1');
      expect(buySelect).toHaveValue('0');
    });

    it('clears amount when flipping assets', async () => {
      const user = userEvent.setup();
      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');
      expect(input).toHaveValue(100);

      const flipButton = screen.getByRole('button', { name: '' });
      await user.click(flipButton);

      expect(input).toHaveValue(null);
    });
  });

  describe('Swap execution', () => {
    it('executes swap when button is clicked with valid inputs', async () => {
      const user = userEvent.setup();
      const { executeSwap, fetchOrderbook, estimateSwapReceive } = await import('../../stellar/dex');
      
      // Ensure valid price data
      vi.mocked(fetchOrderbook).mockResolvedValue({
        bestAskPrice: '1.5',
        bestBidPrice: '1.4',
        askDepth: 10,
        bidDepth: 15,
        estimatedReceive: '0',
      });
      vi.mocked(estimateSwapReceive).mockResolvedValue('140.0000000');
      vi.mocked(executeSwap).mockResolvedValue({
        hash: 'test-tx-hash-123',
      });

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).not.toBeDisabled();
      });

      const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
      await user.click(swapButton);

      await waitFor(() => {
        expect(executeSwap).toHaveBeenCalledWith(
          mockPublicKey,
          expect.objectContaining({ code: 'XLM' }),
          expect.objectContaining({ code: 'USDC' }),
          '100',
          expect.any(String), // slippage price
          mockSignTransaction
        );
      });
    });

    it('shows pending state during swap execution', async () => {
      const user = userEvent.setup();
      const { executeSwap, fetchOrderbook, estimateSwapReceive } = await import('../../stellar/dex');
      
      // Ensure valid price data
      vi.mocked(fetchOrderbook).mockResolvedValue({
        bestAskPrice: '1.5',
        bestBidPrice: '1.4',
        askDepth: 10,
        bidDepth: 15,
        estimatedReceive: '0',
      });
      vi.mocked(estimateSwapReceive).mockResolvedValue('140.0000000');
      vi.mocked(executeSwap).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ hash: 'test-hash' }), 1000))
      );

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).not.toBeDisabled();
      });

      const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
      await user.click(swapButton);

      // Check for pending state immediately after click
      await waitFor(() => {
        expect(screen.getByTestId('tx-status')).toHaveTextContent('pending');
      }, { timeout: 100 });
    });

    it('calls onSwapSuccess callback after successful swap', async () => {
      const user = userEvent.setup();
      const { executeSwap, fetchOrderbook, estimateSwapReceive } = await import('../../stellar/dex');
      
      // Ensure valid price data
      vi.mocked(fetchOrderbook).mockResolvedValue({
        bestAskPrice: '1.5',
        bestBidPrice: '1.4',
        askDepth: 10,
        bidDepth: 15,
        estimatedReceive: '0',
      });
      vi.mocked(estimateSwapReceive).mockResolvedValue('140.0000000');
      vi.mocked(executeSwap).mockResolvedValue({
        hash: 'test-tx-hash-123',
      });

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).not.toBeDisabled();
      });

      const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
      await user.click(swapButton);

      await waitFor(() => {
        expect(mockOnSwapSuccess).toHaveBeenCalledWith({
          fromAsset: 'XLM',
          toAsset: 'USDC',
          amount: '100',
          txHash: 'test-tx-hash-123',
        });
      });
    });

    it('displays success status after swap completes', async () => {
      const user = userEvent.setup();
      const { executeSwap, fetchOrderbook, estimateSwapReceive } = await import('../../stellar/dex');
      
      // Ensure valid price data
      vi.mocked(fetchOrderbook).mockResolvedValue({
        bestAskPrice: '1.5',
        bestBidPrice: '1.4',
        askDepth: 10,
        bidDepth: 15,
        estimatedReceive: '0',
      });
      vi.mocked(estimateSwapReceive).mockResolvedValue('140.0000000');
      vi.mocked(executeSwap).mockResolvedValue({
        hash: 'test-tx-hash-123',
      });

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).not.toBeDisabled();
      });

      const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
      await user.click(swapButton);

      await waitFor(() => {
        expect(screen.getByTestId('tx-status')).toHaveTextContent('success');
        expect(screen.getByTestId('tx-hash')).toHaveTextContent('test-tx-hash-123');
      });
    });
  });

  describe('Error handling', () => {
    it('displays error when swap fails', async () => {
      const user = userEvent.setup();
      const { executeSwap, fetchOrderbook, estimateSwapReceive } = await import('../../stellar/dex');
      
      // Ensure valid price data
      vi.mocked(fetchOrderbook).mockResolvedValue({
        bestAskPrice: '1.5',
        bestBidPrice: '1.4',
        askDepth: 10,
        bidDepth: 15,
        estimatedReceive: '0',
      });
      vi.mocked(estimateSwapReceive).mockResolvedValue('140.0000000');
      vi.mocked(executeSwap).mockRejectedValue(new Error('Network error'));

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).not.toBeDisabled();
      });

      const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
      await user.click(swapButton);

      await waitFor(() => {
        expect(screen.getByTestId('tx-status')).toHaveTextContent('failed');
        expect(screen.getByTestId('tx-error')).toHaveTextContent('Network error');
      });
    });

    it('shows user-friendly error for insufficient balance', async () => {
      const user = userEvent.setup();
      const { executeSwap, fetchOrderbook, estimateSwapReceive } = await import('../../stellar/dex');
      
      // Ensure valid price data
      vi.mocked(fetchOrderbook).mockResolvedValue({
        bestAskPrice: '1.5',
        bestBidPrice: '1.4',
        askDepth: 10,
        bidDepth: 15,
        estimatedReceive: '0',
      });
      vi.mocked(estimateSwapReceive).mockResolvedValue('140.0000000');
      vi.mocked(executeSwap).mockRejectedValue(new Error('op_underfunded'));

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).not.toBeDisabled();
      });

      const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
      await user.click(swapButton);

      await waitFor(() => {
        expect(screen.getByTestId('tx-error')).toHaveTextContent('Insufficient balance for this swap');
      });
    });

    it('shows user-friendly error for rejected transaction', async () => {
      const user = userEvent.setup();
      const { executeSwap, fetchOrderbook, estimateSwapReceive } = await import('../../stellar/dex');
      
      // Ensure valid price data
      vi.mocked(fetchOrderbook).mockResolvedValue({
        bestAskPrice: '1.5',
        bestBidPrice: '1.4',
        askDepth: 10,
        bidDepth: 15,
        estimatedReceive: '0',
      });
      vi.mocked(estimateSwapReceive).mockResolvedValue('140.0000000');
      vi.mocked(executeSwap).mockRejectedValue(new Error('User declined'));

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).not.toBeDisabled();
      });

      const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
      await user.click(swapButton);

      await waitFor(() => {
        expect(screen.getByTestId('tx-error')).toHaveTextContent('Transaction was rejected by user');
      });
    });

    it('shows error when no liquidity is available', async () => {
      const user = userEvent.setup();
      const { fetchOrderbook } = await import('../../stellar/dex');
      
      vi.mocked(fetchOrderbook).mockResolvedValue({
        bestAskPrice: '0',
        bestBidPrice: '0',
        askDepth: 0,
        bidDepth: 0,
        estimatedReceive: '0',
      });

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).not.toBeDisabled();
      });

      const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
      await user.click(swapButton);

      await waitFor(() => {
        expect(screen.getByTestId('tx-error')).toHaveTextContent('No available liquidity for this pair');
      });
    });

    it('handles price fetch errors gracefully', async () => {
      const user = userEvent.setup();
      const { fetchOrderbook } = await import('../../stellar/dex');
      
      vi.mocked(fetchOrderbook).mockRejectedValue(new Error('Network timeout'));

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        // Should show N/A for price on error
        expect(screen.getByText('0.00')).toBeInTheDocument();
      });
    });
  });

  describe('Form state management', () => {
    it('disables inputs during swap execution', async () => {
      const user = userEvent.setup();
      const { executeSwap, fetchOrderbook, estimateSwapReceive } = await import('../../stellar/dex');
      
      // Ensure valid price data
      vi.mocked(fetchOrderbook).mockResolvedValue({
        bestAskPrice: '1.5',
        bestBidPrice: '1.4',
        askDepth: 10,
        bidDepth: 15,
        estimatedReceive: '0',
      });
      vi.mocked(estimateSwapReceive).mockResolvedValue('140.0000000');
      vi.mocked(executeSwap).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ hash: 'test-hash' }), 1000))
      );

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).not.toBeDisabled();
      });

      const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
      await user.click(swapButton);

      // Check that inputs are disabled during pending state
      await waitFor(() => {
        expect(screen.getByTestId('tx-status')).toHaveTextContent('pending');
      }, { timeout: 100 });
      
      expect(input).toBeDisabled();
      
      const selects = screen.getAllByRole('combobox');
      selects.forEach(select => {
        expect(select).toBeDisabled();
      });
    });

    it('resets form after successful swap', async () => {
      const user = userEvent.setup();
      const { executeSwap, fetchOrderbook, estimateSwapReceive } = await import('../../stellar/dex');
      
      // Ensure valid price data
      vi.mocked(fetchOrderbook).mockResolvedValue({
        bestAskPrice: '1.5',
        bestBidPrice: '1.4',
        askDepth: 10,
        bidDepth: 15,
        estimatedReceive: '0',
      });
      vi.mocked(estimateSwapReceive).mockResolvedValue('140.0000000');
      vi.mocked(executeSwap).mockResolvedValue({
        hash: 'test-tx-hash-123',
      });

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).not.toBeDisabled();
      });

      const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
      await user.click(swapButton);

      await waitFor(() => {
        expect(screen.getByTestId('tx-status')).toHaveTextContent('success');
      });

      // Click reset button
      const resetButton = screen.getByRole('button', { name: /reset/i });
      await user.click(resetButton);

      // Form should be cleared
      expect(input).toHaveValue(null);
    });

    it('disables swap button while loading price', async () => {
      const user = userEvent.setup();
      const { fetchOrderbook } = await import('../../stellar/dex');
      
      vi.mocked(fetchOrderbook).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          bestAskPrice: '1.5',
          bestBidPrice: '1.4',
          askDepth: 10,
          bidDepth: 15,
          estimatedReceive: '0',
        }), 1000))
      );

      render(<SwapForm {...defaultProps} />);

      const input = screen.getByPlaceholderText('0.00');
      await user.type(input, '100');

      // Button should be disabled while loading (isLoadingPrice is true)
      await waitFor(() => {
        const swapButton = screen.getByRole('button', { name: /swap xlm → usdc/i });
        expect(swapButton).toBeDisabled();
      }, { timeout: 200 });
    });
  });
});
