// models/Roster.ts
import mongoose, { Schema, Document } from "mongoose";

export interface ISupervisor {
  id: string;
  name: string;
}

export interface IManager {
  id: string;
  name: string;
}

export interface IRoster extends Document {
  date: string;
  employeeName: string;
  employeeId: string;
  department: string;
  designation: string;
  shift: string;
  shiftTiming: string;
  assignedTask: string;
  hours: number;
  remark: string;
  type: "daily" | "weekly" | "fortnightly" | "monthly";
  siteClient: string;
  siteId: string;
  supervisors: ISupervisor[];
  managers: IManager[];
  assignedTaskId: string;
  createdBy: "superadmin" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

const SupervisorSchema: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
});

const ManagerSchema: Schema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
});

const RosterSchema: Schema = new Schema(
  {
    date: {
      type: String,
      required: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    employeeId: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    designation: {
      type: String,
      required: true,
    },
    shift: {
      type: String,
      default: "",        // optional, default empty
    },
    shiftTiming: {
      type: String,
      default: "",
    },
    assignedTask: {
      type: String,
      default: "",         // ✅ remove required: true and set default
    },
    assignedTaskId: {
      type: String,
      default: "",
    },
    hours: {
      type: Number,
      default: 0,          // optional, default 0
      min: 0,
      max: 24,
    },
    remark: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["daily", "weekly", "fortnightly", "monthly"],
      required: true,
    },
    siteClient: {
      type: String,
      required: true,
    },
    siteId: {
      type: String,
      required: true,
    },
    supervisors: {
      type: [SupervisorSchema],
      default: [],
    },
    managers: {
      type: [ManagerSchema],
      default: [],
    },
    createdBy: {
      type: String,
      enum: ["superadmin", "admin"],
      required: true,
      default: "superadmin",
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for efficient querying
RosterSchema.index({ date: 1, employeeId: 1 });
RosterSchema.index({ type: 1, date: 1 });
RosterSchema.index({ createdBy: 1 });
RosterSchema.index({ "supervisors.id": 1 });
RosterSchema.index({ "managers.id": 1 });

export default mongoose.model<IRoster>("Roster", RosterSchema);