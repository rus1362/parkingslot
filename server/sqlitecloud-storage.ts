import { Database } from "@sqlitecloud/drivers";
import type { IStorage } from "./storage";
import type {
  User,
  InsertUser,
  Reservation,
  InsertReservation,
  Penalty,
  InsertPenalty,
  Settings,
  InsertSettings,
} from "../shared/schema";

const SQLITE_CLOUD_URL =
  process.env.SQLITECLOUD_URL ||
  "sqlitecloud://ci8nn3abnk.g6.sqlite.cloud:8860/chinook.sqlite?apikey=T0D9wTpiUufSuTKTUKfibkps1UFHUmQxTanPFr8a2Rs";

export class SQLiteCloudStorage implements IStorage {
  private db: any;

  constructor() {
    this.db = new Database(SQLITE_CLOUD_URL);
    this.initSchema();
  }

  async initSchema() {
    // Create tables if not exist
    await this.db.sql`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        penaltyPoints INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        suspended BOOLEAN NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS reservations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        slot TEXT NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        penaltyId INTEGER,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(penaltyId) REFERENCES penalties(id)
      );
      CREATE TABLE IF NOT EXISTS penalties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        reservationId INTEGER,
        type TEXT NOT NULL,
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(reservationId) REFERENCES reservations(id)
      );
      CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `;
  }

  // USERS
  async getUser(id: number): Promise<User | undefined> {
    const rows = await this.db.sql`SELECT * FROM users WHERE id = ${id}`;
    return rows[0] as User;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await this.db
      .sql`SELECT * FROM users WHERE username = ${username}`;
    return rows[0] as User;
  }

  async getUsers(): Promise<User[]> {
    const rows = await this.db.sql`SELECT * FROM users`;
    return rows as User[];
  }

  async createUser(user: InsertUser): Promise<User> {
    const now = new Date().toISOString();
    const result = await this.db.sql`
      INSERT INTO users (username, password, role, penaltyPoints, createdAt, suspended)
      VALUES (${user.username}, ${user.password}, ${user.role || "user"}, ${
      user.penaltyPoints || 0
    }, ${now}, ${user.suspended ? 1 : 0})
      RETURNING *
    `;
    return result[0] as User;
  }

  async updateUser(
    id: number,
    user: Partial<InsertUser>
  ): Promise<User | undefined> {
    const fields = Object.entries(user)
      .map(([k, v]) => `${k} = ?`)
      .join(", ");
    const values = Object.values(user);
    if (!fields) return this.getUser(id);
    await this.db.sql(`UPDATE users SET ${fields} WHERE id = ?`, ...values, id);
    return this.getUser(id);
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await this.db.sql`DELETE FROM users WHERE id = ${id}`;
    return this.db.changes > 0;
  }

  async getAllUsers(): Promise<User[]> {
    return this.getUsers();
  }

  // RESERVATIONS
  async getReservation(id: number): Promise<Reservation | undefined> {
    const rows = await this.db.sql`SELECT * FROM reservations WHERE id = ${id}`;
    return rows[0] as Reservation;
  }

  async getReservations(): Promise<Reservation[]> {
    const rows = await this.db.sql`SELECT * FROM reservations`;
    return rows as Reservation[];
  }

  async getReservationsByUser(userId: number): Promise<Reservation[]> {
    const rows = await this.db
      .sql`SELECT * FROM reservations WHERE userId = ${userId}`;
    return rows as Reservation[];
  }

  async getReservationsByDate(date: string): Promise<Reservation[]> {
    const rows = await this.db
      .sql`SELECT * FROM reservations WHERE date = ${date} AND status = 'active'`;
    return rows as Reservation[];
  }

  async getReservationBySlotAndDate(
    slot: string,
    date: string
  ): Promise<Reservation | undefined> {
    const rows = await this.db
      .sql`SELECT * FROM reservations WHERE slot = ${slot} AND date = ${date} AND status = 'active'`;
    return rows[0] as Reservation;
  }

  async createReservation(res: InsertReservation): Promise<Reservation> {
    const now = new Date().toISOString();
    const result = await this.db.sql`
      INSERT INTO reservations (userId, slot, date, status, createdAt)
      VALUES (${res.userId}, ${res.slot}, ${res.date}, ${
      res.status || "active"
    }, ${now})
      RETURNING *
    `;
    return result[0] as Reservation;
  }

  async updateReservation(
    id: number,
    res: Partial<InsertReservation>
  ): Promise<Reservation | undefined> {
    const fields = Object.entries(res)
      .map(([k, v]) => `${k} = ?`)
      .join(", ");
    const values = Object.values(res);
    if (!fields) return this.getReservation(id);

    const existingReservation = await this.getReservation(id);
    console.log("res.status", res.status);
    if (existingReservation && res.status === "canceled") {
      const reservationDate = new Date(existingReservation.date);
      const now = new Date();
      const weeksDifference = Math.ceil(
        (reservationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7)
      );

      console.log(
        `Reservation Date: ${reservationDate}, Current Date: ${now}, Weeks Difference: ${weeksDifference}`
      );

      if (weeksDifference >= 1) {
        console.log(`Reservation canceled at least one week in advance.`);
        const user = await this.getUser(existingReservation.userId);
        if (user) {
          console.log(`User found: ${JSON.stringify(user)}`);

          // Fetch the penalty entry associated with the reservation
          const penalty = await this.db.sql`SELECT * FROM penalties WHERE reservationId = ${id}`;
          if (penalty.length === 0) {
            console.log(`No penalty entry found for reservation ID ${id}`);
            return;
          }

          const penaltyPoints = penalty[0]?.points || 0;
          console.log(`Penalty points for reservation: ${penaltyPoints}`);

          const updatedPenaltyPoints = Math.max(0, user.penaltyPoints - penaltyPoints); // Deduct penalty points
          console.log(`Updated Penalty Points: ${updatedPenaltyPoints}`);
          const userUpdateResult = await this.updateUser(user.id, {
            penaltyPoints: updatedPenaltyPoints,
          });
          console.log(
            `User update result: ${JSON.stringify(userUpdateResult)}`
          );

          // Remove penalty from penalties table
          const penaltyDeleteResult = await this.db
            .sql`DELETE FROM penalties WHERE id = ${penalty[0]?.id}`;
          console.log(
            `Penalty delete result: ${JSON.stringify(penaltyDeleteResult)}`
          );

          // Set reservation status to canceled
          const reservationUpdateResult = await this.db
            .sql`UPDATE reservations SET status = 'canceled' WHERE id = ${id}`;
          console.log(
            `Reservation update result: ${JSON.stringify(reservationUpdateResult)}`
          );
        } else {
          console.log(`User with ID ${existingReservation.userId} not found.`);
        }
      } else {
        console.log(
          `Reservation canceled less than one week in advance. No penalty deduction.`
        );
      }
    }

    const reservationUpdateResult = await this.db.sql(
      `UPDATE reservations SET ${fields} WHERE id = ?`,
      ...values,
      id
    );
    console.log(
      `Reservation update result: ${JSON.stringify(reservationUpdateResult)}`
    );
    return this.getReservation(id);
  }

  async deleteReservation(id: number): Promise<boolean> {
    console.log(`Attempting to delete reservation with ID ${id}`);
    const reservation = await this.getReservation(id);
    if (!reservation) {
      console.log(`Reservation with ID ${id} not found.`);
      return false;
    }

    const reservationDate = new Date(reservation.date);
    const now = new Date();
    const weeksDifference = Math.ceil(
      (reservationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 7)
    );

    console.log(
      `Reservation Date: ${reservationDate}, Current Date: ${now}, Weeks Difference: ${weeksDifference}`
    );

    if (weeksDifference >= 1) {
      console.log(`Reservation canceled at least one week in advance.`);
      const user = await this.getUser(reservation.userId);
      if (user) {
        console.log(`User found: ${JSON.stringify(user)}`);
        const updatedPenaltyPoints = Math.max(0, user.penaltyPoints - 1); // Deduct 1 point, ensure non-negative
        console.log(`Updated Penalty Points: ${updatedPenaltyPoints}`);
        await this.updateUser(user.id, { penaltyPoints: updatedPenaltyPoints });
        console.log(
          `Penalty points updated successfully for user ID ${user.id}.`
        );
      } else {
        console.log(`User with ID ${reservation.userId} not found.`);
      }
    } else {
      console.log(
        `Reservation canceled less than one week in advance. No penalty deduction.`
      );
    }

    const result = await this.db.sql`DELETE FROM reservations WHERE id = ${id}`;
    console.log(`Reservation with ID ${id} deleted: ${this.db.changes > 0}`);
    return this.db.changes > 0;
  }

  async getAllReservations(): Promise<Reservation[]> {
    return this.getReservations();
  }

  // PENALTIES
  async getPenalty(id: number): Promise<Penalty | undefined> {
    const rows = await this.db.sql`SELECT * FROM penalties WHERE id = ${id}`;
    return rows[0] as Penalty;
  }

  async getPenalties(): Promise<Penalty[]> {
    const rows = await this.db.sql`SELECT * FROM penalties`;
    return rows as Penalty[];
  }

  async getPenaltiesByUser(userId: number): Promise<Penalty[]> {
    const rows = await this.db
      .sql`SELECT * FROM penalties WHERE userId = ${userId}`;
    return rows as Penalty[];
  }

  async createPenalty(pen: InsertPenalty): Promise<Penalty> {
    const now = new Date().toISOString();
    const result = await this.db.sql`
      INSERT INTO penalties (userId, reservationId, type, points, reason, createdAt)
      VALUES (${pen.userId}, ${pen.reservationId || null}, ${pen.type}, ${
      pen.points
    }, ${pen.reason}, ${now})
      RETURNING *
    `;
    return result[0] as Penalty;
  }

  async updatePenalty(
    id: number,
    pen: Partial<InsertPenalty>
  ): Promise<Penalty | undefined> {
    const fields = Object.entries(pen)
      .map(([k, v]) => `${k} = ?`)
      .join(", ");
    const values = Object.values(pen);
    if (!fields) return this.getPenalty(id);
    await this.db.sql(
      `UPDATE penalties SET ${fields} WHERE id = ?`,
      ...values,
      id
    );
    return this.getPenalty(id);
  }

  async deletePenalty(id: number): Promise<boolean> {
    const result = await this.db.sql`DELETE FROM penalties WHERE id = ${id}`;
    return this.db.changes > 0;
  }

  async getAllPenalties(): Promise<Penalty[]> {
    return this.getPenalties();
  }

  // SETTINGS (single row per key)
  async getSetting(key: string): Promise<Settings | undefined> {
    const rows = await this.db.sql`SELECT * FROM settings WHERE key = ${key}`;
    if (!rows[0]) return undefined;
    const row = rows[0];
    return {
      id: row.id,
      key: row.key,
      value: JSON.parse(row.value),
      updatedAt: new Date(row.updatedAt),
    };
  }

  async setSetting(key: string, value: string): Promise<Settings> {
    const now = new Date().toISOString();
    await this.db.sql`
      INSERT INTO settings (key, value, updatedAt)
      VALUES (${key}, ${JSON.stringify(value)}, ${now})
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
    `;
    return (await this.getSetting(key))!;
  }

  async getAllSettings(): Promise<Settings[]> {
    const rows = await this.db.sql`SELECT * FROM settings`;
    return rows.map((row: any) => ({
      id: row.id,
      key: row.key,
      value: JSON.parse(row.value),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  // Utility operations
  getParkingSlots(): string[] {
    return ["24", "25", "37", "38", "39", "40", "41", "42"];
  }
}

export const sqliteCloudStorage = new SQLiteCloudStorage();
