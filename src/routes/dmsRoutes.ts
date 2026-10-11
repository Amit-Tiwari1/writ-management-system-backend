import { Router } from "express";
import { authenticateToken } from "../middlewares/authMiddleware";
import { uploadSingle } from "../middlewares/uploadMiddleware";
import {
  getCaseDocuments,
  uploadCaseDocument,
  replaceCaseDocument,
  deleteCaseDocument,
  viewDocumentStream,
  addAnnotation,
  searchDocumentsOCR,
} from "../controllers/dmsController";

const router = Router();
router.use(authenticateToken);
router.get("/cases/:caseId/documents", getCaseDocuments);
router.post("/cases/:caseId/documents/upload", uploadSingle("file", 25), uploadCaseDocument);
router.put("/cases/documents/:docId/replace", uploadSingle("file", 25), replaceCaseDocument);
router.delete("/cases/documents/:docId", deleteCaseDocument);
router.get("/cases/documents/:docId/view", viewDocumentStream);
router.post("/cases/documents/:docId/annotations", addAnnotation);
router.get("/cases/:caseId/documents/search-ocr", searchDocumentsOCR);

export default router;