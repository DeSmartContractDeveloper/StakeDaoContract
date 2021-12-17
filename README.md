# StakeDao Contract

Users can obtain the same amount of DD (DeHorizon DAO) by staking a certain amount of DEVT.

The minimum amount of DEVT required for single staking will increase as the number of days increases.

DD is the membership certificate of each DAO member, which stands for the rights of participating in DAO governance, voting, and much more.

Currently, DD does not have a transaction function, and whether to add this function in the future will be decided by DAO members by voting.

DD can be swapped into DEVT at any time, but only swapping all DD is allowed. After the swap is completed, it means that you have withdrawn from DAO.

$\log_2 (day *3 +2) *100$

# DevtMine Contract
Obtain ERC20 token by staking ERC20 token

When the total amount of pledged tokens (devtTotalDeposits) exceeds 20% of the estimated total pledged amount (circulatingSupply), mining starts.

(devtTotalDeposits / circulatingSupply) -> 
Percentage of output per second to maximum output per second
> \<20% ->  0%
> \>20% ->  50%
> \>30% ->  60%
> \>40% ->  80%
> \>50% ->  90%
> \>60% ->  100%

Different pledge time ladders correspond to output bonuses:
>oneWeek ->       (100% + 20% )
>twoWeeks  ->   (100% + 50%)
>oneMonth    ->  (100% + 100%)

After the pledge, the principal and income cannot be withdrawn until the pledge time is over


The pledge contract expires in one month, and the tokens that have not been mined after one month will be destroyed by staying in the contract forever






Try running some of the following tasks:

```shell

npx hardhat node
npm run test

```
