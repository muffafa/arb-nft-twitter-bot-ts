import "dotenv/config";
import { ethers } from "ethers";
import { TwitterApi } from "twitter-api-v2";
import mongoose from "mongoose";
import { schedule } from "node-cron";
import Challenger from "./models/challenger";
import { abi } from "./abi";

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

const twitterClient = new TwitterApi({
  appKey: API_KEY,
  appSecret: API_SECRET,
  accessToken: ACCESS_TOKEN,
  accessSecret: ACCESS_SECRET,
}).readWrite;

const twitterBearer = new TwitterApi(BEARER_TOKEN).readOnly;

const contractAddress = CONTRACT_ADDRESS || "";

// Connect to MongoDB
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("Connected to database");
  })
  .catch((error) => {
    console.error("Error connecting to database:", error);
  });

// Start processing ChallengeSolved events
async function startChallengeSolvedEventProcessing() {
  const providerUrl = PROVIDER_URI || "";
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const contract = new ethers.Contract(contractAddress, abi, provider);
  const filter = contract.filters.ChallengeSolved(null, null, null);
  const iface = new ethers.Interface(abi);

  let latestBlockNumber = await provider.getBlockNumber();
  let currentBlockNumber = 97795210;

  // Get the max blockNumber from the Challenger collection
  currentBlockNumber = await Challenger.findOne()
    .sort({ blockNumber: -1 })
    .select("blockNumber")
    .lean()
    .exec()
    .then((res) => res?.blockNumber ?? currentBlockNumber);

  // Process all ChallengeSolved events emitted since the last processed block
  async function processChallengeSolvedEvents() {
    try {
      latestBlockNumber = await provider.getBlockNumber(); // Get the latest block number

      if (latestBlockNumber > currentBlockNumber) {
        console.log(
          `Processing events from block ${
            currentBlockNumber + 1
          } to ${latestBlockNumber}`
        );
        const events = await contract.queryFilter(
          filter,
          currentBlockNumber + 1,
          latestBlockNumber
        );

        for (const event of events) {
          const [solver, challenge, twitterHandle] = iface.decodeEventLog(
            "ChallengeSolved",
            event.data,
            event.topics
          );

          let handle = twitterHandle;
          if (handle[0] === "@") {
            handle = twitterHandle.substring(1); 
          }
          handle = handle || `""`;
          
          const tweet = `Congratulations @${handle}\n\nYour address:\n${solver}\n\nThe challenge address:\n${challenge}\n\nBlock Number: ${event.blockNumber}`;
          
          console.log("--------------------");
          console.log(tweet);
          console.log("--------------------");

          await twitterClient.v2.tweet(tweet);

          await Challenger.create({
            twitterHandle: handle,
            solver,
            challenge,
            blockNumber: event.blockNumber,
          }).then((res) => console.log("")).catch((err) => console.log(err));
          
        }
        currentBlockNumber = latestBlockNumber; // set current block number for next processing
      }
    } catch (error) {
      console.error("Error processing ChallengeSolved events:", error);
    }
  }

  // Schedule the processing of ChallengeSolved events every 2 minutes
  schedule("*/2 * * * *", async () => {
    await processChallengeSolvedEvents();
  }).start();
}

startChallengeSolvedEventProcessing();
