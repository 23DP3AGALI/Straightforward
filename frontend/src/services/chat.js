import { apiRequest } from "./api";

export async function getChatList() {
  const { chats } = await apiRequest("/chats", { auth: true });
  return chats;
}

export async function getUnreadMessages() {
  const chats = await getChatList();
  return chats.reduce((total, chat) => total + chat.unread, 0);
}

export async function getMessages(gameId, userId) {
  const { messages } = await apiRequest(
    `/chats/${encodeURIComponent(gameId)}/${encodeURIComponent(userId)}/messages`,
    { auth: true },
  );
  return messages;
}

export async function sendMessage(gameId, userId, text) {
  const { message } = await apiRequest(
    `/chats/${encodeURIComponent(gameId)}/${encodeURIComponent(userId)}/messages`,
    { method: "POST", auth: true, body: { text } },
  );
  return message;
}
