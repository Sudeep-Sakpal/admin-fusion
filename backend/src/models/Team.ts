import { Document, Model, Schema, Types, model } from "mongoose";

export enum TeamSelectionStatus {
  PENDING = "PENDING",
  TRACK_SELECTED = "TRACK_SELECTED",
  COMPLETED = "COMPLETED",
}

export interface ITeam extends Document {
  _id: Types.ObjectId;
  name: string;
  track: Types.ObjectId | null;
  problemStatement: Types.ObjectId | null;
  selectionStatus: TeamSelectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const teamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    track: {
      type: Schema.Types.ObjectId,
      ref: "Track",
      default: null,
      index: true,
    },
    problemStatement: {
      type: Schema.Types.ObjectId,
      ref: "ProblemStatement",
      default: null,
    },
    selectionStatus: {
      type: String,
      enum: Object.values(TeamSelectionStatus),
      default: TeamSelectionStatus.PENDING,
      index: true,
    },
  },
  { timestamps: true }
);

export const Team: Model<ITeam> = model<ITeam>("Team", teamSchema);
