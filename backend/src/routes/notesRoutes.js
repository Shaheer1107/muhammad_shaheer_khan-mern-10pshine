import express from "express";
import {
  createNoteHandler,
  listNotesHandler,
  getNoteHandler,
  updateNoteHandler,
  deleteNoteHandler,
} from "../controllers/notesController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.use(authMiddleware);

router.post("/", createNoteHandler);
router.get("/", listNotesHandler); 
router.get("/:id", getNoteHandler);
router.put("/:id", updateNoteHandler);
router.delete("/:id", deleteNoteHandler);

export default router;
