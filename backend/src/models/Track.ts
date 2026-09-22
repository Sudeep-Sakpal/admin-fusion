import { Document, Model, Schema, Types, model } from "mongoose";

export interface ITrack extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  description: string;
  capacity: number;
  currentCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const trackSchema = new Schema<ITrack>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },
    currentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Track: Model<ITrack> = model<ITrack>("Track", trackSchema);
