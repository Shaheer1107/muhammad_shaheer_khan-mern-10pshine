import express from "express";
import { body } from "express-validator";
import { register, login, refresh, logout } from "../controllers/authController.js";
import validateRequest from "../middlewares/validateRequest.js";


console.log("✅ auth routes file loaded");

const router = express.Router();

router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password min length 6"),
  ],
  validateRequest,
  register
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password required"),
  ],
  validateRequest,
  login
);

router.post("/refresh", refresh);
router.post("/logout", logout);


router.get("/test", (req, res) => {
  res.json({ message: "Auth routes working" });
});

export default router;
