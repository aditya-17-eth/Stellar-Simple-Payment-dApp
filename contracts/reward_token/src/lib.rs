#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env};

/// Storage keys for the reward token contract.
#[contracttype]
pub enum DataKey {
    Admin,
    Balance(Address),
    TotalSupply,
}

#[contract]
pub struct RewardTokenContract;

#[contractimpl]
impl RewardTokenContract {
    /// Initializes the contract with an admin address.
    /// Can only be called once — panics if admin is already set.
    ///
    /// # Arguments
    /// * `admin` - The address authorized to mint tokens
    pub fn initialize(env: Env, admin: Address) {
        if env.storage().persistent().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage()
            .persistent()
            .set(&DataKey::TotalSupply, &0_i128);
    }

    /// Mints reward tokens to the specified address.
    /// Only the admin (or a contract authorized by the admin) can call this.
    ///
    /// # Arguments
    /// * `to` - The address to receive tokens
    /// * `amount` - The number of tokens to mint (in smallest unit, 7 decimals)
    pub fn mint(env: Env, to: Address, amount: i128) {
        // Verify the caller is the admin
        let admin: Address = env
            .storage()
            .persistent()
            .get(&DataKey::Admin)
            .expect("not initialized");
        admin.require_auth();

        if amount <= 0 {
            panic!("amount must be positive");
        }

        // Update recipient balance
        let current: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Balance(to.clone()))
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to.clone()), &(current + amount));

        // Update total supply
        let supply: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0);
        env.storage()
            .persistent()
            .set(&DataKey::TotalSupply, &(supply + amount));

        // Emit mint event
        env.events()
            .publish((symbol_short!("mint"),), (to, amount));
    }

    /// Returns the token balance of the given address.
    ///
    /// # Arguments
    /// * `owner` - The address to query
    pub fn balance_of(env: Env, owner: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(owner))
            .unwrap_or(0)
    }

    /// Returns the total supply of minted tokens.
    pub fn total_supply(env: Env) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_mint_and_balance() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, RewardTokenContract);
        let client = RewardTokenContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user = Address::generate(&env);

        // Initialize
        client.initialize(&admin);

        // Mint tokens
        client.mint(&user, &100_0000000_i128);

        // Verify balance
        assert_eq!(client.balance_of(&user), 100_0000000);
        assert_eq!(client.total_supply(), 100_0000000);
    }

    #[test]
    fn test_multiple_mints_accumulate() {
        let env = Env::default();
        env.mock_all_auths();

        let contract_id = env.register_contract(None, RewardTokenContract);
        let client = RewardTokenContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        let user1 = Address::generate(&env);
        let user2 = Address::generate(&env);

        client.initialize(&admin);

        // Mint to two users
        client.mint(&user1, &50_0000000_i128);
        client.mint(&user2, &30_0000000_i128);
        client.mint(&user1, &20_0000000_i128); // additional mint to user1

        assert_eq!(client.balance_of(&user1), 70_0000000);
        assert_eq!(client.balance_of(&user2), 30_0000000);
        assert_eq!(client.total_supply(), 100_0000000);
    }

    #[test]
    fn test_balance_of_unknown_address_is_zero() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RewardTokenContract);
        let client = RewardTokenContractClient::new(&env, &contract_id);

        let unknown = Address::generate(&env);
        assert_eq!(client.balance_of(&unknown), 0);
    }

    #[test]
    #[should_panic(expected = "already initialized")]
    fn test_double_initialize_panics() {
        let env = Env::default();
        let contract_id = env.register_contract(None, RewardTokenContract);
        let client = RewardTokenContractClient::new(&env, &contract_id);

        let admin = Address::generate(&env);
        client.initialize(&admin);
        client.initialize(&admin); // should panic
    }
}
