import { createNodeMiddleware, createProbot } from "probot";
import app from "@/lib/index.ts";

const probot = createProbot();

export default createNodeMiddleware(app, { probot });
