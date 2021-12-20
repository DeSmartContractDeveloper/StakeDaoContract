const { expect } = require("chai");
let DevtLpMine, devtToken, dvtToken, buyerAddress;

const increaseWorldTimeInDays = async (days, mine = false) => {
  await ethers.provider.send("evm_increaseTime", [days * 86400]);
  if (mine) {
    await ethers.provider.send("evm_mine", []);
  }
};

describe("test DevtLpMine contract", function () {
  beforeEach(async () => {
    buyerAddress = await hre.ethers.getSigners();
    const DEVTToken = await hre.ethers.getContractFactory("DEVTToken");
    devtToken = await DEVTToken.deploy();
    await devtToken.deployed();

    const DVTToken = await hre.ethers.getContractFactory("DEVTToken");
    dvtToken = await DVTToken.deploy();
    await dvtToken.deployed();

    const circulatingSupply = "8000000";
    const devtLpMine = await hre.ethers.getContractFactory("DevtLpMine");
    DevtLpMine = await devtLpMine.deploy(
      devtToken.address,
      dvtToken.address,
      buyerAddress[0].address,
      hre.ethers.utils.parseEther(circulatingSupply)
    );
    await DevtLpMine.deployed();
  });
  it("test stake & withdraw", async function () {
    const rewards = "2000000";
    await dvtToken
      .connect(buyerAddress[0])
      .transfer(DevtLpMine.address, hre.ethers.utils.parseEther(rewards));
    await DevtLpMine.connect(buyerAddress[0]).init();

    let account1 = buyerAddress[1];
    let account1StakingNum = "1000000";
    let account2 = buyerAddress[2];
    let account2StakingNum = "1000000";

    await devtToken
      .connect(buyerAddress[0])
      .transfer(
        account1.address,
        hre.ethers.utils.parseEther(account1StakingNum)
      );
    await devtToken
      .connect(buyerAddress[0])
      .transfer(
        account2.address,
        hre.ethers.utils.parseEther(account2StakingNum)
      );
    await devtToken
      .connect(account1)
      .approve(
        DevtLpMine.address,
        hre.ethers.utils.parseEther(account1StakingNum)
      );
    await devtToken
      .connect(account2)
      .approve(
        DevtLpMine.address,
        hre.ethers.utils.parseEther(account2StakingNum)
      );

    await DevtLpMine
      .connect(account1)
      .deposit(hre.ethers.utils.parseEther(account1StakingNum));
      
    await DevtLpMine
      .connect(account2)
      .deposit(hre.ethers.utils.parseEther(account2StakingNum));

    await increaseWorldTimeInDays(20, true);

    let account1PendingReward = await DevtLpMine
      .connect(account1)
      .pendingRewards(account1.address);
    let account2PendingReward = await DevtLpMine
      .connect(account2)
      .pendingRewards(account2.address);

    let oldAccount1DevtTokenBalance = await devtToken.balanceOf(
      account1.address
    );
    let oldAccount1DvtTokenBalance = await dvtToken.balanceOf(account1.address);
    let oldAccount2DevtTokenBalance = await devtToken.balanceOf(
      account2.address
    );
    let oldAccount2DvtTokenBalance = await dvtToken.balanceOf(account2.address);

    await DevtLpMine.connect(account1).withdraw();
    await DevtLpMine.connect(account2).withdraw();

    let account1DevtTokenBalance = await devtToken.balanceOf(account1.address);
    let account1DvtTokenBalance = await dvtToken.balanceOf(account1.address);
    expect(parseInt( hre.ethers.utils.formatEther(account1DevtTokenBalance.toString()))).to.equal(
      parseInt( hre.ethers.utils.formatEther(oldAccount1DevtTokenBalance.toString())) +
        parseInt(account1StakingNum)
    );

    expect(parseInt( hre.ethers.utils.formatEther(account1DvtTokenBalance.toString()))).to.equal(
      parseInt(hre.ethers.utils.formatEther(oldAccount1DvtTokenBalance.toString())) +
        parseInt(hre.ethers.utils.formatEther(account1PendingReward.toString()))
    );

    let account2DevtTokenBalance = await devtToken.balanceOf(account2.address);
    let account2DvtTokenBalance = await dvtToken.balanceOf(account2.address);
    expect(parseInt( hre.ethers.utils.formatEther(account2DevtTokenBalance.toString()))).to.equal(
      parseInt( hre.ethers.utils.formatEther(oldAccount2DevtTokenBalance.toString())) +
        parseInt(account2StakingNum)
    );
    expect(parseInt(hre.ethers.utils.formatEther(account2DvtTokenBalance.toString()))).to.equal(
      parseInt(hre.ethers.utils.formatEther(oldAccount2DvtTokenBalance.toString())) +
        parseInt(hre.ethers.utils.formatEther(account2PendingReward.toString()))
    );
  });

  it("test withdraw Abnormal flow", async function () {
    const rewards = "2000000";
    let account1 = buyerAddress[1];
    let account1StakingNum = "1000000";
    await dvtToken
      .connect(buyerAddress[0])
      .transfer(DevtLpMine.address, hre.ethers.utils.parseEther(rewards));
    await expect(
      DevtLpMine
        .connect(account1)
        .deposit(hre.ethers.utils.parseEther(account1StakingNum))
    ).to.be.revertedWith("Not initialized");
  
  });
  it("test recycleLeftovers", async function () {
    await expect(DevtLpMine.connect(buyerAddress[0]).init()).to.be.revertedWith(
      "No rewards sent"
    );

    await dvtToken
      .connect(buyerAddress[0])
      .transfer(DevtLpMine.address, hre.ethers.utils.parseEther("10000000"));

    await DevtLpMine.connect(buyerAddress[0]).init();

    await increaseWorldTimeInDays(10, true);
    await expect(DevtLpMine.recycleLeftovers()).to.be.revertedWith("Will not recycle before end");
 

    await increaseWorldTimeInDays(21, true);
    await DevtLpMine.recycleLeftovers();
    let devtMineDvtBalance = await dvtToken.balanceOf(DevtLpMine.address);

    expect(
      parseInt(hre.ethers.utils.formatEther(devtMineDvtBalance.toString()))
    ).to.equal(0);
    
  });
});
