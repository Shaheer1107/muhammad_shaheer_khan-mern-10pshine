import dotenv from "dotenv";
import connectDB from "./config/db.js";
import app from "./app.js";
import logger from "./logger.js";
import { registerProcessHandlers } from "./middlewares/processHandler.js";

dotenv.config();


registerProcessHandlers();

(async () => {
  try {
    await connectDB();
    const port = process.env.PORT || 5000;
    app.listen(port, () => {
      logger.info({ port }, `Server running on port ${port}`);
    });
  } catch (err) {
    logger.fatal({ err }, "Failed to start server");
    process.exit(1);
  }
})();
