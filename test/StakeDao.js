const { expect } = require("chai");
let dao,token;
describe("test checkAmount",function(){
  beforeEach(async () => {
    const DEVTToken = await hre.ethers.getContractFactory("DEVTToken");
     token = await DEVTToken.deploy();
    await token.deployed();
   

    const StakeDao = await hre.ethers.getContractFactory("StakeDao");
     dao = await StakeDao.deploy(token.address);
    await dao.deployed();

   
    
  })
  it("test checkAmount", async function(){
    const amount  = await dao.checkAmount();
    console.log(amount.toString(),"get checkAmount")
  })
  it("test stake", async function(){
   
    const buyerAddress = await hre.ethers.getSigners();

   
    let num ='900';
    await token.connect(buyerAddress[0]).transfer(buyerAddress[1].address,hre.ethers.utils.parseEther(num));
    let nums = await token.balanceOf(buyerAddress[1].address);
    expect(nums).to.equal(hre.ethers.utils.parseEther(num));

    console.log(nums.toString(),111);
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

    await dao.connect(buyerAddress[0]).setNoTransfer(false);
    await dao.connect(buyerAddress[1]).transfer(buyerAddress[2].address,hre.ethers.utils.parseEther(num));

    deposits= await dao.balanceOf(buyerAddress[1].address);
    expect(deposits.toString()).to.equal("0");
   
  })


})
