import { DocumentRepository } from "@/server/repositories/document.repo";
import { ActivityRepository } from "@/server/repositories/activity.repo";
import { AuditRepository } from "@/server/repositories/audit.repo";
import { StorageService } from "@/server/storage/supabase-storage";
import { getAuthContext, requireProjectAccess } from "@/server/policies/rbac";
import { NotFoundError } from "@/server/errors";
import { PresignUploadSchema, CompleteDocumentUploadSchema } from "@/server/schemas";

export const DocumentService = {
  async listDocuments(projectId?: string) {
    return DocumentRepository.list(projectId);
  },

  async presignUpload(callerUserId: string, rawInput: unknown) {
    const data = PresignUploadSchema.parse(rawInput);
    const ctx = await getAuthContext(callerUserId);
    await requireProjectAccess(ctx, data.projectId);

    return StorageService.createSignedUploadUrl({
      projectId: data.projectId,
      filename: data.name,
      mimeType: data.mimeType,
      sizeBytes: data.sizeBytes,
    });
  },

  async completeUpload(callerUserId: string, rawInput: unknown) {
    const data = CompleteDocumentUploadSchema.parse(rawInput);
    const ctx = await getAuthContext(callerUserId);
    await requireProjectAccess(ctx, data.projectId);

    const docId = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await DocumentRepository.createWithVersion({
      id: docId,
      projectId: data.projectId,
      name: data.name,
      kind: data.kind,
      version: data.version,
      storagePath: data.storagePath,
      sizeBytes: data.sizeBytes,
      mimeType: data.mimeType,
      uploadedBy: callerUserId,
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "upload",
      text: `uploaded ${data.name} (${data.version})`,
      detail: `${data.kind.toUpperCase()} specification document`,
      projectId: data.projectId,
    });

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "document_uploaded",
      targetType: "document",
      targetId: docId,
      metadataJson: { name: data.name, version: data.version },
    });

    return DocumentRepository.findById(docId);
  },

  async uploadDocumentDirect(
    callerUserId: string,
    rawInput: {
      projectId: string;
      name: string;
      kind: "prd" | "trd" | "arch" | "spec" | "other";
      fileName: string;
      mimeType: string;
      base64: string;
    },
  ) {
    const ctx = await getAuthContext(callerUserId);
    await requireProjectAccess(ctx, rawInput.projectId);

    const base64Clean = rawInput.base64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64Clean, "base64");

    const { storagePath, sizeBytes } = await StorageService.uploadDocumentDirect({
      projectId: rawInput.projectId,
      buffer,
      mimeType: rawInput.mimeType,
      filename: rawInput.fileName || rawInput.name,
    });

    const docId = `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    await DocumentRepository.createWithVersion({
      id: docId,
      projectId: rawInput.projectId,
      name: rawInput.name,
      kind: rawInput.kind,
      version: "v1.0",
      storagePath,
      sizeBytes,
      mimeType: rawInput.mimeType,
      uploadedBy: callerUserId,
    });

    await ActivityRepository.create({
      id: `act-${Date.now()}`,
      actorId: callerUserId,
      kind: "upload",
      text: `uploaded ${rawInput.name} (v1.0)`,
      detail: `${rawInput.kind.toUpperCase()} specification document`,
      projectId: rawInput.projectId,
    });

    await AuditRepository.log({
      id: `audit-${Date.now()}`,
      actorId: callerUserId,
      action: "document_uploaded",
      targetType: "document",
      targetId: docId,
      metadataJson: { name: rawInput.name, version: "v1.0" },
    });

    return DocumentRepository.findById(docId);
  },

  async getDownloadUrl(callerUserId: string, documentId: string) {
    const doc = await DocumentRepository.findById(documentId);
    if (!doc) throw new NotFoundError("Document");

    const ctx = await getAuthContext(callerUserId);
    await requireProjectAccess(ctx, doc.projectId);

    if (!doc.storagePath) {
      return `/api/v1/files/sample/${doc.name}`;
    }

    return StorageService.createSignedDownloadUrl(doc.storagePath);
  },
};
