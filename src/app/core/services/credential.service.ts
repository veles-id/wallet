import { Injectable, inject } from "@angular/core";
import {
  VerifiableCredential,
  StoredCredential,
  CreateCredentialRequest,
  CredentialTemplate,
  CredentialCategory,
  CredentialSource,
  CredentialPrivacy,
  FieldType,
} from "./credential.types";
import { DidService } from "./did.service";
import {
  CredentialVerificationService,
  VerificationResult,
} from "./credential-verification.service";

@Injectable({
  providedIn: "root",
})
export class CredentialService {
  private _didService = inject(DidService);
  private _verificationService = inject(CredentialVerificationService);
  private readonly STORAGE_KEY = "veles_credentials";
  private readonly TEMPLATES_KEY = "veles_credential_templates";

  constructor() {
    this._initializeDefaultTemplates();
  }

  async createCredential(
    request: CreateCredentialRequest
  ): Promise<StoredCredential> {
    try {
      const credentialId = this._generateCredentialId();
      const issuanceDate = new Date().toISOString();

      const credential: VerifiableCredential = {
        "@context": [
          "https://www.w3.org/2018/credentials/v1",
          "https://www.w3.org/ns/credentials/examples/v1",
        ],
        id: credentialId,
        type: ["VerifiableCredential"],
        issuer: request.issuerDID,
        issuanceDate,
        ...(request.expirationDate && {
          expirationDate: request.expirationDate,
        }),
        credentialSubject: {
          id: request.subjectDID,
          ...request.credentialData,
        },
      };

      // Add template-specific context and types if using a template
      if (request.templateId) {
        const template = this.getTemplate(request.templateId);
        if (template) {
          credential["@context"] = [
            ...credential["@context"],
            ...template.context,
          ];
          credential.type = [...credential.type, ...template.type];
        }
      }

      const storedCredential: StoredCredential = {
        credential,
        createdAt: new Date().toISOString(),
        alias: request.alias,
        tags: request.tags || [],
        isVerified: false,
        metadata: {
          templateId: request.templateId,
          category: request.category || CredentialCategory.OTHER,
          privacy: request.privacy || CredentialPrivacy.PRIVATE,
          source: CredentialSource.SELF_ISSUED,
        },
      };

      this._storeCredential(storedCredential);
      return storedCredential;
    } catch (error) {
      console.error("Failed to create credential:", error);
      throw error;
    }
  }

  getStoredCredentials(): StoredCredential[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    const credentials = stored ? JSON.parse(stored) : [];
    return credentials.sort(
      (a: StoredCredential, b: StoredCredential) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getCredentialById(id: string): StoredCredential | null {
    const credentials = this.getStoredCredentials();
    return credentials.find((cred) => cred.credential.id === id) || null;
  }

  deleteCredential(id: string): boolean {
    const credentials = this.getStoredCredentials();
    const index = credentials.findIndex((cred) => cred.credential.id === id);

    if (index !== -1) {
      credentials.splice(index, 1);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(credentials));
      return true;
    }

    return false;
  }

  updateCredentialAlias(id: string, alias: string): boolean {
    const credentials = this.getStoredCredentials();
    const credential = credentials.find((cred) => cred.credential.id === id);

    if (credential) {
      credential.alias = alias;
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(credentials));
      return true;
    }

    return false;
  }

  getCredentialsByCategory(category: CredentialCategory): StoredCredential[] {
    return this.getStoredCredentials().filter(
      (cred) => cred.metadata?.category === category
    );
  }

  getCredentialsByDID(did: string): StoredCredential[] {
    return this.getStoredCredentials().filter(
      (cred) =>
        cred.credential.credentialSubject.id === did ||
        cred.credential.issuer === did
    );
  }

  exportCredential(id: string): string | null {
    const credential = this.getCredentialById(id);
    if (credential) {
      return JSON.stringify(credential.credential, null, 2);
    }
    return null;
  }

  async importCredential(
    credentialJson: string,
    alias?: string
  ): Promise<StoredCredential> {
    try {
      const credential: VerifiableCredential = JSON.parse(credentialJson);

      // Basic validation
      if (
        !credential.id ||
        !credential.issuer ||
        !credential.credentialSubject
      ) {
        throw new Error("Invalid credential format");
      }

      const storedCredential: StoredCredential = {
        credential,
        createdAt: new Date().toISOString(),
        alias: alias || "Imported Credential",
        tags: ["imported"],
        isVerified: false,
        metadata: {
          category: CredentialCategory.OTHER,
          privacy: CredentialPrivacy.PRIVATE,
          source: CredentialSource.IMPORTED,
        },
      };

      this._storeCredential(storedCredential);
      return storedCredential;
    } catch (error) {
      console.error("Failed to import credential:", error);
      throw new Error("Invalid credential format");
    }
  }

  getAvailableTemplates(): CredentialTemplate[] {
    const stored = localStorage.getItem(this.TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  getTemplate(id: string): CredentialTemplate | null {
    const templates = this.getAvailableTemplates();
    return templates.find((template) => template.id === id) || null;
  }

  async verifyCredential(
    credential: VerifiableCredential
  ): Promise<VerificationResult> {
    return await this._verificationService.verifyCredential(credential);
  }

  private _storeCredential(credential: StoredCredential): void {
    const credentials = this.getStoredCredentials();
    credentials.push(credential);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(credentials));
  }

  private _generateCredentialId(): string {
    return `urn:uuid:${crypto.randomUUID()}`;
  }

  private _initializeDefaultTemplates(): void {
    const existingTemplates = localStorage.getItem(this.TEMPLATES_KEY);
    if (!existingTemplates) {
      const defaultTemplates: CredentialTemplate[] = [
        {
          id: "education-degree",
          name: "Educational Degree",
          description: "University or college degree credential",
          category: CredentialCategory.EDUCATION,
          context: ["https://www.w3.org/ns/credentials/examples/v1"],
          type: ["UniversityDegreeCredential"],
          fields: [
            {
              key: "degree",
              label: "Degree",
              type: FieldType.TEXT,
              required: true,
              placeholder: "Bachelor of Science",
            },
            {
              key: "degreeType",
              label: "Degree Type",
              type: FieldType.SELECT,
              required: true,
              options: [
                "Bachelor",
                "Master",
                "Doctorate",
                "Associate",
                "Certificate",
              ],
            },
            {
              key: "university",
              label: "Institution",
              type: FieldType.TEXT,
              required: true,
              placeholder: "University Name",
            },
            {
              key: "graduationDate",
              label: "Graduation Date",
              type: FieldType.DATE,
              required: true,
            },
            {
              key: "gpa",
              label: "GPA",
              type: FieldType.NUMBER,
              required: false,
              placeholder: "3.75",
            },
          ],
        },
        {
          id: "professional-certification",
          name: "Professional Certification",
          description: "Industry or professional certification",
          category: CredentialCategory.CERTIFICATION,
          context: ["https://www.w3.org/ns/credentials/examples/v1"],
          type: ["ProfessionalCertificationCredential"],
          fields: [
            {
              key: "certificationName",
              label: "Certification Name",
              type: FieldType.TEXT,
              required: true,
              placeholder: "AWS Solutions Architect",
            },
            {
              key: "issuingOrganization",
              label: "Issuing Organization",
              type: FieldType.TEXT,
              required: true,
              placeholder: "Amazon Web Services",
            },
            {
              key: "certificationId",
              label: "Certification ID",
              type: FieldType.TEXT,
              required: false,
              placeholder: "AWS-123456",
            },
            {
              key: "issueDate",
              label: "Issue Date",
              type: FieldType.DATE,
              required: true,
            },
            {
              key: "validUntil",
              label: "Valid Until",
              type: FieldType.DATE,
              required: false,
            },
          ],
        },
        {
          id: "achievement-badge",
          name: "Achievement Badge",
          description: "Personal or professional achievement",
          category: CredentialCategory.ACHIEVEMENT,
          context: ["https://www.w3.org/ns/credentials/examples/v1"],
          type: ["AchievementCredential"],
          fields: [
            {
              key: "achievementName",
              label: "Achievement Name",
              type: FieldType.TEXT,
              required: true,
              placeholder: "Hackathon Winner",
            },
            {
              key: "description",
              label: "Description",
              type: FieldType.TEXTAREA,
              required: true,
              placeholder: "First place in blockchain hackathon",
            },
            {
              key: "awardedBy",
              label: "Awarded By",
              type: FieldType.TEXT,
              required: true,
              placeholder: "Tech Conference 2024",
            },
            {
              key: "achievementDate",
              label: "Achievement Date",
              type: FieldType.DATE,
              required: true,
            },
          ],
        },
      ];

      localStorage.setItem(
        this.TEMPLATES_KEY,
        JSON.stringify(defaultTemplates)
      );
    }
  }
}
