import { Schema, model } from "mongoose";

const ChallengerSchema = new Schema({
    twitterHandle: {
        type: String,
        required: true,
      },
    solver: {
        type: String,
        required: true,
      },
    challenge: {
        type: String,
        required: true,
      },
    blockNumber: {
        type: Number,
        required: true,
      },
    dateCreated: {
        type: Date,
        default: Date.now,
    },
})

const Challenger = model('Challenger', ChallengerSchema)

export default Challenger