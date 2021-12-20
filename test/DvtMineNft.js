const { expect } = require("chai");
let DvtMineNft, dvtToken, buyerAddress;

const increaseWorldTimeInDays = async (days, mine = false) => {
  await ethers.provider.send("evm_increaseTime", [days * 86400]);
  if (mine) {
    await ethers.provider.send("evm_mine", []);
  }
};

describe("test DvtMineNft contract", function () {
  beforeEach(async () => {
    buyerAddress = await hre.ethers.getSigners();

    const DVTToken = await hre.ethers.getContractFactory("DEVTToken");
    dvtToken = await DVTToken.deploy();
    await dvtToken.deployed();

    const minStakeAmount = "20000";
    const dvtMineNft = await hre.ethers.getContractFactory("DvtMineNft");
    DvtMineNft = await dvtMineNft.deploy(
      dvtToken.address,
      "https://www.metadata.com/",
      hre.ethers.utils.parseEther(minStakeAmount)
    );
    await DvtMineNft.deployed();
  });
  it("test stake & withdraw", async function () {


    let account1 = buyerAddress[1];
    let account1StakingNum = "1000000";
    let account2 = buyerAddress[2];
    let account2StakingNum = "1000000";

    await dvtToken
      .connect(buyerAddress[0])
      .transfer(
        account1.address,
        hre.ethers.utils.parseEther(account1StakingNum)
      );
     
    await dvtToken
      .connect(buyerAddress[0])
      .transfer(
        account2.address,
        hre.ethers.utils.parseEther(account2StakingNum)
      );
     
    await dvtToken
      .connect(account1)
      .approve(
        DvtMineNft.address,
        hre.ethers.utils.parseEther(account1StakingNum)
      );
      
    await dvtToken
      .connect(account2)
      .approve(
        DvtMineNft.address,
        hre.ethers.utils.parseEther(account2StakingNum)
      );
      
    await DvtMineNft
      .connect(account1)
      .deposit(hre.ethers.utils.parseEther(account1StakingNum),0);

    await DvtMineNft
      .connect(account2)
      .deposit(hre.ethers.utils.parseEther(account2StakingNum),1);

    await increaseWorldTimeInDays(33, true);

    let oldAccount1DvtTokenBalance = await dvtToken.balanceOf(account1.address);
    let oldAccount2DvtTokenBalance = await dvtToken.balanceOf(
      account2.address
    );
    await DvtMineNft.connect(account1).withdraw();
    await DvtMineNft.connect(account2).withdraw();

    
   
    let account1DvtTokenBalance = await dvtToken.balanceOf(account1.address);
    expect(parseInt( hre.ethers.utils.formatEther(account1DvtTokenBalance.toString()))).to.equal(
      parseInt( hre.ethers.utils.formatEther(oldAccount1DvtTokenBalance.toString())) +
        parseInt(account1StakingNum)
    );

  
    let account2DvtTokenBalance = await dvtToken.balanceOf(account2.address);
    expect(parseInt( hre.ethers.utils.formatEther(account2DvtTokenBalance.toString()))).to.equal(
      parseInt( hre.ethers.utils.formatEther(oldAccount2DvtTokenBalance.toString())) +
        parseInt(account2StakingNum)
    );


     expect(await DvtMineNft.balanceOf(account1.address)).to.equal("1");
     expect(await DvtMineNft.balanceOf(account2.address)).to.equal("1");
  
  });

  it("test withdraw Abnormal flow", async function () {
    
    let account1 = buyerAddress[1];
    let account1StakingNum = "1000000";
    let account2 = buyerAddress[2];

    await dvtToken
      .connect(buyerAddress[0])
      .transfer(
        account1.address,
        hre.ethers.utils.parseEther(account1StakingNum)
      );
     
   
    await dvtToken
      .connect(account1)
      .approve(
        DvtMineNft.address,
        hre.ethers.utils.parseEther(account1StakingNum)
      );   
    await DvtMineNft
      .connect(account1)
      .deposit(hre.ethers.utils.parseEther(account1StakingNum),0);
    await increaseWorldTimeInDays(3, true);

 
    await expect(
      DvtMineNft
        .connect(account1)
        .withdraw()
    ).to.be.revertedWith("Position is still locked");

    await expect(
      DvtMineNft
        .connect(account2)
        .withdraw()
    ).to.be.revertedWith("Position does not exists");
  
  });
});
