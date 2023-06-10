import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { twitterClient } from "./twitterClient";
import { ethers } from "ethers";
import { abi } from "./abi";
import { schedule } from "node-cron";

dotenv.config();

const server: Express = express();
const port = process.env.PORT || 3000;
const contractAddress = process.env.CONTRACT_ADDRESS || "0xE0ffeddD66245C38f1376F9255CEE57eAdfe790c";

// Handle GET requests to the root URL
server.get("/", async (req: Request, res: Response) => {
  await twitterClient.v2.tweet("deneme2");
  res.send("Express + TypeScript Server");
});

// Start the server
server.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

// Handle ChallengeSolved events emitted by the NFT contract
async function handleChallengeSolvedEvents() {
  const providerUrl =
    "https://avalanche-fuji.infura.io/v3/" + process.env.INFURA_API_KEY;
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const contract = new ethers.Contract(contractAddress, abi, provider);
  const filter = contract.filters.ChallengeSolved(null, null, null);
  let latestBlockNumber = 22891538;
  const iface = new ethers.Interface(abi);

  // Process all ChallengeSolved events emitted since the last processed block
  async function processChallengeSolvedEvents() {
    try {
      const events = await contract.queryFilter(
        filter,
        latestBlockNumber,
        "latest"
      );

      for (const event of events) {
        const [solver, challenge, twitterHandle] = iface.decodeEventLog(
          "ChallengeSolved",
          event.data,
          event.topics
        );
        const tweet = `Congratulations @${twitterHandle} for solving (solver: ${solver}) the challenge ${challenge} Block Number:${event.blockNumber}`;
        await twitterClient.v2.tweet(tweet);
        latestBlockNumber = event.blockNumber;
      }
    } catch (error) {
      console.error('Error processing ChallengeSolved events:', error);
    }
  }

  // Schedule the processing of ChallengeSolved events every 5 seconds
  schedule("*/5 * * * * *", async () => {
    await processChallengeSolvedEvents();
  }).start();
}

// Start processing ChallengeSolved events
handleChallengeSolvedEvents();