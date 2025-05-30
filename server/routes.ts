import type { Express } from "express";
import { createServer, type Server } from "http";
import { getActiveStorage, memStorage } from "./storage";
import {
  insertUserSchema,
  insertReservationSchema,
  PENALTY_TYPES,
} from "@shared/schema";
import { z } from "zod";

// Helper function to calculate week difference
function getWeeksDifference(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil(diffDays / 7);
}

// Helper function to check if cancellation is late (< 12 hours)
function isLateCancellation(reservationDate: string): boolean {
  const resDate = new Date(reservationDate);
  const now = new Date();
  const hoursUntilReservation =
    (resDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  return hoursUntilReservation < 12;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication
  app.post("/api/auth/login", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res
          .status(400)
          .json({ error: "Username and password required" });
      }

      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // In login response, include suspended field
      res.json({
        user: {
          id: user.id,
          username: user.username,
          role: user.role,
          penaltyPoints: user.penaltyPoints,
          suspended: user.suspended, // <-- add this
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Users
  app.get("/api/users", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const users = await storage.getAllUsers();
      const usersWithoutPasswords = users.map(({ password, ...user }) => user);
      res.json(usersWithoutPasswords);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid user data", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteUser(id);

      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Change user password (admin only)
  app.put("/api/users/:id/password", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const id = parseInt(req.params.id);
      const { password } = req.body;
      if (!password) {
        return res.status(400).json({ error: "Password is required" });
      }
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      await storage.updateUser(id, { password });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Change own password (self-service)
  app.put("/api/users/self/password", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const { userId, password } = req.body;
      if (!userId || !password) {
        return res
          .status(400)
          .json({ error: "User ID and password are required" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      await storage.updateUser(userId, { password });
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Suspend or unsuspend a user (admin only)
  app.put("/api/users/:id/suspend", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const id = parseInt(req.params.id);
      const { suspended } = req.body;
      if (typeof suspended !== "boolean") {
        return res
          .status(400)
          .json({ error: "Missing or invalid 'suspended' value" });
      }
      const user = await storage.updateUser(id, { suspended });
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, user });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Reservations
  app.get("/api/reservations", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const { userId, date } = req.query;

      let reservations;
      if (userId) {
        reservations = await storage.getReservationsByUser(
          parseInt(userId as string)
        );
      } else if (date) {
        reservations = await storage.getReservationsByDate(date as string);
      } else {
        reservations = await storage.getAllReservations();
      }

      // Join with user data
      const reservationsWithUsers = await Promise.all(
        reservations.map(async (reservation) => {
          const user = await storage.getUser(reservation.userId);
          return {
            ...reservation,
            user: user ? { id: user.id, username: user.username } : null,
          };
        })
      );

      res.json(reservationsWithUsers);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/reservations", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const reservationData = insertReservationSchema.parse(req.body);
      const user = await storage.getUser(reservationData.userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.suspended) {
        return res
          .status(403)
          .json({ error: "User is suspended and cannot make reservations" });
      }

      // Check if slot is already reserved for that date
      const existingReservation = await storage.getReservationBySlotAndDate(
        reservationData.slot,
        reservationData.date
      );

      if (existingReservation) {
        return res
          .status(400)
          .json({ error: "Slot already reserved for this date" });
      }

      const reservation = await storage.createReservation(reservationData);

      // Calculate and apply penalties
      const reservationDate = new Date(reservationData.date);
      const currentDate = new Date();
      const currentWeekStart = new Date(currentDate);
      currentWeekStart.setDate(currentDate.getDate() - currentDate.getDay());

      const reservationWeekStart = new Date(reservationDate);
      reservationWeekStart.setDate(
        reservationDate.getDate() - reservationDate.getDay()
      );

      if (reservationWeekStart > currentWeekStart) {
        const weeksDiff = getWeeksDifference(
          currentWeekStart,
          reservationWeekStart
        );
        const weeklyMultiplier = parseFloat(
          (await storage.getSetting("WEEKLY_PENALTY_MULTIPLIER"))?.value || "1"
        );
        const penaltyPoints = weeksDiff * weeklyMultiplier;

        // Create penalty record
        await storage.createPenalty({
          userId: reservationData.userId,
          reservationId: reservation.id,
          type: PENALTY_TYPES.FUTURE_WEEK,
          points: penaltyPoints,
          reason: `Reserved ${weeksDiff} week(s) in advance`,
        });

        // Update user penalty points
        const user = await storage.getUser(reservationData.userId);
        if (user) {
          await storage.updateUser(user.id, {
            penaltyPoints: user.penaltyPoints + penaltyPoints,
          });
        }
      }

      res.status(201).json(reservation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid reservation data", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/reservations/:id/cancel", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const id = parseInt(req.params.id);
      const updatedReservation = await storage.updateReservation(id, { status: "canceled" });

      if (!updatedReservation) {
        return res.status(404).json({ error: "Reservation not found" });
      }

      res.json({ success: true, reservation: updatedReservation });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Parking slots
  app.get("/api/parking-slots", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const { date } = req.query;
      const slots = storage.getParkingSlots();

      if (date) {
        const reservations = await storage.getReservationsByDate(
          date as string
        );
        const reservedSlots = reservations.map((r) => r.slot);

        const slotsWithAvailability = slots.map((slot) => ({
          slot,
          available: !reservedSlots.includes(slot),
          reservedBy: reservations.find((r) => r.slot === slot)?.userId || null,
        }));

        res.json(slotsWithAvailability);
      } else {
        res.json(
          slots.map((slot) => ({ slot, available: true, reservedBy: null }))
        );
      }
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Analytics
  app.get("/api/analytics", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const penalties = await storage.getAllPenalties();
      const reservations = await storage.getAllReservations();
      const users = await storage.getAllUsers();

      const totalPenalties = penalties.reduce((sum, p) => sum + p.points, 0);
      const activeReservations = reservations.filter(
        (r) => r.status === "active"
      ).length;
      const totalSlots = storage.getParkingSlots().length;

      // Calculate utilization for current week
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekReservations = reservations.filter((r) => {
        const resDate = new Date(r.date);
        return (
          resDate >= weekStart && resDate <= weekEnd && r.status === "active"
        );
      });

      const utilization = (weekReservations.length / (totalSlots * 7)) * 100;

      // Top penalty users
      const userPenalties = users
        .map((user) => ({
          id: user.id,
          username: user.username,
          penaltyPoints: user.penaltyPoints,
        }))
        .sort((a, b) => b.penaltyPoints - a.penaltyPoints);

      res.json({
        totalPenalties,
        activeReservations,
        utilization: Math.round(utilization * 10) / 10,
        topPenaltyUsers: userPenalties.slice(0, 5),
        penaltyBreakdown: {
          futureWeek: penalties
            .filter((p) => p.type === PENALTY_TYPES.FUTURE_WEEK)
            .reduce((sum, p) => sum + p.points, 0),
          lateCancellation: penalties
            .filter((p) => p.type === PENALTY_TYPES.LATE_CANCELLATION)
            .reduce((sum, p) => sum + p.points, 0),
        },
      });
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Penalties
  app.get("/api/penalties", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const { userId } = req.query;

      let penalties;
      if (userId) {
        penalties = await storage.getPenaltiesByUser(
          parseInt(userId as string)
        );
      } else {
        penalties = await storage.getAllPenalties();
      }

      // Join with user data
      const penaltiesWithUsers = await Promise.all(
        penalties.map(async (penalty) => {
          const user = await storage.getUser(penalty.userId);
          return {
            ...penalty,
            user: user ? { id: user.id, username: user.username } : null,
          };
        })
      );

      res.json(penaltiesWithUsers);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Settings
  app.get("/api/settings", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const settings = await storage.getAllSettings();
      const settingsObj = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      res.json(settingsObj);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/settings", async (req, res) => {
    const storage = await getActiveStorage();
    try {
      const {
        weeklyPenaltyMultiplier,
        lateCancellationPenalty,
        autoSuspendPenaltyThreshold,
      } = req.body;
      if (weeklyPenaltyMultiplier !== undefined) {
        await storage.setSetting(
          "WEEKLY_PENALTY_MULTIPLIER",
          weeklyPenaltyMultiplier.toString()
        );
      }
      if (lateCancellationPenalty !== undefined) {
        await storage.setSetting(
          "LATE_CANCELLATION_PENALTY",
          lateCancellationPenalty.toString()
        );
      }
      if (autoSuspendPenaltyThreshold !== undefined) {
        await storage.setSetting(
          "AUTO_SUSPEND_PENALTY_THRESHOLD",
          autoSuspendPenaltyThreshold.toString()
        );
      }
      const settings = await storage.getAllSettings();
      const settingsObj = settings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
      }, {} as Record<string, string>);

      res.json(settingsObj);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Storage backend selection
  app.get("/api/storage-backend", async (req, res) => {
    const backendSetting = await memStorage.getSetting("STORAGE_BACKEND");
    res.json({ backend: backendSetting?.value || "json" });
  });

  app.put("/api/storage-backend", async (req, res) => {
    const { backend } = req.body;
    if (!backend || !["json", "sqlitecloud"].includes(backend)) {
      return res.status(400).json({ error: "Invalid backend type" });
    }
    await memStorage.setSetting("STORAGE_BACKEND", backend);
    res.json({ backend });
  });

  const httpServer = createServer(app);
  return httpServer;
}
