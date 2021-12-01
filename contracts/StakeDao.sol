// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "abdk-libraries-solidity/ABDKMath64x64.sol";

contract StakeDao is Ownable, ERC20("devt stake dao", "DSD") {
    using SafeMath for uint256;
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);

    IERC20 public devt;
    uint256 public startTime = 1632976189;

    bool public noTransfer = true;

    mapping(address => uint256) public deposits;

    modifier checkStart() {
        require(block.timestamp >= startTime, "StakeDao: not start");
        _;
    }

    function checkAmount() public view returns (uint256) {
        uint256 day = ((block.timestamp.sub(startTime)).div(86400));
        int128 logVariable = ABDKMath64x64.log_2(
            ABDKMath64x64.fromUInt((day.mul(3)).add(2))
        );
        uint256 currentAmount = uint256(ABDKMath64x64.toUInt(logVariable)).mul(
            100
        );
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

    function setNoTransfer(bool _noTransfer) public onlyOwner {
        noTransfer = _noTransfer;
    }

    function stake(uint256 _samount) public checkStart {
        require(_samount >= checkAmount(), "StakeDao: not enough amount");
        devt.transferFrom(msg.sender, address(this), _samount * 10**18);
        _mint(msg.sender, _samount * 10**18);

        emit Staked(msg.sender, _samount * 10**18);
    }

    function withdraw(uint256 _amount) public {
		uint256 amount = balanceOf(msg.sender);
        require(amount > 0, "StakeDao: no stake");
        require(_amount == amount, "StakeDao: amount error");

        _burn(msg.sender, amount);
        devt.transfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }
}
