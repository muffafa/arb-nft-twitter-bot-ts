import "dotenv/config";

import { TwitterApi } from "twitter-api-v2";
import { ethers } from "ethers";
import { abi } from "./abi";
import { schedule } from "node-cron";
import mongoose from "mongoose";
import Challenger from "./models/challenger";

const {
  MONGO_URI,
  PROVIDER_URI,
  CONTRACT_ADDRESS,
  API_KEY,
  API_SECRET,
  ACCESS_TOKEN,
  ACCESS_SECRET,
  BEARER_TOKEN,
} = process.env;

const client = new TwitterApi({
  appKey: API_KEY,
  appSecret: API_SECRET,
  accessToken: ACCESS_TOKEN,
  accessSecret: ACCESS_SECRET,
});
const bearer = new TwitterApi(BEARER_TOKEN);
const twitterClient = client.readWrite;
const twitterBearer = bearer.readOnly;

const contractAddress = CONTRACT_ADDRESS || "";

// Handle ChallengeSolved events emitted by the NFT contract
async function handleChallengeSolvedEvents() {
  await mongoose
    .connect(MONGO_URI)
    .then(() => {
      console.log("CONNTECTED TO DATABASE");
    })
    .catch(console.error);

  const providerUrl = PROVIDER_URI || "";
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const contract = new ethers.Contract(contractAddress, abi, provider);
  const filter = contract.filters.ChallengeSolved(null, null, null);
  const iface = new ethers.Interface(abi);

  let latestBlockNumber = await provider.getBlockNumber();
  let currentBlockNumber = latestBlockNumber - 1;
  // get max blockNumber from Challanger colection
  await Challenger.find()
    .sort({ blockNumber: -1 })
    .limit(1)
    .then((res) => {
      if (res.length > 0) {
        currentBlockNumber = res[0].blockNumber + 1;
      }
    })
    .catch(console.error);

  // Process all ChallengeSolved events emitted since the last processed block
  async function processChallengeSolvedEvents() {
    try {
      latestBlockNumber = await provider.getBlockNumber(); // Get the latest block number

      if (latestBlockNumber > currentBlockNumber) {
        console.log(`Range: ${currentBlockNumber} to ${latestBlockNumber}, `);
        const events = await contract.queryFilter(
          filter,
          currentBlockNumber,
          latestBlockNumber
        );

        for (const event of events) {
          const [solver, challenge, twitterHandle] = iface.decodeEventLog(
            "ChallengeSolved",
            event.data,
            event.topics
          );
          const tweet = `Congratulations @${twitterHandle} for solving (solver: ${solver}) the challenge ${challenge} Block Number:${event.blockNumber}`;
          console.log(tweet);
          await twitterClient.v2.tweet(tweet);

          await Challenger.create({
            twitterHandle,
            solver,
            challenge,
            blockNumber: event.blockNumber,
          })
            .then(() => {
              console.log("saved to database");
            })
            .catch(console.error);
        }
        currentBlockNumber = latestBlockNumber + 1; // set current block number for next processing
      }
    } catch (error) {
      console.error("Error processing ChallengeSolved events:", error);
    }
  }

  // Schedule the processing of ChallengeSolved events evrey 15 seconds
  schedule("*/15 * * * * *", async () => {
    await processChallengeSolvedEvents();
  }).start();
}

// Start processing ChallengeSolved events
handleChallengeSolvedEvents();
