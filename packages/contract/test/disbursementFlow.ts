import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("ERC20Disburser → Bulk Disbursement Flow", function () {
  let token: any;
  let gasliteDisburser: any;
  let simpleDisburser: any;
  let accounts: any[] = [];
  const NUM_BENEFICIARIES = 200;
  const AMOUNT_PER_ACCOUNT = 100;

  const log = (msg: string) => console.log(`\x1b[36m${msg}\x1b[0m`);

  before(async () => {
    for (let i = 0; i < NUM_BENEFICIARIES; i++) {
      const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
      accounts.push(wallet);
    }
  });

  it("Should deploy ERC20 token contract", async function () {
    token = await ethers.deployContract("RahatToken", [100000]);
    await token.waitForDeployment();
    log("✅ Deploying ERC20 token contract: Success");
  });

  it("Should deploy Gaslite ERC20Disburser contract", async function () {
    gasliteDisburser = await ethers.deployContract("ERC20Disburser");
    await gasliteDisburser.waitForDeployment();
    log("✅ Deploying Gaslite ERC20Disburser contract: Success");
  });

  it("Should deploy SimpleERC20Disburser contract", async function () {
    simpleDisburser = await ethers.deployContract("SimpleERC20Disburser");
    await simpleDisburser.waitForDeployment();
    log("✅ Deploying SimpleERC20Disburser contract: Success");
  });

  it("Should approve Gaslite disburser to spend tokens", async function () {
    await token.approve(await gasliteDisburser.getAddress(), 100000);
    log("✅ Approved GasliteDisburser contract: Success");
  });

  it("Should approve Simple disburser to spend tokens", async function () {
    await token.approve(await simpleDisburser.getAddress(), 100000);
    log("✅ Approved SimpleERC20Disburser contract: Success");
  });

  it("Should disburse tokens using GasliteDisburser and record gas", async function () {
    const recipients = accounts.map((a) => a.address);
    const amounts = Array(NUM_BENEFICIARIES).fill(AMOUNT_PER_ACCOUNT);
    const totalAmount = amounts.reduce((a, b) => a + b, 0);

    const tx = await gasliteDisburser.disburseERC20(
      await token.getAddress(),
      recipients,
      amounts,
      totalAmount
    );
    const receipt = await tx.wait();

    const gasUsed = receipt.gasUsed;
    const effectiveGasPrice = tx.gasPrice ?? 0n;
    const gasCostETH = Number(gasUsed * effectiveGasPrice) / 1e18;

    log(
      `💸 GasliteDisburser gas cost for ${NUM_BENEFICIARIES} accounts: ${gasCostETH} ETH`
    );
  });

  it("Should disburse tokens using SimpleERC20Disburser and record gas", async function () {
    const recipients = accounts.map((a) => a.address);
    const amounts = Array(NUM_BENEFICIARIES).fill(AMOUNT_PER_ACCOUNT);
    const totalAmount = amounts.reduce((a, b) => a + b, 0);

    const tx = await simpleDisburser.disburseERC20(
      await token.getAddress(),
      recipients,
      amounts,
      totalAmount
    );
    const receipt = await tx.wait();

    const gasUsed = receipt.gasUsed;
    const effectiveGasPrice = tx.gasPrice ?? 0n;
    const gasCostETH = Number(gasUsed * effectiveGasPrice) / 1e18;

    log(
      `💸 SimpleERC20Disburser gas cost for ${NUM_BENEFICIARIES} accounts: ${gasCostETH} ETH`
    );
  });

  it("Should check balance of 10 random accounts", async function () {
    for (let i = 0; i < 10; i++) {
      const idx = Math.floor(Math.random() * accounts.length);
      const bal = await token.balanceOf(accounts[idx].address);
      expect(bal).to.equal(AMOUNT_PER_ACCOUNT * 2);
      log(`✅ Account ${accounts[idx].address} balance correct: ${bal}`);
    }
  });
});
