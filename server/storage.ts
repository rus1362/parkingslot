import { 
  users, reservations, penalties, settings,
  type User, type InsertUser, 
  type Reservation, type InsertReservation,
  type Penalty, type InsertPenalty,
  type Settings, type InsertSettings,
  PARKING_SLOTS, DEFAULT_SETTINGS
} from "@shared/schema";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.resolve(__dirname, "data.json");

function saveToFile(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function loadFromFile() {
  if (!fs.existsSync(DATA_FILE)) return null;
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  getAllUsers(): Promise<User[]>;

  // Reservation operations
  getReservation(id: number): Promise<Reservation | undefined>;
  getReservationsByUser(userId: number): Promise<Reservation[]>;
  getReservationsByDate(date: string): Promise<Reservation[]>;
  getReservationBySlotAndDate(slot: string, date: string): Promise<Reservation | undefined>;
  createReservation(reservation: InsertReservation): Promise<Reservation>;
  updateReservation(id: number, updates: Partial<Reservation>): Promise<Reservation | undefined>;
  deleteReservation(id: number): Promise<boolean>;
  getAllReservations(): Promise<Reservation[]>;

  // Penalty operations
  getPenaltiesByUser(userId: number): Promise<Penalty[]>;
  createPenalty(penalty: InsertPenalty): Promise<Penalty>;
  getAllPenalties(): Promise<Penalty[]>;

  // Settings operations
  getSetting(key: string): Promise<Settings | undefined>;
  setSetting(key: string, value: string): Promise<Settings>;
  getAllSettings(): Promise<Settings[]>;

  // Utility operations
  getParkingSlots(): string[];
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private reservations: Map<number, Reservation>;
  private penalties: Map<number, Penalty>;
  private settings: Map<string, Settings>;
  private currentUserId: number;
  private currentReservationId: number;
  private currentPenaltyId: number;

  constructor() {
    this.users = new Map();
    this.reservations = new Map();
    this.penalties = new Map();
    this.settings = new Map();
    this.currentUserId = 1;
    this.currentReservationId = 1;
    this.currentPenaltyId = 1;

    const loaded = loadFromFile();
    if (loaded) {
      loaded.users.forEach((user: any) => this.users.set(user.id, user));
      loaded.reservations.forEach((r: any) => this.reservations.set(r.id, r));
      loaded.penalties.forEach((p: any) => this.penalties.set(p.id, p));
      loaded.settings.forEach((s: any) => this.settings.set(s.key, s));
      this.currentUserId = loaded.users.reduce((max: number, u: any) => Math.max(max, u.id), 0) + 1;
      this.currentReservationId = loaded.reservations.reduce((max: number, r: any) => Math.max(max, r.id), 0) + 1;
      this.currentPenaltyId = loaded.penalties.reduce((max: number, p: any) => Math.max(max, p.id), 0) + 1;
      // If no users, add default admin and user
      if (!loaded.users || loaded.users.length === 0) {
        this.initializeDefaultData();
        this.saveAll();
      }
    } else {
      this.initializeDefaultData();
      this.saveAll();
    }
  }

  private initializeDefaultData() {
    // Create admin user
    const adminUser: User = {
      id: this.currentUserId++,
      username: "admin",
      password: "admin123",
      role: "admin",
      penaltyPoints: 0,
      createdAt: new Date(),
    };
    this.users.set(adminUser.id, adminUser);

    // Create a test user
    const testUser: User = {
      id: this.currentUserId++,
      username: "user1",
      password: "password",
      role: "user",
      penaltyPoints: 0,
      createdAt: new Date(),
    };
    this.users.set(testUser.id, testUser);

    // Initialize default settings
    this.settings.set("WEEKLY_PENALTY_MULTIPLIER", {
      id: 1,
      key: "WEEKLY_PENALTY_MULTIPLIER",
      value: DEFAULT_SETTINGS.WEEKLY_PENALTY_MULTIPLIER,
      updatedAt: new Date(),
    });

    this.settings.set("LATE_CANCELLATION_PENALTY", {
      id: 2,
      key: "LATE_CANCELLATION_PENALTY", 
      value: DEFAULT_SETTINGS.LATE_CANCELLATION_PENALTY,
      updatedAt: new Date(),
    });
  }

  private saveAll() {
    saveToFile({
      users: Array.from(this.users.values()),
      reservations: Array.from(this.reservations.values()),
      penalties: Array.from(this.penalties.values()),
      settings: Array.from(this.settings.values()),
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  // In createUser, set suspended to false by default if not provided
  async createUser(user: InsertUser): Promise<User> {
    const newUser: User = {
      id: this.currentUserId++,
      username: user.username,
      password: user.password,
      role: user.role || "user",
      penaltyPoints: user.penaltyPoints ?? 0,
      createdAt: new Date(),
      suspended: false,
    };
    this.users.set(newUser.id, newUser);
    this.saveAll();
    return newUser;
  }

  // Helper to get auto-suspend threshold
  async getAutoSuspendThreshold(): Promise<number> {
    const setting = await this.getSetting("AUTO_SUSPEND_PENALTY_THRESHOLD");
    return setting ? parseInt(setting.value, 10) : 90;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    let updatedUser = { ...user, ...updates };
    if (typeof updatedUser.penaltyPoints === "number") {
      const threshold = await this.getAutoSuspendThreshold();
      if (updatedUser.penaltyPoints >= threshold) {
        updatedUser.suspended = true;
      }
    }
    this.users.set(id, updatedUser);
    this.saveAll();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = this.users.delete(id);
    this.saveAll();
    return result;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  // Reservation operations
  async getReservation(id: number): Promise<Reservation | undefined> {
    return this.reservations.get(id);
  }

  async getReservationsByUser(userId: number): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(r => r.userId === userId);
  }

  async getReservationsByDate(date: string): Promise<Reservation[]> {
    return Array.from(this.reservations.values()).filter(r => r.date === date && r.status === "active");
  }

  async getReservationBySlotAndDate(slot: string, date: string): Promise<Reservation | undefined> {
    return Array.from(this.reservations.values()).find(r => 
      r.slot === slot && r.date === date && r.status === "active"
    );
  }

  async createReservation(insertReservation: InsertReservation): Promise<Reservation> {
    const reservation: Reservation = {
      ...insertReservation,
      id: this.currentReservationId++,
      status: insertReservation.status || "active",
      createdAt: new Date(),
    };
    this.reservations.set(reservation.id, reservation);
    this.saveAll();
    return reservation;
  }

  async updateReservation(id: number, updates: Partial<Reservation>): Promise<Reservation | undefined> {
    const reservation = this.reservations.get(id);
    if (!reservation) return undefined;
    
    const updatedReservation = { ...reservation, ...updates };
    this.reservations.set(id, updatedReservation);
    this.saveAll();
    return updatedReservation;
  }

  async deleteReservation(id: number): Promise<boolean> {
    const result = this.reservations.delete(id);
    this.saveAll();
    return result;
  }

  async getAllReservations(): Promise<Reservation[]> {
    return Array.from(this.reservations.values());
  }

  // Penalty operations
  async getPenaltiesByUser(userId: number): Promise<Penalty[]> {
    return Array.from(this.penalties.values()).filter(p => p.userId === userId);
  }

  async createPenalty(insertPenalty: InsertPenalty): Promise<Penalty> {
    const penalty: Penalty = {
      ...insertPenalty,
      id: this.currentPenaltyId++,
      reservationId: insertPenalty.reservationId || null,
      createdAt: new Date(),
    };
    this.penalties.set(penalty.id, penalty);
    this.saveAll();
    return penalty;
  }

  async getAllPenalties(): Promise<Penalty[]> {
    return Array.from(this.penalties.values());
  }

  // Settings operations
  async getSetting(key: string): Promise<Settings | undefined> {
    return this.settings.get(key);
  }

  async setSetting(key: string, value: string): Promise<Settings> {
    const existing = this.settings.get(key);
    const setting: Settings = {
      id: existing?.id || this.settings.size + 1,
      key,
      value,
      updatedAt: new Date(),
    };
    this.settings.set(key, setting);
    this.saveAll();
    return setting;
  }

  async getAllSettings(): Promise<Settings[]> {
    return Array.from(this.settings.values());
  }

  // Utility operations
  getParkingSlots(): string[] {
    return [...PARKING_SLOTS];
  }
}

export const storage = new MemStorage();
