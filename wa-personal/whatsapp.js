import pkg from "whatsapp-web.js";
const { Client, LocalAuth } = pkg;
import qrcode from "qrcode";

let client, io, ready = false, qrUrl = null, me = null;

export function initWhatsApp(socketIO) {
  io = socketIO;
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: "./.wwebjs_auth" }),
    puppeteer: {
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  client.on("qr", async (qr) => {
    console.log("QR ready — scan from phone");
    qrUrl = await qrcode.toDataURL(qr);
    io.emit("qr", qrUrl);
  });

  client.on("ready", () => {
    ready = true;
    me = client.info;
    console.log("Ready:", me?.pushname);
    io.emit("ready", {
      name: me?.pushname || "Me",
      number: me?.wid?.user || "",
    });
  });

  client.on("disconnected", (r) => {
    ready = false;
    console.log("Disconnected:", r);
    io.emit("disconnected", r);
    client.initialize();
  });

  client.on("message", async (msg) => {
    try {
      const contact = await msg.getContact();
      io.emit("message", {
        from: msg.from,
        body: msg.body,
        senderName: contact.pushname || contact.number,
        senderNumber: contact.number,
        time: msg.timestamp * 1000,
      });
    } catch (e) { console.error(e.message); }
  });

  client.initialize();
}

export function isReady() { return ready; }
export function getQR() { return qrUrl; }
export function getMe() { return me; }

export async function sendText(number, text) {
  if (!ready) throw new Error("WhatsApp not ready");
  const clean = String(number).replace(/\D/g, "");
  const chatId = `${clean}@c.us`;
  const msg = await client.sendMessage(chatId, text);
  return { id: msg.id._serialized };
}

export async function logout() {
  if (client) { ready = false; await client.logout(); }
}
