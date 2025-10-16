// models/CollectionRequest.js
import mongoose from "mongoose";

const collectionRequestSchema = new mongoose.Schema({
  bin: { type: mongoose.Schema.Types.ObjectId, ref: "Bin", required: true },
  binType: { type: String, required: true },
  address: {
    street: String,
    city: String,
    postalCode: String,
    lat: Number,
    lng: Number
  },
  status: { type: String, enum: ["PENDING", "COLLECTED"], default: "PENDING" }
}, { timestamps: true });

export default mongoose.model("CollectionRequest", collectionRequestSchema);
