import { getDb } from "@/server/db/kysely";
import type { DocKindType } from "@/server/db/types";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const DocumentRepository = {
  async list(projectId?: string) {
    const db = getDb();
    let query = db.selectFrom("documents").selectAll().orderBy("updated_at", "desc");
    if (projectId && projectId !== "all") {
      query = query.where("project_id", "=", projectId);
    }
    const docs = await query.execute();
    const docIds = docs.map((d) => d.id);

    const versions = docIds.length
      ? await db
          .selectFrom("document_versions")
          .selectAll()
          .where("document_id", "in", docIds)
          .orderBy("created_at", "desc")
          .execute()
      : [];

    const versionMap = new Map<string, typeof versions>();
    for (const v of versions) {
      const list = versionMap.get(v.document_id) ?? [];
      list.push(v);
      versionMap.set(v.document_id, list);
    }

    return docs.map((d) => {
      const vers = versionMap.get(d.id) ?? [];
      const latest = vers[0];
      return {
        id: d.id,
        projectId: d.project_id,
        name: d.name,
        kind: d.kind,
        version: latest?.version ?? "v1.0",
        updatedBy: latest?.uploaded_by ?? d.created_by,
        updatedAt: d.updated_at ? new Date(d.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recently",
        size: latest ? formatBytes(Number(latest.size_bytes)) : "0 B",
        current: true,
        storagePath: latest?.storage_path,
        mimeType: latest?.mime_type,
        versions: vers,
      };
    });
  },

  async findById(id: string) {
    const list = await this.list();
    return list.find((d) => d.id === id) ?? null;
  },

  async createWithVersion(data: {
    id: string;
    projectId: string;
    name: string;
    kind: DocKindType;
    version: string;
    storagePath: string;
    sizeBytes: number;
    mimeType: string;
    uploadedBy: string;
  }) {
    const db = getDb();
    return db.transaction().execute(async (tx) => {
      const versionId = `ver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      await tx
        .insertInto("documents")
        .values({
          id: data.id,
          project_id: data.projectId,
          name: data.name,
          kind: data.kind,
          current_version_id: versionId,
          created_by: data.uploadedBy,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .execute();

      await tx
        .insertInto("document_versions")
        .values({
          id: versionId,
          document_id: data.id,
          version: data.version,
          storage_path: data.storagePath,
          size_bytes: data.sizeBytes,
          mime_type: data.mimeType,
          uploaded_by: data.uploadedBy,
          created_at: new Date(),
        })
        .execute();

      return data.id;
    });
  },

  async addVersion(data: {
    documentId: string;
    version: string;
    storagePath: string;
    sizeBytes: number;
    mimeType: string;
    uploadedBy: string;
  }) {
    const db = getDb();
    return db.transaction().execute(async (tx) => {
      const versionId = `ver-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      await tx
        .insertInto("document_versions")
        .values({
          id: versionId,
          document_id: data.documentId,
          version: data.version,
          storage_path: data.storagePath,
          size_bytes: data.sizeBytes,
          mime_type: data.mimeType,
          uploaded_by: data.uploadedBy,
          created_at: new Date(),
        })
        .execute();

      await tx
        .updateTable("documents")
        .set({
          current_version_id: versionId,
          updated_at: new Date(),
        })
        .where("id", "=", data.documentId)
        .execute();

      return versionId;
    });
  },
};
