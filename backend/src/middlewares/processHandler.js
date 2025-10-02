import logger from "../logger.js";


export function registerProcessHandlers() {

  process.on("uncaughtException", (err) => {
    try {
      logger.fatal({ err }, "Uncaught Exception - exiting");
    } catch (e) {
      console.error("Fatal uncaughtException", err);
    } finally {
      process.exit(1);
    }
  });


  process.on("unhandledRejection", (reason) => {
    try {
      logger.fatal({ reason }, "Unhandled Promise Rejection - exiting");
    } catch (e) {  
      console.error("Fatal unhandledRejection", reason);
    } finally {
      process.exit(1);
    }
  });
}
