import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { twitterClient } from './twitterClient';
import { Log, LogDescription, ethers } from 'ethers'
import { abi } from './abi';
import { schedule } from 'node-cron'

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

app.get('/', async (req: Request, res: Response) => {
  await twitterClient.v2.tweet("deneme2");
  res.send('Express + TypeScript Server');
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});

async function main() {
  const contractAddress = "0xE0ffeddD66245C38f1376F9255CEE57eAdfe790c";
  const url = "https://avalanche-fuji.infura.io/v3/" + process.env.INFURA_API_KEY;
  const provider = new ethers.JsonRpcProvider(url);
  const nftContract = new ethers.Contract(contractAddress, abi, provider);
  const filter = nftContract.filters.ChallengeSolved(null, null, null);
  let lastBlockNo = 22891538; // inital block number is when contract deployed
  let currentBlockNo = await provider.getBlockNumber();
  const iface = new ethers.Interface(abi);
  const query = await nftContract.queryFilter(filter, lastBlockNo, "latest");
  const parsedQuery = query.map((log) => iface.decodeEventLog('ChallengeSolved', log.data, log.topics))

  console.log(`${currentBlockNo}: ${parsedQuery.length}`);
  try {
    //args[0] -  solver address
	  //args[1] - challenge address
	  //args[2] - twitter handle
    for (let i = 0; i < parsedQuery.length; i++) {
      const twitterHandle = parsedQuery[i][2];
      const challenge = parsedQuery[i][0];
      twitterClient.v2.tweet(`Congratulations @${twitterHandle} for solving the challenge ${challenge} Block Number:${query[i].blockNumber}`);
      console.log
    }
  } catch (e) {
    console.log(e)
  }

  const job = schedule('*/5 * * * * *', async () => {
    const query = await nftContract.queryFilter(
      filter,
      currentBlockNo,
      "latest"
    );
    const parsedQuery = query.map((log) =>
      iface.decodeEventLog("ChallengeSolved", log.data, log.topics)
    );
    currentBlockNo = await provider.getBlockNumber();
    // log parsedQuery
    console.log(`${currentBlockNo}: ${parsedQuery.length}`);
    try {
      for (let i = 0; i < parsedQuery.length; i++) {
        const twitterHandle = parsedQuery[i][2];
        const challenge = parsedQuery[i][0];
        twitterClient.v2.tweet(
          `Congratulations @${twitterHandle} for solving the challenge ${challenge}`
        );
      }
    } catch (e) {
      console.log(e);
    }
  })

  job.start();
}

main();