#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, vec, Address, Env, String, Vec,
};

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
    SwapCount,   // Total number of swaps
    Swap(u64),   // Individual swap records
    Admin,       // Contract admin
    Balance(Address), // User reward token balances
    TotalSupply,    // Total rewards minted
}

#[contract]
pub struct SwapTrackerContract;

#[contractimpl]
impl SwapTrackerContract {
    /// Initializes the swap tracker with an admin.
    /// In this unified version, rewards are managed internally.
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::TotalSupply, &0_i128);
        env.storage().persistent().set(&DataKey::SwapCount, &0_u64);
    }

    /// Records a swap and automatically mints rewards to the user internally.
    pub fn record_swap(
        env: Env,
        user: Address,
        from_asset: String,
        to_asset: String,
        amount: i128,
        timestamp: u64,
    ) {
        // 1. Record the Swap
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

        env.storage()
            .persistent()
            .set(&DataKey::Swap(count), &record);
        env.storage()
            .persistent()
            .set(&DataKey::SwapCount, &(count + 1));

        // 2. Mint Rewards (Internal balance update)
        let current_balance: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(user.clone()))
            .unwrap_or(0);
        
        env.storage()
            .persistent()
            .set(&DataKey::Balance(user.clone()), &(current_balance + REWARD_AMOUNT));

        let current_supply: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        
        env.storage()
            .persistent()
            .set(&DataKey::TotalSupply, &(current_supply + REWARD_AMOUNT));

        // 3. Emit events
        env.events().publish(
            (symbol_short!("swap"),),
            (user.clone(), from_asset, to_asset, amount, timestamp),
        );
        
        env.events().publish(
            (symbol_short!("reward"),),
            (user, REWARD_AMOUNT),
        );
    }

    /// Returns the reward token balance of the given address.
    pub fn balance(env: Env, owner: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(owner))
            .unwrap_or(0)
    }

    pub fn symbol(env: Env) -> String {
        String::from_str(&env, "SWPT")
    }

    pub fn name(env: Env) -> String {
        String::from_str(&env, "Swap Reward Token")
    }

    pub fn decimals(_env: Env) -> u32 {
        7
    }

    /// Returns the total supply of rewards minted.
    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    /// Returns the most recent `count` swap records, newest first.
    pub fn get_recent_swaps(env: Env, count: u32) -> Vec<SwapRecord> {
        let total: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::SwapCount)
            .unwrap_or(0);

        let mut swaps = vec![&env];
        let limit = if (count as u64) > total { total } else { count as u64 };

        for i in 0..limit {
            let index = total - 1 - i;
            if let Some(record) = env.storage().persistent().get::<DataKey, SwapRecord>(&DataKey::Swap(index)) {
                swaps.push_back(record);
            }
        }
        swaps
    }

    /// Returns the total number of swaps recorded.
    pub fn get_swap_count(env: Env) -> u64 {
        env.storage().persistent().get(&DataKey::SwapCount).unwrap_or(0)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_unified_system() {
        let env = Env::default();
        let contract_id = env.register_contract(None, SwapTrackerContract);
        let client = SwapTrackerContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);
        
        client.initialize(&admin);

        let from = String::from_str(&env, "XLM");
        let to = String::from_str(&env, "USDC");

        client.record_swap(&user, &from, &to, &1000_i128, &1700000000_u64);

        assert_eq!(client.get_swap_count(), 1);
        assert_eq!(client.balance_of(&user), 10_0000000);
        assert_eq!(client.total_supply(), 10_0000000);
        
        // Second swap
        client.record_swap(&user, &to, &from, &500_i128, &1700001000_u64);
        assert_eq!(client.balance_of(&user), 20_0000000);
    }
}
