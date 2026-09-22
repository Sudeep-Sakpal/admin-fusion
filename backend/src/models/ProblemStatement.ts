import { Document, Model, Schema, Types, model } from "mongoose";

export interface IProblemStatement extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  code: string;
  track: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const problemStatementSchema = new Schema<IProblemStatement>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    track: {
      type: Schema.Types.ObjectId,
      ref: "Track",
      required: true,
      index: true,
    },
  },
  { timestamps: true }
);

export const ProblemStatement: Model<IProblemStatement> =
  model<IProblemStatement>("ProblemStatement", problemStatementSchema);
