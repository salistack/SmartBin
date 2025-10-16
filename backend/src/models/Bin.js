// models/Bin.js
import mongoose from "mongoose";

const binSchema = new mongoose.Schema({
  type: { type: String, required: true },   // e.g. "Plastic", "Organic"
  filthLevel: { type: Number, default: 0 },
  maxLevel: { type: Number, default: 100 },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

export default mongoose.model("Bin", binSchema);
