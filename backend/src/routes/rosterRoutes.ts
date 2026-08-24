// routes/rosterRoutes.ts
import express from "express";
import {
  getRosterEntries,
  getRosterById,
  createRosterEntry,
  updateRosterEntry,
  deleteRosterEntry,
  getRosterStats,
  getCalendarView,
  bulkCreateRosterEntries,
  checkDuplicateEntry,
} from "../controllers/rosterController";

const router = express.Router();

// Get all roster entries with filters
router.get("/", getRosterEntries);

// Get roster statistics
router.get("/stats", getRosterStats);

// Get calendar view data
router.get("/calendar", getCalendarView);

// Get specific roster entry
router.get("/:id", getRosterById);

// Create new roster entry
router.post("/", createRosterEntry);

// Create multiple roster entries
router.post("/bulk", bulkCreateRosterEntries);

// Update roster entry
router.put("/:id", updateRosterEntry);

// Delete roster entry
router.delete("/:id", deleteRosterEntry);
router.get("/check-duplicate", checkDuplicateEntry);

export default router;