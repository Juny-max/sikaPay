const { expect } = require("chai");
const { ethers } = require("hardhat");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");

describe("SikaPay", function () {
  it("settles an ETH invoice once and records the payment", async function () {
    const [operator, settlement, customer] = await ethers.getSigners();
    const contract = await ethers.deployContract("SikaPay", [settlement.address]);
    const invoiceId = ethers.id("SP-DEMO");
    const merchantId = ethers.id("kojo-store");
    const amount = ethers.parseEther("0.01");
    await contract.createInvoice(invoiceId, merchantId);

    await expect(contract.connect(customer).payInvoice(invoiceId, ethers.ZeroAddress, amount, { value: amount }))
      .to.emit(contract, "PaymentCompleted")
      .withArgs(invoiceId, merchantId, customer.address, ethers.ZeroAddress, amount, anyValue);
    await expect(contract.connect(customer).payInvoice(invoiceId, ethers.ZeroAddress, amount, { value: amount }))
      .to.be.revertedWithCustomError(contract, "InvoiceAlreadyPaid");
    expect(await contract.getPaymentHistory()).to.deep.equal([invoiceId]);
  });
});
