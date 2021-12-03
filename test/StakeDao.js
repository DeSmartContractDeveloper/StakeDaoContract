const { expect } = require("chai");
let dao,token;
const increaseWorldTimeInDays = async (days, mine = false) => {
  await ethers.provider.send('evm_increaseTime', [days*86400]);
  if (mine) {
    await ethers.provider.send('evm_mine', []);
  }
};
describe("test contract",function(){
  beforeEach(async () => {
    const DEVTToken = await hre.ethers.getContractFactory("DEVTToken");
     token = await DEVTToken.deploy();
    await token.deployed();
   

    const StakeDao = await hre.ethers.getContractFactory("StakeDao");
     dao = await StakeDao.deploy(token.address);
    await dao.deployed();

   
    
  })
  it("test checkAmount", async function(){
    let amount;
    amount  = await dao.checkAmount();
    console.log(amount.toString(),"get checkAmount")

    // for(let i=0;i<3;i++){
    //   await increaseWorldTimeInDays(1,true);
    //   amount  = await dao.checkAmount();
    //   console.log(amount.toString(),`get ${i} checkAmount`)
    // }
  });

  it("test stake branch process ", async function(){
    const buyerAddress = await hre.ethers.getSigners();
    let num = await dao.checkAmount();
    num = num.toString();
    num = (parseInt(num) -1).toString()
    await token.connect(buyerAddress[0]).transfer(buyerAddress[3].address,hre.ethers.utils.parseEther(num));
    let nums = await token.balanceOf(buyerAddress[3].address);
    expect(nums).to.equal(hre.ethers.utils.parseEther(num));
    await expect( dao.connect(buyerAddress[3]).stake(num)).to.be.revertedWith("DeHorizon DAO: not enough amount");
  });

  it("test withdraw branch process ", async function(){
    const buyerAddress = await hre.ethers.getSigners();
    let num = await dao.checkAmount();
    num = num.toString();
    await expect( dao.connect(buyerAddress[4]).withdraw(num)).to.be.revertedWith("DeHorizon DAO: no stake");


    await token.connect(buyerAddress[0]).transfer(buyerAddress[4].address,hre.ethers.utils.parseEther(num));
    await token.connect(buyerAddress[4]).approve(dao.address,hre.ethers.utils.parseEther(num));
    await dao.connect(buyerAddress[4]).stake(num);
    num = (parseInt(num) -1).toString()
    await expect( dao.connect(buyerAddress[4]).withdraw(hre.ethers.utils.parseEther(num))).to.be.revertedWith("DeHorizon DAO: amount error");

  });

  it("test stake", async function(){
   
    const buyerAddress = await hre.ethers.getSigners();
    let num = await dao.checkAmount();
    num = num.toString();
    await token.connect(buyerAddress[0]).transfer(buyerAddress[1].address,hre.ethers.utils.parseEther(num));
    let nums = await token.balanceOf(buyerAddress[1].address);
    expect(nums).to.equal(hre.ethers.utils.parseEther(num));

    let res =await token.connect(buyerAddress[1]).approve(dao.address,nums.toString());
    res.wait();

    await dao.connect(buyerAddress[1]).stake(num);
    let deposits= await dao.balanceOf(buyerAddress[1].address);
    expect(deposits.toString()).to.equal(hre.ethers.utils.parseEther(num));
    
    nums = await token.balanceOf(buyerAddress[1].address);
    expect(nums).to.equal("0");

    nums = await dao.balanceOf(buyerAddress[1].address);
    expect(nums).to.equal(hre.ethers.utils.parseEther(num));

    await dao.connect(buyerAddress[1]).withdraw(deposits.toString());
    deposits= await dao.balanceOf(buyerAddress[1].address);
    expect(deposits.toString()).to.equal('0');

    nums = await token.balanceOf(buyerAddress[1].address);
    expect(nums).to.equal(hre.ethers.utils.parseEther(num));

    nums = await dao.balanceOf(buyerAddress[1].address);
    expect(nums).to.equal("0");

    res =await token.connect(buyerAddress[1]).approve(dao.address,hre.ethers.utils.parseEther(num));
    res.wait();

    await dao.connect(buyerAddress[1]).stake(num);
     deposits= await dao.balanceOf(buyerAddress[1].address);
  
    expect(deposits.toString()).to.equal(hre.ethers.utils.parseEther(num));

    await expect(dao.connect(buyerAddress[1]).transfer(buyerAddress[2].address,hre.ethers.utils.parseEther(num))).to.be.revertedWith("DeHorizon DAO: no transfer") ;
    await dao.connect(buyerAddress[0]).setNoTransfer(false);
    await dao.connect(buyerAddress[1]).transfer(buyerAddress[2].address,hre.ethers.utils.parseEther(num));

    deposits= await dao.balanceOf(buyerAddress[1].address);
    expect(deposits.toString()).to.equal("0");
   
  })


})
