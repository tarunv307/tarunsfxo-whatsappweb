import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import {
  initWhatsApp, isReady, getQR, getMe, sendText, logout
} from "./whatsapp.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

app.get("/api/status", (req, res) => {
  res.json({ ready: isReady(), qr: getQR(), me: getMe() });
});

app.post("/api/send", async (req, res) => {
  const { to, text } = req.body;
  if (!to || !text) return res.status(400).json({ ok: false, error: "to + text required" });
  try {
    const r = await sendText(to, text);
    res.json({ ok: true, ...r });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/api/logout", async (req, res) => {
  try { await logout(); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);
  socket.emit("status", { ready: isReady(), qr: getQR(), me: getMe() });
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Backend: http://localhost:${PORT}`);
  console.log(`📱 Frontend open pannunga — QR varum\n`);
  initWhatsApp(io);
});
