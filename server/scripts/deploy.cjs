const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const settlementWallet = process.env.SETTLEMENT_WALLET || deployer.address;
  const contract = await hre.ethers.deployContract("SikaPay", [settlementWallet]);
  await contract.waitForDeployment();
  console.log("SikaPay deployed to:", await contract.getAddress());
  console.log("Settlement wallet:", settlementWallet);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
