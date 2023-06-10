export const abi = [
    {
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "solver",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "challenge",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "string",
				"name": "twitterHandle",
				"type": "string"
			}
		],
		"name": "ChallengeSolved",
		"type": "event"
	}
] as const;