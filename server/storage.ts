import { 
  users, reservations, penalties, settings,
  type User, type InsertUser, 
  type Reservation, type InsertReservation,
  type Penalty, type InsertPenalty,
  type Settings, type InsertSettings,
  PARKING_SLOTS, DEFAULT_SETTINGS
} from "@shared/schema";

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

    // Initialize with default admin user
    this.initializeDefaultData();
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

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: this.currentUserId++,
      role: insertUser.role || "user",
      penaltyPoints: insertUser.penaltyPoints || 0,
      createdAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
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
    return reservation;
  }

  async updateReservation(id: number, updates: Partial<Reservation>): Promise<Reservation | undefined> {
    const reservation = this.reservations.get(id);
    if (!reservation) return undefined;
    
    const updatedReservation = { ...reservation, ...updates };
    this.reservations.set(id, updatedReservation);
    return updatedReservation;
  }

  async deleteReservation(id: number): Promise<boolean> {
    return this.reservations.delete(id);
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
