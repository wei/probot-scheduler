import "@std/dotenv/load";
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import middleware from "@/middleware.ts";

const app = express();
app.use(middleware);

await mongoose.connect(Deno.env.get("MONGODB_URL") || "");
console.log(`MongoDB connection state: ${mongoose.connection.readyState}`);

app.get("/", (_req: Request, res: Response) => {
  res.send("Welcome to the Dinosaur API!");
});

app.listen(Deno.env.get("PORT") || 3000, () => {
  console.log(`Server is running on port ${Deno.env.get("PORT") || 3000}`);
});
