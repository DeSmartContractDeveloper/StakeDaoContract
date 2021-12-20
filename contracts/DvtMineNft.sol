// SPDX-License-Identifier: MIT OR Apache-2.0
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract DvtMineNft is ERC721, ReentrancyGuard {
    using SafeERC20 for ERC20;
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    uint256 public totalCount = 3000;
    uint256 public currentCount = 3000;
    string public baseTokenURI;

    enum Lock {
        oneWeek,
        twoWeeks,
        oneMonth
    }
    struct UserInfo {
        uint256 depositAmount;
        uint256 lockedUntil;
        bool isDeposit;
    }
    /// @notice user => UserInfo
    mapping(address => UserInfo) public userInfo;

    ERC20 public immutable dvt;
    uint256 public immutable minStakeAmount;
    uint256 public constant DAY = 60 * 60 * 24;
    uint256 public constant ONE_WEEK = DAY * 7;
    uint256 public constant TWO_WEEKS = ONE_WEEK * 2;
    uint256 public constant ONE_MONTH = DAY * 30;

    constructor(
        address _dvt,
        string memory _baseTokenURI,
        uint256 _minStakeAmount
    ) ERC721("DeVerseNft", "DVNFT") {
        require(_dvt != address(0), "set address is zero");
        require(bytes(_baseTokenURI).length > 0, "baseTokenURI is null");
        require(_minStakeAmount != 0, "set minStakeAmount is zero");
        dvt = ERC20(_dvt);
        baseTokenURI = _baseTokenURI;
        minStakeAmount = _minStakeAmount;
    }

    /// @notice Obtain the required amount of pledge according to different pledge time
    function getBoost(Lock _lock)
        public
        view
        returns (uint256 stakeAmount, uint256 timelock)
    {
        if (_lock == Lock.oneWeek) {
            return (minStakeAmount * 4, ONE_WEEK);
        } else if (_lock == Lock.twoWeeks) {
            return (minStakeAmount * 2, TWO_WEEKS);
        } else if (_lock == Lock.oneMonth) {
            return (minStakeAmount, ONE_MONTH);
        } else {
            revert("Invalid lock value");
        }
    }

    /// @notice Pledge dvt
    function deposit(uint256 _amount, Lock _lock) external nonReentrant {
        require(!userInfo[msg.sender].isDeposit, "Already desposit");
        require(currentCount >= 1, "Staking end");
        (uint256 stakeAmount, uint256 timelock) = getBoost(_lock);
        require(_amount >= stakeAmount, "Insufficient amount of staking");
        userInfo[msg.sender] = UserInfo(
            _amount,
            block.timestamp + timelock,
            true
        );
        currentCount -= 1;

        dvt.safeTransferFrom(msg.sender, address(this), _amount);
    }

    /// @notice Withdraw and mint nft
    function withdraw() external nonReentrant {
        UserInfo storage user = userInfo[msg.sender];
        require(user.isDeposit && user.depositAmount > 0, "Position does not exists");
        require(
            block.timestamp >= user.lockedUntil,
            "Position is still locked"
        );
        mintTo();
        dvt.safeTransfer(msg.sender, user.depositAmount);
        delete userInfo[msg.sender];
    }

    /// @notice mint nft   
    function mintTo() private {
        require(_tokenIds.current() < totalCount, "Maximum number exceeded");
        _tokenIds.increment();
        uint256 newItemId = _tokenIds.current();
        _mint(msg.sender, newItemId);
    }

    /// @notice get tokenURI  
    function tokenURI(uint256 _tokenId)
        public
        view
        override
        returns (string memory)
    {
        return
            string(abi.encodePacked(baseTokenURI, Strings.toString(_tokenId)));
    }
}
