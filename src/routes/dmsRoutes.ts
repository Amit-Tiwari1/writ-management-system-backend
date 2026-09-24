import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import {
  getCaseDocuments,
  getPresignedUploadUrl,
  confirmDocumentUpload,
  viewDocumentStream,
  downloadDocument,
  addAnnotation,
  getAnnotations,
  searchDocumentsOCR,
} from "../controllers/dmsController";

const router = Router();
router.use(authenticateToken);

// 27. Folder Tree & Documents
router.get("/cases/:caseId/documents", getCaseDocuments);

// 28. Presigned Upload URL
router.post("/cases/:caseId/documents/presigned-url", getPresignedUploadUrl);

// 29. Confirm Document Upload
router.post("/cases/:caseId/documents/confirm-upload", confirmDocumentUpload);

// 30. View Stream
router.get("/cases/:caseId/documents/:docId/view", viewDocumentStream);

// 31. Download Certified Copy
router.get("/cases/:caseId/documents/:docId/download", downloadDocument);

// 32. Add Annotation
router.post("/cases/:caseId/documents/:docId/annotations", addAnnotation);

// 33. Get Annotations
router.get("/cases/:caseId/documents/:docId/annotations", getAnnotations);

// 34. OCR Full Text Search
router.get("/cases/:caseId/documents/search-ocr", searchDocumentsOCR);

export default router;