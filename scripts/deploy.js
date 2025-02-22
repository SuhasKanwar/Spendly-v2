const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners(); // Get deployer's wallet address

    const initialValue = 1000; // Example value for the second argument

    const ContractFactory = await ethers.getContractFactory("ReactiveBuySell");
    const contract = await ContractFactory.deploy(deployer.address, initialValue); // Pass arguments

    await contract.deployed();

    console.log("Contract deployed to:", contract.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });