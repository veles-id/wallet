import express from "express";
import cors from "cors";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { initializeDatabase } from "./db";
import { UserStore } from "./users";
import { Database } from "sqlite";
import crypto from "crypto";

const app = express();
const port = 4300;

// Middleware
app.use(express.json());

// CORS configuration
app.use(
  cors({
    origin: "http://localhost:4210",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Accept"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// WebAuthn configuration
const rpName = "Veles App";
const rpID = "localhost";
const origin = `http://${rpID}:4210`;

let userStore: UserStore;
let currentAuthChallenge: string | null = null;

// Initialize database and start server
async function initialize() {
  const db = await initializeDatabase();
  userStore = new UserStore(db as unknown as Database);

  // Generate authentication options
  app.get("/api/auth/options", async (req, res) => {
    try {
      // Generate authentication options without specifying allowCredentials
      // This allows any registered credential to be used
      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: "preferred",
      });

      // Store the challenge temporarily - we'll associate it with the user during verification
      // For now, we'll store it in a simple way (in production, use a proper session store)
      currentAuthChallenge = options.challenge;

      res.json({ optionsJSON: options });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Failed to generate authentication options" });
    }
  });

  // Generate registration options
  app.post("/api/register/options", async (req, res) => {
    try {
      // Generate a unique user ID for the new user
      const userId = crypto.randomUUID();
      const username = `user_${userId}`;

      console.log("Generating registration options for new user:", {
        userId,
        username,
      });

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userID: Buffer.from(userId),
        userName: username,
        attestationType: "none",
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "preferred",
          requireResidentKey: false,
        },
      });

      console.log("Generated registration options:", {
        challenge: options.challenge,
        rpID: options.rp.id,
        userID: options.user.id,
      });

      // Create a new user with the challenge and store the user ID
      const user = await userStore.createUser(username, userId);
      user.currentChallenge = options.challenge;
      await userStore.updateUser(user);

      // Store the user ID in the response for verification
      res.json({
        optionsJSON: options,
        userId: userId,
      });
    } catch (error) {
      console.error("Error generating registration options:", error);
      res
        .status(500)
        .json({ error: "Failed to generate registration options" });
    }
  });

  // Verify registration response
  app.post("/api/register/verify", async (req, res) => {
    try {
      const { credential, userId } = req.body;
      console.log("Received registration verification request:", {
        userId,
        credentialId: credential.id,
      });

      if (!userId) {
        console.log("No userId provided in request");
        return res.status(400).json({ error: "No user ID provided" });
      }

      // Decode the clientDataJSON to get the challenge
      const clientDataJSON = JSON.parse(
        Buffer.from(credential.response.clientDataJSON, "base64").toString()
      );
      console.log("Decoded clientDataJSON:", clientDataJSON);

      // Find the user by ID
      const user = await userStore.getUserById(userId);
      if (!user) {
        console.log("User not found for ID:", userId);
        return res.status(400).json({ error: "User not found" });
      }

      const expectedChallenge = user.currentChallenge;

      if (!expectedChallenge) {
        console.log("No challenge found for user:", user.id);
        return res.status(400).json({ error: "No challenge found" });
      }

      console.log("Verifying registration with:", {
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      console.log("Verification result:", verification);

      if (verification.verified && verification.registrationInfo) {
        // Add the new authenticator to the user's devices
        const { id, publicKey, counter } =
          verification.registrationInfo.credential;
        const newDevice = {
          credentialID: id,
          credentialPublicKey: Buffer.from(publicKey),
          counter,
        };

        console.log("Adding new device to user:", {
          userId: user.id,
          credentialId: id,
          counter,
        });

        user.devices.push(newDevice);
        await userStore.updateUser(user);

        console.log(
          "User after device addition:",
          await userStore.getUserById(user.id)
        );

        res.json({
          verified: true,
          user: {
            id: user.id,
            name: user.username,
          },
        });
      } else {
        console.log("Registration verification failed:", verification);
        res.status(400).json({ error: "Registration failed" });
      }
    } catch (error) {
      console.error("Detailed registration error:", error);
      res.status(500).json({ error: "Failed to verify registration" });
    }
  });

  // Verify authentication response
  app.post("/api/auth/verify", async (req, res) => {
    try {
      const { credential } = req.body;
      console.log(
        "Received authentication verification request:",
        JSON.stringify(credential, null, 2)
      );

      // Decode the clientDataJSON to get the challenge
      const clientDataJSON = JSON.parse(
        Buffer.from(credential.response.clientDataJSON, "base64").toString()
      );
      console.log("Decoded clientDataJSON:", clientDataJSON);

      // Get the user ID from the userHandle
      const userHandle = credential.response.userHandle;
      if (!userHandle) {
        console.log("No userHandle provided in authentication response");
        return res.status(400).json({ error: "No user handle provided" });
      }

      // Decode the userHandle from base64
      const userId = Buffer.from(userHandle, "base64").toString();
      console.log("Decoded userHandle:", userId);

      // Find the user by ID
      const user = await userStore.getUserById(userId);
      console.log("Found user for authentication:", user);

      if (!user) {
        console.log("User not found for authentication");
        return res.status(400).json({ error: "User not found" });
      }

      const expectedChallenge = currentAuthChallenge;
      console.log("Expected challenge:", expectedChallenge);

      if (!expectedChallenge) {
        console.log("No challenge found");
        return res.status(400).json({ error: "No challenge found" });
      }

      // Find the authenticator device by credentialID
      console.log(
        "Available devices:",
        user.devices.map((d) => ({
          id: d.credentialID,
          rawId: credential.rawId,
        }))
      );

      const authenticator = user.devices.find(
        (dev) => dev.credentialID === credential.rawId
      );

      if (!authenticator) {
        console.log(
          "Authenticator not found for credential ID:",
          credential.rawId
        );
        console.log(
          "Available credential IDs:",
          user.devices.map((d) => d.credentialID)
        );
        return res.status(400).json({ error: "Authenticator not registered" });
      }

      console.log("Verifying authentication with:", {
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: authenticator.credentialID,
          credentialPublicKey: authenticator.credentialPublicKey
            ? "present"
            : "missing",
          counter: authenticator.counter,
        },
      });

      // Create authenticator object with Buffer credentialID for verification
      const base64urlToBuffer = (base64url: string): Buffer => {
        // Convert base64url to base64
        const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
        // Add padding if needed
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        return Buffer.from(padded, "base64");
      };

      const authenticatorForVerification = {
        credentialID:
          typeof authenticator.credentialID === "string"
            ? base64urlToBuffer(authenticator.credentialID)
            : authenticator.credentialID,
        credentialPublicKey: authenticator.credentialPublicKey,
        counter: authenticator.counter,
        transports: [], // Add empty transports array
      };

      console.log("authenticatorForVerification:", {
        credentialID: authenticatorForVerification.credentialID,
        credentialIDLength: authenticatorForVerification.credentialID.length,
        credentialPublicKey: authenticatorForVerification.credentialPublicKey
          ? "Buffer present"
          : "missing",
        credentialPublicKeyLength:
          authenticatorForVerification.credentialPublicKey?.length,
        counter: authenticatorForVerification.counter,
        counterType: typeof authenticatorForVerification.counter,
        transports: authenticatorForVerification.transports,
        hasAllProperties: !!(
          authenticatorForVerification.credentialID &&
          authenticatorForVerification.credentialPublicKey &&
          typeof authenticatorForVerification.counter === "number"
        ),
      });

      try {
        const verification = await verifyAuthenticationResponse({
          response: credential,
          expectedChallenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          credential: {
            id:
              typeof authenticator.credentialID === "string"
                ? authenticator.credentialID
                : authenticator.credentialID.toString("base64url"), // Convert Buffer to base64url string
            publicKey: authenticatorForVerification.credentialPublicKey,
            counter: authenticatorForVerification.counter,
            transports: authenticatorForVerification.transports,
          },
          requireUserVerification: false,
        });

        console.log("Authentication verification result:", verification);

        if (verification.verified) {
          // Update the authenticator's counter
          authenticator.counter = verification.authenticationInfo.newCounter;
          await userStore.updateUser(user);

          res.json({
            verified: true,
            user: {
              id: user.id,
              name: user.username,
            },
          });
        } else {
          console.log("Authentication verification failed:", verification);
          res.status(400).json({ error: "Authentication failed" });
        }
      } catch (verificationError: any) {
        console.error("Verification error details:", {
          error: verificationError,
          message: verificationError?.message,
          stack: verificationError?.stack,
          credentialStructure: Object.keys({
            id: authenticator.credentialID,
            publicKey: authenticatorForVerification.credentialPublicKey,
            counter: authenticatorForVerification.counter,
            transports: authenticatorForVerification.transports,
          }),
        });
        res.status(500).json({ error: "Authentication verification failed" });
      }
    } catch (error) {
      console.error("Detailed authentication error:", error);
      res.status(500).json({ error: "Failed to verify authentication" });
    }
  });

  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

initialize().catch(console.error);
