import "@std/dotenv/load";
import express from "express";
import mongoose from "mongoose";
import { createNodeMiddleware, createProbot } from "probot";
import probotApp from "@/lib/app.ts";
import createRouter from "@/lib/router/index.ts";

const probot = createProbot();

const server = express();
server.use(createNodeMiddleware(probotApp, { probot }));
server.use("/", createRouter(probot));

await mongoose.connect(Deno.env.get("MONGODB_URL") || "");
console.log(`MongoDB connection state: ${mongoose.connection.readyState}`);

server.listen(Deno.env.get("PORT") || 3000, () => {
  console.log(`Server is running on port ${Deno.env.get("PORT") || 3000}`);
});
