$(function() {
  consoleInit();
  start(main);
});

async function loadPool(App, tokens, prices, stakingAddress) {
  const STAKING_POOL = new ethers.Contract(stakingAddress, HYPE_ABI, App.provider);

  const stakeTokenAddress = await STAKING_POOL.lpt();
  
  const rewardTokenAddress = await STAKING_POOL.rewardToken();
  
  var stakeToken = await getToken(App, stakeTokenAddress, stakingAddress);

  if (stakeTokenAddress.toLowerCase() == rewardTokenAddress.toLowerCase()) {
      stakeToken.staked = await STAKING_POOL.totalSupply() / 10 ** stakeToken.decimals;
  }


  const DAI_BCRED_ADDRESS = "0xf6e74879c54349db7c84f43c335d8104c3da5684";
  const bCredPoolToken = await getToken(App, DAI_BCRED_ADDRESS, App.YOUR_ADDRESS);

  var newPriceAddresses = Array.concat(stakeToken.tokens, bCredPoolToken.tokens).filter(x => prices[x] == null);
  var newPrices = await lookUpTokenPrices(newPriceAddresses);
  for (const key in newPrices) {
      prices[key] = newPrices[key];
  }
  var newTokenAddresses = Array.concat(stakeToken.tokens, bCredPoolToken.tokens).filter(x => tokens[x] == null);
  for (const address of newTokenAddresses) {
      tokens[address] = await getToken(App, address, stakingAddress);
  }
  getPoolPrices(tokens, prices, bCredPoolToken);

  const rewardToken = getParameterCaseInsensitive(tokens, rewardTokenAddress);

  const rewardTokenTicker = rewardToken.symbol;
  
  const poolPrices = getPoolPrices(tokens, prices, stakeToken);

  const stakingTokenTicker = poolPrices.stakingTokenTicker;

  const stakeTokenPrice =  getParameterCaseInsensitive(prices, stakeTokenAddress).usd;
  const rewardTokenPrice = getParameterCaseInsensitive(prices, rewardTokenAddress).usd;

  // Find out reward rate
  const weeklyRewards = await get_synth_weekly_rewards(STAKING_POOL);

  const usdPerWeek = weeklyRewards * rewardTokenPrice;

  const staked_tvl = poolPrices.staked_tvl;
  
  const userStaked = await STAKING_POOL.balanceOf(App.YOUR_ADDRESS) / 10 ** stakeToken.decimals;

  const userUnstaked = stakeToken.unstaked;

  const earned = await STAKING_POOL.earned(App.YOUR_ADDRESS) / 10 ** rewardToken.decimals;

  poolPrices.print_price();
  _print(`${rewardTokenTicker} Per Week: ${weeklyRewards.toFixed(2)} ($${formatMoney(usdPerWeek)})`);
  const weeklyAPY = usdPerWeek / staked_tvl * 100;
  const dailyAPY = weeklyAPY / 7;
  const yearlyAPY = weeklyAPY * 52;
  _print(`APY: Day ${dailyAPY.toFixed(2)}% Week ${weeklyAPY.toFixed(2)}% Year ${yearlyAPY.toFixed(2)}%`);
  const userStakedUsd = userStaked * stakeTokenPrice;
  const userStakedPct = userStakedUsd / staked_tvl * 100;
  _print(`You are staking ${userStaked.toFixed(6)} ${stakingTokenTicker} ` +
         `$${formatMoney(userStakedUsd)} (${userStakedPct.toFixed(2)}% of the pool).`);
  if (userStaked > 0) {
      const userWeeklyRewards = userStakedPct * weeklyRewards / 100;
      const userDailyRewards = userWeeklyRewards / 7;
      const userYearlyRewards = userWeeklyRewards * 52;
      _print(`Estimated ${rewardTokenTicker} earnings:`
          + ` Day ${userDailyRewards.toFixed(2)} ($${formatMoney(userDailyRewards*rewardTokenPrice)})`
          + ` Week ${userWeeklyRewards.toFixed(2)} ($${formatMoney(userWeeklyRewards*rewardTokenPrice)})`
          + ` Year ${userYearlyRewards.toFixed(2)} ($${formatMoney(userYearlyRewards*rewardTokenPrice)})`);
  }
  const approveTENDAndStake = async function() {
    return rewardsContract_stake(stakeTokenAddress, stakingAddress, App)
  }
  const unstake = async function() {
    return rewardsContract_unstake(stakingAddress, App)
  }
  const claim = async function() {
    return rewardsContract_claim(stakingAddress, App)
  }
  const exit = async function() {
    return rewardsContract_exit(stakingAddress, App)
  }
  _print_link(`Stake ${userUnstaked.toFixed(6)} ${stakingTokenTicker}`, approveTENDAndStake)
  _print_link(`Unstake ${userStaked.toFixed(6)} ${stakingTokenTicker}`, unstake)
  _print_link(`Claim ${earned.toFixed(6)} ${rewardTokenTicker}`, claim)
  _print_link(`Exit`, exit)
  _print(`\n`);
}

async function main() {

  const CONTRACTS = [
    "0x4ee08a94279a3ad241f8f785a1abdec775809a62"
  ];

  const App = await init_ethers();

  _print(`Initialized ${App.YOUR_ADDRESS}`);
  _print("Reading smart contracts...\n");

  var tokens = {};
  var prices = {};

  for (const c of CONTRACTS) {
    await loadPool(App, tokens, prices, c);
  }

  hideLoading();
}