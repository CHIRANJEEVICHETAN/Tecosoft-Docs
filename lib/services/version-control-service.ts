import { prisma } from '@/lib/prisma'

export interface DocumentVersion {
  id: string
  documentId: string
  version: number
  title: string
  content: string
  summary?: string
  authorId: string
  changeDescription?: string
  createdAt: Date
}

export interface VersionDiff {
  additions: string[]
  deletions: string[]
  modifications: Array<{
    line: number
    old: string
    new: string
  }>
}

export class VersionControlService {
  /**
   * Create a new version of a document
   */
  static async createVersion(
    documentId: string,
    title: string,
    content: string,
    summary: string | undefined,
    authorId: string,
    changeDescription?: string
  ): Promise<DocumentVersion> {
    // Get the latest version number
    const latestVersion = await prisma.documentVersion.findFirst({
      where: { documentId },
      orderBy: { version: 'desc' },
      select: { version: true }
    })

    const newVersionNumber = (latestVersion?.version || 0) + 1

    const version = await prisma.documentVersion.create({
      data: {
        documentId,
        version: newVersionNumber,
        title,
        content,
        summary,
        authorId,
        changeDescription,
      }
    })

    return version as DocumentVersion
  }

  /**
   * Get all versions of a document
   */
  static async getDocumentVersions(documentId: string): Promise<DocumentVersion[]> {
    const versions = await prisma.documentVersion.findMany({
      where: { documentId },
      orderBy: { version: 'desc' },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        }
      }
    })

    return versions as DocumentVersion[]
  }

  /**
   * Get a specific version of a document
   */
  static async getVersion(documentId: string, version: number): Promise<DocumentVersion | null> {
    const documentVersion = await prisma.documentVersion.findFirst({
      where: {
        documentId,
        version
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            imageUrl: true
          }
        }
      }
    })

    return documentVersion as DocumentVersion | null
  }

  /**
   * Rollback document to a specific version
   */
  static async rollbackToVersion(
    documentId: string,
    targetVersion: number,
    authorId: string
  ): Promise<DocumentVersion> {
    const targetVersionData = await this.getVersion(documentId, targetVersion)
    
    if (!targetVersionData) {
      throw new Error('Target version not found')
    }

    // Update the main document
    await prisma.document.update({
      where: { id: documentId },
      data: {
        title: targetVersionData.title,
        content: targetVersionData.content,
        summary: targetVersionData.summary,
      }
    })

    // Create a new version entry for the rollback
    return this.createVersion(
      documentId,
      targetVersionData.title,
      targetVersionData.content,
      targetVersionData.summary,
      authorId,
      `Rolled back to version ${targetVersion}`
    )
  }

  /**
   * Compare two versions and generate a diff
   */
  static generateDiff(oldContent: string, newContent: string): VersionDiff {
    const oldLines = oldContent.split('\n')
    const newLines = newContent.split('\n')
    
    const additions: string[] = []
    const deletions: string[] = []
    const modifications: Array<{ line: number; old: string; new: string }> = []

    // Simple diff algorithm (in production, use a proper diff library)
    const maxLength = Math.max(oldLines.length, newLines.length)
    
    for (let i = 0; i < maxLength; i++) {
      const oldLine = oldLines[i]
      const newLine = newLines[i]
      
      if (oldLine === undefined && newLine !== undefined) {
        additions.push(newLine)
      } else if (oldLine !== undefined && newLine === undefined) {
        deletions.push(oldLine)
      } else if (oldLine !== newLine) {
        modifications.push({
          line: i + 1,
          old: oldLine,
          new: newLine
        })
      }
    }

    return { additions, deletions, modifications }
  }

  /**
   * Get version history with diffs
   */
  static async getVersionHistory(documentId: string): Promise<Array<DocumentVersion & { diff?: VersionDiff }>> {
    const versions = await this.getDocumentVersions(documentId)
    
    const versionsWithDiffs = []
    
    for (let i = 0; i < versions.length; i++) {
      const version = versions[i]
      let diff: VersionDiff | undefined
      
      if (i < versions.length - 1) {
        const previousVersion = versions[i + 1]
        diff = this.generateDiff(previousVersion.content, version.content)
      }
      
      versionsWithDiffs.push({
        ...version,
        diff
      })
    }
    
    return versionsWithDiffs
  }

  /**
   * Create automatic backup version before major changes
   */
  static async createBackupVersion(
    documentId: string,
    authorId: string,
    reason: string = 'Automatic backup'
  ): Promise<DocumentVersion> {
    const document = await prisma.document.findUnique({
      where: { id: documentId }
    })

    if (!document) {
      throw new Error('Document not found')
    }

    return this.createVersion(
      documentId,
      document.title,
      document.content || '',
      document.summary || undefined,
      authorId,
      reason
    )
  }
}