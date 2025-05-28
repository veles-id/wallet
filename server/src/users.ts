import { Database } from "sqlite";
import crypto from "crypto";

// Minimal AuthenticatorDevice type for demo purposes
export interface AuthenticatorDevice {
  credentialID: Buffer | string;
  credentialPublicKey: Buffer;
  counter: number;
  transports?: string[];
}

export interface User {
  id: string;
  username: string;
  currentChallenge: string | null;
  devices: AuthenticatorDevice[];
}

interface UserRow {
  id: string;
  username: string;
  current_challenge?: string;
}

interface DeviceRow {
  credential_id: Buffer;
  credential_public_key: Buffer;
  counter: number;
}

export class UserStore {
  constructor(private db: Database) {}

  async getUserByUsername(username: string): Promise<User | null> {
    const user = await this.db.get("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (!user) return null;

    const devices = await this.db.all(
      "SELECT * FROM devices WHERE user_id = ?",
      [user.id]
    );

    return {
      id: user.id,
      username: user.username,
      currentChallenge: user.current_challenge || null,
      devices: devices.map((d) => ({
        credentialID: d.credential_id,
        credentialPublicKey: Buffer.from(d.credential_public_key, "base64"),
        counter: d.counter,
      })),
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const user = await this.db.get("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) return null;

    const devices = await this.db.all(
      "SELECT * FROM devices WHERE user_id = ?",
      [user.id]
    );

    return {
      id: user.id,
      username: user.username,
      currentChallenge: user.current_challenge || null,
      devices: devices.map((d) => ({
        credentialID: d.credential_id,
        credentialPublicKey: Buffer.from(d.credential_public_key, "base64"),
        counter: d.counter,
      })),
    };
  }

  async getAllUsers(): Promise<User[]> {
    const users = await this.db.all("SELECT * FROM users");
    const usersWithDevices = await Promise.all(
      users.map(async (user) => {
        const devices = await this.db.all(
          "SELECT * FROM devices WHERE user_id = ?",
          [user.id]
        );
        return {
          id: user.id,
          username: user.username,
          currentChallenge: user.current_challenge || null,
          devices: devices.map((d) => ({
            credentialID: d.credential_id,
            credentialPublicKey: Buffer.from(d.credential_public_key, "base64"),
            counter: d.counter,
          })),
        };
      })
    );
    return usersWithDevices;
  }

  async createUser(username: string, userId?: string): Promise<User> {
    const id = userId || crypto.randomUUID();
    const user: User = {
      id,
      username,
      currentChallenge: null,
      devices: [],
    };

    console.log("Creating new user:", user);

    await this.db.run(
      "INSERT INTO users (id, username, current_challenge) VALUES (?, ?, ?)",
      [user.id, user.username, user.currentChallenge]
    );

    return user;
  }

  async updateUser(user: User): Promise<void> {
    console.log("Updating user:", {
      id: user.id,
      username: user.username,
      challenge: user.currentChallenge,
    });

    // First, get the current user state
    const currentUser = await this.getUserById(user.id);
    console.log("Current user state before update:", currentUser);

    // Update the user's challenge
    const updateResult = await this.db.run(
      "UPDATE users SET username = ?, current_challenge = ? WHERE id = ?",
      [user.username, user.currentChallenge, user.id]
    );
    console.log("Update result:", updateResult);

    // Delete existing devices for this user
    await this.db.run("DELETE FROM devices WHERE user_id = ?", [user.id]);

    // Insert new devices
    for (const device of user.devices) {
      await this.db.run(
        "INSERT INTO devices (user_id, credential_id, credential_public_key, counter) VALUES (?, ?, ?, ?)",
        [
          user.id,
          device.credentialID,
          device.credentialPublicKey.toString("base64"),
          device.counter,
        ]
      );
    }

    // Verify the update
    const updatedUser = await this.getUserById(user.id);
    console.log("User state after update:", updatedUser);
  }
}
