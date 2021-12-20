// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";

contract DevtLpMine is Ownable {
    using SafeERC20 for ERC20;
    using SafeCast for uint256;
    using SafeCast for int256;

    uint256 public constant LIFECYCLE = 60 * 60 * 24 * 30;
    uint256 public constant ONE = 1e18;

    // DevtLp token addr
    ERC20 public immutable devt;
    ERC20 public immutable dvt;

    uint256 public endTimestamp;

    uint256 public maxDvtPerSecond;
    uint256 public dvtPerSecond;
    uint256 public totalRewardsEarned;

    //Cumulative revenue per lp token
    uint256 public accDvtPerShare;
    uint256 public devtTotalDeposits;
    uint256 public lastRewardTimestamp;

    //Target pledge amount
    uint256 public immutable targetPledgeAmount;

    struct UserInfo {
        uint256 depositAmount;
        int256 rewardDebt;
        bool isDeposit;
    }

    /// @notice user => UserInfo
    mapping(address => UserInfo) public userInfo;

    event Deposit(address indexed user, uint256 amount);
    event Withdraw(address indexed user, uint256 amount);
    event Harvest(address indexed user, uint256 amount);
    event LogUpdateRewards(
        uint256 indexed lastRewardTimestamp,
        uint256 lpSupply,
        uint256 accDvtPerShare
    );

    /// @notice Refresh the development rate according to the ratio of the current pledge amount to the target pledge amount
    function refreshDevtRate() private {
        uint256 util = utilization();
        if (util < 2e17) {
            dvtPerSecond = 0;
        } else if (util < 3e17) {
            // >20%
            // 50%
            dvtPerSecond = (maxDvtPerSecond * 5) / 10;
        } else if (util < 4e17) {
            // >30%
            // 60%
            dvtPerSecond = (maxDvtPerSecond * 6) / 10;
        } else if (util < 5e17) {
            // >40%
            // 80%
            dvtPerSecond = (maxDvtPerSecond * 8) / 10;
        } else if (util < 6e17) {
            // >50%
            // 90%
            dvtPerSecond = (maxDvtPerSecond * 9) / 10;
        } else {
            // >60%
            // 100%
            dvtPerSecond = maxDvtPerSecond;
        }
    }

    /// @notice update totalRewardsEarned, update cumulative profit per lp token
    function updateRewards() private {
        if (
            block.timestamp > lastRewardTimestamp &&
            lastRewardTimestamp < endTimestamp &&
            endTimestamp != 0
        ) {
            uint256 lpSupply = devtTotalDeposits;
            if (lpSupply > 0) {
                uint256 timeDelta;
                if (block.timestamp > endTimestamp) {
                    timeDelta = endTimestamp - lastRewardTimestamp;
                    lastRewardTimestamp = endTimestamp;
                } else {
                    timeDelta = block.timestamp - lastRewardTimestamp;
                    lastRewardTimestamp = block.timestamp;
                }
                uint256 dvtReward = timeDelta * dvtPerSecond;
                totalRewardsEarned += dvtReward;
                accDvtPerShare += (dvtReward * ONE) / lpSupply;
            }
            emit LogUpdateRewards(
                lastRewardTimestamp,
                lpSupply,
                accDvtPerShare
            );
        }
    }

    constructor(
        address _devt,
        address _dvt,
        address _owner,
        uint256 _targetPledgeAmount
    ) {
        require(_devt != address(0) && _dvt != address(0) && _owner != address(0), "set address is zero");
        require(_targetPledgeAmount != 0,"set targetPledgeAmount is zero" );
        targetPledgeAmount = _targetPledgeAmount;
        devt = ERC20(_devt);
        dvt = ERC20(_dvt);
        transferOwnership(_owner);
    }

    /// @notice Initialize variables
    function init() external onlyOwner {
        require(endTimestamp == 0, "Cannot init again");
        uint256 rewardsAmount;
        if (devt == dvt) {
            rewardsAmount = dvt.balanceOf(address(this)) - devtTotalDeposits;
        } else {
            rewardsAmount = dvt.balanceOf(address(this));
        }

        require(rewardsAmount > 0, "No rewards sent");

        maxDvtPerSecond = rewardsAmount / LIFECYCLE;
        endTimestamp = block.timestamp + LIFECYCLE;
        lastRewardTimestamp = block.timestamp;

        refreshDevtRate();
    }

    /// @notice Get mining utilization
    function utilization() public view returns (uint256 util) {
        util = (devtTotalDeposits * ONE) / targetPledgeAmount;
    }

    /// @notice Get the user's cumulative revenue as of the current time
    function pendingRewards(address _user)
        external
        view
        returns (uint256 pending)
    {
        UserInfo storage user = userInfo[_user];
        uint256 _accDvtPerShare = accDvtPerShare;
        uint256 lpSupply = devtTotalDeposits;
        if (block.timestamp > lastRewardTimestamp && dvtPerSecond != 0) {
            uint256 timeDelta;
            if (block.timestamp > endTimestamp) {
                timeDelta = endTimestamp - lastRewardTimestamp;
            } else {
                timeDelta = block.timestamp - lastRewardTimestamp;
            }
            uint256 dvtReward = timeDelta * dvtPerSecond;
            _accDvtPerShare += (dvtReward * ONE) / lpSupply;
        }

        pending = (((user.depositAmount * _accDvtPerShare) / ONE).toInt256() -
            user.rewardDebt).toUint256();
    }
    /// @notice Pledge devt
    function deposit(uint256 _amount) external {
        updateRewards();
        require(endTimestamp != 0, "Not initialized");
        require(block.timestamp < endTimestamp, "Will not deposit after end");
        devtTotalDeposits += _amount;

        if(userInfo[msg.sender].isDeposit){
            userInfo[msg.sender].depositAmount +=_amount;
            userInfo[msg.sender].rewardDebt += ((_amount * accDvtPerShare) / ONE).toInt256();
        } else {
            userInfo[msg.sender] = UserInfo(
            _amount,
            ((_amount * accDvtPerShare) / ONE).toInt256(),
            true
        );
        }
        

        devt.safeTransferFrom(msg.sender, address(this), _amount);

        emit Deposit(msg.sender, _amount);
        refreshDevtRate();
    }

    /// @notice Withdraw the principal and income
    function withdraw() external {
        updateRewards();
        UserInfo storage user = userInfo[msg.sender];

        require(user.depositAmount > 0, "Position does not exists");    

        devtTotalDeposits -= user.depositAmount;

        int256 accumulatedDvt = ((user.depositAmount * accDvtPerShare) / ONE)
            .toInt256();
        uint256 _pendingDvt = (accumulatedDvt - user.rewardDebt).toUint256();

        devt.safeTransfer(msg.sender, user.depositAmount);

        // Withdrawal income
        if (_pendingDvt != 0) {
            dvt.safeTransfer(msg.sender, _pendingDvt);
        }
        emit Harvest(msg.sender, _pendingDvt);
        emit Withdraw(msg.sender, user.depositAmount);
         delete userInfo[msg.sender];
        refreshDevtRate();
       
    }

    /// @notice After the event is over, recover the unearthed dvt
    function recycleLeftovers() external onlyOwner {
        updateRewards();
        require(block.timestamp > endTimestamp, "Will not recycle before end");
        int256 recycleAmount = (LIFECYCLE * maxDvtPerSecond).toInt256() - // rewards originally sent
            (totalRewardsEarned).toInt256(); // rewards distributed to users

        if (recycleAmount > 0){
            dvt.safeTransfer(owner(), uint256(recycleAmount));
        }
            
    }
}
