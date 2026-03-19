#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, vec, Address, Env, String, Vec,
};

// Import the reward token contract client for cross-contract calls
use reward_token::RewardTokenContractClient;

/// Fixed reward amount per swap: 10 tokens (with 7 decimal places)
const REWARD_AMOUNT: i128 = 10_0000000;

/// Represents a single swap record stored on-chain.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SwapRecord {
    pub user: Address,
    pub from_asset: String,
    pub to_asset: String,
    pub amount: i128,
    pub timestamp: u64,
}

/// Storage keys used by the contract.
#[contracttype]
pub enum DataKey {
    SwapCount,
    Swap(u64),
    Admin,
    RewardToken,
}

#[contract]
pub struct SwapTrackerContract;

#[contractimpl]
impl SwapTrackerContract {
    /// Initializes the swap tracker with an admin and the reward token contract address.
    /// Must be called once before reward minting can occur.
    ///
    /// # Arguments
    /// * `admin` - The admin address (authorized to manage the contract)
    /// * `reward_token` - The deployed reward token contract address
    pub fn initialize(env: Env, admin: Address, reward_token: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::RewardToken, &reward_token);
    }

    /// Records a swap and emits a `swap_recorded` event.
    /// If the contract is initialized with a reward token, it also mints
    /// reward tokens to the user via an inter-contract call.
    ///
    /// # Arguments
    /// * `user` - The address of the user who performed the swap
    /// * `from_asset` - The asset code being sold (e.g. "XLM")
    /// * `to_asset` - The asset code being bought (e.g. "USDC")
    /// * `amount` - The amount of the source asset swapped (in stroops / smallest unit)
    /// * `timestamp` - Unix timestamp of the swap
    pub fn record_swap(
        env: Env,
        user: Address,
        from_asset: String,
        to_asset: String,
        amount: i128,
        timestamp: u64,
    ) {
        // Get current swap count, defaulting to 0
        let count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::SwapCount)
            .unwrap_or(0);

        let record = SwapRecord {
            user: user.clone(),
            from_asset: from_asset.clone(),
            to_asset: to_asset.clone(),
            amount,
            timestamp,
        };

        // Store the swap record
        env.storage()
            .persistent()
            .set(&DataKey::Swap(count), &record);

        // Increment and store the new count
        let new_count = count + 1;
        env.storage()
            .persistent()
            .set(&DataKey::SwapCount, &new_count);

        // Emit a contract event for real-time listeners
        env.events().publish(
            (symbol_short!("swap"),),
            (user.clone(), from_asset, to_asset, amount, timestamp),
        );

        // --- INTER-CONTRACT CALL: Mint reward tokens ---
        // If the contract has been initialized with a reward token address,
        // call the reward token contract to mint tokens to the swapper.
        if let Some(reward_token_addr) = env
            .storage()
            .persistent()
            .get::<DataKey, Address>(&DataKey::RewardToken)
        {
            let reward_client = RewardTokenContractClient::new(&env, &reward_token_addr);
            reward_client.mint(&user, &REWARD_AMOUNT);

            // Emit reward event
            env.events().publish(
                (symbol_short!("reward"),),
                (user, REWARD_AMOUNT),
            );
        }
    }

    /// Returns the most recent `count` swap records, newest first.
    ///
    /// # Arguments
    /// * `count` - The maximum number of recent swaps to return
    pub fn get_recent_swaps(env: Env, count: u32) -> Vec<SwapRecord> {
        let total: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::SwapCount)
            .unwrap_or(0);

        let mut swaps = vec![&env];
        let limit = if (count as u64) > total {
            total
        } else {
            count as u64
        };

        // Iterate from newest to oldest
        for i in 0..limit {
            let index = total - 1 - i;
            if let Some(record) = env
                .storage()
                .persistent()
                .get::<DataKey, SwapRecord>(&DataKey::Swap(index))
            {
                swaps.push_back(record);
            }
        }

        swaps
    }

    /// Returns the total number of swaps recorded.
    pub fn get_swap_count(env: Env) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::SwapCount)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Events, Env, IntoVal};

    #[test]
    fn test_record_and_retrieve() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SwapTrackerContract);
        let client = SwapTrackerContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let from = String::from_str(&env, "XLM");
        let to = String::from_str(&env, "USDC");

        client.record_swap(&user, &from, &to, &1_000_000_i128, &1700000000_u64);

        assert_eq!(client.get_swap_count(), 1);

        let swaps = client.get_recent_swaps(&1);
        assert_eq!(swaps.len(), 1);

        let record = swaps.get(0).unwrap();
        assert_eq!(record.amount, 1_000_000);
        assert_eq!(record.timestamp, 1700000000);
    }

    #[test]
    fn test_multiple_swaps_ordering() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SwapTrackerContract);
        let client = SwapTrackerContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let xlm = String::from_str(&env, "XLM");
        let usdc = String::from_str(&env, "USDC");

        // Record 3 swaps
        client.record_swap(&user, &xlm, &usdc, &100_i128, &1000_u64);
        client.record_swap(&user, &usdc, &xlm, &200_i128, &2000_u64);
        client.record_swap(&user, &xlm, &usdc, &300_i128, &3000_u64);

        assert_eq!(client.get_swap_count(), 3);

        // Get last 2 — should be newest first
        let swaps = client.get_recent_swaps(&2);
        assert_eq!(swaps.len(), 2);
        assert_eq!(swaps.get(0).unwrap().amount, 300);
        assert_eq!(swaps.get(1).unwrap().amount, 200);
    }

    #[test]
    fn test_event_emission() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SwapTrackerContract);
        let client = SwapTrackerContractClient::new(&env, &contract_id);

        let user = Address::generate(&env);
        let from = String::from_str(&env, "XLM");
        let to = String::from_str(&env, "USDC");

        client.record_swap(&user, &from, &to, &500_i128, &1700000000_u64);

        // Verify event was emitted
        let events = env.events().all();
        assert!(!events.is_empty());
    }

    #[test]
    fn test_inter_contract_reward_minting() {
        let env = Env::default();
        env.mock_all_auths();

        // Deploy the reward token contract
        let reward_token_id =
            env.register_contract(None, reward_token::RewardTokenContract);
        let reward_client =
            reward_token::RewardTokenContractClient::new(&env, &reward_token_id);

        // Deploy the swap tracker contract
        let swap_tracker_id = env.register_contract(None, SwapTrackerContract);
        let swap_client = SwapTrackerContractClient::new(&env, &swap_tracker_id);

        // Initialize the reward token with the swap tracker as admin
        // (so it can mint tokens on behalf of users)
        reward_client.initialize(&swap_tracker_id);

        // Initialize the swap tracker with admin and reward token address
        let admin = Address::generate(&env);
        swap_client.initialize(&admin, &reward_token_id);

        let user = Address::generate(&env);
        let xlm = String::from_str(&env, "XLM");
        let usdc = String::from_str(&env, "USDC");

        // Record a swap — should trigger reward token minting
        swap_client.record_swap(&user, &xlm, &usdc, &1_000_000_i128, &1700000000_u64);

        // Verify the user received reward tokens (10 tokens = 10_0000000)
        let reward_balance = reward_client.balance_of(&user);
        assert_eq!(reward_balance, 10_0000000);

        // Record another swap
        swap_client.record_swap(&user, &usdc, &xlm, &500_000_i128, &1700001000_u64);

        // Should accumulate: 20 tokens total
        let reward_balance_2 = reward_client.balance_of(&user);
        assert_eq!(reward_balance_2, 20_0000000);

        // Swap count should still be correct
        assert_eq!(swap_client.get_swap_count(), 2);
    }
}
