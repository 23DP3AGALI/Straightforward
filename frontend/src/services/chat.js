import { apiRequest } from "./api";
import { getCurrentUser } from "./auth";
import { getMyLobbies } from "./lobbies";

export async function getChatList() {
  const { chats } = await apiRequest("/chats", { auth: true });
  const [lobbies, user] = await Promise.all([getMyLobbies(), Promise.resolve(getCurrentUser())]);
  const groupChats = lobbies.map((lobby) => ({
    ...lobby,
    type: "lobby",
    last: lobby.lastMessage == null
      ? null
      : { text: lobby.lastMessage, createdAt: lobby.lastMessageAt },
    unread: 0,
    isOwner: String(lobby.ownerId) === String(user?.id),
  }));
  return [
    ...chats.map((chat) => ({ ...chat, type: "direct" })),
    ...groupChats,
  ].sort((a, b) => new Date(b.last?.createdAt || 0) - new Date(a.last?.createdAt || 0));
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
