/**
 * Material Service
 *
 * Handles all course material-related business logic including:
 * - Material upload with file storage
 * - Background PDF parsing
 * - Material retrieval with parsing status
 * - Material deletion with file cleanup
 */

import { prisma } from "@/lib/prisma";
import { parsePDFToText, validateParsedContent } from "@/lib/pdf-parser";
import { readFile, unlink } from "fs/promises";
import { join } from "path";
import type { Material_Type } from "@/generated/prisma";
import type { ServiceResult } from "./types";

/**
 * Material data transfer objects
 */
export type UploadMaterialInput = {
  courseId: string;
  title: string;
  filename: string;
  materialType: Material_Type;
  unit: number;
  uploadedById: string;
};

export type MaterialResponse = {
  id: string;
  title: string;
  filePath: string;
  materialType: Material_Type;
  unit: number;
  parsingStatus: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  parsingError?: string | null;
  parsedContent?: string | null;
  createdAt: Date;
  course: {
    id: string;
    course_code: string;
    name: string;
  };
};

/**
 * Service class for material operations
 */
export class MaterialService {
  /**
   * Upload course material
   */
  static async uploadMaterial(
    input: UploadMaterialInput
  ): Promise<ServiceResult<MaterialResponse>> {
    const material = await prisma.course_Material.create({
      data: {
        courseId: input.courseId,
        title: input.title,
        filePath: input.filename,
        materialType: input.materialType,
        unit: input.unit,
        uploadedById: input.uploadedById,
        parsingStatus: "PENDING",
      },
      select: {
        id: true,
        title: true,
        filePath: true,
        materialType: true,
        unit: true,
        parsingStatus: true,
        parsingError: true,
        parsedContent: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            course_code: true,
            name: true,
          },
        },
      },
    });

    // Start background PDF parsing (non-blocking)
    this.parsePDFInBackground(material.id, input.filename).catch((error) => {
      console.error(
        `Failed to start background parsing for ${material.id}:`,
        error
      );
    });

    return {
      data: material as MaterialResponse,
      message: "Material uploaded successfully. Parsing will begin shortly.",
    };
  }

  /**
   * Background PDF parsing (non-blocking)
   */
  private static async parsePDFInBackground(
    materialId: string,
    filename: string
  ): Promise<void> {
    try {
      console.log(
        `[PDF Parser] Starting background parsing for material ${materialId}`
      );

      // Update status to PROCESSING
      await prisma.course_Material.update({
        where: { id: materialId },
        data: { parsingStatus: "PROCESSING" },
      });

      // Read the uploaded PDF file
      const filePath = join(process.cwd(), "src", "uploads", filename);
      const buffer = await readFile(filePath);

      // Parse the PDF content
      const pdfContent = await parsePDFToText(buffer);
      const validation = validateParsedContent(pdfContent);

      if (!validation.isValid) {
        console.warn(
          `[PDF Parser] Validation warnings for ${materialId}:`,
          validation.warnings
        );
      }

      // Log the parsed content
      console.log(
        `\n========== PARSED PDF CONTENT (Material ID: ${materialId}) ==========`
      );
      console.log(`Filename: ${filename}`);
      console.log(`Pages: ${pdfContent.metadata.pages}`);
      console.log(`Text Length: ${pdfContent.text.length} characters`);
      console.log(`Markdown Length: ${pdfContent.markdown.length} characters`);
      console.log(`\n--- Raw Text (Full) ---`);
      console.log(pdfContent.text);
      console.log(`\n--- Markdown Format (Full) ---`);
      console.log(pdfContent.markdown);
      console.log(`\n--- Full Metadata ---`);
      console.log(JSON.stringify(pdfContent.metadata, null, 2));
      console.log(`========== END OF PARSED CONTENT ==========\n`);

      // Update the database with parsed content
      await prisma.course_Material.update({
        where: { id: materialId },
        data: {
          parsedContent: pdfContent.markdown,
          parsingStatus: "COMPLETED",
          parsingError: null,
        },
      });

      console.log(
        `[PDF Parser] Successfully completed parsing for material ${materialId}`
      );
    } catch (error) {
      console.error(
        `[PDF Parser] Error parsing material ${materialId}:`,
        error
      );

      // Update status to FAILED with error message
      await prisma.course_Material
        .update({
          where: { id: materialId },
          data: {
            parsingStatus: "FAILED",
            parsingError:
              error instanceof Error ? error.message : "Unknown parsing error",
          },
        })
        .catch((dbError) => {
          console.error(`[PDF Parser] Failed to update error status:`, dbError);
        });
    }
  }

  /**
   * Get uploaded materials for a coordinator
   */
  static async getMaterialsByCoordinator(
    coordinatorId: string
  ): Promise<ServiceResult<MaterialResponse[]>> {
    const materials = await prisma.course_Material.findMany({
      where: {
        course: {
          OR: [
            { courseCoordinatorId: coordinatorId },
            { moduleCoordinatorId: coordinatorId },
            { programCoordinatorId: coordinatorId },
          ],
        },
      },
      select: {
        id: true,
        title: true,
        filePath: true,
        materialType: true,
        unit: true,
        parsingStatus: true,
        parsingError: true,
        parsedContent: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            course_code: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return { data: materials as MaterialResponse[] };
  }

  /**
   * Get material by ID
   */
  static async getMaterialById(
    id: string
  ): Promise<ServiceResult<MaterialResponse>> {
    const material = await prisma.course_Material.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        filePath: true,
        materialType: true,
        unit: true,
        parsingStatus: true,
        parsingError: true,
        parsedContent: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            course_code: true,
            name: true,
          },
        },
      },
    });

    if (!material) {
      throw new Error("Material not found.");
    }

    return { data: material as MaterialResponse };
  }

  /**
   * Delete material with file cleanup
   */
  static async deleteMaterial(
    materialId: string
  ): Promise<ServiceResult<null>> {
    try {
      // Get material details
      const material = await prisma.course_Material.findUnique({
        where: { id: materialId },
        select: {
          filePath: true,
          _count: { select: { questions: true } },
        },
      });

      if (!material) {
        throw new Error("Material not found.");
      }

      // Delete associated questions
      if (material._count.questions > 0) {
        await prisma.question.deleteMany({
          where: { materialId },
        });
      }

      // Delete the database record
      await prisma.course_Material.delete({
        where: { id: materialId },
      });

      // Delete the physical file
      const filePath = join(process.cwd(), "src", "uploads", material.filePath);
      try {
        await unlink(filePath);
        console.log(`[Material Service] Deleted file: ${filePath}`);
      } catch (fileError) {
        console.error(
          `[Material Service] Failed to delete file ${filePath}:`,
          fileError
        );
        // Don't throw - file might already be deleted or missing
      }

      return {
        message: `Material deleted successfully${
          material._count.questions > 0
            ? ` along with ${material._count.questions} associated question(s)`
            : ""
        }.`,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Failed to delete material.");
    }
  }

  /**
   * Get materials by course ID
   */
  static async getMaterialsByCourse(
    courseId: string
  ): Promise<ServiceResult<MaterialResponse[]>> {
    const materials = await prisma.course_Material.findMany({
      where: { courseId },
      select: {
        id: true,
        title: true,
        filePath: true,
        materialType: true,
        unit: true,
        parsingStatus: true,
        parsingError: true,
        parsedContent: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            course_code: true,
            name: true,
          },
        },
      },
      orderBy: [{ unit: "asc" }, { createdAt: "desc" }],
    });

    return { data: materials as MaterialResponse[] };
  }
}
