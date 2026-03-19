import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Balance } from '../Balance';

// Mock the stellar utilities
vi.mock('../../utils/stellar', () => ({
  fetchBalance: vi.fn(),
  fetchTokenBalance: vi.fn(),
}));

// Mock the reward token client
vi.mock('../../contract/rewardTokenClient', () => ({
  getRewardBalance: vi.fn(),
}));

describe('Balance — Reward Token Display', () => {
  const mockPublicKey = 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

  beforeEach(async () => {
    vi.clearAllMocks();

    const { fetchBalance, fetchTokenBalance } = await import('../../utils/stellar');
    const { getRewardBalance } = await import('../../contract/rewardTokenClient');

    vi.mocked(fetchBalance).mockResolvedValue('1000.0000000');
    vi.mocked(fetchTokenBalance).mockResolvedValue('500.0000000');
    vi.mocked(getRewardBalance).mockResolvedValue('30.00');
  });

  it('renders all three balance cards including reward tokens', async () => {
    render(<Balance publicKey={mockPublicKey} />);

    await waitFor(() => {
      // XLM card
      expect(screen.getByText('XLM')).toBeInTheDocument();
      expect(screen.getByText('Stellar Lumens')).toBeInTheDocument();

      // USDC card
      expect(screen.getByText('USDC')).toBeInTheDocument();
      expect(screen.getByText('USD Coin')).toBeInTheDocument();

      // SWPT reward card
      expect(screen.getByText('SWPT')).toBeInTheDocument();
      expect(screen.getByText('Rewards')).toBeInTheDocument();
      expect(screen.getByText('Earned by swapping tokens')).toBeInTheDocument();
    });
  });

  it('displays the correct reward balance value', async () => {
    render(<Balance publicKey={mockPublicKey} />);

    await waitFor(() => {
      expect(screen.getByText('30.00')).toBeInTheDocument();
    });
  });

  it('displays zero reward balance when no rewards earned', async () => {
    const { getRewardBalance } = await import('../../contract/rewardTokenClient');
    vi.mocked(getRewardBalance).mockResolvedValue('0');

    render(<Balance publicKey={mockPublicKey} />);

    await waitFor(() => {
      expect(screen.getByText('SWPT')).toBeInTheDocument();
      // '0' should appear as the formatted value
      const rewardCard = screen.getByText('Earned by swapping tokens');
      expect(rewardCard).toBeInTheDocument();
    });
  });

  it('refreshes balances when refreshTrigger changes', async () => {
    const { fetchBalance } = await import('../../utils/stellar');
    const { getRewardBalance } = await import('../../contract/rewardTokenClient');

    const { rerender } = render(<Balance publicKey={mockPublicKey} refreshTrigger={0} />);

    await waitFor(() => {
      expect(fetchBalance).toHaveBeenCalledTimes(1);
      expect(getRewardBalance).toHaveBeenCalledTimes(1);
    });

    // Trigger refresh
    rerender(<Balance publicKey={mockPublicKey} refreshTrigger={1} />);

    await waitFor(() => {
      expect(fetchBalance).toHaveBeenCalledTimes(2);
      expect(getRewardBalance).toHaveBeenCalledTimes(2);
    });
  });
});
