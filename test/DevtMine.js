const { expect } = require("chai");
let devtMine, devtToken, dvtToken, buyerAddress;

const increaseWorldTimeInDays = async (days, mine = false) => {
  await ethers.provider.send("evm_increaseTime", [days * 86400]);
  if (mine) {
    await ethers.provider.send("evm_mine", []);
  }
};

describe("test DevtMine contract", function () {
  beforeEach(async () => {
    buyerAddress = await hre.ethers.getSigners();
    const DEVTToken = await hre.ethers.getContractFactory("DEVTToken");
    devtToken = await DEVTToken.deploy();
    await devtToken.deployed();

    const DVTToken = await hre.ethers.getContractFactory("DEVTToken");
    dvtToken = await DVTToken.deploy();
    await dvtToken.deployed();

    const circulatingSupply = "8000000";
    const DevtMine = await hre.ethers.getContractFactory("DevtMine");
    devtMine = await DevtMine.deploy(
      devtToken.address,
      dvtToken.address,
      buyerAddress[0].address,
      hre.ethers.utils.parseEther(circulatingSupply)
    );
    await devtMine.deployed();
  });
  it("test stake & withdraw", async function () {
    const rewards = "2000000";
    await dvtToken
      .connect(buyerAddress[0])
      .transfer(devtMine.address, hre.ethers.utils.parseEther(rewards));
    await devtMine.connect(buyerAddress[0]).init();

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
        devtMine.address,
        hre.ethers.utils.parseEther(account1StakingNum)
      );
    await devtToken
      .connect(account2)
      .approve(
        devtMine.address,
        hre.ethers.utils.parseEther(account2StakingNum)
      );

    await devtMine
      .connect(account1)
      .deposit(hre.ethers.utils.parseEther(account1StakingNum), 0);
    await devtMine
      .connect(account2)
      .deposit(hre.ethers.utils.parseEther(account2StakingNum), 2);

    await increaseWorldTimeInDays(30, true);

    let account1PendingReward = await devtMine
      .connect(account1)
      .pendingRewards(account1.address);
    let account2PendingReward = await devtMine
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

    await devtMine.connect(account1).withdraw();
    await devtMine.connect(account2).withdraw();

    let account1DevtTokenBalance = await devtToken.balanceOf(account1.address);
    let account1DvtTokenBalance = await dvtToken.balanceOf(account1.address);
    expect(parseInt(account1DevtTokenBalance)).to.equal(
      parseInt(oldAccount1DevtTokenBalance) +
        parseInt(hre.ethers.utils.parseEther(account1StakingNum))
    );
    expect(parseInt(account1DvtTokenBalance)).to.equal(
      parseInt(oldAccount1DvtTokenBalance) +
        parseInt(account1PendingReward.toString())
    );

    let account2DevtTokenBalance = await devtToken.balanceOf(account2.address);
    let account2DvtTokenBalance = await dvtToken.balanceOf(account2.address);
    expect(parseInt(account2DevtTokenBalance)).to.equal(
      parseInt(oldAccount2DevtTokenBalance) +
        parseInt(hre.ethers.utils.parseEther(account2StakingNum))
    );
    expect(parseInt(account2DvtTokenBalance)).to.equal(
      parseInt(oldAccount2DvtTokenBalance) +
        parseInt(account2PendingReward.toString())
    );
  });

  it("test withdraw Abnormal flow", async function () {
    const rewards = "2000000";
    let account1 = buyerAddress[1];
    let account1StakingNum = "1000000";
    await dvtToken
      .connect(buyerAddress[0])
      .transfer(devtMine.address, hre.ethers.utils.parseEther(rewards));
    await expect(
      devtMine
        .connect(account1)
        .deposit(hre.ethers.utils.parseEther(account1StakingNum), 0)
    ).to.be.revertedWith("Not initialized");

    await devtMine.connect(buyerAddress[0]).init();

    await devtToken
      .connect(buyerAddress[0])
      .transfer(
        account1.address,
        hre.ethers.utils.parseEther(account1StakingNum)
      );
    await devtToken
      .connect(account1)
      .approve(
        devtMine.address,
        hre.ethers.utils.parseEther(account1StakingNum)
      );
    await devtMine
      .connect(account1)
      .deposit(hre.ethers.utils.parseEther(account1StakingNum), 0);
    await increaseWorldTimeInDays(6, true);
    await expect(
      devtMine.connect(account1).withdraw()
    ).to.be.revertedWith("Position is still locked");
  });
  it("test kill", async function () {
    await expect(devtMine.connect(buyerAddress[0]).init()).to.be.revertedWith(
      "No rewards sent"
    );

    await dvtToken
      .connect(buyerAddress[0])
      .transfer(devtMine.address, hre.ethers.utils.parseEther("10000000"));

    await devtMine.connect(buyerAddress[0]).init();

    await increaseWorldTimeInDays(10, true);
    await devtMine.kill();
    let devtMineDvtBalance = await dvtToken.balanceOf(devtMine.address);

    expect(
      parseInt(hre.ethers.utils.formatEther(devtMineDvtBalance.toString()))
    ).to.equal(0);

    await increaseWorldTimeInDays(21, true);
    await expect(devtMine.kill()).to.be.revertedWith("Will not kill after end");
  });
});
