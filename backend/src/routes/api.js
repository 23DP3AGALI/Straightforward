import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as auth from "../controllers/authController.js";
import * as games from "../controllers/gameController.js";
import * as profiles from "../controllers/profileController.js";
import * as admin from "../controllers/adminController.js";
import * as chats from "../controllers/chatController.js";
import * as notifications from "../controllers/notificationController.js";
import * as lobbies from "../controllers/lobbyController.js";
import * as lobbyChat from "../controllers/lobbyChatController.js";
import { requireAdmin, requireAuth } from "../middleware/auth.js";

const router = Router();
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-7", legacyHeaders: false });
const registrationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: "draft-7", legacyHeaders: false });
const verificationLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: "draft-7", legacyHeaders: false });

router.get("/health", (req, res) => res.json({ status: "ok" }));
router.post("/auth/register", registrationLimiter, auth.register);
router.post("/auth/verify-registration", verificationLimiter, auth.verifyRegistration);
router.post("/auth/resend-registration-code", verificationLimiter, auth.resendRegistrationCode);
router.post("/auth/login", loginLimiter, auth.login);
router.get("/auth/me", requireAuth, auth.me);
router.patch("/auth/me", requireAuth, auth.updateMe);

router.get("/games", games.listGames);
router.get("/games/:id", games.getGame);
router.post("/games", requireAuth, requireAdmin, games.createGame);
router.patch("/games/:id", requireAuth, requireAdmin, games.updateGame);
router.delete("/games/:id", requireAuth, requireAdmin, games.deleteGame);

router.get("/games/:gameId/profiles", requireAuth, profiles.listGameProfiles);
router.get("/games/:gameId/profiles/me", requireAuth, profiles.getMyProfile);
router.put("/games/:gameId/profiles/me", requireAuth, profiles.saveMyProfile);
router.delete("/games/:gameId/profiles/me", requireAuth, profiles.deleteMyProfile);
router.post("/games/:gameId/profiles/:profileId/reactions", requireAuth, profiles.reactToProfile);
router.post("/games/:gameId/profiles/:profileId/reports", requireAuth, profiles.reportProfile);
router.get("/profiles/favorites", requireAuth, profiles.listFavorites);
router.get("/profiles/history", requireAuth, profiles.listProfileHistory);
router.put("/profiles/favorites/:profileId", requireAuth, profiles.addFavorite);
router.delete("/profiles/favorites/:profileId", requireAuth, profiles.removeFavorite);

router.get("/games/:gameId/lobbies", requireAuth, lobbies.listLobbies);
router.get("/lobbies/mine", requireAuth, lobbies.listMyLobbies);
router.post("/games/:gameId/lobbies", requireAuth, lobbies.createLobby);
router.post("/games/:gameId/lobbies/:lobbyId/join", requireAuth, lobbies.joinLobby);
router.delete("/games/:gameId/lobbies/:lobbyId/members/me", requireAuth, lobbies.leaveLobby);
router.delete("/games/:gameId/lobbies/:lobbyId", requireAuth, lobbies.closeLobby);
router.get("/lobbies/:lobbyId/messages", requireAuth, lobbyChat.getLobbyMessages);
router.post("/lobbies/:lobbyId/messages", requireAuth, lobbyChat.sendLobbyMessage);

router.get("/chats", requireAuth, chats.listChats);
router.get("/chats/:gameId/:userId/messages", requireAuth, chats.getMessages);
router.post("/chats/:gameId/:userId/messages", requireAuth, chats.sendMessage);
router.get("/notifications/unread-count", requireAuth, notifications.getUnreadCount);
router.get("/notifications", requireAuth, notifications.listNotifications);
router.post("/notifications/read", requireAuth, notifications.markAllNotificationsRead);
router.post("/notifications/:notificationId/read", requireAuth, notifications.markNotificationRead);

router.get("/admin/reports", requireAuth, requireAdmin, admin.listReports);
router.get("/admin/bans", requireAuth, requireAdmin, admin.listBans);
router.post("/admin/reports/:reportId/review", requireAuth, requireAdmin, admin.reviewReport);
router.post("/admin/users/:userId/bans", requireAuth, requireAdmin, admin.banUser);
router.delete("/admin/users/:userId/bans/:banId", requireAuth, requireAdmin, admin.liftBan);
router.post("/admin/admins", requireAuth, requireAdmin, admin.grantAdmin);
router.delete("/admin/admins/:nick", requireAuth, requireAdmin, admin.revokeAdmin);

export default router;