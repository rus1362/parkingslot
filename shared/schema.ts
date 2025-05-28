import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // "admin" or "user"
  penaltyPoints: integer("penalty_points").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  slot: text("slot").notNull(), // "24", "25", "37", "38", "39", "40", "41", "42"
  date: text("date").notNull(), // YYYY-MM-DD format
  status: text("status").notNull().default("active"), // "active", "cancelled", "completed"
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const penalties = pgTable("penalties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  reservationId: integer("reservation_id").references(() => reservations.id),
  type: text("type").notNull(), // "future_week", "late_cancellation"
  points: integer("points").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertReservationSchema = createInsertSchema(reservations).omit({
  id: true,
  createdAt: true,
});

export const insertPenaltySchema = createInsertSchema(penalties).omit({
  id: true,
  createdAt: true,
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = z.infer<typeof insertReservationSchema>;
export type Penalty = typeof penalties.$inferSelect;
export type InsertPenalty = z.infer<typeof insertPenaltySchema>;
export type Settings = typeof settings.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// Available parking slots
export const PARKING_SLOTS = ["24", "25", "37", "38", "39", "40", "41", "42"];

// Penalty types
export const PENALTY_TYPES = {
  FUTURE_WEEK: "future_week",
  LATE_CANCELLATION: "late_cancellation",
} as const;

// Default settings
export const DEFAULT_SETTINGS = {
  WEEKLY_PENALTY_MULTIPLIER: "1",
  LATE_CANCELLATION_PENALTY: "1",
} as const;
