// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract StakeDao is Ownable, ReentrancyGuard, ERC20("devt stake dao", "DSD") {
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    IERC20 public devt;
    uint256 public startTime = 1638416028;

    //no tranfer flag
    bool public noTransfer = true;

    mapping(address => uint256) public deposits;

    modifier checkStart() {
        require(block.timestamp >= startTime, "StakeDao: no start");
        _;
    }

    //from the start time, calculate the minimum stake amount
    function checkAmount() public checkStart view returns (uint256) {
        uint256 day = (block.timestamp - startTime) / 86400;
        int128 logVariable = ABDKMath64x64.log_2(
            ABDKMath64x64.fromUInt(day * 3 + 2)
        )*100;
      
        uint256 currentAmount = uint256(ABDKMath64x64.toUInt(logVariable));
        return currentAmount;
    }

    constructor(address _devt) public {
        devt = IERC20(_devt);
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal override(ERC20) {
        require(!noTransfer, "StakeDao: no transfer");
        ERC20._transfer(sender, recipient, amount);
    }

    // setup no tranfer flag
    function setNoTransfer(bool _noTransfer) public onlyOwner {
        noTransfer = _noTransfer;
    }

    //staking DEVT, get DSD
    function stake(uint256 _samount) public checkStart nonReentrant {
        require(_samount >= checkAmount(), "StakeDao: not enough amount");
        devt.transferFrom(msg.sender, address(this), _samount * 10**18);
        _mint(msg.sender, _samount * 10**18);

        emit Staked(msg.sender, _samount * 10**18);
    }

    function withdraw(uint256 _amount) public nonReentrant {
        uint256 amount = balanceOf(msg.sender);
        require(amount > 0, "StakeDao: no stake");
        require(_amount == amount, "StakeDao: amount error");

        _burn(msg.sender, amount);
        devt.transfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }
}
